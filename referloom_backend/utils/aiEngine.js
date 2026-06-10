// referloom_backend/utils/aiEngine.js
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

// 🧠 1. Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// We use 1.5-flash because it is extremely fast and natively supports JSON outputs
const model = genAI.getGenerativeModel({ 
  model: "gemini-1.5-flash",
  generationConfig: { responseMimeType: "application/json" }
});

// ==========================================
// 🛡️ ORIGINAL LOGIC (THE FALLBACKS)
// ==========================================
const normalize = (str) => str?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
const INDUSTRY_STANDARDS = { /* ... (Your existing standards) ... */ };
const getUserTextCorpus = (user) => { /* ... (Your existing normalizer) ... */ return ""; };

// Rename your original functions so they act as a safety net
const calculateProfileStrengthFallback = (user) => {
  // (Your original static logic goes here - returning { score, suggestions })
  return { score: 50, suggestions: ["Complete your profile.", "Add more projects."] }; 
};

const calculateJobMatchFallback = (user, job) => {
  // (Your original static logic goes here)
  return { fitScore: 50, suggestions: ["Review the job requirements."] };
};

const generateCareerRoadmapFallback = (user) => {
  // (Your original static logic goes here)
  return ["Add more skills to your profile.", "Build a foundational project."];
};


// ==========================================
// 🔥 FEATURE 1: GEMINI PROFILE STRENGTH
// ==========================================
export const calculateProfileStrength = async (user) => {
  try {
    const prompt = `
      You are an expert tech recruiter AI. Analyze the following student profile and calculate a profile strength score (0-100) based on how well their skills, projects, and experience align with their career preferences.
      Provide exactly 3 highly specific, actionable suggestions to improve their profile.
      
      Student Data:
      Headline: ${user.headline || 'None'}
      Bio: ${user.bio || 'None'}
      Skills: ${JSON.stringify(user.studentDetails?.skills || [])}
      Career Goals: ${JSON.stringify(user.studentDetails?.careerPreferences || {})}
      Projects: ${JSON.stringify(user.projects || [])}
      Experience: ${JSON.stringify(user.studentDetails?.experience || [])}

      Return ONLY a valid JSON object in this exact structure:
      {
        "score": 85,
        "suggestions": ["Suggestion 1", "Suggestion 2", "Suggestion 3"]
      }
    `;

    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text());

  } catch (error) {
    console.error("Gemini AI Error (Profile):", error.message);
    return calculateProfileStrengthFallback(user); // Failsafe
  }
};


// ==========================================
// 🚀 FEATURE 2: GEMINI JOB MATCH CALCULATOR
// ==========================================
export const calculateJobMatch = async (user, job) => {
  try {
    const prompt = `
      You are a strict applicant tracking system (ATS) AI. Compare the candidate's profile against the job requirements.
      Calculate a fitScore (0-99). Look for deep, implicit matches (e.g., if a job requires 'backend' and the user built a 'Node.js API', give them credit).
      Provide 2 short, specific suggestions on why they match or what they are missing.

      Candidate Data:
      Skills: ${JSON.stringify(user.studentDetails?.skills || [])}
      Projects: ${JSON.stringify(user.projects || [])}
      Experience: ${JSON.stringify(user.studentDetails?.experience || [])}

      Job Data:
      Title: ${job.title}
      Type: ${job.jobType}
      Requirements: ${JSON.stringify(job.requirements || [])}
      Description: ${job.description}

      Return ONLY a valid JSON object in this exact structure:
      {
        "fitScore": 92,
        "suggestions": ["Reason 1", "Reason 2"]
      }
    `;

    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text());

  } catch (error) {
    console.error("Gemini AI Error (Job Match):", error.message);
    return calculateJobMatchFallback(user, job);
  }
};


// ==========================================
// 🗺️ FEATURE 3: GEMINI CAREER ROADMAP
// ==========================================
export const generateCareerRoadmap = async (user) => {
  try {
    const prompt = `
      You are an elite career mentor for software engineers. Look at this student's current profile and their target career goals.
      Generate a 4-step actionable roadmap outlining exactly what they need to learn, build, or do next to land a job in their target field.
      Keep each step under 2 sentences.

      Target Goals: ${JSON.stringify(user.studentDetails?.careerPreferences?.fields || [])}
      Current Skills: ${JSON.stringify(user.studentDetails?.skills || [])}
      Current Projects: ${JSON.stringify(user.projects || [])}

      Return ONLY a valid JSON array of strings in this exact structure:
      [
        "Step 1: ...",
        "Step 2: ...",
        "Step 3: ...",
        "Step 4: ..."
      ]
    `;

    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text());

  } catch (error) {
    console.error("Gemini AI Error (Roadmap):", error.message);
    return generateCareerRoadmapFallback(user);
  }
};