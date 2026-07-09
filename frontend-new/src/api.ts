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

function buildApiCandidates(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const configuredOrigin = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "");
  const candidates = [
    configuredOrigin ? `${configuredOrigin}${normalizedPath}` : "",
    normalizedPath,
    `${DEFAULT_BACKEND_ORIGIN}${normalizedPath}`
  ].filter(Boolean);

  return Array.from(new Set(candidates));
}
