import natural from 'natural';
import SkillsAnalyzer from './skillsAnalyzer';
import { calculateJaroWinklerDistance } from './utils/stringDistance';

export interface Experience {
  role: string;
  company?: string;
  startDate?: Date;
  endDate?: Date;
  duration: number;  // en mois
  description: string;
  location?: string;
  skills: string[];
  achievements: string[];
}

interface ExperienceMatch {
  requiredRole: string;
  matchedExperience: Experience;
  relevance: number;
  matchingSkills: string[];
  missingSkills: string[];
  durationMatch: number;  // pourcentage de correspondance avec la durée requise
}

export interface ExperienceAnalysis {
  matches: ExperienceMatch[];
  totalRelevantExperience: number;  // en mois
  score: number;
  gaps: {
    duration: boolean;
    skills: string[];
    roles: string[];
  };
  recommendations: string[];
}

class ExperienceAnalyzer {
  private static instance: ExperienceAnalyzer;
  private skillsAnalyzer: SkillsAnalyzer;
  private tokenizer: natural.WordTokenizer;

  private constructor() {
    this.skillsAnalyzer = SkillsAnalyzer.getInstance();
    this.tokenizer = new natural.WordTokenizer();
  }

  public static getInstance(): ExperienceAnalyzer {
    if (!ExperienceAnalyzer.instance) {
      ExperienceAnalyzer.instance = new ExperienceAnalyzer();
    }
    return ExperienceAnalyzer.instance;
  }

  private parseDate(dateStr: string): Date | undefined {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? undefined : date;
  }

