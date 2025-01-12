import React from 'react';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

const ResumeAnalysis = () => {
  // This would normally be populated by actual analysis
  const analysis = {
    matchScore: 75,
    recommendations: [
      {
        type: 'missing',
        text: 'Add experience with Docker containerization'
      },
      {
        type: 'weak',
        text: 'Strengthen description of Agile methodology experience'
      },
      {
        type: 'good',
        text: 'Strong match on React.js development experience'
      }
    ]
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'good':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'missing':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'weak':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-4">Analysis Results</h2>
      
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-600">Match Score</span>
          <span className="text-2xl font-bold text-blue-600">{analysis.matchScore}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full"
            style={{ width: `${analysis.matchScore}%` }}
          ></div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-medium text-gray-700">Recommendations</h3>
        {analysis.recommendations.map((rec, index) => (
          <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
            {getIcon(rec.type)}
            <p className="text-gray-600">{rec.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResumeAnalysis;