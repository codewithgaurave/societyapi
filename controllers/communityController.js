// controllers/communityController.js
import CommunityPost from "../models/CommunityPost.js";
import User from "../models/User.js";
import { sendMulticastNotification } from "../services/notificationService.js";

// Helper: build public image URL
const imageUrl = (req, filename) =>
  `${req.protocol}://${req.get("host")}/uploads/community/${filename}`;

// ✅ Create Post
export const createPost = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    const { type, title, description, colonyId } = req.body;

    if (!title?.trim() || !description?.trim()) {
      return res.status(400).json({ message: "Title and description are required" });
    }

    const images = req.files
      ? req.files.map((f) => imageUrl(req, f.filename))
      : [];

    const post = await CommunityPost.create({
      author: userId,
      pincode: user.pincode,
      colony: colonyId || null,
      type: type || "post",
      title: title.trim(),
      description: description.trim(),
      images,
      location: user.location || { type: "Point", coordinates: [0, 0] },
    });

    await post.populate("author", "fullName profileImage pincode");

    // Send FCM notification to nearby society members (10km radius)
    setImmediate(async () => {
      try {
        const typeLabels = { post: "Post", complaint: "Complaint", info: "Info", event: "Event", lost_found: "Lost & Found" };
        const typeLabel = typeLabels[type] || "Post";

        // Find users within 10km using $geoNear — same society (pincode) OR within 10km
        const nearbyUsers = await User.find({
          _id: { $ne: userId },
          role: "society member",
          fcmToken: { $ne: null },
          location: {
            $geoWithin: {
              $centerSphere: [
                user.location?.coordinates || [0, 0],
                10 / 6378.1, // 10km in radians
              ],
            },
          },
        }).select("fcmToken").lean();

        const tokens = nearbyUsers.map((u) => u.fcmToken).filter(Boolean);
        if (tokens.length) {
          await sendMulticastNotification(
            tokens,
            `📢 ${typeLabel} in your Society`,
            `${post.author.fullName}: ${title.trim()}`,
            { type: "community_post", postId: post._id.toString(), postType: type }
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

// ✅ Get Posts — within 5km radius (society feed)
export const getPosts = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    const { type, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = { isActive: true };
    if (type && type !== "all") filter.type = type;

    // Check if user has coordinates set and they are not [0, 0]
    const hasCoordinates = user.location?.coordinates && 
      Array.isArray(user.location.coordinates) && 
      user.location.coordinates.length === 2 && 
      (user.location.coordinates[0] !== 0 || user.location.coordinates[1] !== 0);

    if (hasCoordinates) {
      // 5km radius in radians = 5 / 6378.1
      filter.location = {
        $geoWithin: {
          $centerSphere: [
            user.location.coordinates,
            5 / 6378.1
          ]
        }
      };
    } else {
      // Fallback to pincode filter
      filter.pincode = user.pincode;
    }

    const posts = await CommunityPost.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("author", "fullName profileImage")
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
    const userId = req.user._id;
    const post = await CommunityPost.findOne({
      _id: req.params.id,
      isActive: true,
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
    const userId = req.user._id;
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
    const userId = req.user._id;
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
    const userId = req.user._id;
    const post = await CommunityPost.findById(req.params.id);
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
    const userId = req.user._id;
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: "Comment text required" });

    const post = await CommunityPost.findById(req.params.id);
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
    const userId = req.user._id;
    const post = await CommunityPost.findById(req.params.id);
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

// ✅ My Posts
export const getMyPosts = async (req, res) => {
  try {
    const posts = await CommunityPost.find({
      author: req.user._id,
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
