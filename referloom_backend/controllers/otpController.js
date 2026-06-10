import Otp from "../models/Otp.js";
import User from "../models/User.js";
import { sendEmail } from "../utils/sendEmail.js";
// Import your OTP generator and email service (e.g., Nodemailer) here
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists. Please log in." });
    }
    
    
    // 1. Generate OTP (using your provided generator)
    const otpCode = generateOTP(); 
    
    // 2. Save to database with a 10-minute expiration
    const newOtp = new Otp({
      email,
      otp: otpCode, // Note: In a production app, bcrypt hash this before saving
      expiresAt: new Date(Date.now() + 10 * 60000) // 10 minutes from now
    });
    
    await newOtp.save();

    // 3. TODO: Send via Nodemailer or your preferred email service
    // await sendEmail(email, "Your Referloom Verification Code", `Your code is: ${otpCode}`);
    const message = `Welcome to Referloom! Your verification code is: ${otpCode}. It will expire in 10 minutes.`;
await sendEmail({
  email: email,
  subject: "Your Referloom Verification Code",
  message: message,
});
    console.log(`[DEV] OTP for ${email}: ${otpCode}`); // For testing

    res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error sending OTP", error: error.message });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const otpRecord = await Otp.findOne({ email }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({ message: "No OTP found for this email." });
    }

    if (otpRecord.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP." });
    }

    if (otpRecord.expiresAt < new Date()) {
      return res.status(400).json({ message: "OTP has expired." });
    }

    // ❌ REMOVE THIS: await User.findOneAndUpdate({ email }, { isVerified: true });
    // The user hasn't been created yet in your frontend flow!

    // Delete the used OTP record for security
    await Otp.deleteMany({ email });

    // ✅ Just return success so the frontend can proceed to call /auth/register
    res.status(200).json({ message: "Email verified successfully." });
  } catch (error) {
    res.status(500).json({ message: "Error verifying OTP", error: error.message });
  }
};