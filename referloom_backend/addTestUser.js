import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./models/User.js"; // adjust path if needed

// MongoDB Atlas connection string
const MONGO_URI = "mongodb+srv://ishitaamin3094_db_user:Ruj9JbvTLrjqlDWo@cluster0.xin4mpf.mongodb.net/?appName=Cluster0";

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB connected!"))
  .catch((err) => console.log("MongoDB connection error:", err));

const createTestUsers = async () => {
  try {
    const hashedPassword = await bcrypt.hash("123456", 10);

    const users = [
      {
        role: "student",
        fullName: "Test Student",
        email: "test@student.com",
        phone: "9998887776",
        password: hashedPassword,
        student: { enrollmentNo: "S12345", semester: "5", branch: "CSE" },
      },
      {
        role: "alumni",
        fullName: "Test Alumni",
        email: "test@alumni.com",
        phone: "8887776665",
        password: hashedPassword,
        alumni: { fullName: "Test Alumni", graduationYear: 2020, degreeProof: "test_degree.jpg" },
      },
      {
        role: "company",
        fullName: "Test Company",
        email: "test@company.com",
        phone: "7776665554",
        password: hashedPassword,
        company: { companyName: "Test Company Pvt Ltd", designation: "HR", idProof: "test_id.jpg" },
      },
    ];

    for (const u of users) {
      const exists = await User.findOne({ email: u.email });
      if (!exists) {
        await User.create(u);
        console.log(`Created test user: ${u.role} -> ${u.email}`);
      } else {
        console.log(`User already exists: ${u.role} -> ${u.email}`);
      }
    }

    console.log("All test users processed!");
    process.exit(0);
  } catch (error) {
    console.error("Error adding test users:", error);
    process.exit(1);
  }
};

createTestUsers();
