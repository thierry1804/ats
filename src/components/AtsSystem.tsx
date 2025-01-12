import React, { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { analyzeResume, generateOptimizedPDF, AnalysisResults } from '../services/api';
import '@fortawesome/fontawesome-free/css/all.css';

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
    };
    experienceAnalysis: {
      strengths: string[];
      gaps: string[];
    };
  };
}

const AtsSystem: React.FC = () => {
  const [jobDescription, setJobDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canAnalyze = jobDescription.trim() !== '' && selectedFile !== null;

  const getScoreColorClass = () => {
    const score = analysisResults?.matchScore || 0;
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (isValidFileType(file)) {
        setSelectedFile(file);
        setError(null);
      } else {
        setError('Invalid file type. Please upload a PDF, DOC, or DOCX file.');
      }
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (isValidFileType(file)) {
        setSelectedFile(file);
        setError(null);
      } else {
        setError('Invalid file type. Please upload a PDF, DOC, or DOCX file.');
      }
    }
  };

  const isValidFileType = (file: File) => {
    const validTypes = ['.pdf', '.doc', '.docx'];
    return validTypes.some(type => file.name.toLowerCase().endsWith(type));
  };

  const handleAnalyzeResume = async () => {
    if (!selectedFile || !jobDescription.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const results = await analyzeResume(selectedFile, jobDescription);
      setAnalysisResults(results);
    } catch (err) {
      setError('Failed to analyze resume. Please try again.');
      console.error('Analysis error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!selectedFile || !analysisResults) return;

    setIsLoading(true);
    setError(null);

    try {
      const pdfBlob = await generateOptimizedPDF(selectedFile, analysisResults);
      
      // Create download link
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'optimized-resume.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to generate PDF. Please try again.');
      console.error('PDF generation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-8">ATS Resume Analyzer</h1>
      
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}
      
      {/* Job Description Input */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Job Description</h2>
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the job description here..."
          className="w-full h-48 p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Resume Upload */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Upload Resume</h2>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors ${
            isDragging ? 'border-blue-500 bg-blue-50' : ''
          }`}
          onDragEnter={() => setIsDragging(true)}
          onDragLeave={() => setIsDragging(false)}
        >
          {!selectedFile ? (
            <div>
              <i className="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-3" />
              <p className="text-gray-600">Drag and drop your resume here or</p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Browse Files
              </button>
            </div>
          ) : (
            <div className="text-green-600">
              <i className="fas fa-check-circle text-2xl mb-2" />
              <p>{selectedFile.name}</p>
              <button
                onClick={() => setSelectedFile(null)}
                className="mt-2 text-red-500 hover:text-red-600"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Analysis Results */}
      {analysisResults && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Analysis Results</h2>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Match Score</h3>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className={`h-4 rounded-full transition-all duration-500 ${getScoreColorClass()}`}
                  style={{ width: `${analysisResults.matchScore}%` }}
                />
              </div>
              <p className="text-right mt-1">{analysisResults.matchScore}%</p>
            </div>

            {/* AI Analysis */}
            {analysisResults.aiAnalysis && (
              <>
                {/* Key Findings */}
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Key Findings</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {analysisResults.aiAnalysis.keyFindings.map((finding, index) => (
                      <li key={index} className="text-gray-700">{finding}</li>
                    ))}
                  </ul>
                </div>

                {/* Skills Analysis */}
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Skills Analysis</h3>
                  
                  {/* Technical Skills */}
                  <div className="mb-2">
                    <h4 className="text-sm font-medium text-gray-600">Technical Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysisResults.aiAnalysis.skillsAnalysis.technical.map((skill, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Soft Skills */}
                  <div className="mb-2">
                    <h4 className="text-sm font-medium text-gray-600">Soft Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysisResults.aiAnalysis.skillsAnalysis.soft.map((skill, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Missing Skills */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-600">Missing Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysisResults.aiAnalysis.skillsAnalysis.missing.map((skill, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Experience Analysis */}
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Experience Analysis</h3>
                  
                  {/* Strengths */}
                  <div className="mb-2">
                    <h4 className="text-sm font-medium text-gray-600">Strengths</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {analysisResults.aiAnalysis.experienceAnalysis.strengths.map((strength, index) => (
                        <li key={index} className="text-gray-700">{strength}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Gaps */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-600">Areas for Improvement</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {analysisResults.aiAnalysis.experienceAnalysis.gaps.map((gap, index) => (
                        <li key={index} className="text-gray-700">{gap}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Suggested Improvements */}
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Suggested Improvements</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {analysisResults.aiAnalysis.suggestedImprovements.map((improvement, index) => (
                      <li key={index} className="text-gray-700">{improvement}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {/* Original Keyword Analysis */}
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Keyword Analysis</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-600">Strong Matches</h4>
                  <div className="flex flex-wrap gap-2">
                    {analysisResults.strongMatches.map((match) => (
                      <span
                        key={match}
                        className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                      >
                        {match}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-600">Missing Keywords</h4>
                  <div className="flex flex-wrap gap-2">
                    {analysisResults.missingKeywords.map((keyword) => (
                      <span
                        key={keyword}
                        className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        <button
          onClick={handleAnalyzeResume}
          disabled={!canAnalyze || isLoading}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Analyzing...' : 'Analyze Resume'}
        </button>
        <button
          onClick={handleGeneratePDF}
          disabled={!analysisResults || isLoading}
          className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Generating...' : 'Generate Optimized PDF'}
        </button>
      </div>
    </div>
  );
};

export default AtsSystem; 