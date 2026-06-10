import User from "../models/User.js";

// @desc    Get all pending (unverified) users
// @route   GET /api/admin/pending
export const getPendingUsers = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Not authorized" });
    const users = await User.find({ isVerified: false, role: { $ne: 'admin' } });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Verify a user
// @route   PUT /api/admin/verify/:id
export const verifyUser = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Not authorized" });
    const user = await User.findByIdAndUpdate(req.params.id, { isVerified: true }, { new: true });
    res.json({ message: "User verified", user });
  } catch (error) {
    res.status(500).json({ message: "Verification failed" });
  }
};