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

export async function fetchApiData<T>(path: string): Promise<T[]> {
  const urls = buildApiCandidates(path);
  let lastError: unknown = null;

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" }
      });

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

async function fetchApiPayload<T>(path: string, init?: RequestInit): Promise<T> {
  const urls = buildApiCandidates(path);
  let lastError: unknown = null;

  for (const url of urls) {
    try {
      const response = await fetch(url, init ?? { headers: { Accept: "application/json" } });

      if (!response.ok) {
        throw new Error(`请求失败：${response.status}`);
      }

      const payload = await response.json();
      return (payload?.data ?? payload) as T;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("接口请求失败");
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
