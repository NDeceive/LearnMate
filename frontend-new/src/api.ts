import type { AgentTaskDescriptions, LearningPathResponse, LearningPathVersion } from "./types";

export interface AgentLogSummary {
  id: number | string;
  agent_label: string;
  task_label: string;
  status_label: string;
  input_summary: string;
  analysis_summary: string;
  output_summary: string;
  duration_ms: number;
  created_at: string;
}

export interface KnowledgeMasteryRecord {
  subject: string;
  knowledge_point: string;
  mastery: number;
  wrong_count: number;
  practice_count: number;
  last_updated?: string;
}

export interface WrongQuestionRecord {
  id: number | string;
  subject: string;
  knowledge_point: string;
  difficulty?: string;
  question_text: string;
  selected_answer?: string;
  correct_answer?: string;
  analysis?: string;
  error_reason?: string;
  feedback_suggestion?: string;
  recommended_action?: string;
  status?: string;
  updated_at?: string;
}

export interface CodeExercise {
  id?: number | string;
  exercise_id: string;
  subject: string;
  knowledge_point: string;
  title: string;
  description: string;
  language: string;
  difficulty: string;
  starter_code: string;
  sample_input: string;
  sample_output: string;
  explanation: string;
  tags?: string[] | string;
  source?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CodeRunPayload {
  exerciseId: string;
  language: string;
  sourceCode: string;
  stdin?: string;
}

export interface CodeRunResult {
  status: "success" | "error" | string;
  stdout: string;
  stderr: string;
  compileOutput: string;
  time: string;
  memory: string;
}

export interface CodeExplainPayload {
  exerciseId: string;
  sourceCode: string;
  stdout: string;
  stderr: string;
  compileOutput: string;
}

export interface CodeExplainResult {
  explanation: string;
}

const DEFAULT_BACKEND_ORIGIN = "http://localhost:5800";
const AUTH_TOKEN_KEY = "jizhi_auth_token";
const AUTH_USER_KEY = "jizhi_auth_user";

export interface AuthUser {
  id: number;
  studentId: number;
  studentNo: string;
  username: string;
  displayName: string;
}

export interface LoginResult {
  token: string;
  user: AuthUser;
}

export interface LearningProfileDraft {
  majorAndGrade: { major: string; grade: string };
  currentCourse: string;
  priorKnowledge: string[];
  learningGoals: string[];
  explanationPreference: string;
  resourcePreferences: string[];
  paceAndTimeBudget: { pacePreference: string; weeklyTimeBudgetMinutes: number | null };
}

export interface ProfileFieldMeta {
  confidence?: number;
  evidence?: string;
  source?: string;
}

export interface CompleteLearningProfile extends LearningProfileDraft {
  knowledgeMastery: Array<{ subject: string; knowledgePoint: string; mastery: number; wrongCount: number; practiceCount: number; updatedAt?: string }>;
  errorPatterns: Array<{ subject: string; knowledgePoint: string; errorType: string; occurrenceCount: number; confidence: number; evidence?: unknown; updatedAt?: string }>;
}

export interface ProfileResponse {
  profile: CompleteLearningProfile;
  completeness: number;
  version: number;
  updatedAt: string | null;
  confirmedAt: string | null;
  fieldMeta: Record<string, ProfileFieldMeta>;
  evidenceSummary: Array<{ field: string; source?: string; confidence?: number; evidence?: string }>;
  latestChange: null | { version: number; reason: string; sourceType: string; createdAt: string };
}

export interface ProfileDialogueResponse {
  sessionId: string;
  status: "collecting" | "ready_for_confirmation" | "completed";
  assistantMessage: string;
  progress: number;
  missingFields: string[];
  currentDraft: LearningProfileDraft;
  fieldMeta: Record<string, ProfileFieldMeta>;
  profilePatch?: Record<string, { value: unknown; confidence: number; evidence: string }>;
  modelAvailable?: boolean;
  messages?: Array<{ role: "assistant" | "user"; content: string; created_at?: string }>;
}

export interface QuizSubmissionResult {
  attemptId: number;
  score: number;
  correctCount: number;
  totalCount: number;
  questionResults: Array<{ questionId: string; isCorrect: boolean; correctAnswer: string; analysis: string }>;
  masteryChanges: Array<{ knowledgePointId: string; knowledgePointName: string; before: number; after: number; delta: number; reason: string }>;
  errorAttributions: Array<{ knowledgePointId: string; knowledgePointName: string; errorType: string; label: string; confidence: number; evidence: string; suggestion: string }>;
  profileUpdate: { previousVersion: number; currentVersion: number; changes: Array<Record<string, unknown>> };
  recommendations: Array<{ resourceType: string; title: string; reason: string; priority: number; knowledgePointId: string; estimatedMinutes: number }>;
}

export interface LearningEventSummary {
  type: string;
  text: string;
  time: string;
  eventType: string;
}

export function getAuthToken() {
  return typeof window === "undefined" ? "" : window.localStorage.getItem(AUTH_TOKEN_KEY) || "";
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.localStorage.getItem(AUTH_USER_KEY) || "null") as AuthUser | null;
  } catch {
    return null;
  }
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_USER_KEY);
}

