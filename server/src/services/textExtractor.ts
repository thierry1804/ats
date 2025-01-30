import { createWorker } from 'tesseract.js';
import pdf2img from 'pdf-img-convert';
import { JSDOM } from 'jsdom';
import mammoth from 'mammoth';

interface ExtractedSection {
  title: string;
  content: string;
  confidence: number;
}

interface ExtractedDocument {
  sections: ExtractedSection[];
  metadata: {
    format: string;
    pageCount?: number;
    language?: string;
    confidence: number;
  };
}

class TextExtractor {
  private static instance: TextExtractor;
  private ocrWorker: any = null;

  private constructor() {}

  public static getInstance(): TextExtractor {
    if (!TextExtractor.instance) {
      TextExtractor.instance = new TextExtractor();
    }
    return TextExtractor.instance;
  }

  public async initialize(): Promise<void> {
    if (!this.ocrWorker) {
      this.ocrWorker = await createWorker('fra+eng');
    }
  }

  public async cleanup(): Promise<void> {
    if (this.ocrWorker) {
      await this.ocrWorker.terminate();
      this.ocrWorker = null;
    }
  }

  private async extractFromPDF(buffer: Buffer): Promise<ExtractedDocument> {
    try {
      // Convertir le PDF en images
      const images = await pdf2img.convert(buffer);
      const sections: ExtractedSection[] = [];
      let totalConfidence = 0;

      // Extraire le texte de chaque page avec OCR
      for (let i = 0; i < images.length; i++) {
        const {
          data: { text, confidence }
        } = await this.ocrWorker.recognize(images[i]);

        // Analyser la structure du texte
        const extractedSections = this.parseTextIntoSections(text);
        sections.push(...extractedSections);
        totalConfidence += confidence;
      }

      return {
        sections,
        metadata: {
          format: 'pdf',
          pageCount: images.length,
          confidence: totalConfidence / images.length
        }
      };
    } catch (error) {
      console.error('Erreur lors de l\'extraction du PDF:', error);
      throw error;
    }
  }

  private async extractFromDOCX(buffer: Buffer): Promise<ExtractedDocument> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const sections = this.parseTextIntoSections(result.value);

      return {
        sections,
        metadata: {
          format: 'docx',
          confidence: 1.0
        }
      };
    } catch (error) {
      console.error('Erreur lors de l\'extraction du DOCX:', error);
      throw error;
    }
  }

  private async extractFromHTML(content: string): Promise<ExtractedDocument> {
    try {
      const dom = new JSDOM(content);
      const document = dom.window.document;
      const sections: ExtractedSection[] = [];

      // Extraire le contenu des balises sémantiques courantes
      const semanticTags = ['header', 'section', 'article', 'main', 'div'];
      for (const tag of semanticTags) {
        const elements = document.getElementsByTagName(tag);
        for (const element of Array.from(elements)) {
          const title = element.getAttribute('class') || element.getAttribute('id') || tag;
          sections.push({
            title,
            content: element.textContent || '',
            confidence: 1.0
          });
        }
      }

      return {
        sections,
        metadata: {
          format: 'html',
          confidence: 1.0
        }
      };
    } catch (error) {
      console.error('Erreur lors de l\'extraction du HTML:', error);
      throw error;
    }
  }

  private parseTextIntoSections(text: string): ExtractedSection[] {
    const sections: ExtractedSection[] = [];
    const lines = text.split('\n').map(line => line.trim());
    let currentSection: ExtractedSection | null = null;

    const sectionHeaders = [
      'EXPÉRIENCE',
      'EXPERIENCE',
      'FORMATION',
      'EDUCATION',
      'COMPÉTENCES',
      'COMPETENCES',
      'SKILLS',
      'PROJETS',
      'PROJECTS',
      'LANGUES',
      'LANGUAGES',
      'CERTIFICATIONS',
      'CENTRES D\'INTÉRÊT',
      'INTERESTS'
    ];

    for (const line of lines) {
      if (line.length === 0) continue;

      // Vérifier si la ligne est un en-tête de section
      const isHeader = sectionHeaders.some(header =>
        line.toUpperCase().includes(header)
      );

      if (isHeader) {
        // Sauvegarder la section précédente si elle existe
        if (currentSection && currentSection.content.trim()) {
          sections.push(currentSection);
        }

        // Créer une nouvelle section
        currentSection = {
          title: line,
          content: '',
          confidence: 1.0
        };
      } else if (currentSection) {
        // Ajouter la ligne au contenu de la section courante
        currentSection.content += line + '\n';
      } else {
        // Si aucune section n'est encore définie, créer une section "En-tête"
        currentSection = {
          title: 'En-tête',
          content: line + '\n',
          confidence: 1.0
        };
      }
    }

    // Ajouter la dernière section
    if (currentSection && currentSection.content.trim()) {
      sections.push(currentSection);
    }

    return sections;
  }

  public async extractText(
    buffer: Buffer,
    filename: string
  ): Promise<ExtractedDocument> {
    const ext = filename.toLowerCase().split('.').pop();

    switch (ext) {
      case 'pdf':
        return this.extractFromPDF(buffer);
      case 'docx':
      case 'doc':
        return this.extractFromDOCX(buffer);
      case 'html':
      case 'htm':
        return this.extractFromHTML(buffer.toString());
      default:
        throw new Error(`Format de fichier non supporté: ${ext}`);
    }
  }

  public cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')  // Remplacer les espaces multiples par un seul espace
      .replace(/[^\S\r\n]+/g, ' ')  // Nettoyer les espaces horizontaux tout en préservant les sauts de ligne
      .replace(/\n{3,}/g, '\n\n')  // Réduire les sauts de ligne multiples à deux maximum
      .trim();
  }

  public normalizeText(text: string): string {
    return text
      .normalize('NFD')  // Décomposer les caractères accentués
      .replace(/[\u0300-\u036f]/g, '')  // Supprimer les diacritiques
      .toLowerCase();  // Convertir en minuscules
  }
}

export default TextExtractor; 