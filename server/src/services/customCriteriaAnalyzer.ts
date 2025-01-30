import natural from 'natural';
import { calculateJaroWinklerDistance } from './utils/stringDistance';

export interface CustomCriterion {
  id: string;
  name: string;
  type: 'keyword' | 'regex' | 'semantic' | 'numeric' | 'boolean';
  value: string | number | boolean | RegExp;
  weight: number;  // 0-1
  required: boolean;
  category?: string;
  description?: string;
  validationRules?: {
    min?: number;
    max?: number;
    pattern?: string;
    options?: string[];
  };
}

export interface CriterionMatch {
  criterion: CustomCriterion;
  found: boolean;
  value?: string | number | boolean;
  confidence: number;
  context?: string;
}

export interface CustomCriteriaAnalysis {
  matches: CriterionMatch[];
  score: number;
  missingRequired: CustomCriterion[];
  recommendations: string[];
  details: {
    [category: string]: {
      score: number;
      matches: CriterionMatch[];
      missing: CustomCriterion[];
    };
  };
}

class CustomCriteriaAnalyzer {
  private static instance: CustomCriteriaAnalyzer;
  private tokenizer: natural.WordTokenizer;
  private tfidf: natural.TfIdf;

  private constructor() {
    this.tokenizer = new natural.WordTokenizer();
    this.tfidf = new natural.TfIdf();
  }

  public static getInstance(): CustomCriteriaAnalyzer {
    if (!CustomCriteriaAnalyzer.instance) {
      CustomCriteriaAnalyzer.instance = new CustomCriteriaAnalyzer();
    }
    return CustomCriteriaAnalyzer.instance;
  }

  private extractContext(text: string, term: string, windowSize: number = 50): string {
    const index = text.toLowerCase().indexOf(term.toLowerCase());
    if (index === -1) return '';

    const start = Math.max(0, index - windowSize);
    const end = Math.min(text.length, index + term.length + windowSize);
    
    return text.slice(start, end).trim();
  }

  private evaluateKeywordCriterion(
    criterion: CustomCriterion,
    text: string
  ): CriterionMatch {
    const value = criterion.value as string;
    const normalizedText = text.toLowerCase();
    const normalizedValue = value.toLowerCase();

    // Recherche exacte
    const exactMatch = normalizedText.includes(normalizedValue);
    if (exactMatch) {
      return {
        criterion,
        found: true,
        value: value,
        confidence: 1.0,
        context: this.extractContext(text, value)
      };
    }

    // Recherche de similarité
    const words = this.tokenizer.tokenize(normalizedText) || [];
    let bestMatch = {
      word: '',
      similarity: 0
    };

    words.forEach(word => {
      const similarity = calculateJaroWinklerDistance(word, normalizedValue);
      if (similarity > bestMatch.similarity && similarity > 0.85) {
        bestMatch = { word, similarity };
      }
    });

    if (bestMatch.similarity > 0) {
      return {
        criterion,
        found: true,
        value: bestMatch.word,
        confidence: bestMatch.similarity,
        context: this.extractContext(text, bestMatch.word)
      };
    }

    return {
      criterion,
      found: false,
      confidence: 0
    };
  }

  private evaluateRegexCriterion(
    criterion: CustomCriterion,
    text: string
  ): CriterionMatch {
    const pattern = criterion.value instanceof RegExp ? 
      criterion.value : 
      new RegExp(criterion.value as string, 'i');

    const matches = text.match(pattern);
    if (matches) {
      return {
        criterion,
        found: true,
        value: matches[0],
        confidence: 1.0,
        context: this.extractContext(text, matches[0])
      };
    }

    return {
      criterion,
      found: false,
      confidence: 0
    };
  }

  private evaluateNumericCriterion(
    criterion: CustomCriterion,
    text: string
  ): CriterionMatch {
    const targetValue = criterion.value as number;
    const rules = criterion.validationRules || {};
    
    // Rechercher des valeurs numériques dans le texte
    const numberPattern = /\b\d+(?:\.\d+)?\b/g;
    const numbers = text.match(numberPattern);

    if (!numbers) {
      return {
        criterion,
        found: false,
        confidence: 0
      };
    }

    // Évaluer chaque nombre trouvé
    let bestMatch = {
      value: 0,
      confidence: 0
    };

    numbers.forEach(num => {
      const value = parseFloat(num);
      if (isNaN(value)) return;

      // Vérifier les règles de validation
      if (
        (rules.min !== undefined && value < rules.min) ||
        (rules.max !== undefined && value > rules.max)
      ) {
        return;
      }

      // Calculer la proximité avec la valeur cible
      const maxDiff = (rules.max || targetValue * 2) - (rules.min || 0);
      const diff = Math.abs(value - targetValue);
      const confidence = Math.max(0, 1 - (diff / maxDiff));

      if (confidence > bestMatch.confidence) {
        bestMatch = { value, confidence };
      }
    });

    if (bestMatch.confidence > 0) {
      return {
        criterion,
        found: true,
        value: bestMatch.value,
        confidence: bestMatch.confidence,
        context: this.extractContext(text, bestMatch.value.toString())
      };
    }

    return {
      criterion,
      found: false,
      confidence: 0
    };
  }