export async function login(identifier: string, password: string): Promise<LoginResult> {
  const result = await apiRequest<LoginResult>("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password })
  }, false);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(AUTH_TOKEN_KEY, result.token);
    window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(result.user));
  }
  return result;
}

export async function fetchApiData<T>(path: string): Promise<T[]> {
  const urls = buildApiCandidates(path);
  let lastError: unknown = null;

  for (const url of urls) {
    try {
      const response = await fetch(url, withAuthHeaders({ headers: { Accept: "application/json" } }));

      if (!response.ok) {
        throw new Error(`请求失败：${response.status}`);
      }

      const payload = await response.json();
      if (Array.isArray(payload)) {
        return payload as T[];
      }

      if (Array.isArray(payload?.data)) {
        return payload.data as T[];
      }

      return [];
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("接口请求失败");
}

export async function getCodeExercises(params: {
  subject?: string;
  knowledgePoint?: string;
  difficulty?: string;
} = {}): Promise<CodeExercise[]> {
  const query = buildQueryString({
    subject: params.subject,
    knowledgePoint: params.knowledgePoint,
    difficulty: params.difficulty
  });

  return fetchApiData<CodeExercise>(`/api/code/exercises${query}`);
}

export async function getCodeExerciseDetail(id: string): Promise<CodeExercise | null> {
  if (!id) return null;

  return fetchApiPayload<CodeExercise>(`/api/code/exercises/${encodeURIComponent(id)}`);
}

export async function runCode(payload: CodeRunPayload): Promise<CodeRunResult> {
  return fetchApiPayload<CodeRunResult>("/api/code/run", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload)
  });
}

export async function explainCodeRun(payload: CodeExplainPayload): Promise<CodeExplainResult> {
  return fetchApiPayload<CodeExplainResult>("/api/code/explain", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload)
  });
}

export async function getAgentTaskDescriptions(question: string): Promise<AgentTaskDescriptions> {
  const descriptions = await fetchApiPayload<AgentTaskDescriptions>("/api/agent-task-descriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ question })
  });

  if (!isAgentTaskDescriptions(descriptions)) {
    throw new Error("智能体任务描述返回结构无效");
  }

  return descriptions;
}

export async function getLearningPath(): Promise<LearningPathResponse> {
  return apiRequest<LearningPathResponse>("/api/path/me");
}

export async function generateLearningPath(): Promise<LearningPathResponse> {
  return apiRequest<LearningPathResponse>("/api/path/generate", { method: "POST" });
}

export async function getLearningPathVersions(): Promise<LearningPathVersion[]> {
  const response = await apiRequest<{ data: LearningPathVersion[] } | LearningPathVersion[]>("/api/path/versions");
  return Array.isArray(response) ? response : response.data;
}

function buildApiCandidates(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const configuredOrigin = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "");
  const candidates = [
    normalizedPath,
    configuredOrigin ? `${configuredOrigin}${normalizedPath}` : "",
    `${DEFAULT_BACKEND_ORIGIN}${normalizedPath}`
  ].filter(Boolean);

  return Array.from(new Set(candidates));
}

export async function apiRequest<T>(path: string, init?: RequestInit, authenticated = true): Promise<T> {
  const urls = buildApiCandidates(path);
  let lastError: unknown = null;

  for (const url of urls) {
    try {
      const requestInit = authenticated ? withAuthHeaders(init) : init;
      const response = await fetch(url, requestInit ?? { headers: { Accept: "application/json" } });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const error = new Error(body?.error || `请求失败：${response.status}`) as Error & { status?: number };
        error.status = response.status;
        throw error;
      }

      const payload = await response.json();
      return (payload?.data ?? payload) as T;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("接口请求失败");
}

const fetchApiPayload = apiRequest;

function withAuthHeaders(init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers || {});
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  const token = getAuthToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return { ...(init || {}), headers };
}

function isAgentTaskDescriptions(value: unknown): value is AgentTaskDescriptions {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return ["coordinator", "theoryAgent", "codeAgent", "reviewAgent"].every(
    (field) => typeof candidate[field] === "string" && candidate[field].trim().length > 0
  );
}

function buildQueryString(params: Record<string, string | undefined>) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      query.set(key, value);
    }
  });

  const value = query.toString();
  return value ? `?${value}` : "";
}
