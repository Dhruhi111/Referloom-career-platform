// referloom_backend/routes/uploadRoutes.js
import express from 'express';
import upload from '../middlewares/upload.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// @desc    Upload a single file and return the secure Cloudinary URL
// @route   POST /api/upload
router.post('/', protect, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // req.file.path contains the secure Cloudinary URL!
    res.status(200).json({ 
      message: 'File uploaded successfully', 
      url: req.file.path 
    });
  } catch (error) {
    res.status(500).json({ message: 'File upload failed', error: error.message });
  }
});

export default router;