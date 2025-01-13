import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export interface Analysis {
  id?: string;
  created_at?: string;
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

export async function saveAnalysis(analysis: Omit<Analysis, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('analyses')
    .insert([analysis])
    .select()
    .single();

  if (error) {
    console.error('Error saving analysis:', error);
    throw error;
  }

  return data;
}

export async function getAnalyses() {
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching analyses:', error);
    throw error;
  }

  return data;
}

export async function getAnalysisById(id: string) {
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching analysis:', error);
    throw error;
  }

  return data;
} 