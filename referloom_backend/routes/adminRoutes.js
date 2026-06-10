import express from "express";
import { getPendingUsers, verifyUser } from "../controllers/adminController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Admin views pending verifications
router.get("/pending", protect, getPendingUsers);

// Admin verifies a user
router.put("/verify/:id", protect, verifyUser);

export default router;