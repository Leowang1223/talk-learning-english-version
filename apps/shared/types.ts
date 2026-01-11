// Shared type definitions - Unified data structures for the entire project

// API response unified format
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

// API error class
export class ApiError extends Error {
  statusCode: number;
  code?: string;

  constructor(message: string, statusCode = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'ApiError';
  }
}

// User related types
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

// Session related types
export interface Session {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  entries: SessionEntry[];
  metadata?: SessionMetadata;
}

export interface SessionMetadata {
  interviewType: string;
  totalQuestions: number;
  completedQuestions: number;
  duration: number; // Total duration in seconds
}

// Session entry type
export interface SessionEntry {
  index: number;
  question: string;
  answer: string;
  askedAt: string;
  answeredAt: string;
  thinkingTime: number; // Thinking time in seconds
  answeringTime: number; // Answering time in seconds
  lessonId?: string;
  stepId?: number;
  completed: boolean;
}

// Q&A item type (for analysis)
export interface QAItem {
  index: number;
  question: string;
  answer: string;
  thinkingTime: number;
  answeringTime: number;
  lessonId?: string;
  stepId?: number;
  expectedAnswer?: string | string[];
}

// Analysis result type
export interface AnalysisResult {
  sessionId: string;
  results: PerQuestionResult[];
  summary: AnalysisSummary;
  recommendations: Recommendation[];
}

export interface PerQuestionResult {
  questionId: string;
  title: string;
  metrics: {
    thinkingTime: number;
    answeringTime: number;
    tokensPerMinute: number;
    tokenCount: number;
    ratio: number;
  };
  scores: {
    pronunciation: number;
    fluency: number;
    accuracy: number;
    comprehension: number;
    confidence: number;
    total: number;
  };
  notes?: string;
  llmAnalysis?: PerQuestionLLMAnalysis;
  advice?: string;
  optimizedAnswer?: string;
}

export interface PerQuestionLLMAnalysis {
  signals?: SemanticSignals;
  highlights?: AnalysisHighlight[];
}

export interface SemanticSignals {
  semanticRelevance?: number;
  directAnswerProbability?: number;
  conclusionFirstProbability?: number;
  structureCompleteness?: number;
  coverageRatio?: number;
  missingPoints?: string[];
}

export interface AnalysisHighlight {
  type: 'support' | 'risk';
  start: number;
  end: number;
  note?: string;
}

export interface AnalysisSummary {
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  improvementAreas: string[];
}

export interface Recommendation {
  type: 'practice' | 'study' | 'technique';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

// Report type
export interface Report {
  id: string;
  sessionId: string;
  studentName: string;
  lessonTitle: string;
  interviewType: string;
  createdAt: Date;
  analysis: AnalysisResult;
  metadata: ReportMetadata;
}

export interface ReportMetadata {
  totalQuestions: number;
  averageScore: number;
  duration: number;
  generatedBy: string; // 'ai' | 'manual'
}

// Interview question type
export interface InterviewQuestion {
  id: string;
  type: string;
  lessonId?: string;
  stepId?: number;
  question: string;
  expectedAnswer?: string | string[];
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
}

// Lesson data type
export interface Lesson {
  lessonId: string;
  title: string;
  description: string;
  steps: LessonStep[];
}

export interface LessonStep {
  stepId: number;
  title: string;
  content: string;
  expectedAnswer?: string | string[];
  tips?: string[];
}

// Plugin configuration type
export interface PluginConfig {
  interviewTypes: InterviewTypeConfig[];
}

export interface InterviewTypeConfig {
  type: string;
  name: string;
  description: string;
  questions: InterviewQuestion[];
  lessons?: Lesson[];
  rules?: any;
}
