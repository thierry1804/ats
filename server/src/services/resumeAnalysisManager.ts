import TextExtractor from './textExtractor';
import SkillsAnalyzer from './skillsAnalyzer';
import ExperienceAnalyzer from './experienceAnalyzer';
import EducationAnalyzer from './educationAnalyzer';
import LocationAnalyzer from './locationAnalyzer';
import RedFlagAnalyzer from './redFlagAnalyzer';
import CustomCriteriaAnalyzer from './customCriteriaAnalyzer';
import { SkillAnalysis } from './skillsAnalyzer';
import { ExperienceAnalysis } from './experienceAnalyzer';
import { EducationAnalysis } from './educationAnalyzer';
import { LocationAnalysis, LocationMatch } from './locationAnalyzer';
import { RedFlagAnalysis, RedFlag, ConsistencyIssue, TimeGap } from './redFlagAnalyzer';
import { CustomCriteriaAnalysis, CriterionMatch } from './customCriteriaAnalyzer';

interface ResumeAnalysisConfig {
  jobDescription: string;
  requiredSkills: string[];
  preferredSkills?: string[];
  experience: {
    roles: string[];
    minYearsTotal: number;
    requiredSkills: string[];
    preferredIndustries?: string[];
  };
  education: {
    degrees: { degree: string; field: string }[];
    requiredCertifications?: string[];
    minimumDegreeLevel?: number;
  };
  location?: {
    city: string;
    remote?: boolean;
    hybrid?: boolean;
    maxCommuteDistance?: number;
  };
  customCriteria?: {
    id: string;
    name: string;
    type: 'keyword' | 'regex' | 'semantic' | 'numeric' | 'boolean';
    value: string | number | boolean | RegExp;
    weight: number;
    required: boolean;
    category?: string;
    description?: string;
    validationRules?: {
      min?: number;
      max?: number;
      pattern?: string;
      options?: string[];
    };
  }[];
}

interface DetailedAnalysisReport {
  overallScore: number;
  categoryScores: {
    skills: number;
    experience: number;
    education: number;
    location?: number;
    customCriteria?: number;
  };
  skillsAnalysis: SkillAnalysis;
  experienceAnalysis: ExperienceAnalysis;
  educationAnalysis: EducationAnalysis;
  locationAnalysis?: LocationAnalysis;
  redFlags: RedFlagAnalysis;
  customCriteriaAnalysis?: CustomCriteriaAnalysis;
  summary: DetailedSummary;
}

interface DetailedSummary {
  keyStrengths: string[];
  keyWeaknesses: string[];
  recommendations: string[];
  overallAssessment: string;
}

interface AnalysesInput {
  skills: SkillAnalysis;
  experience: ExperienceAnalysis;
  education: EducationAnalysis;
  location?: LocationAnalysis;
  redFlags: RedFlagAnalysis;
  customCriteria?: CustomCriteriaAnalysis;
}

class ResumeAnalysisManager {
  private static instance: ResumeAnalysisManager;
  private textExtractor: TextExtractor;
  private skillsAnalyzer: SkillsAnalyzer;
  private experienceAnalyzer: ExperienceAnalyzer;
  private educationAnalyzer: EducationAnalyzer;
  private locationAnalyzer: LocationAnalyzer;
  private redFlagAnalyzer: RedFlagAnalyzer;
  private customCriteriaAnalyzer: CustomCriteriaAnalyzer;

  private constructor() {
    this.textExtractor = TextExtractor.getInstance();
    this.skillsAnalyzer = SkillsAnalyzer.getInstance();
    this.experienceAnalyzer = ExperienceAnalyzer.getInstance();
    this.educationAnalyzer = EducationAnalyzer.getInstance();
    this.locationAnalyzer = LocationAnalyzer.getInstance();
    this.redFlagAnalyzer = RedFlagAnalyzer.getInstance();
    this.customCriteriaAnalyzer = CustomCriteriaAnalyzer.getInstance();
  }

  public static getInstance(): ResumeAnalysisManager {
    if (!ResumeAnalysisManager.instance) {
      ResumeAnalysisManager.instance = new ResumeAnalysisManager();
    }
    return ResumeAnalysisManager.instance;
  }

