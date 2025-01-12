import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface DetailedAnalysis {
  relevanceScore: number;
  keyFindings: string[];
  suggestedImprovements: string[];
  skillsAnalysis: {
    technical: string[];
    soft: string[];
    missing: string[];
  };
  experienceAnalysis: {
    strengths: string[];
    gaps: string[];
  };
}

function cleanJsonResponse(text: string): string {
  // Remove markdown code blocks if present
  let cleanText = text.replace(/```json\n?/gi, '').replace(/```\n?/g, '');
  
  // Remove any leading/trailing whitespace
  cleanText = cleanText.trim();
  
  // If the text starts with a newline, remove it
  cleanText = cleanText.replace(/^\n+/, '');
  
  return cleanText;
}

export async function analyzeWithGemini(
  resumeText: string,
  jobDescription: string
): Promise<DetailedAnalysis> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `
      You are an ATS (Applicant Tracking System) expert. Analyze the following resume and job description.
      Return ONLY a JSON response (no markdown, no explanations) in the exact format shown below:

      Resume text:
      ${resumeText}

      Job Description:
      ${jobDescription}

      Required JSON format (maintain this exact structure):
      {
        "relevanceScore": (number between 0-100),
        "keyFindings": [(3-5 key findings as strings)],
        "suggestedImprovements": [(3-5 specific improvements as strings)],
        "skillsAnalysis": {
          "technical": [(relevant technical skills found in resume)],
          "soft": [(relevant soft skills found in resume)],
          "missing": [(important skills from job description not found in resume)]
        },
        "experienceAnalysis": {
          "strengths": [(3-4 strong matches between experience and job requirements)],
          "gaps": [(3-4 areas where experience doesn't meet job requirements)]
        }
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    try {
      // Clean the response text before parsing
      const cleanedText = cleanJsonResponse(text);
      console.log('Cleaned JSON response:', cleanedText);
      return JSON.parse(cleanedText) as DetailedAnalysis;
    } catch (error) {
      console.error('Failed to parse Gemini response:', error);
      console.error('Raw response:', text);
      throw new Error('Invalid response format from AI');
    }
  } catch (error) {
    console.error('Gemini analysis error:', error);
    throw error;
  }
} 