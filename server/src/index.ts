import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { analyzeResume, analyzeMultipleCandidates } from './services/resumeAnalyzer';
import { generateOptimizedPDF } from './services/pdfGenerator';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

// Configure multer for multiple file uploads
const multipleUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 10 // Maximum 10 files at once
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, and DOCX files are allowed.'));
    }
  }
});

// Routes
app.post('/api/analyze', upload.single('resume'), async (req, res) => {
  try {
    const { jobDescription } = req.body;
    const resumeFile = req.file;

    if (!jobDescription || !resumeFile) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const results = await analyzeResume(resumeFile.path, jobDescription);
    res.json(results);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze resume' });
  }
});

app.post('/api/generate-pdf', upload.single('resume'), async (req, res) => {
  try {
    const resumeFile = req.file;
    const analysisResults = JSON.parse(req.body.analysisResults);

    if (!resumeFile || !analysisResults) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const pdfBuffer = await generateOptimizedPDF(resumeFile.path, analysisResults);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=optimized-resume.pdf');
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// Endpoint for analyzing multiple resumes
app.post('/api/analyze-multiple', multipleUpload.array('resumes', 10), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    const jobDescription = req.body.jobDescription;

    if (!files || files.length === 0) {
      return res.status(400).json({ 
        error: 'No resume files provided',
        message: 'Please select at least one resume file to analyze.'
      });
    }

    if (!jobDescription) {
      return res.status(400).json({ 
        error: 'Job description is required',
        message: 'Please provide a job description for analysis.'
      });
    }

    // Convert files array to object with candidate names
    const resumeFiles: { [key: string]: Express.Multer.File } = {};
    files.forEach((file) => {
      // Use original filename without extension as candidate name
      const candidateName = file.originalname.replace(/\.[^/.]+$/, '');
      resumeFiles[candidateName] = file;
    });

    const analysis = await analyzeMultipleCandidates(resumeFiles, jobDescription);
    res.json({
      success: true,
      data: analysis,
      message: `Successfully analyzed ${files.length} resume${files.length > 1 ? 's' : ''}`
    });

  } catch (error) {
    console.error('Error in multiple resume analysis endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to analyze resumes',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 