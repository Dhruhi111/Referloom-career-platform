// referloom_backend/controllers/userController.js
import User from "../models/User.js";
import cloudinary from "../config/cloudinary.js";
import { generateCareerRoadmap, calculateProfileStrength } from "../utils/aiEngine.js";

// 🔥 HELPER: Guarantees every user object sent to frontend has the real-time AI Score
// ✅ UPDATED: Now an async function to wait for Gemini
const attachAIToUser = async (userDoc) => {
  console.log("🚨 [1] attachAIToUser function was triggered!"); 
  
  let userObj = userDoc.toObject ? userDoc.toObject() : JSON.parse(JSON.stringify(userDoc));
  
  console.log(`🚨 [2] Detected User Role: ${userObj.role}`); 

  if (userObj.role === 'student') {
    try {
      // ✅ UPDATED: Added await
      const strengthData = await calculateProfileStrength(userObj);
      userObj.profileStrength = strengthData.score;
      userObj.profileSuggestions = strengthData.suggestions;
      
      console.log(`🟢 [3] [AI ENGINE SUCCESS] Score for ${userObj.fullName} is: ${strengthData.score}%`);
      
    } catch (error) {
      console.log("❌ [AI ENGINE ERROR]:", error);
      userObj.profileStrength = 30; 
      userObj.profileSuggestions = ["AI Engine encountered a calculation error."];
    }
  }
  return userObj;
};

// @desc    Get current logged in user profile
export const getMyProfile = async (req, res) => {
  console.log("📞 [API CALL] Frontend requested GET /users/profile");
  try {
    const user = await User.findById(req.user.id).populate('projects');
    if (!user) {
      console.log("⚠️ [WARNING] User not found in DB.");
      return res.status(404).json({ message: "User not found" });
    }
    
    // ✅ UPDATED: Added await
    res.json(await attachAIToUser(user)); 
  } catch (error) {
    console.log("❌ [SERVER ERROR in getMyProfile]:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get user by ID
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || id === "undefined" || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "A valid User ID is required" });
    }

    const user = await User.findById(id).select("-password").populate('projects'); 
    if (!user) return res.status(404).json({ message: "User not found" });

    // ✅ UPDATED: Added await
    res.json(await attachAIToUser(user)); 
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Update Profile Details dynamically based on role
export const updateProfile = async (req, res) => {
  try {
    const updates = { ...req.body };
    const user = await User.findById(req.user.id);
    
    if (!user) return res.status(404).json({ message: "User not found" });

    // 1. Handle Image Upload to Cloudinary
    if (updates.base64Image) {
      const uploadRes = await cloudinary.uploader.upload(`data:image/jpeg;base64,${updates.base64Image}`, {
        folder: "referloom_profiles",
      });
      user.profileImage = uploadRes.secure_url;
    } else if (updates.profileImage !== undefined) {
      user.profileImage = updates.profileImage;
    }

    // 2. Handle universal fields
    if (updates.fullName) user.fullName = updates.fullName;
    if (updates.bio !== undefined) user.bio = updates.bio;
    if (updates.headline !== undefined) user.headline = updates.headline;
    if (updates.visibilityMode) user.visibilityMode = updates.visibilityMode;
    if (updates.isProfileComplete !== undefined) user.isProfileComplete = updates.isProfileComplete;

    // 3. Handle Role Specific updates
    if (user.role === 'student') {
        if (updates.studentDetails) user.studentDetails = { ...user.studentDetails, ...updates.studentDetails };
        if (updates.skills) user.studentDetails.skills = updates.skills;
        if (updates.experience) user.studentDetails.experience = updates.experience;
    }

    if (user.role === 'alumni' && updates.alumniDetails) user.alumniDetails = { ...user.alumniDetails, ...updates.alumniDetails };
    if (user.role === 'company' && updates.companyDetails) user.companyDetails = { ...user.companyDetails, ...updates.companyDetails };

    await user.save();
    
    const populatedUser = await User.findById(user._id).populate('projects');
    
    // ✅ UPDATED: Added await
    res.json({ message: "Profile updated successfully", user: await attachAIToUser(populatedUser) });
  } catch (error) {
    console.error("Profile Update Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Update Career Preferences & Generate AI Roadmap
export const updateCareerPreferences = async (req, res) => {
  try {
    const { fields, companies, locations, jobTypes, timeline } = req.body;
    const user = await User.findById(req.user.id).populate('projects');

    if (!user) return res.status(404).json({ message: "User not found" });

    // Save preferences
    user.studentDetails.careerPreferences = { fields, companies, locations, jobTypes, timeline };

    // 🧠 ✅ UPDATED: Trigger the AI Engine with await
    const roadmap = await generateCareerRoadmap(user);
    user.studentDetails.aiCareerRoadmap = roadmap;
    
    await user.save();

    const populatedUser = await User.findById(user._id).populate('projects');
    
    // ✅ UPDATED: Added await
    res.status(200).json({ message: "Preferences saved and AI Roadmap generated!", user: await attachAIToUser(populatedUser) });
  } catch (error) {
    res.status(500).json({ message: "Failed to update preferences", error: error.message });
  }
};

// @desc    Reset Career Goals
export const resetCareerGoals = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.studentDetails.careerPreferences = {};
    user.studentDetails.aiCareerRoadmap = []; 
    await user.save();
    
    const populatedUser = await User.findById(user._id).populate('projects');
    
    // ✅ UPDATED: Added await
    res.json(await attachAIToUser(populatedUser));
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Update Visibility Mode
export const updateVisibility = async (req, res) => {
  try {
    const { visibilityMode } = req.body;
    const user = await User.findByIdAndUpdate(req.user.id, { visibilityMode }, { new: true }).populate('projects');
    
    // ✅ UPDATED: Added await
    res.json({ message: `Profile is now ${visibilityMode}`, user: await attachAIToUser(user) });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get all completed Alumni profiles
export const getAllAlumni = async (req, res) => {
  try {
    const alumni = await User.find({ role: 'alumni', isProfileComplete: true })
      .select('fullName profileImage alumniDetails');
    res.json(alumni);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch alumni", error: error.message });
  }
};