import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Gemini AI with API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface DetailedAnalysis {
  matchScore: number;
  missingKeywords: string[];
  strongMatches: string[];
  aiAnalysis: {
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

function cleanJsonResponse(text: string): string {
  // Remove any text before the first {
  const startIndex = text.indexOf('{');
  if (startIndex === -1) {
    throw new Error('No JSON object found in response');
  }
  
  // Remove any text after the last }
  const endIndex = text.lastIndexOf('}');
  if (endIndex === -1) {
    throw new Error('Invalid JSON format: missing closing brace');
  }
  
  // Extract just the JSON part
  const jsonText = text.substring(startIndex, endIndex + 1);
  
  // Remove any markdown code block markers
  return jsonText.replace(/```json\n?|```\n?/g, '').trim();
}

function validateAnalysisResponse(data: any): DetailedAnalysis {
  // Check if all required fields are present
  const requiredFields = [
    'matchScore',
    'missingKeywords',
    'strongMatches',
    'aiAnalysis'
  ];

  for (const field of requiredFields) {
    if (!(field in data)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Validate matchScore
  if (typeof data.matchScore !== 'number' || data.matchScore < 0 || data.matchScore > 100) {
    throw new Error('matchScore must be a number between 0 and 100');
  }

  // Validate arrays
  const arrayFields = ['missingKeywords', 'strongMatches'];
  for (const field of arrayFields) {
    if (!Array.isArray(data[field])) {
      throw new Error(`${field} must be an array`);
    }
    if (!data[field].every(item => typeof item === 'string')) {
      throw new Error(`All items in ${field} must be strings`);
    }
  }

  // Validate aiAnalysis
  if (typeof data.aiAnalysis !== 'object' || data.aiAnalysis === null) {
    throw new Error('aiAnalysis must be an object');
  }

  // Validate aiAnalysis fields
  const aiAnalysisFields = ['keyFindings', 'suggestedImprovements'];
  for (const field of aiAnalysisFields) {
    if (!Array.isArray(data.aiAnalysis[field])) {
      throw new Error(`aiAnalysis.${field} must be an array`);
    }
    if (!data.aiAnalysis[field].every(item => typeof item === 'string')) {
      throw new Error(`All items in aiAnalysis.${field} must be strings`);
    }
  }

  // Validate skillsAnalysis
  const skillsFields = ['technical', 'soft', 'missing', 'recommendations'];
  for (const field of skillsFields) {
    if (!Array.isArray(data.aiAnalysis.skillsAnalysis[field])) {
      throw new Error(`aiAnalysis.skillsAnalysis.${field} must be an array`);
    }
    if (!data.aiAnalysis.skillsAnalysis[field].every(item => typeof item === 'string')) {
      throw new Error(`All items in aiAnalysis.skillsAnalysis.${field} must be strings`);
    }
  }

  // Validate experienceAnalysis
  const expFields = ['strengths', 'gaps', 'recommendations'];
  for (const field of expFields) {
    if (!Array.isArray(data.aiAnalysis.experienceAnalysis[field])) {
      throw new Error(`aiAnalysis.experienceAnalysis.${field} must be an array`);
    }
    if (!data.aiAnalysis.experienceAnalysis[field].every(item => typeof item === 'string')) {
      throw new Error(`All items in aiAnalysis.experienceAnalysis.${field} must be strings`);
    }
  }

  return data as DetailedAnalysis;
}

export async function analyzeWithGemini(
  resumeText: string,
  jobDescription: string
): Promise<DetailedAnalysis> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `
      Tu es un expert en recrutement et en analyse de CV avec plus de 20 ans d'expérience.
      Analyse en détail le CV et la description du poste fournis ci-dessous.
      Fournis une analyse APPROFONDIE et des recommandations SPÉCIFIQUES et ACTIONNABLES.

      CV à analyser:
      ${resumeText}

      Description du poste:
      ${jobDescription}

      IMPORTANT: 
      1. Ta réponse doit être UNIQUEMENT un objet JSON valide, sans aucun texte avant ou après.
      2. N'utilise PAS de blocs de code markdown.
      3. Utilise UNIQUEMENT des guillemets droits (") pour les chaînes JSON, PAS de guillemets français ("") ou d'apostrophes ('').
      4. Assure-toi que chaque chaîne de caractères est correctement échappée.
      5. Ne mets PAS de virgule après le dernier élément d'un tableau ou d'un objet.
      6. Vérifie que ton JSON est valide avant de le renvoyer.

      Format exact requis (respecte STRICTEMENT ce format):

      {
        "matchScore": (nombre entre 0 et 100),
        "missingKeywords": [
          "mot-clé manquant 1",
          "mot-clé manquant 2"
        ],
        "strongMatches": [
          "correspondance forte 1",
          "correspondance forte 2"
        ],
        "aiAnalysis": {
          "keyFindings": [
            "observation clé 1",
            "observation clé 2"
          ],
          "suggestedImprovements": [
            "amélioration suggérée 1",
            "amélioration suggérée 2"
          ],
          "skillsAnalysis": {
            "technical": [
              "compétence technique 1",
              "compétence technique 2"
            ],
            "soft": [
              "soft skill 1",
              "soft skill 2"
            ],
            "missing": [
              "compétence manquante 1",
              "compétence manquante 2"
            ],
            "recommendations": [
              "recommandation 1",
              "recommandation 2"
            ]
          },
          "experienceAnalysis": {
            "strengths": [
              "point fort 1",
              "point fort 2"
            ],
            "gaps": [
              "lacune 1",
              "lacune 2"
            ],
            "recommendations": [
              "recommandation 1",
              "recommandation 2"
            ]
          }
        }
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    try {
      const cleanedText = cleanJsonResponse(text);
      const parsedData = JSON.parse(cleanedText);
      const validatedData = validateAnalysisResponse(parsedData);
      return validatedData;
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