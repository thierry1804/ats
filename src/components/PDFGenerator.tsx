import React from 'react';
import { Download } from 'lucide-react';

const PDFGenerator = () => {
  const handleDownload = () => {
    // This would normally generate and download the optimized PDF
    console.log('Downloading optimized resume...');
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-4">Optimized Resume</h2>
      <p className="text-gray-600 mb-4">
        We've created an optimized version of your resume based on the job description.
        Download it below to increase your chances of success!
      </p>
      
      <button
        onClick={handleDownload}
        className="flex items-center justify-center space-x-2 w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
      >
        <Download className="w-5 h-5" />
        <span>Download Optimized Resume</span>
      </button>
    </div>
  );
};

export default PDFGenerator;