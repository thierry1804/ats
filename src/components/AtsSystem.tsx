import React, { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { analyzeResume, generateOptimizedPDF, AnalysisResults, analyzeMultipleResumes, MultipleAnalysisResults } from '../services/api';
import '@fortawesome/fontawesome-free/css/all.css';

const AtsSystem: React.FC = () => {
  const [jobDescription, setJobDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null);
  const [multipleAnalysisResults, setMultipleAnalysisResults] = useState<MultipleAnalysisResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const calculateMatchScore = (results: AnalysisResults): number => {
    if (results.matchScore !== null) return results.matchScore;

    let score = 0;
    let totalWeight = 0;

    // Score basé sur les compétences techniques (40%)
    if (results.aiAnalysis?.skillsAnalysis) {
      const technicalSkills = results.aiAnalysis.skillsAnalysis.technical.length;
      const missingSkills = results.aiAnalysis.skillsAnalysis.missing.length;
      const totalSkills = technicalSkills + missingSkills;
      if (totalSkills > 0) {
        score += (technicalSkills / totalSkills) * 40;
      }
      totalWeight += 40;
    }

    // Score basé sur l'expérience (30%)
    if (results.aiAnalysis?.experienceAnalysis) {
      const strengths = results.aiAnalysis.experienceAnalysis.strengths.length;
      const gaps = results.aiAnalysis.experienceAnalysis.gaps.length;
      const totalExp = strengths + gaps;
      if (totalExp > 0) {
        score += (strengths / totalExp) * 30;
      }
      totalWeight += 30;
    }

    // Score basé sur les red flags (30% inversé)
    if (results.redFlags) {
      const redFlagScore = Math.max(0, 30 - (results.redFlags.length * 10));
      score += redFlagScore;
      totalWeight += 30;
    }

    // Normaliser le score si nous avons des poids
    return totalWeight > 0 ? Math.round((score / totalWeight) * 100) : 0;
  };

  const getScoreColorClass = () => {
    if (!analysisResults) return '';
    const score = calculateMatchScore(analysisResults);
    if (score >= 80) return 'bg-green-600';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const canAnalyze = jobDescription.trim() !== '' && selectedFiles.length > 0;

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer?.files || []);
    const validFiles = files.filter(file => isValidFileType(file));
    
    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
      setError(null);
    } else {
      setError('Invalid file type. Please upload PDF, DOC, or DOCX files.');
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => isValidFileType(file));
    
    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
      setError(null);
    } else {
      setError('Invalid file type. Please upload PDF, DOC, or DOCX files.');
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const isValidFileType = (file: File) => {
    const validTypes = ['.pdf', '.doc', '.docx'];
    return validTypes.some(type => file.name.toLowerCase().endsWith(type));
  };

  const handleAnalyzeResumes = async () => {
    if (selectedFiles.length === 0 || !jobDescription.trim()) return;

    setIsLoading(true);
    setError(null);
    setAnalysisResults(null);
    setMultipleAnalysisResults(null);

    try {
      if (selectedFiles.length === 1) {
        const results = await analyzeResume(selectedFiles[0], jobDescription);
        setAnalysisResults(results);
      } else {
        const results = await analyzeMultipleResumes(selectedFiles, jobDescription);
        if (results?.data) {
          setMultipleAnalysisResults(results.data);
        } else {
          throw new Error('Invalid response format from server');
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze resume(s)';
      setError(errorMessage);
      console.error('Analysis error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (selectedFiles.length === 0 || !analysisResults) return;

    setIsLoading(true);
    setError(null);

    try {
      const pdfBlob = await generateOptimizedPDF(selectedFiles[0], analysisResults);
      
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

  // Helper function to safely render arrays
  const safeMap = (array: any[] | undefined, renderFn: (item: any, index: number) => React.ReactNode) => {
    if (!array || !Array.isArray(array)) return null;
    return array.map(renderFn);
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
        <h2 className="text-xl font-semibold mb-3">Upload Resumes</h2>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors ${
            isDragging ? 'border-blue-500 bg-blue-50' : ''
          }`}
          onDragEnter={() => setIsDragging(true)}
          onDragLeave={() => setIsDragging(false)}
        >
          <div>
            <i className="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-3" />
            <p className="text-gray-600">Drag and drop your resumes here or</p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx"
              multiple
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Browse Files
            </button>
          </div>
        </div>

        {/* Selected Files List */}
        {selectedFiles.length > 0 && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Selected Files:</h3>
            <div className="space-y-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                  <span>{file.name}</span>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <i className="fas fa-times" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Analyze Button */}
      <div className="mb-8 text-center">
        <button
          onClick={handleAnalyzeResumes}
          disabled={!canAnalyze || isLoading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Analyzing...' : `Analyze Resume${selectedFiles.length > 1 ? 's' : ''}`}
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
                  style={{ width: `${calculateMatchScore(analysisResults)}%` }}
                />
              </div>
              <p className="text-right mt-1">{calculateMatchScore(analysisResults)}%</p>
            </div>

            {/* Keyword Analysis */}
            <div className="mb-6">
              <h3 className="font-semibold mb-2">Keyword Analysis</h3>
              <div className="space-y-4">
                {analysisResults.skillMatches && analysisResults.skillMatches.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-600">Strong Matches</h4>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {analysisResults.skillMatches.map((match) => (
                        <span
                          key={match}
                          className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                        >
                          {match}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {analysisResults.missingSkills && analysisResults.missingSkills.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-600">Missing Skills</h4>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {analysisResults.missingSkills.map((skill) => (
                        <span
                          key={skill}
                          className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Red Flags */}
            {analysisResults.redFlags && analysisResults.redFlags.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2">Points d'attention</h3>
                <ul className="list-disc pl-5 space-y-2">
                  {analysisResults.redFlags.map((flag, index) => (
                    <li key={index} className="text-red-600">{flag}</li>
                  ))}
                </ul>
              </div>
            )}

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

      {/* Multiple Analysis Results */}
      {multipleAnalysisResults?.comparison && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Comparative Analysis Results</h2>
          
          {/* Global Comparison */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Global Comparison</h3>
            
            {/* Ranking */}
            {multipleAnalysisResults.comparison?.ranking?.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold mb-2">Candidate Ranking</h4>
                <ul className="space-y-2">
                  {safeMap(multipleAnalysisResults.comparison.ranking, (rank: string, index: number) => (
                    <li key={index} className="p-2 bg-gray-50 rounded">
                      {rank}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Strength Comparison */}
            {multipleAnalysisResults.comparison?.strengthComparison && multipleAnalysisResults.comparison.strengthComparison.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold mb-2">Comparative Analysis</h4>
                <ul className="list-disc pl-5 space-y-2">
                  {safeMap(multipleAnalysisResults.comparison.strengthComparison, (comparison: string, index: number) => (
                    <li key={index} className="text-gray-700">{comparison}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {multipleAnalysisResults.comparison?.recommendations && multipleAnalysisResults.comparison.recommendations.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold mb-2">Global Recommendations</h4>
                <ul className="list-disc pl-5 space-y-2">
                  {safeMap(multipleAnalysisResults.comparison.recommendations, (recommendation: string, index: number) => (
                    <li key={index} className="text-gray-700">{recommendation}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Individual Analyses */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Individual Analyses</h3>
            {Object.entries(multipleAnalysisResults.candidates).map(([candidateName, analysis]) => (
              <div key={candidateName} className="bg-white rounded-lg shadow p-6">
                <h4 className="text-lg font-semibold mb-4 pb-2 border-b">
                  {candidateName}
                  <span className={`ml-4 px-3 py-1 rounded-full text-sm ${
                    calculateMatchScore(analysis) >= 80 ? 'bg-green-100 text-green-800' :
                    calculateMatchScore(analysis) >= 60 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    Match Score: {calculateMatchScore(analysis)}%
                  </span>
                </h4>

                {/* Key Findings */}
                {analysis.aiAnalysis?.keyFindings && analysis.aiAnalysis.keyFindings.length > 0 && (
                  <div className="mb-4">
                    <h5 className="font-semibold mb-2">Key Findings</h5>
                    <ul className="list-disc pl-5 space-y-1">
                      {analysis.aiAnalysis.keyFindings.map((finding, idx) => (
                        <li key={idx} className="text-gray-700">{finding}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Keywords Analysis */}
                <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Strong Matches */}
                  {analysis.skillMatches && analysis.skillMatches.length > 0 && (
                  <div>
                    <h5 className="font-semibold mb-2">Strong Matches</h5>
                    <div className="flex flex-wrap gap-2">
                        {analysis.skillMatches.map((match, idx) => (
                        <span key={idx} className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                          {match}
                        </span>
                      ))}
                    </div>
                  </div>
                  )}

                  {/* Missing Skills */}
                  {analysis.missingSkills && analysis.missingSkills.length > 0 && (
                  <div>
                      <h5 className="font-semibold mb-2">Missing Skills</h5>
                    <div className="flex flex-wrap gap-2">
                        {analysis.missingSkills.map((skill, idx) => (
                        <span key={idx} className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                            {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  )}
                </div>

                {/* Skills Analysis */}
                {analysis.aiAnalysis?.skillsAnalysis && (
                  <div className="mb-4">
                    <h5 className="font-semibold mb-2">Skills Analysis</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Technical Skills */}
                      <div>
                        <h6 className="text-sm font-medium text-gray-600 mb-1">Technical Skills</h6>
                        <ul className="list-disc pl-5 space-y-1">
                          {analysis.aiAnalysis.skillsAnalysis.technical.map((skill, idx) => (
                            <li key={idx} className="text-gray-700">{skill}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Soft Skills */}
                      {analysis.aiAnalysis.skillsAnalysis.soft.length > 0 && (
                        <div>
                          <h6 className="text-sm font-medium text-gray-600 mb-1">Soft Skills</h6>
                          <ul className="list-disc pl-5 space-y-1">
                            {analysis.aiAnalysis.skillsAnalysis.soft.map((skill, idx) => (
                              <li key={idx} className="text-gray-700">{skill}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Improvements */}
                {analysis.aiAnalysis?.suggestedImprovements && analysis.aiAnalysis.suggestedImprovements.length > 0 && (
                  <div className="mb-4">
                    <h5 className="font-semibold mb-2">Suggested Improvements</h5>
                    <ul className="list-disc pl-5 space-y-1">
                      {analysis.aiAnalysis.suggestedImprovements.map((improvement, idx) => (
                        <li key={idx} className="text-gray-700">{improvement}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AtsSystem; 