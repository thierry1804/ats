import natural from 'natural';
import { calculateJaroWinklerDistance } from './utils/stringDistance';

export interface Education {
  degree: string;
  field: string;
  institution: string;
  startDate?: Date;
  endDate?: Date;
  gpa?: number;
  achievements?: string[];
}

export interface Certification {
  name: string;
  issuer: string;
  date?: Date;
  expiryDate?: Date;
  score?: number;
}

interface EducationMatch {
  requiredDegree: string;
  requiredField: string;
  matchedEducation: Education;
  relevance: number;
  fieldMatch: number;
  institutionRanking?: number;
}

interface CertificationMatch {
  requiredCert: string;
  matchedCert: Certification;
  relevance: number;
  isExpired: boolean;
}

export interface EducationAnalysis {
  matches: EducationMatch[];
  certificationMatches: CertificationMatch[];
  score: number;
  gaps: {
    degrees: string[];
    fields: string[];
    certifications: string[];
  };
  recommendations: string[];
}

class EducationAnalyzer {
  private static instance: EducationAnalyzer;
  private tokenizer: natural.WordTokenizer;
  private degreeHierarchy: { [key: string]: number } = {
    'doctorat': 5,
    'phd': 5,
    'master': 4,
    'mba': 4,
    'ingénieur': 4,
    'licence': 3,
    'bachelor': 3,
    'dut': 2,
    'bts': 2,
    'bac': 1
  };

  private constructor() {
    this.tokenizer = new natural.WordTokenizer();
  }

  public static getInstance(): EducationAnalyzer {
    if (!EducationAnalyzer.instance) {
      EducationAnalyzer.instance = new EducationAnalyzer();
    }
    return EducationAnalyzer.instance;
  }

  private getDegreeLevel(degree: string): number {
    const normalizedDegree = degree.toLowerCase();
    for (const [key, value] of Object.entries(this.degreeHierarchy)) {
      if (normalizedDegree.includes(key)) {
        return value;
      }
    }
    return 0;
  }

  private calculateFieldMatch(
    requiredField: string,
    actualField: string
  ): number {
    // Normaliser les champs
    const normalizeField = (field: string): string[] => {
      return field
        .toLowerCase()
        .split(/[\s,]+/)
        .filter(word => word.length > 2);
    };

    const requiredWords = new Set(normalizeField(requiredField));
    const actualWords = normalizeField(actualField);

    // Calculer la correspondance des mots
    let matches = 0;
    for (const word of actualWords) {
      if (requiredWords.has(word)) {
        matches++;
      } else {
        // Vérifier la similarité avec les mots requis
        for (const reqWord of requiredWords) {
          const similarity = calculateJaroWinklerDistance(word, reqWord);
          if (similarity > 0.85) {  // Seuil de similarité élevé
            matches += similarity;
            break;
          }
        }
      }
    }

    return matches / Math.max(requiredWords.size, actualWords.length);
  }

  private isRelevantInstitution(institution: string): number {
    // Liste d'établissements reconnus (à compléter/personnaliser)
    const topInstitutions = new Map<string, number>([
      ['polytechnique', 1],
      ['centrale', 0.95],
      ['mines', 0.95],
      ['hec', 1],
      ['essec', 0.95],
      ['dauphine', 0.9],
      ['sorbonne', 0.9],
      ['insa', 0.85],
      ['ensimag', 0.85]
    ]);

    const normalizedInstitution = institution.toLowerCase();
    for (const [key, value] of topInstitutions.entries()) {
      if (normalizedInstitution.includes(key)) {
        return value;
      }
    }

    return 0.7;  // Score par défaut pour les autres institutions
  }

  private isCertificationExpired(cert: Certification): boolean {
    if (!cert.expiryDate) return false;
    return new Date() > cert.expiryDate;
  }

  private calculateCertificationRelevance(
    requiredCert: string,
    actualCert: Certification
  ): number {
    const similarity = calculateJaroWinklerDistance(
      requiredCert.toLowerCase(),
      actualCert.name.toLowerCase()
    );

    // Pénalité pour les certifications expirées
    const expiryPenalty = this.isCertificationExpired(actualCert) ? 0.5 : 1;

    // Bonus pour les scores élevés
    const scorebonus = actualCert.score ? Math.min((actualCert.score / 100) * 0.2, 0.2) : 0;

    return (similarity * expiryPenalty) + scorebonus;
  }

