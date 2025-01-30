import { Experience } from './experienceAnalyzer';
import { Education, Certification } from './educationAnalyzer';

export interface TimeGap {
  startDate: Date;
  endDate: Date;
  duration: number;  // en mois
  explanation?: string;
}

export interface RedFlag {
  type: 'critical' | 'warning' | 'info';
  category: 'experience' | 'education' | 'skills' | 'general';
  description: string;
  details?: string;
  impact: number;  // 0-100
}

export interface ConsistencyIssue {
  type: 'timeline' | 'skills' | 'roles' | 'education';
  description: string;
  elements: string[];
  severity: 'high' | 'medium' | 'low';
}

export interface RedFlagAnalysis {
  flags: RedFlag[];
  consistencyIssues: ConsistencyIssue[];
  timeGaps: TimeGap[];
  overallRisk: number;  // 0-100
  recommendations: string[];
}

class RedFlagAnalyzer {
  private static instance: RedFlagAnalyzer;

  private constructor() {}

  public static getInstance(): RedFlagAnalyzer {
    if (!RedFlagAnalyzer.instance) {
      RedFlagAnalyzer.instance = new RedFlagAnalyzer();
    }
    return RedFlagAnalyzer.instance;
  }

  private calculateDuration(startDate: Date, endDate: Date): number {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30.44));
  }

  private findTimeGaps(experiences: Experience[]): TimeGap[] {
    const gaps: TimeGap[] = [];
    const sortedExperiences = [...experiences].sort(
      (a, b) => (a.startDate?.getTime() || 0) - (b.startDate?.getTime() || 0)
    );

    for (let i = 1; i < sortedExperiences.length; i++) {
      const current = sortedExperiences[i];
      const previous = sortedExperiences[i - 1];

      if (current.startDate && previous.endDate) {
        if (current.startDate > previous.endDate) {
          const duration = this.calculateDuration(previous.endDate, current.startDate);
          if (duration > 3) {  // Gap de plus de 3 mois
            gaps.push({
              startDate: previous.endDate,
              endDate: current.startDate,
              duration
            });
          }
        }
      }
    }

    return gaps;
  }

  private analyzeExperienceConsistency(experiences: Experience[]): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];

    // Vérifier les changements fréquents de poste
    const shortTermPositions = experiences.filter(exp => exp.duration < 12);
    if (shortTermPositions.length >= 2) {
      issues.push({
        type: 'roles',
        description: 'Changements fréquents de poste',
        elements: shortTermPositions.map(exp => exp.role),
        severity: shortTermPositions.length >= 3 ? 'high' : 'medium'
      });
    }

    // Vérifier la progression logique des rôles
    const roleProgression = experiences.map(exp => ({
      role: exp.role.toLowerCase(),
      date: exp.startDate
    }));

    const seniorityKeywords = ['senior', 'lead', 'manager', 'director', 'chef', 'responsable'];
    const juniorToSenior = roleProgression.some((current, index) => {
      if (index === 0) return false;
      const previous = roleProgression[index - 1];
      const currentIsSenior = seniorityKeywords.some(kw => current.role.includes(kw));
      const previousIsJunior = !seniorityKeywords.some(kw => previous.role.includes(kw));
      return currentIsSenior && previousIsJunior && 
             (current.date && previous.date && 
              this.calculateDuration(previous.date, current.date) < 24);
    });

    if (juniorToSenior) {
      issues.push({
        type: 'roles',
        description: 'Progression de carrière inhabituellement rapide',
        elements: roleProgression.map(r => r.role),
        severity: 'medium'
      });
    }

    return issues;
  }

  private analyzeSkillConsistency(
    experiences: Experience[],
    certifications: Certification[]
  ): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];
    const allSkills = new Set<string>();
    const skillTimeline = new Map<string, {
      firstMention: Date;
      lastMention: Date;
      occurrences: number;
    }>();

    // Collecter toutes les compétences et leur timeline
    experiences.forEach(exp => {
      exp.skills.forEach(skill => {
        allSkills.add(skill);
        const skillData = skillTimeline.get(skill) || {
          firstMention: exp.startDate || new Date(),
          lastMention: exp.endDate || new Date(),
          occurrences: 0
        };

        if (exp.startDate && exp.startDate < skillData.firstMention) {
          skillData.firstMention = exp.startDate;
        }
        if (exp.endDate && exp.endDate > skillData.lastMention) {
          skillData.lastMention = exp.endDate;
        }
        skillData.occurrences++;
        skillTimeline.set(skill, skillData);
      });
    });

    // Vérifier les compétences mentionnées une seule fois
    const oneTimeSkills = Array.from(skillTimeline.entries())
      .filter(([_, data]) => data.occurrences === 1)
      .map(([skill]) => skill);

    if (oneTimeSkills.length > 3) {
      issues.push({
        type: 'skills',
        description: 'Plusieurs compétences mentionnées une seule fois',
        elements: oneTimeSkills,
        severity: 'low'
      });
    }

    // Vérifier la cohérence entre les certifications et les compétences
    certifications.forEach(cert => {
      const relatedSkills = Array.from(allSkills).filter(skill =>
        cert.name.toLowerCase().includes(skill.toLowerCase())
      );

      relatedSkills.forEach(skill => {
        const skillData = skillTimeline.get(skill);
        if (skillData && cert.date) {
          const skillDuration = this.calculateDuration(
            skillData.firstMention,
            cert.date
          );
          if (skillDuration < 6) {
            issues.push({
              type: 'skills',
              description: 'Certification obtenue avec peu d\'expérience pratique',
              elements: [skill, cert.name],
              severity: 'medium'
            });
          }
        }
      });
    });

    return issues;
  }

  private datesOverlap(
    start1: Date | undefined,
    end1: Date | undefined,
    start2: Date | undefined,
    end2: Date | undefined
  ): boolean {
    if (!start1 || !end1 || !start2 || !end2) return false;
    return (start1 <= end2 && end1 >= start2) || (start2 <= end1 && end2 >= start1);
  }

  private analyzeEducationConsistency(
    education: Education[],
    experiences: Experience[]
  ): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];

    // Vérifier la cohérence des dates
    education.forEach(edu => {
      const overlappingExperiences = experiences.filter(exp =>
        this.datesOverlap(exp.startDate, exp.endDate, edu.startDate, edu.endDate)
      );

      if (overlappingExperiences.length > 0) {
        const totalWorkHours = overlappingExperiences.reduce((sum, exp) => {
          return sum + (exp.duration * 40);  // 40 heures par semaine
        }, 0);

        if (totalWorkHours > 1000) {
          issues.push({
            type: 'education',
            description: 'Charge de travail importante pendant les études',
            elements: [
              edu.degree,
              ...overlappingExperiences.map(exp => exp.role)
            ],
            severity: 'medium'
          });
        }
      }
    });

    return issues;
  }

  public async analyzeProfile(
    experiences: Experience[],
    education: Education[],
    certifications: Certification[]
  ): Promise<RedFlagAnalysis> {
    const flags: RedFlag[] = [];
    const timeGaps = this.findTimeGaps(experiences);
    let consistencyIssues: ConsistencyIssue[] = [];

    // Analyser les gaps dans le parcours
    timeGaps.forEach(gap => {
      if (gap.duration > 12) {
        flags.push({
          type: 'critical',
          category: 'experience',
          description: 'Gap significatif dans le parcours professionnel',
          details: `Gap de ${gap.duration} mois entre ${gap.startDate.toLocaleDateString()} et ${gap.endDate.toLocaleDateString()}`,
          impact: 80
        });
      } else if (gap.duration > 6) {
        flags.push({
          type: 'warning',
          category: 'experience',
          description: 'Gap notable dans le parcours professionnel',
          details: `Gap de ${gap.duration} mois`,
          impact: 50
        });
      }
    });

    // Analyser la cohérence des expériences
    consistencyIssues = [
      ...this.analyzeExperienceConsistency(experiences),
      ...this.analyzeSkillConsistency(experiences, certifications),
      ...this.analyzeEducationConsistency(education, experiences)
    ];

    // Convertir les problèmes de cohérence en red flags
    consistencyIssues.forEach(issue => {
      flags.push({
        type: issue.severity === 'high' ? 'critical' : 
              issue.severity === 'medium' ? 'warning' : 'info',
        category: issue.type === 'education' ? 'education' :
                 issue.type === 'skills' ? 'skills' : 'experience',
        description: issue.description,
        details: `Éléments concernés : ${issue.elements.join(', ')}`,
        impact: issue.severity === 'high' ? 70 :
               issue.severity === 'medium' ? 40 : 20
      });
    });

    // Calculer le risque global
    const overallRisk = Math.min(
      100,
      Math.round(
        flags.reduce((sum, flag) => sum + flag.impact, 0) / flags.length
      )
    );

    // Générer des recommandations
    const recommendations = this.generateRecommendations(flags, timeGaps);

    return {
      flags,
      consistencyIssues,
      timeGaps,
      overallRisk,
      recommendations
    };
  }

  private generateRecommendations(
    flags: RedFlag[],
    timeGaps: TimeGap[]
  ): string[] {
    const recommendations: string[] = [];

    // Recommandations basées sur les red flags critiques
    const criticalFlags = flags.filter(f => f.type === 'critical');
    if (criticalFlags.length > 0) {
      recommendations.push(
        "Points à éclaircir lors de l'entretien :",
        ...criticalFlags.map(f => `- ${f.description}`)
      );
    }

    // Recommandations pour les gaps
    if (timeGaps.length > 0) {
      recommendations.push(
        "Demander des explications sur les périodes d'inactivité :",
        ...timeGaps.map(gap => 
          `- Période du ${gap.startDate.toLocaleDateString()} au ${gap.endDate.toLocaleDateString()}`
        )
      );
    }

    // Recommandations générales
    if (flags.some(f => f.category === 'skills')) {
      recommendations.push(
        "Vérifier en profondeur les compétences techniques lors de l'entretien"
      );
    }

    if (flags.some(f => f.category === 'experience' && f.impact > 60)) {
      recommendations.push(
        "Prévoir une période d'essai plus encadrée"
      );
    }

    return recommendations;
  }
}

export default RedFlagAnalyzer; 