  private evaluateSemanticCriterion(
    criterion: CustomCriterion,
    text: string
  ): CriterionMatch {
    const semanticValue = criterion.value as string;
    const words = semanticValue.toLowerCase().split(/\s+/);
    
    // Préparer le TF-IDF
    this.tfidf.addDocument(text.toLowerCase());
    this.tfidf.addDocument(semanticValue.toLowerCase());

    // Calculer la similarité sémantique
    let totalSimilarity = 0;
    let matchedWords = 0;

    words.forEach(word => {
      const similarity = this.tfidf.tfidf(word, 0);  // Document 0 est le texte original
      if (similarity > 0) {
        totalSimilarity += similarity;
        matchedWords++;
      }
    });

    const confidence = matchedWords > 0 ? totalSimilarity / (words.length * matchedWords) : 0;

    if (confidence > 0.3) {  // Seuil minimal de confiance
      return {
        criterion,
        found: true,
        confidence,
        context: this.findBestContext(text, words)
      };
    }

    return {
      criterion,
      found: false,
      confidence: 0
    };
  }

  private findBestContext(text: string, keywords: string[]): string {
    let bestContext = '';
    let bestScore = 0;

    const sentences = text.split(/[.!?]+/);
    sentences.forEach(sentence => {
      const normalizedSentence = sentence.toLowerCase();
      let score = 0;

      keywords.forEach(keyword => {
        if (normalizedSentence.includes(keyword)) {
          score++;
        }
      });

      if (score > bestScore) {
        bestScore = score;
        bestContext = sentence.trim();
      }
    });

    return bestContext;
  }

  public async analyzeCriteria(
    text: string,
    criteria: CustomCriterion[]
  ): Promise<CustomCriteriaAnalysis> {
    const matches: CriterionMatch[] = [];
    const missingRequired: CustomCriterion[] = [];
    const details: {
      [category: string]: {
        score: number;
        matches: CriterionMatch[];
        missing: CustomCriterion[];
      };
    } = {};

    // Analyser chaque critère
    for (const criterion of criteria) {
      let match: CriterionMatch;

      switch (criterion.type) {
        case 'keyword':
          match = this.evaluateKeywordCriterion(criterion, text);
          break;
        case 'regex':
          match = this.evaluateRegexCriterion(criterion, text);
          break;
        case 'numeric':
          match = this.evaluateNumericCriterion(criterion, text);
          break;
        case 'semantic':
          match = this.evaluateSemanticCriterion(criterion, text);
          break;
        case 'boolean':
          match = this.evaluateKeywordCriterion(criterion, text);  // Simplification pour les booléens
          break;
        default:
          throw new Error(`Type de critère non supporté : ${criterion.type}`);
      }

      matches.push(match);

      // Gérer les critères requis manquants
      if (criterion.required && !match.found) {
        missingRequired.push(criterion);
      }

      // Organiser par catégorie
      const category = criterion.category || 'default';
      if (!details[category]) {
        details[category] = {
          score: 0,
          matches: [],
          missing: []
        };
      }

      if (match.found) {
        details[category].matches.push(match);
      } else {
        details[category].missing.push(criterion);
      }
    }

    // Calculer les scores par catégorie
    for (const category of Object.keys(details)) {
      const categoryData = details[category];
      const totalWeight = categoryData.matches.reduce(
        (sum, m) => sum + m.criterion.weight,
        0
      ) + categoryData.missing.reduce(
        (sum, c) => sum + c.weight,
        0
      );

      if (totalWeight > 0) {
        categoryData.score = Math.round(
          (categoryData.matches.reduce(
            (sum, m) => sum + (m.confidence * m.criterion.weight),
            0
          ) / totalWeight) * 100
        );
      }
    }

    // Calculer le score global
    const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
    const score = Math.round(
      (matches.reduce(
        (sum, m) => sum + (m.confidence * m.criterion.weight),
        0
      ) / totalWeight) * 100
    );

    // Générer des recommandations
    const recommendations = this.generateRecommendations(matches, missingRequired);

    return {
      matches,
      score,
      missingRequired,
      recommendations,
      details
    };
  }

  private generateRecommendations(
    matches: CriterionMatch[],
    missingRequired: CustomCriterion[]
  ): string[] {
    const recommendations: string[] = [];

    // Recommandations pour les critères manquants
    if (missingRequired.length > 0) {
      recommendations.push(
        "Critères requis manquants :",
        ...missingRequired.map(c => 
          `- ${c.name}${c.description ? ` (${c.description})` : ''}`
        )
      );
    }

    // Recommandations basées sur les correspondances faibles
    const weakMatches = matches.filter(m => 
      m.found && m.confidence < 0.7 && m.criterion.weight > 0.5
    );

    if (weakMatches.length > 0) {
      recommendations.push(
        "Critères à approfondir :",
        ...weakMatches.map(m =>
          `- ${m.criterion.name} (confiance: ${Math.round(m.confidence * 100)}%)`
        )
      );
    }

    return recommendations;
  }
}

export default CustomCriteriaAnalyzer; 