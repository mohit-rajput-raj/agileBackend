import express from "express";
import { protectRoute } from "../middleware/auth.js";
import {
  createPost,
  getFeedPosts,
  getPost,
  toggleLikePost,
  addComment,
  deleteComment,
  deletePost,
  getUserPosts,
} from "../controler/postsControler.js";

const router = express.Router();

// Static routes first
router.post("/create", protectRoute, createPost);
router.get("/feed", protectRoute, getFeedPosts);
router.get("/user/:userId", protectRoute, getUserPosts);

// Like & Comment
router.put("/like/:id", protectRoute, toggleLikePost);
router.post("/comment/:id", protectRoute, addComment);
router.delete("/comment/:postId/:commentId", protectRoute, deleteComment);

// Dynamic :id routes last to avoid conflicts
router.get("/:id", protectRoute, getPost);
router.delete("/:id", protectRoute, deletePost);

export default router;
