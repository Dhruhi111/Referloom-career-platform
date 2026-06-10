// referloom_backend/controllers/mentorshipController.js
import Mentorship from "../models/Mentorship.js";
import User from "../models/User.js";

// @desc    Get Mentorship Requests (Context-Aware: Works for both Student & Alumni)
// @route   GET /api/mentorship/requests
export const getMentorshipRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    let requests;

    // If Student: Find requests they sent, populate Alumni details
    if (role === 'student') {
      requests = await Mentorship.find({ student: userId })
        // ✅ Removed 'professionalDetails' as it's not a top-level schema field
        .populate('alumni', 'fullName headline alumniDetails profileImage')
        .sort({ createdAt: -1 });
    } 
    // If Alumni: Find requests they received, populate Student details
    else if (role === 'alumni') {
      requests = await Mentorship.find({ alumni: userId })
        // ✅ Removed 'careerPreferences' as it sits inside studentDetails
        .populate('student', 'fullName headline studentDetails profileImage')
        .sort({ createdAt: -1 });
    } else {
      return res.status(403).json({ message: "Unauthorized role for this action." });
    }

    res.json(requests);
  } catch (error) {
    console.error("Mentorship Fetch Error:", error);
    res.status(500).json({ message: "Failed to fetch requests", error: error.message });
  }
};

// @desc    Update Request Status (Alumni Accepts/Rejects)
// @route   PUT /api/mentorship/requests/:id
export const updateMentorshipStatus = async (req, res) => {
  try {
    const { status } = req.body; 
    
    const request = await Mentorship.findOne({ _id: req.params.id, alumni: req.user.id });
    if (!request) return res.status(404).json({ message: "Request not found or unauthorized." });

    request.status = status;
    await request.save();

    res.json({ message: `Request ${status}!`, request });
  } catch (error) {
    res.status(500).json({ message: "Failed to update status", error: error.message });
  }
};

// @desc    Send a Mentorship Request (Student -> Alumni)
// @route   POST /api/mentorship/request
export const requestMentorship = async (req, res) => {
  try {
    const { alumniId, message } = req.body;
    const studentId = req.user.id;

    const existing = await Mentorship.findOne({ student: studentId, alumni: alumniId });
    if (existing) return res.status(400).json({ message: "Request already sent." });

    const request = await Mentorship.create({ student: studentId, alumni: alumniId, message });
    res.status(201).json({ message: "Mentorship request sent!", request });
  } catch (error) {
    res.status(500).json({ message: "Failed to send request", error: error.message });
  }
};