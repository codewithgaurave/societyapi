// routes/communityRoutes.js
import express from "express";
import {
  createPost,
  getPosts,
  getPostById,
  updatePost,
  deletePost,
  toggleLike,
  addComment,
  deleteComment,
  getMyPosts,
} from "../controllers/communityController.js";
import { requireAuth } from "../middleware/auth.js";
import { uploadCommunityImages } from "../config/cloudinary.js";

const router = express.Router();

// All routes require auth
router.use(requireAuth);

router.get("/", getPosts);                                          // GET  /api/community
router.post("/", uploadCommunityImages, createPost);               // POST /api/community
router.get("/my-posts", getMyPosts);                               // GET  /api/community/my-posts
router.get("/:id", getPostById);                                   // GET  /api/community/:id
router.put("/:id", updatePost);                                    // PUT  /api/community/:id
router.delete("/:id", deletePost);                                 // DELETE /api/community/:id
router.post("/:id/like", toggleLike);                              // POST /api/community/:id/like
router.post("/:id/comments", addComment);                          // POST /api/community/:id/comments
router.delete("/:id/comments/:commentId", deleteComment);          // DELETE /api/community/:id/comments/:commentId

export default router;