  public async analyzeEducation(
    education: Education[],
    certifications: Certification[],
    requirements: {
      degrees: { degree: string; field: string }[];
      requiredCertifications?: string[];
      minimumDegreeLevel?: number;
    }
  ): Promise<EducationAnalysis> {
    const analysis: EducationAnalysis = {
      matches: [],
      certificationMatches: [],
      score: 0,
      gaps: {
        degrees: [],
        fields: [],
        certifications: []
      },
      recommendations: []
    };

    // Analyser les diplômes
    for (const required of requirements.degrees) {
      let bestMatch: EducationMatch | null = null;
      const requiredLevel = this.getDegreeLevel(required.degree);

      for (const edu of education) {
        const actualLevel = this.getDegreeLevel(edu.degree);
        
        // Vérifier le niveau minimum requis
        if (requirements.minimumDegreeLevel && 
            actualLevel < requirements.minimumDegreeLevel) {
          continue;
        }

        const levelMatch = actualLevel >= requiredLevel ? 1 : actualLevel / requiredLevel;
        const fieldMatch = this.calculateFieldMatch(required.field, edu.field);
        const institutionRanking = this.isRelevantInstitution(edu.institution);

        const relevance = (
          levelMatch * 0.4 +
          fieldMatch * 0.4 +
          institutionRanking * 0.2
        );

        if (!bestMatch || relevance > bestMatch.relevance) {
          bestMatch = {
            requiredDegree: required.degree,
            requiredField: required.field,
            matchedEducation: edu,
            relevance,
            fieldMatch,
            institutionRanking
          };
        }
      }

      if (bestMatch && bestMatch.relevance >= 0.6) {
        analysis.matches.push(bestMatch);
      } else {
        analysis.gaps.degrees.push(required.degree);
        analysis.gaps.fields.push(required.field);
      }
    }

    // Analyser les certifications
    if (requirements.requiredCertifications) {
      for (const requiredCert of requirements.requiredCertifications) {
        let bestMatch: CertificationMatch | null = null;

        for (const cert of certifications) {
          const relevance = this.calculateCertificationRelevance(requiredCert, cert);

          if (!bestMatch || relevance > bestMatch.relevance) {
            bestMatch = {
              requiredCert,
              matchedCert: cert,
              relevance,
              isExpired: this.isCertificationExpired(cert)
            };
          }
        }

        if (bestMatch && bestMatch.relevance >= 0.7 && !bestMatch.isExpired) {
          analysis.certificationMatches.push(bestMatch);
        } else {
          analysis.gaps.certifications.push(requiredCert);
        }
      }
    }

    // Calculer le score global
    const educationScore = analysis.matches.reduce(
      (sum, match) => sum + match.relevance,
      0
    ) / requirements.degrees.length;

    const certificationScore = requirements.requiredCertifications ?
      analysis.certificationMatches.length / requirements.requiredCertifications.length : 1;

    analysis.score = Math.round(
      (educationScore * 0.7 + certificationScore * 0.3) * 100
    );

    // Générer des recommandations
    this.generateRecommendations(analysis);

    return analysis;
  }

  private generateRecommendations(analysis: EducationAnalysis): void {
    if (analysis.gaps.degrees.length > 0) {
      analysis.recommendations.push(
        `Niveau de diplôme manquant ou insuffisant : ${analysis.gaps.degrees.join(', ')}`
      );
    }

    if (analysis.gaps.fields.length > 0) {
      analysis.recommendations.push(
        `Spécialisation manquante : ${analysis.gaps.fields.join(', ')}`
      );
    }

    if (analysis.gaps.certifications.length > 0) {
      analysis.recommendations.push(
        `Certifications recommandées : ${analysis.gaps.certifications.join(', ')}`
      );
    }

    const expiredCerts = analysis.certificationMatches
      .filter(match => match.isExpired)
      .map(match => match.matchedCert.name);

    if (expiredCerts.length > 0) {
      analysis.recommendations.push(
        `Certifications à renouveler : ${expiredCerts.join(', ')}`
      );
    }

    // Recommandations basées sur le score
    if (analysis.score < 50) {
      analysis.recommendations.push(
        "Le niveau de formation ne correspond pas aux exigences du poste"
      );
    } else if (analysis.score < 70) {
      analysis.recommendations.push(
        "Formation complémentaire recommandée pour mieux correspondre au poste"
      );
    }
  }
}

export default EducationAnalyzer; 