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

interface ComparativeAnalysis {
  candidates: {
    [key: string]: DetailedAnalysis;
  };
  comparison: {
    ranking: string[];
    strengthComparison: string[];
    uniqueStrengths: {
      [key: string]: string[];
    };
    recommendations: string[];
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
      Tu es un expert en recrutement technique et en analyse de CV de haut niveau, spécialisé dans l'évaluation approfondie des correspondances entre les candidats et les postes, avec une expertise particulière dans l'identification des compétences équivalentes et transférables.
      
      CONTEXTE ET OBJECTIF:
      - Analyse méticuleuse de l'adéquation entre le CV fourni et les exigences du poste
      - Évaluation objective basée sur des critères mesurables
      - Identification précise des forces, des équivalences technologiques et des axes d'amélioration
      
      INSTRUCTIONS DÉTAILLÉES:
      1. Analyse des compétences techniques avec équivalences:
         - Évalue la pertinence et le niveau de maîtrise de chaque compétence
         - Identifie les équivalences technologiques (exemples):
           * Git/Github/Gitlab/Bitbucket sont considérés comme équivalents
           * React/Vue/Angular sont des frameworks front-end équivalents
           * MySQL/PostgreSQL/MariaDB sont des SGBD relationnels équivalents
           * PHP/Python/Node.js pour le backend sont souvent interchangeables
         - Compare avec les exigences en considérant les alternatives valables
         - Évalue le potentiel de transfert rapide entre technologies similaires
      
      2. Analyse de l'expérience avec focus technologique:
         - Évalue la progression technique et la capacité d'adaptation
         - Identifie les patterns d'apprentissage et d'adoption de nouvelles technologies
         - Mesure la polyvalence technique à travers les projets
      
      3. Évaluation des mots-clés et équivalences:
         - Analyse la densité des mots-clés et leurs alternatives valables
         - Vérifie l'alignement avec l'écosystème technologique demandé
         - Identifie les termes manquants en tenant compte des équivalences
      
      4. Analyse culturelle et technique:
         - Évalue la culture d'apprentissage et d'adaptation technique
         - Analyse la capacité à adopter de nouvelles technologies
         - Identifie les indicateurs de veille technologique et d'auto-formation
      
      DONNÉES À ANALYSER:
      
      CV:
      ${resumeText}

      Description du poste:
      ${jobDescription}

      CONSIGNES DE FORMATAGE CRITIQUES:
      - Réponse UNIQUEMENT en JSON valide
      - TOUS les tableaux doivent contenir UNIQUEMENT des chaînes de caractères simples
      - PAS d'objets complexes dans les tableaux
      - Pour les compétences techniques, utilisez le format "NomCompétence: Niveau - Détails (Équivalences: X, Y, Z)"
      - Pour les expériences, utilisez le format "Projet/Rôle: Description - Impact - Technologies équivalentes utilisées"
      - Pas de texte avant/après le JSON
      - Utilisation exclusive de guillemets droits (")
      - Échappement correct des caractères spéciaux
      - Pas de virgule après le dernier élément
      - Validation de la structure JSON avant envoi

      EXEMPLE DE FORMAT POUR LES TABLEAUX:
      "technical": [
        "Git: Expert - Maîtrise des workflows Git (Équivalences: Github, Gitlab, Bitbucket)",
        "React: Avancé - Développement front-end moderne (Équivalences: Vue.js, Angular)"
      ]
      "strengths": [
        "Projet E-commerce: Lead Developer - Migration réussie vers nouvelle stack - Adaptation rapide Node.js vers Python",
        "API Gateway: Architecte - Optimisation performance 40% - Expertise transférable microservices"
      ]

      FORMAT DE RÉPONSE REQUIS:
      {
        "matchScore": (score de 0 à 100 basé sur une analyse pondérée incluant les équivalences),
        "missingKeywords": [
          "technologie manquante sans équivalent dans le profil"
        ],
        "strongMatches": [
          "compétence directe ou équivalente parfaitement alignée"
        ],
        "aiAnalysis": {
          "keyFindings": [
            "observation clé sur l'adéquation technique et les équivalences"
          ],
          "suggestedImprovements": [
            "suggestion d'amélioration ou de transition technologique"
          ],
          "skillsAnalysis": {
            "technical": [
              "compétence: niveau - détails (avec équivalences)"
            ],
            "soft": [
              "compétence d'adaptation technique - contexte"
            ],
            "missing": [
              "compétence manquante - impact (après considération des équivalences)"
            ],
            "recommendations": [
              "recommandation de montée en compétence ou transition"
            ]
          },
          "experienceAnalysis": {
            "strengths": [
              "expérience pertinente - impact - technologies équivalentes"
            ],
            "gaps": [
              "lacune identifiée - contexte - possibilités de transition"
            ],
            "recommendations": [
              "recommandation pour combler les lacunes techniques"
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

export async function analyzeMultipleResumes(
  resumes: { [key: string]: string },
  jobDescription: string
): Promise<ComparativeAnalysis> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // Analyze each resume individually
    const individualAnalyses: { [key: string]: DetailedAnalysis } = {};
    for (const [candidateName, resumeText] of Object.entries(resumes)) {
      const analysis = await analyzeWithGemini(resumeText, jobDescription);
      individualAnalyses[candidateName] = analysis;
    }

    // Perform comparative analysis
    const comparativePrompt = `
      Tu es un expert en recrutement technique chargé de comparer plusieurs candidats pour un même poste.
      Analyse et compare les profils suivants de manière objective et détaillée.

      Description du poste:
      ${jobDescription}

      Analyses individuelles des candidats:
      ${JSON.stringify(individualAnalyses, null, 2)}

      INSTRUCTIONS:
      1. Compare les candidats de manière objective
      2. Identifie les forces uniques de chaque candidat
      3. Établis un classement basé sur l'adéquation globale
      4. Fournis des recommandations pour le processus de sélection

      IMPORTANT - FORMAT DE RÉPONSE:
      - Utilise UNIQUEMENT des chaînes de caractères simples dans les tableaux
      - Pour le ranking, utilise le format: "NomCandidat: Score - Raison"
      - Pas d'objets imbriqués dans les tableaux
      - Pas de virgule après le dernier élément

      FORMAT DE RÉPONSE REQUIS (JSON):
      {
        "ranking": [
          "NomCandidat: Score - Raison du classement"
        ],
        "strengthComparison": [
          "Comparaison détaillée entre Candidat1 et Candidat2: forces et faiblesses"
        ],
        "uniqueStrengths": {
          "NomCandidat": [
            "Force unique spécifique au candidat"
          ]
        },
        "recommendations": [
          "Recommandation générale pour le processus de sélection"
        ]
      }

      EXEMPLE DE FORMAT VALIDE:
      {
        "ranking": [
          "Jean Dupont: 85 - Excellente expérience technique",
          "Marie Martin: 75 - Bonnes compétences transférables"
        ],
        "strengthComparison": [
          "Jean montre plus d'expérience en backend, Marie excelle en frontend",
          "Les deux candidats maîtrisent bien les principes DevOps"
        ],
        "uniqueStrengths": {
          "Jean Dupont": [
            "Expert en architecture microservices",
            "Certification AWS avancée"
          ],
          "Marie Martin": [
            "Spécialiste React/Redux",
            "Expérience en UX design"
          ]
        },
        "recommendations": [
          "Considérer les deux profils pour des rôles complémentaires",
          "Approfondir les connaissances en architecture système lors des entretiens"
        ]
      }
    `;

    const comparisonResult = await model.generateContent(comparativePrompt);
    const comparisonResponse = await comparisonResult.response;
    const comparisonText = comparisonResponse.text();
    
    try {
      const cleanedText = cleanJsonResponse(comparisonText);
      const comparisonData = JSON.parse(cleanedText);

      return {
        candidates: individualAnalyses,
        comparison: comparisonData
      };
    } catch (error) {
      console.error('Failed to parse comparative analysis:', error);
      console.error('Raw comparison response:', comparisonText);
      throw new Error('Invalid comparison response format');
    }
  } catch (error) {
    console.error('Multiple resume analysis error:', error);
    throw error;
  }
} 