  private calculateDuration(startDate?: Date, endDate?: Date): number {
    if (!startDate || !endDate) return 0;

    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30.44));
    return diffMonths;
  }

  private extractAchievements(description: string): string[] {
    const achievements: string[] = [];
    const sentences = description.split(/[.!?]+/);

    const achievementIndicators = [
      'réalisé',
      'développé',
      'créé',
      'amélioré',
      'augmenté',
      'réduit',
      'géré',
      'dirigé',
      'coordonné',
      'optimisé',
      'implémenté'
    ];

    for (const sentence of sentences) {
      const normalized = sentence.toLowerCase().trim();
      if (achievementIndicators.some(indicator => normalized.includes(indicator))) {
        achievements.push(sentence.trim());
      }
    }

    return achievements;
  }

  private calculateRoleRelevance(
    requiredRole: string,
    experience: Experience
  ): number {
    // Calculer la similarité du titre du poste
    const roleSimilarity = calculateJaroWinklerDistance(
      requiredRole.toLowerCase(),
      experience.role.toLowerCase()
    );

    // Analyser la description pour des mots-clés pertinents
    const keywords = this.tokenizer.tokenize(requiredRole.toLowerCase()) || [];
    const descriptionWords = new Set(
      this.tokenizer.tokenize(experience.description.toLowerCase()) || []
    );

    const keywordMatches = keywords.filter(word => descriptionWords.has(word));
    const keywordScore = keywords.length > 0 ? keywordMatches.length / keywords.length : 0;

    // Pondération : 60% titre du poste, 40% mots-clés
    return (roleSimilarity * 0.6) + (keywordScore * 0.4);
  }

  public async analyzeExperience(
    experiences: Experience[],
    requirements: {
      roles: string[];
      minYearsTotal: number;
      requiredSkills: string[];
      preferredIndustries?: string[];
    }
  ): Promise<ExperienceAnalysis> {
    const analysis: ExperienceAnalysis = {
      matches: [],
      totalRelevantExperience: 0,
      score: 0,
      gaps: {
        duration: false,
        skills: [],
        roles: []
      },
      recommendations: []
    };

    // Trier les expériences par date décroissante
    const sortedExperiences = [...experiences].sort((a, b) => {
      const dateA = a.endDate || new Date();
      const dateB = b.endDate || new Date();
      return dateB.getTime() - dateA.getTime();
    });

    // Analyser chaque rôle requis
    for (const requiredRole of requirements.roles) {
      let bestMatch: ExperienceMatch | null = null;

      for (const experience of sortedExperiences) {
        const relevance = this.calculateRoleRelevance(requiredRole, experience);
        
        // Analyser les compétences
        const skillsAnalysis = await this.skillsAnalyzer.analyzeSkills(
          experience.description,
          requirements.requiredSkills
        );

        const durationMatch = experience.duration / (requirements.minYearsTotal * 12);

        const match: ExperienceMatch = {
          requiredRole,
          matchedExperience: experience,
          relevance,
          matchingSkills: skillsAnalysis.matches.map(m => m.skill),
          missingSkills: skillsAnalysis.missing,
          durationMatch: Math.min(1, durationMatch)
        };

        if (!bestMatch || match.relevance > bestMatch.relevance) {
          bestMatch = match;
        }
      }

      if (bestMatch && bestMatch.relevance >= 0.6) {
        analysis.matches.push(bestMatch);
        analysis.totalRelevantExperience += bestMatch.matchedExperience.duration;
      } else {
        analysis.gaps.roles.push(requiredRole);
      }
    }

    // Vérifier les gaps de durée
    const requiredMonths = requirements.minYearsTotal * 12;
    analysis.gaps.duration = analysis.totalRelevantExperience < requiredMonths;

    // Identifier les gaps de compétences
    const allMatchingSkills = new Set<string>();
    analysis.matches.forEach(match => {
      match.matchingSkills.forEach(skill => allMatchingSkills.add(skill));
    });

    analysis.gaps.skills = requirements.requiredSkills.filter(
      skill => !allMatchingSkills.has(skill)
    );

    // Calculer le score global
    const durationScore = Math.min(1, analysis.totalRelevantExperience / requiredMonths);
    const roleScore = analysis.matches.length / requirements.roles.length;
    const skillScore = 1 - (analysis.gaps.skills.length / requirements.requiredSkills.length);

    analysis.score = Math.round(
      (durationScore * 0.3 + roleScore * 0.4 + skillScore * 0.3) * 100
    );

    // Générer des recommandations
    this.generateRecommendations(analysis);

    return analysis;
  }

  private generateRecommendations(analysis: ExperienceAnalysis): void {
    if (analysis.gaps.duration) {
      analysis.recommendations.push(
        "Le candidat n'a pas l'expérience minimale requise. Suggérer d'acquérir plus d'expérience dans le domaine."
      );
    }

    if (analysis.gaps.roles.length > 0) {
      analysis.recommendations.push(
        `Manque d'expérience dans les rôles suivants : ${analysis.gaps.roles.join(', ')}`
      );
    }

    if (analysis.gaps.skills.length > 0) {
      analysis.recommendations.push(
        `Compétences à développer : ${analysis.gaps.skills.join(', ')}`
      );
    }

    // Recommandations basées sur le score
    if (analysis.score < 50) {
      analysis.recommendations.push(
        "Le profil ne correspond pas suffisamment aux exigences du poste."
      );
    } else if (analysis.score < 70) {
      analysis.recommendations.push(
        "Le profil correspond partiellement. Formation complémentaire recommandée."
      );
    }
  }

  public detectCareerProgression(experiences: Experience[]): {
    progression: 'positive' | 'stable' | 'irregular';
    observations: string[];
  } {
    const observations: string[] = [];
    let progression: 'positive' | 'stable' | 'irregular' = 'stable';

    // Trier les expériences par date
    const sortedExperiences = [...experiences].sort((a, b) => {
      const dateA = a.startDate?.getTime() || 0;
      const dateB = b.startDate?.getTime() || 0;
      return dateA - dateB;
    });

    // Analyser les changements de poste
    let roleChanges = 0;
    let shortTermPositions = 0;
    let responsibilityIncrease = 0;

    for (let i = 1; i < sortedExperiences.length; i++) {
      const current = sortedExperiences[i];
      const previous = sortedExperiences[i - 1];

      // Vérifier la durée
      if (current.duration < 12) {
        shortTermPositions++;
      }

      // Analyser l'évolution des responsabilités
      const currentRole = current.role.toLowerCase();
      const previousRole = previous.role.toLowerCase();

      const promotionKeywords = ['senior', 'lead', 'chef', 'manager', 'directeur'];
      const hasPromotion = promotionKeywords.some(
        keyword => currentRole.includes(keyword) && !previousRole.includes(keyword)
      );

      if (hasPromotion) {
        responsibilityIncrease++;
      }

      // Compter les changements de poste significatifs
      if (!currentRole.includes(previousRole) && !previousRole.includes(currentRole)) {
        roleChanges++;
      }
    }

    // Évaluer la progression
    if (responsibilityIncrease > 0 && shortTermPositions <= 1) {
      progression = 'positive';
      observations.push("Progression de carrière positive avec augmentation des responsabilités");
    } else if (roleChanges > experiences.length / 2) {
      progression = 'irregular';
      observations.push("Changements fréquents de direction de carrière");
    }

    if (shortTermPositions > 1) {
      observations.push(`${shortTermPositions} postes de courte durée détectés`);
    }

    return { progression, observations };
  }
}

export default ExperienceAnalyzer; 