import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { analyzeResume } from './services/resumeAnalyzer';
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

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 