import { analyzeWithGemini } from '../geminiAnalyzer';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Mock the Google Generative AI
jest.mock('@google/generative-ai');

describe('geminiAnalyzer', () => {
  const mockGenerateContent = jest.fn();
  const mockGetModel = jest.fn().mockReturnValue({
    generateContent: mockGenerateContent
  });

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    (GoogleGenerativeAI as jest.Mock).mockImplementation(() => ({
      getGenerativeModel: mockGetModel
    }));
  });

  it('should successfully analyze resume and job description', async () => {
    const mockResponse = {
      matchScore: 85,
      missingKeywords: ['Python', 'AWS', 'Docker'],
      strongMatches: ['JavaScript', 'React', 'Node.js'],
      aiAnalysis: {
        keyFindings: [
          'Strong technical background',
          'Good cultural fit'
        ],
        suggestedImprovements: [
          'Add more quantifiable achievements'
        ],
        skillsAnalysis: {
          technical: ['JavaScript', 'React'],
          soft: ['Communication', 'Leadership'],
          missing: ['Python'],
          recommendations: ['Get Python certification']
        },
        experienceAnalysis: {
          strengths: ['5+ years in similar role'],
          gaps: ['No management experience'],
          recommendations: ['Highlight team lead experience']
        }
      }
    };

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify(mockResponse)
      }
    });

    const result = await analyzeWithGemini(
      'Sample resume text',
      'Sample job description'
    );

    expect(result).toEqual(mockResponse);
    expect(mockGetModel).toHaveBeenCalledWith({ model: 'gemini-pro' });
    expect(mockGenerateContent).toHaveBeenCalled();
  });

  it('should handle invalid JSON response', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => 'Invalid JSON response'
      }
    });

    await expect(
      analyzeWithGemini('Sample resume', 'Sample job')
    ).rejects.toThrow('No JSON object found in response');
  });

  it('should handle missing required fields', async () => {
    const invalidResponse = {
      matchScore: 85
      // Missing other required fields
    };

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify(invalidResponse)
      }
    });

    await expect(
      analyzeWithGemini('Sample resume', 'Sample job')
    ).rejects.toThrow('Missing required field');
  });

  it('should handle invalid matchScore', async () => {
    const invalidResponse = {
      matchScore: 150, // Invalid score > 100
      missingKeywords: [],
      strongMatches: [],
      aiAnalysis: {
        keyFindings: [],
        suggestedImprovements: [],
        skillsAnalysis: {
          technical: [],
          soft: [],
          missing: [],
          recommendations: []
        },
        experienceAnalysis: {
          strengths: [],
          gaps: [],
          recommendations: []
        }
      }
    };

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify(invalidResponse)
      }
    });

    await expect(
      analyzeWithGemini('Sample resume', 'Sample job')
    ).rejects.toThrow('matchScore must be a number between 0 and 100');
  });

  it('should handle API errors', async () => {
    const errorMessage = 'API Error';
    mockGenerateContent.mockRejectedValue(new Error(errorMessage));

    await expect(
      analyzeWithGemini('Sample resume', 'Sample job')
    ).rejects.toThrow(errorMessage);
  });
}); 