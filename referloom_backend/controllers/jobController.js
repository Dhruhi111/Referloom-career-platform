// referloom_backend/controllers/jobController.js
import Job from "../models/Job.js";
import Application from "../models/Application.js";
import User from "../models/User.js";
import { calculateJobMatch } from "../utils/aiEngine.js";

// @desc    Create a new Job Posting (Company or Alumni)
export const createJob = async (req, res) => {
  try {
    const jobData = { ...req.body, postedBy: req.user.id, status: 'Open' };
    const job = await Job.create(jobData);
    res.status(201).json({ message: "Job posted successfully!", job });
  } catch (error) {
    res.status(500).json({ message: "Failed to post job", error: error.message });
  }
};

// @desc    Get Applicants for Jobs posted by this Alumni
export const getAlumniApplicants = async (req, res) => {
  try {
    const myJobs = await Job.find({ postedBy: req.user.id }).select('_id');
    const jobIds = myJobs.map(job => job._id);

    const applicants = await Application.find({ job: { $in: jobIds } })
      .populate('student', 'fullName profileImage')
      .populate('job', 'title')
      .sort({ createdAt: -1 });

    res.status(200).json(applicants);
  } catch (error) {
    console.error("Error fetching applicants:", error);
    res.status(500).json({ message: "Failed to fetch applicants", error: error.message });
  }
};

// @desc    Get single job details & generate dynamic AI match insights
export const getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate('postedBy', 'fullName companyDetails profileImage');
    if (!job) return res.status(404).json({ message: "Job not found" });

    let fitScore = 0;
    let aiSuggestions = [];

    // 🧠 Trigger the AI Engine if viewed by a student
    if (req.user && req.user.role === 'student') {
      const user = await User.findById(req.user.id).populate('projects');
      
      // ✅ UPDATED: Added await
      const aiAnalysis = await calculateJobMatch(user, job);
      fitScore = aiAnalysis.fitScore;
      aiSuggestions = aiAnalysis.suggestions;
    }

    res.status(200).json({
      ...job._doc,
      companyName: job.postedBy?.companyDetails?.companyName || job.postedBy?.fullName,
      fitScore,
      aiSuggestions
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch job", error: error.message });
  }
};

// @desc    Get matching jobs for student dashboard
export const getStudentMatches = async (req, res) => {
  try {
    const filter = { status: 'open' };
    if (req.query.jobType) filter.jobType = req.query.jobType;
    if (req.query.location) filter.location = { $regex: req.query.location, $options: 'i' }; 
    
    const jobs = await Job.find(filter).populate('postedBy', 'fullName companyDetails profileImage');
    const user = await User.findById(req.user.id).populate('projects');

    // ✅ UPDATED: Upgraded mapping to use Promise.all to handle multiple Gemini calls in parallel
    const matchedJobs = await Promise.all(jobs.map(async (job) => {
      const aiAnalysis = await calculateJobMatch(user, job);
      return {
        ...job._doc,
        companyName: job.postedBy?.companyDetails?.companyName || job.postedBy?.fullName,
        fitScore: aiAnalysis.fitScore,
        aiSuggestions: aiAnalysis.suggestions
      };
    }));

    // 3. Sort by highest match first
    matchedJobs.sort((a, b) => b.fitScore - a.fitScore);
    
    res.json(matchedJobs);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch matches", error: error.message });
  }
};

// @desc    Apply to a Job
export const applyForJob = async (req, res) => {
  try {
    const jobId = req.params.id;
    const studentId = req.user.id;

    const existingApp = await Application.findOne({ job: jobId, student: studentId });
    if (existingApp) return res.status(400).json({ message: "You have already applied for this role." });

    const job = await Job.findById(jobId);
    const student = await User.findById(studentId).populate('projects');

    // ✅ UPDATED: Added await
    const aiAnalysis = await calculateJobMatch(student, job);

    const application = await Application.create({
      job: jobId,
      student: studentId,
      fitScore: aiAnalysis.fitScore,
      status: 'applied'
    });

    res.status(201).json({ message: "Application submitted successfully", application });
  } catch (error) {
    console.error("Apply Error:", error);
    res.status(500).json({ message: "Failed to apply", error: error.message });
  }
};

