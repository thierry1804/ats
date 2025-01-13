import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

export interface AnalysisResults {
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

export interface Analysis {
  id: string;
  created_at: string;
  job_description: string;
  resume_filename: string;
  match_score: number;
  missing_keywords: string[];
  strong_matches: string[];
  ai_analysis: {
    key_findings: string[];
    suggested_improvements: string[];
    skills_analysis: {
      technical: string[];
      soft: string[];
      missing: string[];
      recommendations: string[];
    };
    experience_analysis: {
      strengths: string[];
      gaps: string[];
      recommendations: string[];
    };
  };
}

export async function analyzeResume(
  file: File,
  jobDescription: string
): Promise<AnalysisResults> {
  const formData = new FormData();
  formData.append('resume', file);
  formData.append('jobDescription', jobDescription);

  const response = await fetch(`${API_URL}/analyze`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to analyze resume');
  }

  return response.json();
}

export async function generateOptimizedPDF(
  file: File,
  analysisResults: AnalysisResults
): Promise<Blob> {
  const formData = new FormData();
  formData.append('resume', file);
  formData.append('analysisResults', JSON.stringify(analysisResults));

  const response = await fetch(`${API_URL}/generate-pdf`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to generate PDF');
  }

  return response.blob();
}

export async function getAnalyses(): Promise<Analysis[]> {
  const response = await axios.get(`${API_URL}/analyses`);
  return response.data;
}

export async function getAnalysisById(id: string): Promise<Analysis> {
  const response = await axios.get(`${API_URL}/analyses/${id}`);
  return response.data;
} 