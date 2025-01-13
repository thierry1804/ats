import React, { useEffect, useState } from 'react';
import { Analysis, getAnalyses } from '../services/api';

interface AnalysisHistoryProps {
  onLoadAnalysis: (analysis: Analysis) => void;
}

const AnalysisHistory: React.FC<AnalysisHistoryProps> = ({ onLoadAnalysis }) => {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalyses = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getAnalyses();
        setAnalyses(data);
      } catch (err) {
        setError('Failed to load analysis history');
        console.error('Error fetching analyses:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalyses();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <i className="fas fa-spinner fa-spin text-blue-600 text-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4 text-red-600">
        <i className="fas fa-exclamation-circle mr-2" />
        {error}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Historique des analyses</h2>
      
      {analyses.length === 0 ? (
        <p className="text-gray-600 text-center py-4">
          Aucune analyse précédente
        </p>
      ) : (
        <div className="space-y-4">
          {analyses.map((analysis) => (
            <div
              key={analysis.id}
              className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => onLoadAnalysis(analysis)}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-medium">{analysis.resume_filename}</h3>
                  <p className="text-sm text-gray-600">
                    {formatDate(analysis.created_at)}
                  </p>
                </div>
                <div className="flex items-center">
                  <span className={`px-2 py-1 rounded-full text-sm ${
                    analysis.match_score >= 80 ? 'bg-green-100 text-green-800' :
                    analysis.match_score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {analysis.match_score}% Match
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-600 line-clamp-2">
                {analysis.job_description}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnalysisHistory; 