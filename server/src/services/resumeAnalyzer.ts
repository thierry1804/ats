import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import natural from 'natural';
import fs from 'fs/promises';
import path from 'path';
import { analyzeWithGemini } from './geminiAnalyzer';
import { saveAnalysis } from './supabaseClient';

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

export async function extractTextFromFile(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  
  try {
    if (ext === '.pdf') {
      const dataBuffer = await fs.readFile(filePath);
      const pdfData = await pdfParse(dataBuffer);
      return pdfData.text;
    } else if (ext === '.doc' || ext === '.docx') {
      const docBuffer = await fs.readFile(filePath);
      const result = await mammoth.extractRawText({ buffer: docBuffer });
      return result.value;
    }
    throw new Error('Unsupported file type');
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
  const keywords = tokens.filter(token => 
    token.length > 2 && 
    !stopwords.includes(token) &&
    /^[a-zA-Z]+$/.test(token)
  );
  
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
      
      const results = {
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

      // Save analysis to Supabase
      await saveAnalysis({
        job_description: jobDescription,
        resume_filename: path.basename(resumePath),
        match_score: results.matchScore,
        missing_keywords: results.missingKeywords,
        strong_matches: results.strongMatches,
        ai_analysis: {
          key_findings: results.aiAnalysis.keyFindings,
          suggested_improvements: results.aiAnalysis.suggestedImprovements,
          skills_analysis: results.aiAnalysis.skillsAnalysis,
          experience_analysis: results.aiAnalysis.experienceAnalysis
        }
      });

      return results;
    } catch (aiError) {
      console.error('AI analysis failed, falling back to basic analysis:', aiError);
      const results = {
        matchScore,
        missingKeywords: missingKeywords.slice(0, 10),
        strongMatches: strongMatches.slice(0, 10)
      };

      // Save basic analysis to Supabase
      await saveAnalysis({
        job_description: jobDescription,
        resume_filename: path.basename(resumePath),
        match_score: results.matchScore,
        missing_keywords: results.missingKeywords,
        strong_matches: results.strongMatches,
        ai_analysis: {
          key_findings: [],
          suggested_improvements: [],
          skills_analysis: {
            technical: [],
            soft: [],
            missing: [],
            recommendations: []
          },
          experience_analysis: {
            strengths: [],
            gaps: [],
            recommendations: []
          }
        }
      });

      return results;
    }
  } catch (error) {
    console.error('Resume analysis error:', error);
    throw error;
  }
} 