import PDFDocument from 'pdfkit';
import fs from 'fs/promises';
import { extractTextFromFile } from './resumeAnalyzer';

interface AnalysisResults {
  matchScore: number;
  missingKeywords: string[];
  strongMatches: string[];
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

    // Add suggested improvements section
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('Suggested Improvements:')
      .fontSize(12)
      .font('Helvetica');

    doc.text('Consider adding these keywords to your resume:');
    analysisResults.missingKeywords.forEach(keyword => {
      doc.text(`• ${keyword}`);
    });
    doc.moveDown();

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