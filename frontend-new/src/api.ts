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

const AUTH_TOKEN_KEY = "jizhi_auth_token";
const AUTH_USER_KEY = "jizhi_auth_user";
export const AUTH_UNAUTHORIZED_EVENT = "learnmate:student-unauthorized";

export interface AuthUser {
  id: number;
  studentId?: number;
  teacherId?: number;
  studentNo?: string | null;
  username: string;
  displayName: string;
  role: "STUDENT" | "TEACHER" | "ADMIN";
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

export interface LearningResource {
  id: number; version: number; resourceType: "mind_map" | "pptx"; title: string; status: string;
  subject: string; knowledgePoint: string; stageKey: string; pathVersion: number; estimatedMinutes: number;
  generationRationale: string[]; learningObjectives: string[]; targetLearnerSummary: string;
  content: Record<string, unknown>; review: { status: string; score: number; summary: string; issues: Array<Record<string, unknown>> };
  retrievalRunId?: number | null; citations?: KnowledgeCitation[];
  progress: null | { status: string; progressPercent: number; accumulatedSeconds: number; openedAt?: string; completedAt?: string; downloadedAt?: string };
  createdAt: string;
}

export interface KnowledgeCitation { label:string;chunkId:number;sourceKey:string;sourceTitle:string;chapter?:string;section?:string;license:string;version:string;excerpt:string;supportScore:number }
export interface GroundedAnswerResponse { generationId?:string;retrievalRunId:number;status:"grounded"|"insufficient";answer:string;claims:Array<{text:string;chunkIds:number[]}>;citations:KnowledgeCitation[];confidence:"high"|"medium"|"low"|"insufficient";coverage:number }
export function askKnowledgeBase(query:string,knowledgePoint?:string):Promise<GroundedAnswerResponse>{return apiRequest<GroundedAnswerResponse>("/api/knowledge/answer",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query,subject:"数据结构",knowledgePoint})});}

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
  if (result.user.role !== "STUDENT" || !result.user.studentId) {
    clearAuth();
    throw new Error("请使用学生账号登录学生端");
  }
  if (typeof window !== "undefined") {
    window.localStorage.setItem(AUTH_TOKEN_KEY, result.token);
    window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(result.user));
  }
  return result;
}

export async function getCurrentUser(): Promise<AuthUser> {
  const result = await apiRequest<{ user: AuthUser }>("/api/auth/me");
  const user = result.user;
  if (user.role !== "STUDENT" || !user.studentId) {
    clearAuth();
    throw new Error("当前账号无学生端访问权限");
  }
  if (typeof window !== "undefined") {
    window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  }
  return user;
}

export async function fetchApiData<T>(path: string): Promise<T[]> {
  const urls = buildApiCandidates(path);
  let lastError: unknown = null;

  for (const url of urls) {
    try {
      const response = await fetch(url, withAuthHeaders({ headers: { Accept: "application/json" } }));
      handleUnauthorizedResponse(response);

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

export async function listLearningResources(params: Record<string, string | number | undefined> = {}): Promise<LearningResource[]> {
  const query = new URLSearchParams(); Object.entries(params).forEach(([k,v]) => { if (v !== undefined && v !== "") query.set(k,String(v)); });
  return apiRequest<LearningResource[]>(`/api/resources${query.size ? `?${query}` : ""}`);
}
export async function generateLearningResource(input: { resourceType: "mind_map"|"pptx"; subject: string; knowledgePoint: string; stageKey: string; pathVersion: number; regenerate?: boolean }): Promise<LearningResource> {
  const result=await apiRequest<{resource:LearningResource}>("/api/resources/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(input)}); return result.resource;
}
export async function getLearningResource(id:number,version?:number):Promise<LearningResource>{const suffix=version?`/versions/${version}`:"";const result=await apiRequest<{resource:LearningResource}>(`/api/resources/${id}${suffix}`);return result.resource;}
export async function getResourceVersions(id:number):Promise<Array<Record<string,unknown>>>{return apiRequest<Array<Record<string,unknown>>>(`/api/resources/${id}/versions`);}
export async function openLearningResource(id:number):Promise<LearningResource>{const r=await apiRequest<{resource:LearningResource}>(`/api/resources/${id}/open`,{method:"POST"});return r.resource;}
export async function updateLearningResourceProgress(id:number,progressPercent:number):Promise<LearningResource>{const r=await apiRequest<{resource:LearningResource}>(`/api/resources/${id}/progress`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({progressPercent})});return r.resource;}
export async function completeLearningResource(id:number):Promise<LearningResource>{const r=await apiRequest<{resource:LearningResource}>(`/api/resources/${id}/complete`,{method:"POST"});return r.resource;}
export async function downloadLearningResource(id: number, version?: number): Promise<void> {
  const path = `/api/resources/${id}${version ? `/versions/${version}` : ""}/download`;
  let last: unknown;
  for (const url of buildApiCandidates(path)) {
    try {
      const response = await fetch(url, withAuthHeaders());
      handleUnauthorizedResponse(response);
      if (!response.ok) {
        throw new Error((await response.json().catch(() => ({}))).error || `下载失败：${response.status}`);
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      const name = match ? decodeURIComponent(match[1]) : "LearnMate课件.pptx";
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      return;
    } catch (error) {
      last = error;
    }
  }
  throw last || new Error("下载失败");
}

function buildApiCandidates(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const configuredBase = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

  if (!configuredBase) return [normalizedPath];
  if (configuredBase.endsWith("/api") && (normalizedPath === "/api" || normalizedPath.startsWith("/api/"))) {
    return [`${configuredBase}${normalizedPath.slice(4)}`];
  }
  return [`${configuredBase}${normalizedPath}`];
}

export async function apiRequest<T>(path: string, init?: RequestInit, authenticated = true): Promise<T> {
  const urls = buildApiCandidates(path);
  let lastError: unknown = null;

  for (const url of urls) {
    try {
      const requestInit = authenticated ? withAuthHeaders(init) : init;
      const response = await fetch(url, requestInit ?? { headers: { Accept: "application/json" } });
      if (authenticated) handleUnauthorizedResponse(response);

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

function handleUnauthorizedResponse(response: Response) {
  if (response.status !== 401 || typeof window === "undefined") return;
  clearAuth();
  window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
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