  private async extractAndStructureContent(
    buffer: Buffer,
    filename: string
  ): Promise<{
    structuredContent: any;
    rawText: string;
  }> {
    try {
      const extractedDoc = await this.textExtractor.extractText(buffer, filename);
      const rawText = extractedDoc.sections.map(s => s.content).join('\n');

      // Structurer le contenu par section
      const structuredContent = {
        contact: {},
        skills: [],
        experience: [],
        education: [],
        certifications: []
      };

      for (const section of extractedDoc.sections) {
        const normalizedTitle = section.title.toLowerCase();
        
        if (normalizedTitle.includes('contact')) {
          // Extraire les informations de contact
          const emailMatch = section.content.match(/[\w.-]+@[\w.-]+\.\w+/);
          const phoneMatch = section.content.match(/(\+\d{1,3}[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}/);
          const locationMatch = section.content.match(/(?:based in|located in|remote from)\s+([^,\n]+)(?:,\s*([^,\n]+))?/i);

          structuredContent.contact = {
            email: emailMatch ? emailMatch[0] : undefined,
            phone: phoneMatch ? phoneMatch[0] : undefined,
            location: locationMatch ? locationMatch[1] : undefined
          };
        }
        // Ajouter d'autres sections selon leur type...
      }

      return {
        structuredContent,
        rawText
      };
    } catch (error) {
      console.error('Erreur lors de l\'extraction du contenu:', error);
      throw error;
    }
  }

  private generateSummary(analyses: AnalysesInput): DetailedSummary {
    const summary: DetailedSummary = {
      keyStrengths: [],
      keyWeaknesses: [],
      recommendations: [],
      overallAssessment: ''
    };

    // Identifier les points forts
    if (analyses.skills.score >= 80) {
      summary.keyStrengths.push('Excellente correspondance des compétences techniques');
    }
    if (analyses.experience.score >= 80) {
      summary.keyStrengths.push('Expérience professionnelle très pertinente');
    }
    if (analyses.education.score >= 80) {
      summary.keyStrengths.push('Formation académique parfaitement adaptée');
    }

    // Identifier les points faibles
    if (analyses.skills.missing.length > 0) {
      summary.keyWeaknesses.push(
        `Compétences manquantes : ${analyses.skills.missing.join(', ')}`
      );
    }
    if (analyses.experience.gaps.duration) {
      summary.keyWeaknesses.push('Expérience insuffisante en termes de durée');
    }
    if (analyses.redFlags.overallRisk > 60) {
      summary.keyWeaknesses.push('Plusieurs points d\'attention identifiés');
    }

    // Compiler les recommandations
    const allRecommendations = [
      ...analyses.skills.recommendations,
      ...analyses.experience.recommendations,
      ...analyses.education.recommendations,
      ...(analyses.location?.recommendations || []),
      ...analyses.redFlags.recommendations
    ];

    // Filtrer et prioriser les recommandations
    summary.recommendations = Array.from(new Set(allRecommendations))
      .slice(0, 5);  // Limiter aux 5 recommandations les plus importantes

    // Générer l'évaluation globale
    const scores = [
      analyses.skills.score * 0.3,
      analyses.experience.score * 0.3,
      analyses.education.score * 0.2,
      (analyses.location?.score || 100) * 0.1,
      (100 - analyses.redFlags.overallRisk) * 0.1
    ];

    const overallScore = scores.reduce((a, b) => a + b, 0);

    if (overallScore >= 80) {
      summary.overallAssessment = 
        "Excellent profil, fortement recommandé pour le poste";
    } else if (overallScore >= 70) {
      summary.overallAssessment = 
        "Bon profil, recommandé avec quelques points à approfondir";
    } else if (overallScore >= 60) {
      summary.overallAssessment = 
        "Profil acceptable mais nécessitant des vérifications complémentaires";
    } else {
      summary.overallAssessment = 
        "Profil ne correspondant pas suffisamment aux exigences du poste";
    }

    return summary;
  }

  public async analyzeResume(
    buffer: Buffer,
    filename: string,
    config: ResumeAnalysisConfig
  ): Promise<DetailedAnalysisReport> {
    try {
      // Extraire et structurer le contenu du CV
      const { structuredContent, rawText } = await this.extractAndStructureContent(
        buffer,
        filename
      );

      // Analyser les compétences
      const skillsAnalysis = await this.skillsAnalyzer.analyzeSkills(
        rawText,
        config.requiredSkills
      );

      // Analyser l'expérience
      const experienceAnalysis = await this.experienceAnalyzer.analyzeExperience(
        structuredContent.experience,
        config.experience
      );

      // Analyser la formation
      const educationAnalysis = await this.educationAnalyzer.analyzeEducation(
        structuredContent.education,
        structuredContent.certifications,
        config.education
      );

      // Analyser la localisation si spécifiée
      let locationAnalysis;
      if (config.location && structuredContent.contact.location) {
        locationAnalysis = await this.locationAnalyzer.analyzeLocation(
          {
            city: structuredContent.contact.location,
            country: 'France'  // À adapter selon le contexte
          },
          {
            isRemoteOnly: false,  // À adapter selon le profil
            maxCommuteDistance: 50
          },
          {
            city: config.location.city,
            country: 'France'
          },
          {
            isRemoteAllowed: config.location.remote || false,
            isHybridAllowed: config.location.hybrid || false,
            maxAllowedCommuteDistance: config.location.maxCommuteDistance
          }
        );
      }

      // Analyser les red flags
      const redFlagAnalysis = await this.redFlagAnalyzer.analyzeProfile(
        structuredContent.experience,
        structuredContent.education,
        structuredContent.certifications
      );

      // Analyser les critères personnalisés si spécifiés
      let customCriteriaAnalysis;
      if (config.customCriteria) {
        customCriteriaAnalysis = await this.customCriteriaAnalyzer.analyzeCriteria(
          rawText,
          config.customCriteria
        );
      }

      // Calculer les scores par catégorie
      const categoryScores = {
        skills: skillsAnalysis.score,
        experience: experienceAnalysis.score,
        education: educationAnalysis.score,
        location: locationAnalysis?.score,
        customCriteria: customCriteriaAnalysis?.score
      };

      // Calculer le score global
      const weights = {
        skills: 0.3,
        experience: 0.3,
        education: 0.2,
        location: 0.1,
        customCriteria: 0.1
      };

      const overallScore = Math.round(
        Object.entries(categoryScores)
          .filter(([_, score]) => score !== undefined)
          .reduce((sum, [category, score]) => 
            sum + (score! * weights[category as keyof typeof weights]),
            0
          )
      );

      // Générer le résumé
      const summary = this.generateSummary({
        skills: skillsAnalysis,
        experience: experienceAnalysis,
        education: educationAnalysis,
        location: locationAnalysis,
        redFlags: redFlagAnalysis,
        customCriteria: customCriteriaAnalysis
      });

      // Construire le rapport détaillé
      return {
        overallScore,
        categoryScores,
        skillsAnalysis,
        experienceAnalysis,
        educationAnalysis,
        locationAnalysis,
        redFlags: redFlagAnalysis,
        customCriteriaAnalysis,
        summary
      };

    } catch (error) {
      console.error('Erreur lors de l\'analyse du CV:', error);
      throw error;
    }
  }

  public async analyzeMultipleResumes(
    files: { [key: string]: { buffer: Buffer; filename: string } },
    config: ResumeAnalysisConfig
  ): Promise<{
    individualAnalyses: { [key: string]: DetailedAnalysisReport };
    comparison: {
      ranking: string[];
      strengthComparison: string[];
      uniqueStrengths: { [key: string]: string[] };
      recommendations: string[];
    };
  }> {
    try {
      const individualAnalyses: { [key: string]: DetailedAnalysisReport } = {};

      // Analyser chaque CV
      for (const [candidateName, file] of Object.entries(files)) {
        individualAnalyses[candidateName] = await this.analyzeResume(
          file.buffer,
          file.filename,
          config
        );
      }

      // Préparer la comparaison
      const ranking = Object.entries(individualAnalyses)
        .sort(([, a], [, b]) => b.overallScore - a.overallScore)
        .map(([name, analysis]) => 
          `${name}: ${analysis.overallScore} - ${analysis.summary.overallAssessment}`
        );

      // Comparer les forces et faiblesses
      const strengthComparison: string[] = [];
      const uniqueStrengths: { [key: string]: string[] } = {};
      const recommendations: string[] = [];

      // Analyser les forces uniques de chaque candidat
      for (const [candidateName, analysis] of Object.entries(individualAnalyses)) {
        uniqueStrengths[candidateName] = [];

        // Identifier les compétences uniques
        const candidateSkills = new Set(
          analysis.skillsAnalysis.matches.map(m => m.skill)
        );

        for (const skill of candidateSkills) {
          const isUnique = Object.entries(individualAnalyses)
            .filter(([name]) => name !== candidateName)
            .every(([, otherAnalysis]) => 
              !otherAnalysis.skillsAnalysis.matches
                .some(m => m.skill === skill)
            );

          if (isUnique) {
            uniqueStrengths[candidateName].push(skill);
          }
        }

        // Ajouter des comparaisons pertinentes
        if (analysis.overallScore >= 80) {
          strengthComparison.push(
            `${candidateName} se démarque par une excellente adéquation globale`
          );
        }
        if (analysis.experienceAnalysis.score >= 85) {
          strengthComparison.push(
            `${candidateName} possède une expérience particulièrement pertinente`
          );
        }
      }

      // Générer des recommandations pour le processus de sélection
      if (ranking.length > 0) {
        recommendations.push(
          `Candidat le plus adapté : ${ranking[0].split(':')[0]}`
        );
      }

      if (Object.values(individualAnalyses).some(a => a.redFlags.overallRisk > 50)) {
        recommendations.push(
          "Prévoir des entretiens approfondis pour vérifier les points d'attention"
        );
      }

      return {
        individualAnalyses,
        comparison: {
          ranking,
          strengthComparison,
          uniqueStrengths,
          recommendations
        }
      };

    } catch (error) {
      console.error('Erreur lors de l\'analyse multiple des CV:', error);
      throw error;
    }
  }
}

export default ResumeAnalysisManager; 