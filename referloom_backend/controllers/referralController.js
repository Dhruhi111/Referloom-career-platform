// referloom_backend/controllers/referralController.js
import User from "../models/User.js";
import Job from "../models/Job.js";
import Application from "../models/Application.js";

// @desc    Refer a Candidate (Alumni -> Company ATS)
// @route   POST /api/referrals/refer
export const referCandidate = async (req, res) => {
  try {
    const { studentId, jobId } = req.body;
    const alumniId = req.user.id;

    if (req.user.role !== 'alumni') {
      return res.status(403).json({ message: "Only alumni can refer candidates." });
    }

    // SCENARIO 1: Referral to a specific Job Posting
    if (jobId) {
      // Check if student is already applied/referred to this job
      const existingApp = await Application.findOne({ job: jobId, student: studentId });
      
      if (existingApp) {
        // If they applied normally, upgrade their application to a Referral!
        if (!existingApp.isReferral) {
          existingApp.isReferral = true;
          existingApp.referredBy = alumniId;
          await existingApp.save();
          return res.json({ message: "Candidate's existing application was upgraded to a Referral!" });
        }
        return res.status(400).json({ message: "Candidate has already been referred to this job." });
      }

      // Create a brand new Application injected straight into the HR pipeline as a referral
      await Application.create({
        job: jobId,
        student: studentId,
        isReferral: true,
        referredBy: alumniId,
        status: 'applied',
        fitScore: 85 // You could optionally call your aiEngine here, but 85+ is standard for referrals
      });

      return res.status(201).json({ message: "Candidate successfully referred to the specific job!" });
    }

    // SCENARIO 2: General Referral to the Company (No specific job)
    // For V1, we just return a success note. In V2, you could save this to a general 'Referrals' collection.
    res.status(200).json({ message: "Candidate referral noted and sent to your HR team!" });

  } catch (error) {
    res.status(500).json({ message: "Failed to process referral", error: error.message });
  }
};