// @desc    Get all applicants across all jobs posted by the logged-in user (Alumni/Company)
export const getMyApplicants = async (req, res) => {
  try {
    const myJobs = await Job.find({ postedBy: req.user.id }).select('_id title');
    const jobIds = myJobs.map(j => j._id);

    const applications = await Application.find({ job: { $in: jobIds } })
      .populate('student', 'fullName headline skills studentDetails')
      .sort({ fitScore: -1 }); 

    const formattedApps = applications.map(app => {
      const jobDetails = myJobs.find(j => j._id.toString() === app.job.toString());
      return {
        ...app._doc,
        jobTitle: jobDetails ? jobDetails.title : 'Unknown Role'
      };
    });

    res.json(formattedApps);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch applicants", error: error.message });
  }
};

// @desc    Update Candidate Application Stage (ATS Pipeline)
export const updateApplicationStage = async (req, res) => {
  try {
    const { status } = req.body; 
    const { appId } = req.params;

    if (req.user.role !== 'company') {
      return res.status(403).json({ message: "Only companies can update application stages." });
    }

    const application = await Application.findById(appId);
    if (!application) return res.status(404).json({ message: "Application not found." });

    const job = await Job.findById(application.job);
    if (job.postedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized to update this application." });
    }

    application.status = status;
    await application.save();

    res.json({ message: `Candidate moved to ${status}`, application });
  } catch (error) {
    res.status(500).json({ message: "Failed to update stage", error: error.message });
  }
};

export const getMyApplications = async (req, res) => {
  try {
    const applications = await Application.find({ student: req.user.id })
      .populate({
        path: 'job',
        populate: { path: 'postedBy', select: 'companyDetails fullName' }
      })
      .sort({ appliedAt: -1 });

    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch applications", error: error.message });
  }
};

export const updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body; 
    const application = await Application.findOne({ _id: req.params.id, student: req.user.id });

    if (!application) return res.status(404).json({ message: "Application not found" });

    application.status = status;
    await application.save();

    res.json({ message: `Offer ${status} successfully!`, application });
  } catch (error) {
    res.status(500).json({ message: "Failed to update status", error: error.message });
  }
};

export const getCompanyJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ postedBy: req.user.id }).sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getCompanyApplicants = async (req, res) => {
  try {
    const jobs = await Job.find({ postedBy: req.user.id }).select('_id title');
    const jobIds = jobs.map(j => j._id);
    
    const applicants = await Application.find({ job: { $in: jobIds } })
      .populate('student', 'fullName profileImage studentDetails')
      .populate('job', 'title')
      .sort({ appliedAt: -1 });
      
    res.json(applicants);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const updateApplicationStatusATS = async (req, res) => {
  try {
    const { status } = req.body; 
    const application = await Application.findById(req.params.id);
    
    if (!application) return res.status(404).json({ message: "Application not found" });
    
    application.status = status;
    await application.save();
    
    res.json({ message: `Candidate moved to ${status}`, application });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getMyJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ postedBy: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(jobs);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch jobs", error: error.message });
  }
};

// @desc    Find high-match students for a specific job
export const getJobMatchesForAlumni = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });

    const students = await User.find({ role: 'student', isProfileComplete: true }).populate('projects');
    
    // ✅ UPDATED: Upgraded to Promise.all
    const analyzedStudents = await Promise.all(students.map(async (student) => {
       const analysis = await calculateJobMatch(student, job);
       return {
          student,
          fitScore: analysis.fitScore
       };
    }));

    const matches = analyzedStudents.filter(m => m.fitScore >= 75);
    matches.sort((a, b) => b.fitScore - a.fitScore);
    
    res.status(200).json(matches);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch matches", error: error.message });
  }
};

export const updateJobStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const job = await Job.findById(req.params.id);
    
    if (!job) return res.status(404).json({ message: "Job not found" });
    
    if (job.postedBy.toString() !== req.user.id) {
       return res.status(403).json({ message: "Unauthorized" });
    }

    job.status = status;
    await job.save();
    
    res.json({ message: "Job status updated", job });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};