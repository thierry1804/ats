import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import natural from 'natural';
import fs from 'fs/promises';
import path from 'path';
import { analyzeWithGemini, analyzeMultipleResumes } from './geminiAnalyzer';
import SkillsDatabaseManager from './skillsDatabase';
import { calculateJaroWinklerDistance } from './utils/stringDistance';

const tokenizer = new natural.WordTokenizer();
const TfIdf = natural.TfIdf;

interface SkillMatch {
  skill: string;
  found: string;  // Le terme exact trouvé dans le CV
  category: string;
  confidence: number;
}

interface ExperienceMatch {
  role: string;
  duration: number;  // en mois
  relevance: number;
  keywords: string[];
}

interface EducationMatch {
  degree: string;
  field: string;
  relevance: number;
}

interface DetailedAnalysisResults {
  matchScore: number;
  skillMatches: SkillMatch[];
  missingSkills: string[];
  experienceMatches: ExperienceMatch[];
  educationMatches: EducationMatch[];
  locationInfo: {
    candidateLocation?: string;
    jobLocation?: string;
    isRemote?: boolean;
    distanceMatch?: number;
  };
  redFlags: string[];
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

// Regex patterns pour l'extraction d'informations
const PATTERNS = {
  email: /[\w.-]+@[\w.-]+\.\w+/g,
  phone: /(\+\d{1,3}[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}/g,
  date: /(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}/gi,
  duration: /(\d+)\s*(?:year|yr|month|mo)s?\b/gi,
  location: /(?:based in|located in|remote from)\s+([^,\n]+)(?:,\s*([^,\n]+))?/i
};

export async function extractTextFromFile(input: string | Buffer, filename?: string): Promise<string> {
  try {
    let dataBuffer: Buffer;
    let ext = '';

    if (typeof input === 'string') {
      dataBuffer = await fs.readFile(input);
      ext = path.extname(input).toLowerCase();
    } else {
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

function extractStructuredInformation(text: string): {
  skills: string[];
  experience: { role: string; duration: string; description: string }[];
  education: { degree: string; field: string; institution: string }[];
  contact: { email?: string; phone?: string; location?: string };
} {
  const lines = text.split('\n').map(line => line.trim());
  const sections: { [key: string]: string[] } = {
    skills: [],
    experience: [],
    education: [],
    contact: []
  };

  let currentSection = '';
  
  // Identifier les sections
  for (const line of lines) {
    if (line.length === 0) continue;

    const normalizedLine = line.toLowerCase();
    if (normalizedLine.includes('skills') || normalizedLine.includes('competences')) {
      currentSection = 'skills';
    } else if (normalizedLine.includes('experience') || normalizedLine.includes('employment')) {
      currentSection = 'experience';
    } else if (normalizedLine.includes('education') || normalizedLine.includes('formation')) {
      currentSection = 'education';
    } else if (normalizedLine.includes('contact') || normalizedLine.match(PATTERNS.email)) {
      currentSection = 'contact';
    } else if (currentSection) {
      sections[currentSection].push(line);
    }
  }

  // Extraire les informations structurées
  const skills = extractSkills(sections.skills.join('\n'));
  const experience = extractExperience(sections.experience.join('\n'));
  const education = extractEducation(sections.education.join('\n'));
  const contact = extractContactInfo(sections.contact.join('\n'));

  return {
    skills,
    experience,
    education,
    contact
  };
}

function extractSkills(text: string): string[] {
  const skillsManager = SkillsDatabaseManager.getInstance();
  const words = tokenizer.tokenize(text.toLowerCase()) || [];
  const skills = new Set<string>();

  for (const word of words) {
    // Vérifier si le mot est une compétence connue ou un synonyme
    const category = skillsManager.getCategoryForSkill(word);
    if (category) {
      skills.add(word);
      // Ajouter les synonymes connus
      const synonyms = skillsManager.findSynonyms(word);
      synonyms.forEach(syn => skills.add(syn));
    }
  }

  return Array.from(skills);
}

function extractExperience(text: string): { role: string; duration: string; description: string }[] {
  const experiences: { role: string; duration: string; description: string }[] = [];
  const experienceBlocks = text.split(/\n{2,}/);

  for (const block of experienceBlocks) {
    const lines = block.split('\n');
    if (lines.length < 2) continue;

    const role = lines[0].trim();
    const durationMatch = block.match(PATTERNS.duration);
    const duration = durationMatch ? durationMatch[0] : '';
    const description = lines.slice(1).join('\n').trim();

    if (role && description) {
      experiences.push({ role, duration, description });
    }
  }

  return experiences;
}

function extractEducation(text: string): { degree: string; field: string; institution: string }[] {
  const education: { degree: string; field: string; institution: string }[] = [];
  const educationBlocks = text.split(/\n{2,}/);

  for (const block of educationBlocks) {
    const lines = block.split('\n');
    if (lines.length < 2) continue;

    const degreeMatch = lines[0].match(/([^,]+),\s*([^,]+)/);
    if (degreeMatch) {
      education.push({
        degree: degreeMatch[1].trim(),
        field: degreeMatch[2].trim(),
        institution: lines[1].trim()
      });
    }
  }

  return education;
}

function extractContactInfo(text: string): { email?: string; phone?: string; location?: string } {
  const contact: { email?: string; phone?: string; location?: string } = {};

  const emailMatch = text.match(PATTERNS.email);
  if (emailMatch) {
    contact.email = emailMatch[0];
  }

  const phoneMatch = text.match(PATTERNS.phone);
  if (phoneMatch) {
    contact.phone = phoneMatch[0];
  }

  const locationMatch = text.match(PATTERNS.location);
  if (locationMatch) {
    contact.location = locationMatch[1];
  }

  return contact;
}

function calculateSkillScore(requiredSkills: string[], candidateSkills: string[]): {
  score: number;
  matches: SkillMatch[];
  missing: string[];
} {
  const skillsManager = SkillsDatabaseManager.getInstance();
  const matches: SkillMatch[] = [];
  const missing: string[] = [];
  let totalScore = 0;
  let maxPossibleScore = requiredSkills.length * 100;

  for (const requiredSkill of requiredSkills) {
    let bestMatch: SkillMatch | null = null;

    for (const candidateSkill of candidateSkills) {
      if (skillsManager.isSkillEquivalent(requiredSkill, candidateSkill)) {
        const category = skillsManager.getCategoryForSkill(requiredSkill) || 'Unknown';
        const confidence = requiredSkill.toLowerCase() === candidateSkill.toLowerCase() ? 1 :
          skillsManager.findSynonyms(requiredSkill).includes(candidateSkill.toLowerCase()) ? 0.9 : 0.8;

        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = {
            skill: requiredSkill,
            found: candidateSkill,
            category,
            confidence
          };
        }
      }
    }

    if (bestMatch) {
      matches.push(bestMatch);
      totalScore += bestMatch.confidence * 100;
    } else {
      missing.push(requiredSkill);
    }
  }

  return {
    score: Math.round((totalScore / maxPossibleScore) * 100),
    matches,
    missing
  };
}

function calculateExperienceScore(
  requiredExperience: { role: string; minYears?: number; requirements?: string[] }[],
  candidateExperience: { role: string; duration: string; description: string }[]
): {
  score: number;
  matches: ExperienceMatch[];
} {
  const matches: ExperienceMatch[] = [];
  let totalScore = 0;
  let maxPossibleScore = requiredExperience.length * 100;

  for (const required of requiredExperience) {
    let bestMatch: ExperienceMatch | null = null;
    const requiredKeywords = required.requirements || [];

    for (const candidate of candidateExperience) {
      // Calculer la pertinence du rôle
      const roleRelevance = calculateJaroWinklerDistance(
        required.role.toLowerCase(),
        candidate.role.toLowerCase()
      );

      // Extraire la durée en mois
      const durationMatch = candidate.duration.match(/(\d+)\s*(year|yr|month|mo)/i);
      const durationInMonths = durationMatch ? 
        (durationMatch[2].startsWith('y') ? parseInt(durationMatch[1]) * 12 : parseInt(durationMatch[1])) : 0;

      // Vérifier les mots-clés requis
      const foundKeywords = requiredKeywords.filter(keyword => 
        candidate.description.toLowerCase().includes(keyword.toLowerCase())
      );

      const keywordScore = requiredKeywords.length > 0 ?
        (foundKeywords.length / requiredKeywords.length) : 1;

      const matchScore = (
        roleRelevance * 0.4 +
        (required.minYears ? Math.min(durationInMonths / (required.minYears * 12), 1) : 1) * 0.3 +
        keywordScore * 0.3
      ) * 100;

      if (!bestMatch || matchScore > bestMatch.relevance) {
        bestMatch = {
          role: candidate.role,
          duration: durationInMonths,
          relevance: matchScore,
          keywords: foundKeywords
        };
      }
    }

    if (bestMatch) {
      matches.push(bestMatch);
      totalScore += bestMatch.relevance;
    }
  }

  return {
    score: Math.round(totalScore / maxPossibleScore * 100),
    matches
  };
}

function calculateEducationScore(
  requiredEducation: { degree: string; field: string }[],
  candidateEducation: { degree: string; field: string; institution: string }[]
): {
  score: number;
  matches: EducationMatch[];
} {
  const matches: EducationMatch[] = [];
  let totalScore = 0;
  let maxPossibleScore = requiredEducation.length * 100;

  for (const required of requiredEducation) {
    let bestMatch: EducationMatch | null = null;

    for (const candidate of candidateEducation) {
      const degreeRelevance = calculateJaroWinklerDistance(
        required.degree.toLowerCase(),
        candidate.degree.toLowerCase()
      );

      const fieldRelevance = calculateJaroWinklerDistance(
        required.field.toLowerCase(),
        candidate.field.toLowerCase()
      );

      const matchScore = (degreeRelevance * 0.6 + fieldRelevance * 0.4) * 100;

      if (!bestMatch || matchScore > bestMatch.relevance) {
        bestMatch = {
          degree: candidate.degree,
          field: candidate.field,
          relevance: matchScore
        };
      }
    }

    if (bestMatch) {
      matches.push(bestMatch);
      totalScore += bestMatch.relevance;
    }
  }

  return {
    score: Math.round(totalScore / maxPossibleScore * 100),
    matches
  };
}

function detectRedFlags(
  candidateInfo: {
    experience: { role: string; duration: string; description: string }[];
    education: { degree: string; field: string; institution: string }[];
  }
): string[] {
  const redFlags: string[] = [];

  // Vérifier les trous dans l'expérience
  const experiences = candidateInfo.experience
    .map(exp => {
      const durationMatch = exp.duration.match(/(\d+)\s*(year|yr|month|mo)/i);
      return {
        role: exp.role,
        duration: durationMatch ? 
          (durationMatch[2].startsWith('y') ? parseInt(durationMatch[1]) * 12 : parseInt(durationMatch[1])) : 0
      };
    })
    .sort((a, b) => b.duration - a.duration);

  // Détecter les changements fréquents de poste
  const shortTermPositions = experiences.filter(exp => exp.duration < 12);
  if (shortTermPositions.length >= 2) {
    redFlags.push(`${shortTermPositions.length} positions de moins d'un an détectées`);
  }

  // Vérifier la cohérence de l'éducation
  const education = candidateInfo.education;
  if (education.length === 0) {
    redFlags.push('Aucune information sur la formation');
  }

  return redFlags;
}

export async function analyzeResume(
  resumePath: string,
  jobDescription: string,
  jobRequirements?: {
    requiredSkills: string[];
    requiredExperience: { role: string; minYears?: number; requirements?: string[] }[];
    requiredEducation: { degree: string; field: string }[];
    location?: { city: string; remote?: boolean };
  }
): Promise<DetailedAnalysisResults> {
  try {
    // Extraire le texte du CV
    const resumeText = await extractTextFromFile(resumePath);
    
    // Extraire les informations structurées
    const structuredInfo = extractStructuredInformation(resumeText);

    // Analyser les compétences
    const skillsAnalysis = calculateSkillScore(
      jobRequirements?.requiredSkills || extractSkills(jobDescription),
      structuredInfo.skills
    );

    // Analyser l'expérience
    const experienceAnalysis = calculateExperienceScore(
      jobRequirements?.requiredExperience || [],
      structuredInfo.experience
    );

    // Analyser la formation
    const educationAnalysis = calculateEducationScore(
      jobRequirements?.requiredEducation || [],
      structuredInfo.education
    );

    // Détecter les red flags
    const redFlags = detectRedFlags({
      experience: structuredInfo.experience,
      education: structuredInfo.education
    });

    // Calculer le score global
    const weights = {
      skills: 0.4,
      experience: 0.35,
      education: 0.25
    };

    const globalScore = Math.round(
      skillsAnalysis.score * weights.skills +
      experienceAnalysis.score * weights.experience +
      educationAnalysis.score * weights.education
    );

    // Analyse IA
    try {
      const aiAnalysis = await analyzeWithGemini(resumeText, jobDescription);
      
      return {
        matchScore: globalScore,
        skillMatches: skillsAnalysis.matches,
        missingSkills: skillsAnalysis.missing,
        experienceMatches: experienceAnalysis.matches,
        educationMatches: educationAnalysis.matches,
        locationInfo: {
          candidateLocation: structuredInfo.contact.location,
          jobLocation: jobRequirements?.location?.city,
          isRemote: jobRequirements?.location?.remote
        },
        redFlags,
        aiAnalysis: aiAnalysis.aiAnalysis
      };
    } catch (aiError) {
      console.error('AI analysis failed, returning basic analysis:', aiError);
      return {
        matchScore: globalScore,
        skillMatches: skillsAnalysis.matches,
        missingSkills: skillsAnalysis.missing,
        experienceMatches: experienceAnalysis.matches,
        educationMatches: educationAnalysis.matches,
        locationInfo: {
          candidateLocation: structuredInfo.contact.location,
          jobLocation: jobRequirements?.location?.city,
          isRemote: jobRequirements?.location?.remote
        },
        redFlags
      };
    }
  } catch (error) {
    console.error('Resume analysis error:', error);
    throw error;
  }
}

export async function analyzeMultipleCandidates(
  files: { [key: string]: Express.Multer.File },
  jobDescription: string,
  jobRequirements?: {
    requiredSkills: string[];
    requiredExperience: { role: string; minYears?: number; requirements?: string[] }[];
    requiredEducation: { degree: string; field: string }[];
    location?: { city: string; remote?: boolean };
  }
): Promise<any> {
  try {
    const resumes: { [key: string]: string } = {};

    // Traiter chaque fichier de CV
    for (const [candidateName, file] of Object.entries(files)) {
      if (!file.buffer) {
        throw new Error(`Aucun contenu trouvé dans le fichier pour le candidat ${candidateName}`);
      }

      const text = await extractTextFromFile(file.buffer, file.originalname);
      if (!text) {
        throw new Error(`Échec de l'extraction du texte du fichier pour le candidat ${candidateName}`);
      }

      resumes[candidateName] = text;
    }

    // Effectuer l'analyse comparative
    const analysis = await analyzeMultipleResumes(resumes, jobDescription);
    return analysis;

  } catch (error) {
    console.error('Erreur lors de l\'analyse multiple des CV:', error);
    throw error;
  }
}