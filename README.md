# ATS Resume Analyzer

An intelligent ATS (Applicant Tracking System) powered by AI to analyze and compare resumes against job descriptions.

## Features

### Single Resume Analysis
- Upload and analyze individual resumes (PDF, DOC, DOCX)
- Match score calculation
- Keyword analysis (matches and missing keywords)
- Detailed AI analysis of skills and experience
- Generate optimized PDF with analysis results

### Multiple Resume Analysis (New!)
- Upload and analyze multiple resumes simultaneously
- Comparative analysis between candidates
- Global ranking and recommendations
- Individual detailed analysis for each candidate
- Strength comparison across all candidates
- Unique strengths identification per candidate

### Technical Features
- Real-time analysis using Gemini AI
- Support for multiple file formats (PDF, DOC, DOCX)
- Drag and drop file upload
- Responsive design
- Error handling and validation

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- XAMPP (for local development)

### Installation

1. Clone the repository:
```bash
git clone [repository-url]
```

2. Install dependencies:
```bash
# Install frontend dependencies
npm install

# Install server dependencies
cd server
npm install
```

3. Set up environment variables:
Create a `.env` file in the server directory with:
```env
GEMINI_API_KEY=your_gemini_api_key
```

4. Start the development servers:
```bash
# Start frontend (from root directory)
npm run dev

# Start backend (from server directory)
npm run dev
```

## Usage

1. Enter the job description in the text area
2. Upload one or multiple resumes using drag & drop or file browser
3. Click "Analyze Resume(s)" to start the analysis
4. View the detailed analysis results:
   - For single resume: Match score, keywords, skills analysis, and recommendations
   - For multiple resumes: Comparative analysis, ranking, and individual detailed analysis

## Technologies Used

### Frontend
- React with TypeScript
- Tailwind CSS
- Vite

### Backend
- Node.js with Express
- Google Gemini AI
- PDF parsing and processing

## Contributing

1. Create a feature branch (`git checkout -b feature/AmazingFeature`)
2. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
3. Push to the branch (`git push origin feature/AmazingFeature`)
4. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details

## Contact

Thierry RANDRIANTIANA - thierry1804@gmail.com
Lien du projet : [https://github.com/thierry1804/ats](https://github.com/thierry1804/ats) 
