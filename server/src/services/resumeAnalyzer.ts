import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import natural from 'natural';
import fs from 'fs/promises';
import path from 'path';
import { analyzeWithGemini, analyzeMultipleResumes } from './geminiAnalyzer';

const tokenizer = new natural.WordTokenizer();
const TfIdf = natural.TfIdf;

interface AnalysisResults {
  matchScore: number;
  missingKeywords: string[];
  strongMatches: string[];
  aiAnalysis?: {
    keyFindings: string[];
    suggestedImprovements: string[];
    skillsAnalysis: {
      technical: string[];
      soft: string[];
      missing: string[];
      recommendations: string[];
    };
    experienceAnalysis: {
      strengths: string[];
      gaps: string[];
      recommendations: string[];
    };
  };
}

export async function extractTextFromFile(input: string | Buffer, filename?: string): Promise<string> {
  try {
    let dataBuffer: Buffer;
    let ext = '';

    if (typeof input === 'string') {
      // Input is a file path
      dataBuffer = await fs.readFile(input);
      ext = path.extname(input).toLowerCase();
    } else {
      // Input is a Buffer
      dataBuffer = input;
      if (!filename) {
        throw new Error('Filename is required when input is a Buffer');
      }
      ext = path.extname(filename).toLowerCase();
    }

    if (ext === '.pdf') {
      const pdfData = await pdfParse(dataBuffer);
      return pdfData.text;
    } else if (ext === '.doc' || ext === '.docx') {
      const result = await mammoth.extractRawText({ buffer: dataBuffer });
      return result.value;
    }
    
    throw new Error(`Unsupported file type: ${ext}`);
  } catch (error) {
    console.error('Text extraction error:', error);
    throw error;
  }
}

function extractKeywords(text: string): string[] {
  const tfidf = new TfIdf();
  tfidf.addDocument(text);
  
  const tokens = tokenizer.tokenize(text.toLowerCase());
  const stopwords = natural.stopwords;
  
  // Filter out stopwords and short words
  const keywords = tokens?.filter(token => 
    token.length > 2 && 
    !stopwords.includes(token) &&
    /^[a-zA-Z]+$/.test(token)
  ) || [];
  
  // Get unique keywords
  return Array.from(new Set(keywords));
}

function calculateMatchScore(resumeKeywords: string[], jobKeywords: string[]): number {
  const matchingKeywords = resumeKeywords.filter(keyword => 
    jobKeywords.includes(keyword)
  );
  
  return Math.round((matchingKeywords.length / jobKeywords.length) * 100);
}

export async function analyzeResume(
  resumePath: string,
  jobDescription: string
): Promise<AnalysisResults> {
  try {
    // Extract text from resume
    const resumeText = await extractTextFromFile(resumePath);
    
    // Basic keyword analysis
    const resumeKeywords = extractKeywords(resumeText);
    const jobKeywords = extractKeywords(jobDescription);
    
    const strongMatches = resumeKeywords.filter(keyword => 
      jobKeywords.includes(keyword)
    );
    
    const missingKeywords = jobKeywords.filter(keyword => 
      !resumeKeywords.includes(keyword)
    );
    
    const matchScore = calculateMatchScore(resumeKeywords, jobKeywords);

    // AI Analysis
    try {
      const aiAnalysis = await analyzeWithGemini(resumeText, jobDescription);
      
      return {
        matchScore: aiAnalysis.matchScore,
        missingKeywords: missingKeywords.slice(0, 10),
        strongMatches: strongMatches.slice(0, 10),
        aiAnalysis: {
          keyFindings: aiAnalysis.aiAnalysis.keyFindings,
          suggestedImprovements: aiAnalysis.aiAnalysis.suggestedImprovements,
          skillsAnalysis: aiAnalysis.aiAnalysis.skillsAnalysis,
          experienceAnalysis: aiAnalysis.aiAnalysis.experienceAnalysis
        }
      };
    } catch (aiError) {
      console.error('AI analysis failed, falling back to basic analysis:', aiError);
      return {
        matchScore,
        missingKeywords: missingKeywords.slice(0, 10),
        strongMatches: strongMatches.slice(0, 10)
      };
    }
  } catch (error) {
    console.error('Resume analysis error:', error);
    throw error;
  }
}

export async function analyzeMultipleCandidates(
  files: { [key: string]: Express.Multer.File },
  jobDescription: string
): Promise<any> {
  try {
    const resumes: { [key: string]: string } = {};

    // Process each resume file
    for (const [candidateName, file] of Object.entries(files)) {
      if (!file.buffer) {
        throw new Error(`No content found in file for candidate ${candidateName}`);
      }

      // Convert file to text using the buffer and filename
      const text = await extractTextFromFile(file.buffer, file.originalname);
      if (!text) {
        throw new Error(`Failed to extract text from file for candidate ${candidateName}`);
      }

      resumes[candidateName] = text;
    }

    // Perform comparative analysis
    const analysis = await analyzeMultipleResumes(resumes, jobDescription);
    return analysis;

  } catch (error) {
    console.error('Error analyzing multiple resumes:', error);
    throw error;
  }
} 