// referloom_backend/middlewares/upload.js
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// 1. Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 2. Configure Storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'referloom_uploads', // The folder name in your Cloudinary account
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'], // Allow images and resumes/proofs
    transformation: [{ width: 800, height: 800, crop: 'limit' }], // Compress large images
  },
});

const upload = multer({ storage: storage });

export default upload;