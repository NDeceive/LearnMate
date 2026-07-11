export interface UserProfile {
  name: string;
  proficiency: number; // overall percentage (0-100)
  totalHours: number;
  completionRate: number; // percentage
  knowledgeCoverage: number; // percentage
  streak: number; // in days
  testsTaken: number;
  pendingTasks: number;
  weakPointsCount: number;
  extraPoints?: number; // extra challenge points
}

export interface Course {
  id: string;
  name: string;
  code: string;
  proficiency: number; // (0-100)
  totalHours: number;
  completionRate: number; // percentage
  color: string;
}

export interface WeakPoint {
  id: string;
  name: string;
  level: 'High' | 'Medium' | 'Low';
  count: number; // number of times answered incorrectly
  course: string;
  remediationProgress: number; // 0-100
}

export interface QuizQuestion {
  id: string;
  domain: string;
  question: string;
  code?: string;
  options: string[];
  answerIndex: number; // 0-3 for A,B,C,D
  explanation: string;
  hint: string;
}

export interface QuizSettings {
  domain: string;
  numQuestions: number;
  difficulty: 'basic' | 'advanced' | 'challenge';
}

export interface QuizState {
  settings: QuizSettings;
  questions: QuizQuestion[];
  currentQuestionIndex: number;
  userAnswers: { [key: number]: number }; // questionIndex -> answerIndex
  markedQuestions: number[]; // indices
  isCompleted: boolean;
  score: number;
  timer: number; // in seconds
  currentAbilityEstimate: number; // ability score, e.g. +1.45
}

export interface AgentCollaboration {
  agentName: string;
  status: 'idle' | 'working' | 'completed' | 'failed';
  message: string;
}

export interface AgentTaskDescriptions {
  coordinator: string;
  theoryAgent: string;
  codeAgent: string;
  reviewAgent: string;
}

export interface MessagePart {
  agent: 'coordinator' | 'TheoryAgent' | 'CodeAgent' | 'ReviewAgent';
  title: string;
  content: string;
  code?: string;
  codeLanguage?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text?: string;
  parts?: MessagePart[]; // For multi-agent formatted messages
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  knowledgePoints: string[];
  recommendedResources: { title: string; type: string; url?: string }[];
  suggestedFollowups: string[];
}

export interface ResourceGenerationInput {
  subject: string;
  topic: string;
  resourceType: 'LectureNotes' | 'Homework' | 'CaseStudy' | 'CheatSheet';
  difficulty: 'Elementary' | 'Intermediate' | 'Advanced';
}

export interface GeneratedResource {
  id: string;
  subject: string;
  topic: string;
  resourceType: string;
  difficulty: string;
  content: string;
  createdDate: string;
}

export interface PathStage {
  key: string;
  title: string;
  subject: string;
  durationMinutes: number;
  progress: number; // 0-100
  status: 'completed' | 'active' | 'locked';
  goals: string[];
  knowledgePoints: string[];
  questionIds: string[];
  codeExerciseIds: string[];
  completion: { type: 'quiz' | 'codelab' | 'resource'; ids: string[] };
  dependsOn: string[];
  completedAt?: string | null;
  resources: string[];
}

export interface LearningPathResponse {
  version: number;
  title: string;
  progress: number;
  changeReason: string;
  sourceType: string;
  createdAt: string;
  stages: PathStage[];
}

export interface LearningPathVersion {
  version: number;
  title: string;
  changeReason: string;
  sourceType: string;
  createdAt: string;
  stages: Array<Record<string, unknown>>;
  diff: { added: string[]; removed: string[]; changed: string[]; reordered: boolean };
}

export interface ErrorRecord {
  id: string;
  title: string;
  course: string;
  question: string;
  code?: string;
  options: string[];
  userAnswer: number;
  correctAnswer: number;
  diagnosis: {
    rootCause: string;
    cognitiveTrap: string;
    learningPathAdjustment: string;
  };
  similarRecommendations: string[];
  remediated: boolean;
  timestamp: string;
}
