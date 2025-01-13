import React, { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { analyzeResume, generateOptimizedPDF, AnalysisResults, Analysis } from '../services/api';
import AnalysisHistory from './AnalysisHistory';
import '@fortawesome/fontawesome-free/css/all.css';

const AtsSystem: React.FC = () => {
  const [jobDescription, setJobDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getScoreColorClass = () => {
    if (!analysisResults) return '';
    if (analysisResults.matchScore >= 80) return 'bg-green-600';
    if (analysisResults.matchScore >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const canAnalyze = jobDescription.trim() !== '' && selectedFile !== null;

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

  const handleLoadAnalysis = (analysis: Analysis) => {
    setAnalysisResults({
      matchScore: analysis.match_score,
      missingKeywords: analysis.missing_keywords,
      strongMatches: analysis.strong_matches,
      aiAnalysis: {
        keyFindings: analysis.ai_analysis.key_findings,
        suggestedImprovements: analysis.ai_analysis.suggested_improvements,
        skillsAnalysis: analysis.ai_analysis.skills_analysis,
        experienceAnalysis: analysis.ai_analysis.experience_analysis
      }
    });
    setJobDescription(analysis.job_description);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-8">ATS Resume Analyzer</h1>
      
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
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

          {/* Analyze Button */}
          <div className="mb-8 text-center">
            <button
              onClick={handleAnalyzeResume}
              disabled={!canAnalyze || isLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Analyzing...' : 'Analyze Resume'}
            </button>
          </div>

          {/* Analysis Results */}
          {analysisResults && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-3">Analysis Results</h2>
              <div className="bg-white rounded-lg shadow p-6">
                {/* Match Score */}
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

                {/* Keyword Analysis */}
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">Keyword Analysis</h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-600">Strong Matches</h4>
                      <div className="flex flex-wrap gap-2 mt-2">
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
                      <div className="flex flex-wrap gap-2 mt-2">
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

                {/* AI Analysis */}
                {analysisResults.aiAnalysis && (
                  <>
                    {/* Key Findings */}
                    <div className="mb-6">
                      <h3 className="font-semibold mb-2">Key Findings</h3>
                      <ul className="list-disc pl-5 space-y-2">
                        {analysisResults.aiAnalysis.keyFindings.map((finding, index) => (
                          <li key={index} className="text-gray-700">{finding}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Suggested Improvements */}
                    <div className="mb-6">
                      <h3 className="font-semibold mb-2">Suggested Improvements</h3>
                      <ul className="list-disc pl-5 space-y-2">
                        {analysisResults.aiAnalysis.suggestedImprovements.map((improvement, index) => (
                          <li key={index} className="text-gray-700">{improvement}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Skills Analysis */}
                    <div className="mb-6">
                      <h3 className="font-semibold mb-2">Skills Analysis</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium text-gray-600 mb-2">Technical Skills</h4>
                          <ul className="list-disc pl-5 space-y-1">
                            {analysisResults.aiAnalysis.skillsAnalysis.technical.map((skill, index) => (
                              <li key={index} className="text-gray-700">{skill}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-600 mb-2">Soft Skills</h4>
                          <ul className="list-disc pl-5 space-y-1">
                            {analysisResults.aiAnalysis.skillsAnalysis.soft.map((skill, index) => (
                              <li key={index} className="text-gray-700">{skill}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-600 mb-2">Missing Skills</h4>
                          <ul className="list-disc pl-5 space-y-1">
                            {analysisResults.aiAnalysis.skillsAnalysis.missing.map((skill, index) => (
                              <li key={index} className="text-gray-700">{skill}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-600 mb-2">Recommendations</h4>
                          <ul className="list-disc pl-5 space-y-1">
                            {analysisResults.aiAnalysis.skillsAnalysis.recommendations.map((rec, index) => (
                              <li key={index} className="text-gray-700">{rec}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Experience Analysis */}
                    <div className="mb-6">
                      <h3 className="font-semibold mb-2">Experience Analysis</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium text-gray-600 mb-2">Strengths</h4>
                          <ul className="list-disc pl-5 space-y-1">
                            {analysisResults.aiAnalysis.experienceAnalysis.strengths.map((strength, index) => (
                              <li key={index} className="text-gray-700">{strength}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-600 mb-2">Gaps</h4>
                          <ul className="list-disc pl-5 space-y-1">
                            {analysisResults.aiAnalysis.experienceAnalysis.gaps.map((gap, index) => (
                              <li key={index} className="text-gray-700">{gap}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="md:col-span-2">
                          <h4 className="text-sm font-medium text-gray-600 mb-2">Recommendations</h4>
                          <ul className="list-disc pl-5 space-y-1">
                            {analysisResults.aiAnalysis.experienceAnalysis.recommendations.map((rec, index) => (
                              <li key={index} className="text-gray-700">{rec}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Actions */}
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleGeneratePDF}
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoading ? 'Generating...' : 'Generate Optimized PDF'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <AnalysisHistory onLoadAnalysis={handleLoadAnalysis} />
        </div>
      </div>
    </div>
  );
};

export default AtsSystem; 