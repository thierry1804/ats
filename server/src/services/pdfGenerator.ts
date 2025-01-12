import PDFDocument from 'pdfkit';
import fs from 'fs/promises';
import { extractTextFromFile } from './resumeAnalyzer';

interface AnalysisResults {
  matchScore: number;
  missingKeywords: string[];
  strongMatches: string[];
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

export async function generateOptimizedPDF(
  resumePath: string,
  analysisResults: AnalysisResults
): Promise<Buffer> {
  const doc = new PDFDocument();
  const chunks: Buffer[] = [];

  // Collect PDF data chunks
  doc.on('data', (chunk) => chunks.push(chunk));

  try {
    // Extract original resume text
    const resumeText = await extractTextFromFile(resumePath);

    // Add title
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('Optimized Resume', { align: 'center' })
      .moveDown();

    // Add match score
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('ATS Match Score:', { continued: true })
      .font('Helvetica')
      .text(` ${analysisResults.matchScore}%`)
      .moveDown();

    // Add strong matches section
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('Strong Matches:')
      .fontSize(12)
      .font('Helvetica');

    analysisResults.strongMatches.forEach(match => {
      doc.text(`• ${match}`);
    });
    doc.moveDown();

    // Add missing keywords section
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('Missing Keywords:')
      .fontSize(12)
      .font('Helvetica');

    analysisResults.missingKeywords.forEach(keyword => {
      doc.text(`• ${keyword}`);
    });
    doc.moveDown();

    // Add AI Analysis if available
    if (analysisResults.aiAnalysis) {
      // Key Findings
      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('Key Findings:')
        .fontSize(12)
        .font('Helvetica');

      analysisResults.aiAnalysis.keyFindings.forEach(finding => {
        doc.text(`• ${finding}`);
      });
      doc.moveDown();

      // Suggested Improvements
      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('Suggested Improvements:')
        .fontSize(12)
        .font('Helvetica');

      analysisResults.aiAnalysis.suggestedImprovements.forEach(improvement => {
        doc.text(`• ${improvement}`);
      });
      doc.moveDown();

      // Skills Analysis
      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('Skills Analysis:')
        .fontSize(12)
        .font('Helvetica');

      doc.text('Technical Skills:');
      analysisResults.aiAnalysis.skillsAnalysis.technical.forEach(skill => {
        doc.text(`• ${skill}`);
      });
      doc.moveDown(0.5);

      doc.text('Soft Skills:');
      analysisResults.aiAnalysis.skillsAnalysis.soft.forEach(skill => {
        doc.text(`• ${skill}`);
      });
      doc.moveDown(0.5);

      doc.text('Missing Skills:');
      analysisResults.aiAnalysis.skillsAnalysis.missing.forEach(skill => {
        doc.text(`• ${skill}`);
      });
      doc.moveDown(0.5);

      doc.text('Skills Recommendations:');
      analysisResults.aiAnalysis.skillsAnalysis.recommendations.forEach(rec => {
        doc.text(`• ${rec}`);
      });
      doc.moveDown();

      // Experience Analysis
      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('Experience Analysis:')
        .fontSize(12)
        .font('Helvetica');

      doc.text('Strengths:');
      analysisResults.aiAnalysis.experienceAnalysis.strengths.forEach(strength => {
        doc.text(`• ${strength}`);
      });
      doc.moveDown(0.5);

      doc.text('Gaps:');
      analysisResults.aiAnalysis.experienceAnalysis.gaps.forEach(gap => {
        doc.text(`• ${gap}`);
      });
      doc.moveDown(0.5);

      doc.text('Experience Recommendations:');
      analysisResults.aiAnalysis.experienceAnalysis.recommendations.forEach(rec => {
        doc.text(`• ${rec}`);
      });
      doc.moveDown();
    }

    // Add original resume content
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('Original Resume Content:')
      .fontSize(12)
      .font('Helvetica')
      .moveDown()
      .text(resumeText);

    // End the document
    doc.end();

    // Return promise that resolves with the complete PDF buffer
    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      doc.on('error', reject);
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
} 