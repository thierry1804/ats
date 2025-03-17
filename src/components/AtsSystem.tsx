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
    // Si le score est déjà calculé, l'utiliser directement
    if (results.matchScore !== null && results.matchScore !== undefined) {
      return results.matchScore;
    }

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
    } else if (results.skillMatches && results.missingSkills) {
      // Utiliser les données alternatives si disponibles
      const skillMatches = results.skillMatches.length;
      const missingSkills = results.missingSkills.length;
      const totalSkills = skillMatches + missingSkills;
      
      if (totalSkills > 0) {
        score += (skillMatches / totalSkills) * 40;
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
    } else if (results.experienceMatches) {
      // Valeur par défaut si nous avons des correspondances d'expérience
      score += 15;
      totalWeight += 30;
    }

    // Score basé sur les red flags (30% inversé)
    if (results.redFlags) {
      const redFlagScore = Math.max(0, 30 - (results.redFlags.length * 10));
      score += redFlagScore;
      totalWeight += 30;
    } else {
      // Si pas de red flags, score maximum pour cette catégorie
      score += 30;
      totalWeight += 30;
    }

    // Normaliser le score si nous avons des poids
    return totalWeight > 0 ? Math.round((score / totalWeight) * 100) : 0;
  };

  const calculateScoreDetails = (results: AnalysisResults) => {
    // Vérifier si les données d'analyse sont disponibles
    const hasTechnicalAnalysis = results.aiAnalysis?.skillsAnalysis && 
      (results.aiAnalysis.skillsAnalysis.technical.length > 0 || 
       results.aiAnalysis.skillsAnalysis.missing.length > 0);
    
    const hasExperienceAnalysis = results.aiAnalysis?.experienceAnalysis && 
      (results.aiAnalysis.experienceAnalysis.strengths.length > 0 || 
       results.aiAnalysis.experienceAnalysis.gaps.length > 0);

    // Calculer le score technique
    let technicalScore = 0;
    if (hasTechnicalAnalysis) {
      const technicalSkills = results.aiAnalysis!.skillsAnalysis.technical.length;
      const missingSkills = results.aiAnalysis!.skillsAnalysis.missing.length;
      const totalSkills = technicalSkills + missingSkills;
      
      if (totalSkills > 0) {
        technicalScore = Math.round((technicalSkills / totalSkills) * 40);
      } else if (results.skillMatches && results.missingSkills) {
        // Utiliser les données alternatives si disponibles
        const skillMatches = results.skillMatches.length;
        const missingSkills = results.missingSkills.length;
        const totalSkills = skillMatches + missingSkills;
        
        if (totalSkills > 0) {
          technicalScore = Math.round((skillMatches / totalSkills) * 40);
        }
      }
    } else if (results.skillMatches && results.missingSkills) {
      // Utiliser les données alternatives si disponibles
      const skillMatches = results.skillMatches.length;
      const missingSkills = results.missingSkills.length;
      const totalSkills = skillMatches + missingSkills;
      
      if (totalSkills > 0) {
        technicalScore = Math.round((skillMatches / totalSkills) * 40);
      }
    }

    // Calculer le score d'expérience
    let experienceScore = 0;
    if (hasExperienceAnalysis) {
      const strengths = results.aiAnalysis!.experienceAnalysis.strengths.length;
      const gaps = results.aiAnalysis!.experienceAnalysis.gaps.length;
      const totalExp = strengths + gaps;
      
      if (totalExp > 0) {
        experienceScore = Math.round((strengths / totalExp) * 30);
      }
    } else if (results.experienceMatches) {
      // Utiliser les données alternatives si disponibles
      experienceScore = 15; // Valeur par défaut si nous avons des correspondances d'expérience
    }

    // Calculer le score des red flags
    const redFlagScore = results.redFlags ? 
      Math.max(0, 30 - (results.redFlags.length * 10)) : 30;

    // Si le score global est disponible mais les détails ne sont pas calculables,
    // répartir le score global proportionnellement
    if (!hasTechnicalAnalysis && !hasExperienceAnalysis && results.matchScore) {
      const totalScore = results.matchScore;
      technicalScore = Math.round(totalScore * 0.4); // 40% du score total
      experienceScore = Math.round(totalScore * 0.3); // 30% du score total
    }

    return {
      technical: {
        score: technicalScore,
        present: hasTechnicalAnalysis ? results.aiAnalysis!.skillsAnalysis.technical.length : 
                (results.skillMatches ? results.skillMatches.length : 0),
        total: hasTechnicalAnalysis ? 
                (results.aiAnalysis!.skillsAnalysis.technical.length + 
                 results.aiAnalysis!.skillsAnalysis.missing.length) : 
                ((results.skillMatches ? results.skillMatches.length : 0) + 
                 (results.missingSkills ? results.missingSkills.length : 0))
      },
      experience: {
        score: experienceScore,
        strengths: hasExperienceAnalysis ? results.aiAnalysis!.experienceAnalysis.strengths.length : 0,
        total: hasExperienceAnalysis ? 
                (results.aiAnalysis!.experienceAnalysis.strengths.length + 
                 results.aiAnalysis!.experienceAnalysis.gaps.length) : 
                (results.experienceMatches ? results.experienceMatches.length : 0)
      },
      redFlags: {
        score: redFlagScore,
        count: results.redFlags?.length || 0,
        penalty: results.redFlags?.length ? Math.min(30, results.redFlags.length * 10) : 0
      }
    };
  };

  const getScoreColorClass = () => {
    if (!analysisResults) return '';
    const score = calculateMatchScore(analysisResults);
    if (score >= 80) return 'bg-green-500';
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
    <div className="w-full">
      <h1 className="text-3xl font-bold text-center mb-8">ATS Resume Analyzer</h1>
      
      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg border border-red-200 shadow-sm animate-fade-in">
          <div className="flex items-center">
            <i className="fas fa-exclamation-circle mr-2 text-red-500"></i>
            <span>{error}</span>
          </div>
        </div>
      )}
      
      {/* Main two-column layout */}
      <div className="flex flex-col lg:flex-row w-full gap-6">
        {/* Left Column - 1/3 width */}
        <div className="w-full lg:w-1/3 space-y-6">
          {/* Resume Upload */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 card-hover">
            <h2 className="text-xl font-semibold mb-3 text-secondary-dark">Upload Resumes</h2>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary hover:bg-primary/5'
              }`}
              onDragEnter={() => setIsDragging(true)}
              onDragLeave={() => setIsDragging(false)}
            >
              <div>
                <i className="fas fa-cloud-upload-alt text-4xl text-primary mb-3" />
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
                  className="btn-primary mt-2"
                >
                  Browse Files
                </button>
              </div>
            </div>

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <div className="mt-4 animate-fade-in">
                <h3 className="font-semibold mb-2 text-gray-700">Selected Files:</h3>
                <div className="space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <span className="flex items-center">
                        <i className="fas fa-file-alt text-primary mr-2"></i>
                        {file.name}
                      </span>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <i className="fas fa-times" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Job Description Input */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 card-hover">
            <h2 className="text-xl font-semibold mb-3 text-secondary-dark">Job Description</h2>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here..."
              className="w-full h-48 p-4 border border-gray-200 rounded-lg focus-ring resize-none"
            />
          </div>

          {/* Analyze Button */}
          <div className="text-center">
            <button
              onClick={handleAnalyzeResumes}
              disabled={!canAnalyze || isLoading}
              className="btn-secondary px-6 py-3 w-full disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Analyzing...
                </span>
              ) : (
                `Analyze Resume${selectedFiles.length > 1 ? 's' : ''}`
              )}
            </button>
          </div>
        </div>

        {/* Right Column - 2/3 width */}
        <div className="w-full lg:w-2/3">
          {/* Analysis Results */}
          {analysisResults ? (
            <div className="animate-fade-in">
              <h2 className="text-xl font-semibold mb-3 text-secondary-dark">Analysis Results</h2>
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 card-hover">
                {/* Header with Model Info and Score */}
                <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary-dark mb-3 md:mb-0">
                    <i className="fas fa-robot mr-1"></i> Powered by Gemini Pro
                  </span>
                  
                  <div className="flex items-center">
                    <span className="mr-2 font-semibold">Match Score:</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      calculateMatchScore(analysisResults) >= 80 ? 'bg-green-100 text-green-800' :
                      calculateMatchScore(analysisResults) >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {calculateMatchScore(analysisResults)}%
                    </span>
                  </div>
                </div>
                
                {/* Main Content */}
                <div className="space-y-6">
                  {/* Score Details */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <h4 className="text-sm font-medium text-gray-600 mb-3">Score Details</h4>
                    {(() => {
                      const details = calculateScoreDetails(analysisResults);
                      return (
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium text-primary-dark">Technical Skills (40%)</span>
                              <span className="font-medium">{details.technical.score}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                              <div
                                className="h-2 rounded-full bg-primary"
                                style={{ width: `${details.technical.score / 40 * 100}%` }}
                              />
                            </div>
                            <div className="text-xs text-gray-500">
                              {details.technical.present} skills present / {details.technical.total} required
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium text-secondary">Experience (30%)</span>
                              <span className="font-medium">{details.experience.score}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                              <div
                                className="h-2 rounded-full bg-secondary"
                                style={{ width: `${details.experience.score / 30 * 100}%` }}
                              />
                            </div>
                            <div className="text-xs text-gray-500">
                              {details.experience.strengths} strengths / {details.experience.total} criteria
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium text-secondary-light">Attention Points (30%)</span>
                              <span className="font-medium">{details.redFlags.score}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                              <div
                                className="h-2 rounded-full bg-secondary-light"
                                style={{ width: `${details.redFlags.score / 30 * 100}%` }}
                              />
                            </div>
                            <div className="text-xs text-gray-500">
                              {details.redFlags.count} attention points detected
                              {details.redFlags.count ? 
                                ` (-${details.redFlags.penalty}%)` : 
                                ' (no penalty)'}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Two columns for the analysis details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left column of analysis */}
                    <div className="space-y-4">
                      {/* Key Recommendations */}
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <h3 className="font-semibold mb-2 text-secondary">Key Recommendations</h3>
                        {(analysisResults.aiAnalysis?.suggestedImprovements && analysisResults.aiAnalysis.suggestedImprovements.length > 0) ||
                         (analysisResults.aiAnalysis?.skillsAnalysis?.recommendations && analysisResults.aiAnalysis.skillsAnalysis.recommendations.length > 0) ||
                         (analysisResults.aiAnalysis?.experienceAnalysis?.recommendations && analysisResults.aiAnalysis.experienceAnalysis.recommendations.length > 0) ? (
                          <ul className="list-disc pl-5 space-y-1 text-sm">
                            {analysisResults.aiAnalysis?.suggestedImprovements?.slice(0, 3).map((improvement, index) => (
                              <li key={index} className="text-gray-700">{improvement}</li>
                            ))}
                            {analysisResults.aiAnalysis?.skillsAnalysis?.recommendations?.slice(0, 2).map((rec, index) => (
                              <li key={`skill-${index}`} className="text-gray-700">{rec}</li>
                            ))}
                            {analysisResults.aiAnalysis?.experienceAnalysis?.recommendations?.slice(0, 2).map((rec, index) => (
                              <li key={`exp-${index}`} className="text-gray-700">{rec}</li>
                            ))}
                          </ul>
                        ) : (
                          <div>
                            <p className="text-sm text-gray-700 mb-2">Voici quelques recommandations générales pour améliorer votre CV :</p>
                            <ul className="list-disc pl-5 space-y-1 text-sm">
                              <li className="text-gray-700">Ajoutez les compétences manquantes identifiées dans l'analyse</li>
                              <li className="text-gray-700">Mettez en avant vos réalisations avec des résultats quantifiables</li>
                              <li className="text-gray-700">Adaptez votre CV pour qu'il corresponde mieux aux mots-clés de l'offre d'emploi</li>
                              <li className="text-gray-700">Incluez des projets pertinents qui démontrent vos compétences techniques</li>
                              <li className="text-gray-700">Utilisez des termes et technologies spécifiques mentionnés dans l'offre</li>
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Red Flags */}
                      {analysisResults.redFlags && analysisResults.redFlags.length > 0 ? (
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                          <h3 className="font-semibold mb-2 text-red-600">Attention Points</h3>
                          <ul className="list-disc pl-5 space-y-1 text-sm">
                            {analysisResults.redFlags.map((flag, index) => (
                              <li key={index} className="text-red-600">{flag}</li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                          <h3 className="font-semibold mb-2 text-green-600">Attention Points</h3>
                          <p className="text-sm text-gray-700">Aucun point d'attention n'a été identifié dans votre CV par rapport à ce poste.</p>
                        </div>
                      )}
                    </div>

                    {/* Right column of analysis */}
                    <div className="space-y-4">
                      {/* Keyword Analysis */}
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <h3 className="font-semibold mb-2 text-gray-700">Keyword Analysis</h3>
                        <div className="space-y-3">
                          {analysisResults.skillMatches && analysisResults.skillMatches.length > 0 ? (
                            <div>
                              <h4 className="text-sm font-medium text-primary-dark mb-1">Strong Matches</h4>
                              <div className="flex flex-wrap gap-1">
                                {analysisResults.skillMatches.map((match) => (
                                  <span
                                    key={match}
                                    className="badge badge-primary"
                                  >
                                    {match}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <h4 className="text-sm font-medium text-primary-dark mb-1">Strong Matches</h4>
                              <p className="text-sm text-gray-700">Aucune correspondance forte n'a été identifiée. Essayez d'inclure plus de mots-clés de l'offre d'emploi dans votre CV.</p>
                            </div>
                          )}
                          {analysisResults.missingSkills && analysisResults.missingSkills.length > 0 ? (
                            <div>
                              <h4 className="text-sm font-medium text-red-600 mb-1">Missing Skills</h4>
                              <div className="flex flex-wrap gap-1">
                                {analysisResults.missingSkills.map((skill) => (
                                  <span
                                    key={skill}
                                    className="px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-xs"
                                  >
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <h4 className="text-sm font-medium text-green-600 mb-1">Missing Skills</h4>
                              <p className="text-sm text-gray-700">Aucune compétence manquante n'a été identifiée. Votre CV semble bien correspondre aux exigences du poste.</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Experience Summary */}
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <h3 className="font-semibold mb-2 text-secondary">Experience Summary</h3>
                        {analysisResults.aiAnalysis?.experienceAnalysis?.strengths && 
                         analysisResults.aiAnalysis.experienceAnalysis.strengths.length > 0 ? (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-1">Points forts :</h4>
                            <ul className="list-disc pl-5 space-y-1 text-sm mb-3">
                              {analysisResults.aiAnalysis.experienceAnalysis.strengths.map((strength, index) => (
                                <li key={index} className="text-gray-700">{strength}</li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm text-gray-700 mb-2">Aucun point fort spécifique n'a été identifié dans votre expérience.</p>
                            <p className="text-sm text-gray-700">Assurez-vous que votre CV détaille clairement vos responsabilités et réalisations pour chaque poste.</p>
                          </div>
                        )}
                        
                        {analysisResults.aiAnalysis?.experienceAnalysis?.gaps && 
                         analysisResults.aiAnalysis.experienceAnalysis.gaps.length > 0 ? (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-1">Lacunes identifiées :</h4>
                            <ul className="list-disc pl-5 space-y-1 text-sm">
                              {analysisResults.aiAnalysis.experienceAnalysis.gaps.map((gap, index) => (
                                <li key={index} className="text-gray-700">{gap}</li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm text-gray-700">Aucune lacune majeure n'a été identifiée dans votre expérience professionnelle par rapport à ce poste.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Generate PDF Button */}
                  <div className="flex justify-end">
                    <button
                      onClick={handleGeneratePDF}
                      disabled={isLoading}
                      className="btn-secondary flex items-center"
                    >
                      {isLoading ? (
                        <>
                          <i className="fas fa-spinner fa-spin mr-2"></i>
                          Generating...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-file-pdf mr-2"></i>
                          Generate Optimized PDF
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-md p-8 border border-gray-100 card-hover text-center h-full flex flex-col justify-center items-center">
              <i className="fas fa-file-search text-6xl text-gray-300 mb-4"></i>
              <h3 className="text-xl font-semibold text-gray-500 mb-2">No Analysis Results Yet</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Upload your resume and paste a job description, then click "Analyze Resume" to see how well your resume matches the job requirements.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AtsSystem; 