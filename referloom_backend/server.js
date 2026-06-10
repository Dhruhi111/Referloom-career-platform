import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import path from "path";

// Route Imports
import authRoutes from "./routes/authRoutes.js";
import otpRoutes from "./routes/otpRoutes.js"; 
import projectRoutes from "./routes/projectRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import mentorshipRoutes from "./routes/mentorshipRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import referralRoutes from "./routes/referralRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import collabRoutes from './routes/collabRoutes.js';

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

// Static folder for file uploads
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/otp", otpRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/users", userRoutes);
app.use("/api/mentorship", mentorshipRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/referrals", referralRoutes);
app.use("/api/upload", uploadRoutes);
app.use('/api/collab', collabRoutes);

app.get("/", (req, res) => {
  res.send("Referloom API is running...");
});

// Ensure your .env file has a PORT defined, otherwise defaults to 5000
const PORT = process.env.PORT || 5001; 
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));