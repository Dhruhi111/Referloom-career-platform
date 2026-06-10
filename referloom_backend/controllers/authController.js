// referloom_backend/controllers/authController.js
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const register = async (req, res) => {
  try {
    const { email, password, role, fullName, ...roleSpecificData } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userData = {
      email,
      password: hashedPassword,
      role,
      fullName,
      isVerified: false,
    };

    if (role === "student") {
      userData.studentDetails = {
        course: roleSpecificData.course,
        semester: roleSpecificData.semester,
        university: roleSpecificData.university,
      };
    } else if (role === "alumni") {
      userData.alumniDetails = {
        graduationYear: roleSpecificData.graduationYear,
        company: roleSpecificData.company,
        role: roleSpecificData.jobRole, 
      };
    } else if (role === "company") {
      userData.companyDetails = {
        companyName: roleSpecificData.companyName,
        industryType: roleSpecificData.industryType,
      };
    }

    const user = await User.create(userData);
    
    // Fetch the complete user object to send to the frontend
    const fullUser = await User.findById(user._id);

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      success: true,
      token,
      user: fullUser, // ✅ Sending the absolute complete profile
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Registration failed" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        message: "Please verify your email before logging in.",
        unverifiedEmail: user.email
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    

    // Fetch the complete user object (including projects and details) to send to frontend
    const fullUser = await User.findById(user._id).populate('projects');

    // ✅ THE FIX: The frontend now receives the exact same data during Login as it does on Refresh
    res.json({
      token,
      user: fullUser 
    });

  } catch (error) {
    res.status(500).json({ message: "Login failed" });
  }
};