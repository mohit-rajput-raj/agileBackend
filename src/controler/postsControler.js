import { Post } from "../models/postsModel.js";
import { User } from "../models/userModel.js";
import { Notification } from "../models/notificationModel.js";
import cloudinary from "../library/cloud.js";

// Create a post (text + optional image via cloudinary)
export const createPost = async (req, res) => {
  try {
    const { text, image } = req.body;
    const authorId = req.user._id;

    if (!text && !image) {
      return res.status(400).json({ msg: "Post must have text or an image" });
    }

    let imageUrl = "";
    if (image) {
      const result = await cloudinary.uploader.upload(image, {
        folder: "bake2biz_posts",
        format: "webp",
        transformation: [{ quality: "auto:good", fetch_format: "webp" }],
      });
      imageUrl = result.secure_url;
    }

    const newPost = await Post.create({
      author: authorId,
      text: text || "",
      image: imageUrl,
    });

    // Push post to user's profile.posts
    await User.findByIdAndUpdate(authorId, {
      $push: { "profile.posts": newPost._id },
    });

    const populated = await Post.findById(newPost._id).populate(
      "author",
      "username profile.pic profile.role shopName"
    );

    return res.status(201).json(populated);
  } catch (error) {
    console.error("Error in createPost:", error);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
};

// Get paginated feed (all posts, newest first)
export const getFeedPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalPosts = await Post.countDocuments();
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "username profile.pic profile.role shopName")
      .populate("comments.user", "username profile.pic")
      .populate("likes.author", "username profile.pic");

    return res.status(200).json({
      posts,
      currentPage: page,
      totalPages: Math.ceil(totalPosts / limit),
      totalPosts,
      hasMore: skip + posts.length < totalPosts,
    });
  } catch (error) {
    console.error("Error in getFeedPosts:", error);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
};

// Get single post
export const getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate("author", "username profile.pic profile.role shopName")
      .populate("comments.user", "username profile.pic")
      .populate("likes.author", "username profile.pic");

    if (!post) return res.status(404).json({ msg: "Post not found" });
    return res.status(200).json(post);
  } catch (error) {
    console.error("Error in getPost:", error);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
};

// Like / Unlike a post
export const toggleLikePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ msg: "Post not found" });

    const existingLike = post.likes.find(
      (like) => like.author.toString() === userId.toString()
    );

    if (existingLike) {
      // Unlike
      post.likes = post.likes.filter(
        (like) => like.author.toString() !== userId.toString()
      );
    } else {
      // Like
      post.likes.push({ author: userId });

      // Send notification if it's not the post author liking their own post
      if (post.author.toString() !== userId.toString()) {
        const user = await User.findById(userId).select("username");
        const notification = await Notification.create({
          sender: userId,
          recipient: post.author,
          description: `${user.username} liked your post`,
          type: "Like",
          relatedPost: postId,
        });
        await User.findByIdAndUpdate(post.author, {
          $push: { "profile.notifications": notification._id },
        });
      }
    }

    await post.save();

    const updatedPost = await Post.findById(postId)
      .populate("author", "username profile.pic profile.role shopName")
      .populate("comments.user", "username profile.pic")
      .populate("likes.author", "username profile.pic");

    return res.status(200).json(updatedPost);
  } catch (error) {
    console.error("Error in toggleLikePost:", error);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
};

// Add a comment
export const addComment = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;
    const { text } = req.body;

    if (!text) return res.status(400).json({ msg: "Comment text is required" });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ msg: "Post not found" });

    post.comments.push({ text, user: userId });
    await post.save();

    // Notify post author
    if (post.author.toString() !== userId.toString()) {
      const user = await User.findById(userId).select("username");
      const notification = await Notification.create({
        sender: userId,
        recipient: post.author,
        description: `${user.username} commented on your post`,
        type: "Comment",
        relatedPost: postId,
      });
      await User.findByIdAndUpdate(post.author, {
        $push: { "profile.notifications": notification._id },
      });
    }

    const updatedPost = await Post.findById(postId)
      .populate("author", "username profile.pic profile.role shopName")
      .populate("comments.user", "username profile.pic")
      .populate("likes.author", "username profile.pic");

    return res.status(201).json(updatedPost);
  } catch (error) {
    console.error("Error in addComment:", error);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
};

// Delete a comment
export const deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ msg: "Post not found" });

    const comment = post.comments.find(
      (c) => c.id.toString() === commentId || c._id.toString() === commentId
    );
    if (!comment) return res.status(404).json({ msg: "Comment not found" });

    // Only comment author or post author can delete
    if (
      comment.user.toString() !== userId.toString() &&
      post.author.toString() !== userId.toString()
    ) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    post.comments = post.comments.filter(
      (c) => c._id.toString() !== commentId && c.id.toString() !== commentId
    );
    await post.save();

    const updatedPost = await Post.findById(postId)
      .populate("author", "username profile.pic profile.role shopName")
      .populate("comments.user", "username profile.pic")
      .populate("likes.author", "username profile.pic");

    return res.status(200).json(updatedPost);
  } catch (error) {
    console.error("Error in deleteComment:", error);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
};

// Delete a post
export const deletePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ msg: "Post not found" });

    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({ msg: "Not authorized to delete this post" });
    }

    // Delete image from cloudinary if exists
    if (post.image) {
      try {
        const publicId = post.image.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`bake2biz_posts/${publicId}`);
      } catch (e) {
        console.error("Cloudinary delete error:", e);
      }
    }

    await Post.findByIdAndDelete(postId);

    // Remove from user's profile.posts
    await User.findByIdAndUpdate(userId, {
      $pull: { "profile.posts": postId },
    });

    return res.status(200).json({ msg: "Post deleted successfully" });
  } catch (error) {
    console.error("Error in deletePost:", error);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
};

// Get posts by a specific user
export const getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalPosts = await Post.countDocuments({ author: userId });
    const posts = await Post.find({ author: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "username profile.pic profile.role shopName")
      .populate("comments.user", "username profile.pic")
      .populate("likes.author", "username profile.pic");

    return res.status(200).json({
      posts,
      currentPage: page,
      totalPages: Math.ceil(totalPosts / limit),
      totalPosts,
      hasMore: skip + posts.length < totalPosts,
    });
  } catch (error) {
    console.error("Error in getUserPosts:", error);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
};
