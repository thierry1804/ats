import React from 'react';
import AtsSystem from './components/AtsSystem';
import '@fortawesome/fontawesome-free/css/all.css';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light/5 to-secondary-light/5">
      <header className="bg-white shadow-sm py-4 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold gradient-text">ATS Resume Analyzer</h1>
          <nav className="flex items-center space-x-4">
            <a href="#" className="text-gray-600 hover:text-primary transition-colors">
              <i className="fas fa-home mr-1"></i> Home
            </a>
            <a href="#" className="text-gray-600 hover:text-primary transition-colors">
              <i className="fas fa-question-circle mr-1"></i> Help
            </a>
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        <AtsSystem />
      </main>
      <footer className="bg-white border-t border-gray-100 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500 text-sm">
          <p>© 2023 ATS Resume Analyzer. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;