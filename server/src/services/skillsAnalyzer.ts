import natural from 'natural';
import SkillsDatabaseManager from './skillsDatabase';
import { calculateJaroWinklerDistance } from './utils/stringDistance';

interface SkillMatch {
  skill: string;
  found: string;
  category: string;
  confidence: number;
  context?: string;
}

export interface SkillAnalysis {
  matches: SkillMatch[];
  missing: string[];
  score: number;
  recommendations: string[];
  categories: {
    [key: string]: {
      score: number;
      matches: SkillMatch[];
      missing: string[];
    };
  };
}

class SkillsAnalyzer {
  private static instance: SkillsAnalyzer;
  private skillsDB: SkillsDatabaseManager;
  private tokenizer: natural.WordTokenizer;
  private tfidf: natural.TfIdf;

  private constructor() {
    this.skillsDB = SkillsDatabaseManager.getInstance();
    this.tokenizer = new natural.WordTokenizer();
    this.tfidf = new natural.TfIdf();
  }

  public static getInstance(): SkillsAnalyzer {
    if (!SkillsAnalyzer.instance) {
      SkillsAnalyzer.instance = new SkillsAnalyzer();
    }
    return SkillsAnalyzer.instance;
  }

  private extractContext(text: string, skill: string, windowSize: number = 50): string {
    const index = text.toLowerCase().indexOf(skill.toLowerCase());
    if (index === -1) return '';

    const start = Math.max(0, index - windowSize);
    const end = Math.min(text.length, index + skill.length + windowSize);
    
    return text.slice(start, end).trim();
  }

  private calculateSkillConfidence(
    requiredSkill: string,
    foundSkill: string,
    context: string
  ): number {
    let confidence = 0;

    // Correspondance exacte
    if (requiredSkill.toLowerCase() === foundSkill.toLowerCase()) {
      confidence = 1.0;
    }
    // Synonyme connu
    else if (this.skillsDB.isSkillEquivalent(requiredSkill, foundSkill)) {
      confidence = 0.9;
    }
    // Correspondance partielle
    else {
      const similarity = calculateJaroWinklerDistance(
        requiredSkill.toLowerCase(),
        foundSkill.toLowerCase()
      );
      confidence = similarity * 0.8;
    }

    // Bonus basé sur le contexte
    if (context) {
      // Analyser le contexte pour des mots-clés positifs
      const positiveContextKeywords = [
        'expert',
        'expérience',
        'maîtrise',
        'expertise',
        'certification',
        'développé',
        'réalisé',
        'projet'
      ];

      const contextWords = this.tokenizer.tokenize(context.toLowerCase()) || [];
      const hasPositiveContext = positiveContextKeywords.some(keyword =>
        contextWords.includes(keyword)
      );

      if (hasPositiveContext) {
        confidence = Math.min(1.0, confidence + 0.1);
      }
    }

    return confidence;
  }

  public async analyzeSkills(
    resumeText: string,
    requiredSkills: string[]
  ): Promise<SkillAnalysis> {
    const analysis: SkillAnalysis = {
      matches: [],
      missing: [],
      score: 0,
      recommendations: [],
      categories: {}
    };

    // Normaliser et tokenizer le texte du CV
    const normalizedText = resumeText.toLowerCase();
    const words = this.tokenizer.tokenize(normalizedText) || [];
    
    // Analyser chaque compétence requise
    for (const requiredSkill of requiredSkills) {
      let bestMatch: SkillMatch | null = null;

      // Rechercher la compétence et ses synonymes dans le CV
      const skillVariants = [
        requiredSkill,
        ...this.skillsDB.findSynonyms(requiredSkill)
      ];

      for (const variant of skillVariants) {
        if (normalizedText.includes(variant.toLowerCase())) {
          const context = this.extractContext(resumeText, variant);
          const confidence = this.calculateSkillConfidence(
            requiredSkill,
            variant,
            context
          );

          if (!bestMatch || confidence > bestMatch.confidence) {
            const category = this.skillsDB.getCategoryForSkill(requiredSkill) || 'Other';
            bestMatch = {
              skill: requiredSkill,
              found: variant,
              category,
              confidence,
              context
            };
          }
        }
      }

      if (bestMatch) {
        analysis.matches.push(bestMatch);

        // Mettre à jour les statistiques par catégorie
        if (!analysis.categories[bestMatch.category]) {
          analysis.categories[bestMatch.category] = {
            score: 0,
            matches: [],
            missing: []
          };
        }
        analysis.categories[bestMatch.category].matches.push(bestMatch);
      } else {
        analysis.missing.push(requiredSkill);

        // Ajouter aux compétences manquantes par catégorie
        const category = this.skillsDB.getCategoryForSkill(requiredSkill) || 'Other';
        if (!analysis.categories[category]) {
          analysis.categories[category] = {
            score: 0,
            matches: [],
            missing: []
          };
        }
        analysis.categories[category].missing.push(requiredSkill);
      }
    }

    // Calculer les scores par catégorie
    for (const [category, data] of Object.entries(analysis.categories)) {
      const totalSkills = data.matches.length + data.missing.length;
      if (totalSkills > 0) {
        const categoryScore = data.matches.reduce(
          (sum, match) => sum + match.confidence,
          0
        ) / totalSkills;
        analysis.categories[category].score = Math.round(categoryScore * 100);
      }
    }

    // Calculer le score global
    const totalConfidence = analysis.matches.reduce(
      (sum, match) => sum + match.confidence,
      0
    );
    analysis.score = Math.round(
      (totalConfidence / requiredSkills.length) * 100
    );

    return analysis;
  }

  public suggestAlternativeSkills(
    missingSkills: string[]
  ): { [key: string]: string[] } {
    const suggestions: { [key: string]: string[] } = {};

    for (const skill of missingSkills) {
      const category = this.skillsDB.getCategoryForSkill(skill);
      if (category) {
        const relatedSkills = this.skillsDB
          .getAllSkillsInCategory(category)
          .filter(s => s !== skill)
          .slice(0, 3);

        if (relatedSkills.length > 0) {
          suggestions[skill] = relatedSkills;
        }
      }
    }

    return suggestions;
  }

  public identifySkillGaps(
    analysis: SkillAnalysis
  ): { [key: string]: string[] } {
    const gaps: { [key: string]: string[] } = {};

    for (const [category, data] of Object.entries(analysis.categories)) {
      if (data.score < 70) {  // Seuil de 70% pour identifier un gap
        gaps[category] = data.missing;
      }
    }

    return gaps;
  }
}

export default SkillsAnalyzer; 