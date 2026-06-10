// referloom_backend/controllers/collabController.js
import CollabPost from "../models/CollabPost.js";

// @desc    Create a new Collab Post
export const createPost = async (req, res) => {
  try {
    const { type, title, description, roles } = req.body;
    const post = await CollabPost.create({
      author: req.user.id, type, title, description, roles
    });
    res.status(201).json(post);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// @desc    Get All ACTIVE Posts (For the Explore Feed)
export const getActivePosts = async (req, res) => {
  try {
    const posts = await CollabPost.find({ isActive: true })
      .populate('author', 'fullName profileImage')
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// @desc    Get My Posts (Includes applicants)
export const getMyPosts = async (req, res) => {
  try {
    const posts = await CollabPost.find({ author: req.user.id })
      .populate('applicants.student', 'fullName profileImage studentDetails')
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// @desc    Toggle Active Status
export const toggleStatus = async (req, res) => {
  try {
    const post = await CollabPost.findOne({ _id: req.params.id, author: req.user.id });
    if(!post) return res.status(404).json({ message: "Post not found" });
    post.isActive = !post.isActive;
    await post.save();
    res.json(post);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// @desc    Apply to a Post
export const applyToPost = async (req, res) => {
  try {
    const { role, message } = req.body;
    const post = await CollabPost.findById(req.params.id);
    if(!post) return res.status(404).json({ message: "Post not found" });

    // Prevent duplicate apply
    if (post.applicants.some(app => app.student.toString() === req.user.id)) {
      return res.status(400).json({ message: "You already applied to this team." });
    }

    post.applicants.push({ student: req.user.id, role, message });
    await post.save();
    res.json({ message: "Applied successfully!" });
  } catch (error) { res.status(500).json({ message: error.message }); }
};