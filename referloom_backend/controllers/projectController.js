// referloom_backend/controllers/projectController.js
import Project from "../models/Project.js";
import User from "../models/User.js";

// @desc    Create a new Project
// @route   POST /api/projects
export const createProject = async (req, res) => {
  try {
    const { title, description, tags, githubUrl, liveUrl, image } = req.body;
    const studentId = req.user.id;

    if (req.user.role !== 'student') {
      return res.status(403).json({ message: "Only students can upload projects." });
    }

    // Create the project
    const project = await Project.create({
      student: studentId,
      title,
      description,
      technologies: tags, // Frontend sends 'tags', we save as 'technologies'
      github: githubUrl,
      live: liveUrl,
      image
    });

    // Link project to the User's profile
    await User.findByIdAndUpdate(studentId, {
      $push: { projects: project._id }
    });

    res.status(201).json({ message: "Project uploaded successfully", project });
  } catch (error) {
    res.status(500).json({ message: "Failed to upload project", error: error.message });
  }
};

// @desc    Update an existing project
// @route   PUT /api/projects/:id
export const updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Security Check: Ensure the logged-in user actually owns this project
    if (project.student.toString() !== req.user.id) {
      return res.status(401).json({ message: "Not authorized to update this project" });
    }

    const { title, description, github, live, technologies, tags } = req.body;

    // Update the text fields
    if (title) project.title = title;
    if (description !== undefined) project.description = description;
    if (github !== undefined) project.github = github;
    if (live !== undefined) project.live = live;

    // Update the arrays (the frontend sends the split comma-separated array)
    if (technologies) project.technologies = technologies;
    if (tags) project.tags = tags;

    const updatedProject = await project.save();
    
    res.status(200).json({ message: "Project updated successfully", project: updatedProject });
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get Project Details
// @route   GET /api/projects/:id
export const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Delete a project
// @route   DELETE /api/projects/:id
export const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Security Check: Ensure the logged-in user actually owns this project
    if (project.student.toString() !== req.user.id) {
      return res.status(401).json({ message: "Not authorized to delete this project" });
    }

    await project.deleteOne();
    
    res.status(200).json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getMyProjects = async (req, res) => {
  try {
    // Find all projects where the 'student' field matches the logged-in user's ID
    const projects = await Project.find({ student: req.user.id }).sort({ createdAt: -1 });
    
    res.status(200).json(projects);
  } catch (error) {
    console.error("Error fetching my projects:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};