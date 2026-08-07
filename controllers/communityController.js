// controllers/communityController.js
import mongoose from "mongoose";
import CommunityPost from "../models/CommunityPost.js";
import User from "../models/User.js";
import { sendMulticastNotification } from "../services/notificationService.js";

// Helper: robustly extract user ID from req.user payload
const getUserId = (req) => req.user?._id || req.user?.sub || req.user?.id || req.user?.userId;

// Helper: build public image URL
const imageUrl = (req, filename) =>
  `${req.protocol}://${req.get("host")}/uploads/community/${filename}`;

// ✅ Create Post
export const createPost = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Invalid user token" });

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.societyCode || !user.societyCode.trim()) {
      return res.status(400).json({ message: "Community post requires a society code. Please update your profile with your society code first." });
    }

    const { type, title, description, colonyId, targetAddress, targetPincode, targetLat, targetLng } = req.body;

    if (!title?.trim() || !description?.trim()) {
      return res.status(400).json({ message: "Title and description are required" });
    }

    let targetColony = null;
    const isValidColonyId = colonyId && mongoose.Types.ObjectId.isValid(colonyId);
    if (isValidColonyId) {
      const Colony = (await import("../models/Colony.js")).default;
      targetColony = await Colony.findById(colonyId).lean();
    }

    const images = req.files
      ? req.files.map((f) => imageUrl(req, f.filename))
      : [];

    const finalPincode = targetPincode 
      ? Number(targetPincode) 
      : (targetColony?.pincode 
          ? Number(targetColony.pincode) 
          : (user?.pincode ? Number(user.pincode) : 0));

    const postLocation = (user?.location?.coordinates && Array.isArray(user.location.coordinates) && user.location.coordinates.length === 2)
      ? user.location
      : { type: "Point", coordinates: [0, 0] };

    const parsedTargetLocation = (targetLat && targetLng && !isNaN(Number(targetLat)) && !isNaN(Number(targetLng)))
      ? { type: "Point", coordinates: [Number(targetLng), Number(targetLat)] }
      : { type: "Point", coordinates: [0, 0] };

    const post = await CommunityPost.create({
      author: userId,
      societyCode: user.societyCode ? user.societyCode.trim().toUpperCase() : null,
      pincode: finalPincode,
      colony: isValidColonyId ? colonyId : (user.colony || null),
      targetAddress: targetAddress || null,
      targetPincode: targetPincode ? Number(targetPincode) : null,
      targetLocation: parsedTargetLocation,
      type: type || "post",
      title: title.trim(),
      description: description.trim(),
      images,
      location: postLocation,
    });

    await post.populate("author", "fullName profileImage pincode");
    await post.populate("colony", "name city pincode");

    // Send FCM notification to society members
    setImmediate(async () => {
      try {
        const typeLabels = { post: "Post", complaint: "Complaint", info: "Info", event: "Event", lost_found: "Lost & Found" };
        const typeLabel = typeLabels[type] || "Post";

        const filterUser = {
          fcmToken: { $exists: true, $ne: null },
          societyCode: user.societyCode ? user.societyCode.trim().toUpperCase() : "NONE",
        };

        let nearbyUsers = await User.find(filterUser).select("fcmToken fullName").lean();

        const tokens = nearbyUsers
          .map((u) => u.fcmToken)
          .filter((t) => t && typeof t === "string" && t.trim().length > 0);

        console.log(`📡 Found ${nearbyUsers.length} target users, ${tokens.length} valid FCM tokens for notification.`);

        if (tokens.length) {
          const locHeader = targetAddress ? ` [${targetAddress.split(',')[0]}]` : (targetColony ? ` [${targetColony.name}]` : "");
          await sendMulticastNotification(
            tokens,
            `📢 ${typeLabel}${locHeader}`,
            `${post.author?.fullName || 'Member'}: ${title.trim()}`,
            { type: "community_post", postId: post._id.toString(), postType: type, targetAddress: targetAddress || "" }
          );
        }
      } catch (notifErr) {
        console.error("Community notification error:", notifErr.message);
      }
    });

    return res.status(201).json({ message: "Post created successfully", post });
  } catch (err) {
    console.error("createPost error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Get Posts — within 5km radius or society filter
export const getPosts = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Invalid user token" });

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    const { type, colonyId, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = { isActive: true };
    if (type && type !== "all") filter.type = type;

    if (user.societyCode) {
      filter.societyCode = user.societyCode.trim().toUpperCase();
    } else {
      filter.societyCode = "NONE";
    }

    const posts = await CommunityPost.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("author", "fullName profileImage")
      .populate("colony", "name city pincode")
      .populate("comments.user", "fullName profileImage")
      .lean();

    // Add likedByMe flag
    const enriched = posts.map((p) => ({
      ...p,
      likeCount: p.likes.length,
      commentCount: p.comments.length,
      likedByMe: p.likes.some((id) => id.toString() === userId.toString()),
    }));

    const total = await CommunityPost.countDocuments(filter);

    return res.json({ posts: enriched, total, page: parseInt(page) });
  } catch (err) {
    console.error("getPosts error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Get single post
export const getPostById = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Invalid user token" });

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    const userSocietyCode = user.societyCode ? user.societyCode.trim().toUpperCase() : "NONE";

    const post = await CommunityPost.findOne({
      _id: req.params.id,
      isActive: true,
      societyCode: userSocietyCode,
    })
      .populate("author", "fullName profileImage pincode")
      .populate("comments.user", "fullName profileImage")
      .lean();

    if (!post) return res.status(404).json({ message: "Post not found" });

    return res.json({
      post: {
        ...post,
        likeCount: post.likes.length,
        commentCount: post.comments.length,
        likedByMe: post.likes.some((id) => id.toString() === userId.toString()),
      },
    });
  } catch (err) {
    console.error("getPostById error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Update Post (only author)
export const updatePost = async (req, res) => {
  try {
    const userId = getUserId(req);
    const post = await CommunityPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { title, description, type } = req.body;
    if (title) post.title = title.trim();
    if (description) post.description = description.trim();
    if (type) post.type = type;

    await post.save();
    await post.populate("author", "fullName profileImage");

    return res.json({ message: "Post updated", post });
  } catch (err) {
    console.error("updatePost error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Delete Post (only author)
export const deletePost = async (req, res) => {
  try {
    const userId = getUserId(req);
    const post = await CommunityPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    post.isActive = false;
    await post.save();

    return res.json({ message: "Post deleted" });
  } catch (err) {
    console.error("deletePost error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Toggle Like
export const toggleLike = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Invalid user token" });

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    const userSocietyCode = user.societyCode ? user.societyCode.trim().toUpperCase() : "NONE";

    const post = await CommunityPost.findOne({ _id: req.params.id, societyCode: userSocietyCode });
    if (!post) return res.status(404).json({ message: "Post not found" });

    const idx = post.likes.findIndex((id) => id.toString() === userId.toString());
    if (idx === -1) {
      post.likes.push(userId);
    } else {
      post.likes.splice(idx, 1);
    }
    await post.save();

    return res.json({
      likeCount: post.likes.length,
      likedByMe: idx === -1,
    });
  } catch (err) {
    console.error("toggleLike error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Add Comment
export const addComment = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Invalid user token" });

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: "Comment text required" });

    const userSocietyCode = user.societyCode ? user.societyCode.trim().toUpperCase() : "NONE";

    const post = await CommunityPost.findOne({ _id: req.params.id, societyCode: userSocietyCode });
    if (!post) return res.status(404).json({ message: "Post not found" });

    const ist = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour12: true,
    });

    post.comments.push({ user: userId, text: text.trim(), createdAtIST: ist });
    await post.save();
    await post.populate("comments.user", "fullName profileImage");

    const newComment = post.comments[post.comments.length - 1];
    return res.status(201).json({ message: "Comment added", comment: newComment });
  } catch (err) {
    console.error("addComment error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Delete Comment (author of comment or post author)
export const deleteComment = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Invalid user token" });

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    const userSocietyCode = user.societyCode ? user.societyCode.trim().toUpperCase() : "NONE";

    const post = await CommunityPost.findOne({ _id: req.params.id, societyCode: userSocietyCode });
    if (!post) return res.status(404).json({ message: "Post not found" });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const isCommentAuthor = comment.user.toString() === userId.toString();
    const isPostAuthor = post.author.toString() === userId.toString();

    if (!isCommentAuthor && !isPostAuthor) {
      return res.status(403).json({ message: "Not authorized" });
    }

    comment.deleteOne();
    await post.save();

    return res.json({ message: "Comment deleted" });
  } catch (err) {
    console.error("deleteComment error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Admin: Get all posts (society-wise filter optional)
export const adminGetPosts = async (req, res) => {
  try {
    const { type, colonyId, pincode, page = 1, limit = 20, isActive } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (type && type !== "all") filter.type = type;
    if (colonyId && mongoose.Types.ObjectId.isValid(colonyId)) filter.colony = colonyId;
    if (pincode) filter.pincode = Number(pincode);

    const posts = await CommunityPost.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("author", "fullName profileImage pincode")
      .populate("colony", "name city pincode")
      .lean();

    const total = await CommunityPost.countDocuments(filter);
    return res.json({ posts, total, page: parseInt(page) });
  } catch (err) {
    console.error("adminGetPosts error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Admin: Toggle post active/inactive
export const adminTogglePost = async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    post.isActive = !post.isActive;
    await post.save();
    return res.json({ message: `Post ${post.isActive ? "activated" : "deactivated"}`, isActive: post.isActive });
  } catch (err) {
    console.error("adminTogglePost error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Admin: Hard delete post
export const adminDeletePost = async (req, res) => {
  try {
    const post = await CommunityPost.findByIdAndDelete(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    return res.json({ message: "Post permanently deleted" });
  } catch (err) {
    console.error("adminDeletePost error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ My Posts
export const getMyPosts = async (req, res) => {
  try {
    const userId = getUserId(req);
    const posts = await CommunityPost.find({
      author: userId,
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .populate("author", "fullName profileImage")
      .lean();

    return res.json({ posts });
  } catch (err) {
    console.error("getMyPosts error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
