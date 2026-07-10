import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Code2,
  Loader2,
  Play,
  RotateCcw,
  Sparkles
} from "lucide-react";
import {
  CodeExercise,
  CodeRunResult,
  explainCodeRun,
  getCodeExerciseDetail,
  runCode
} from "../api";

interface CodeLabWorkspaceProps {
  exerciseId: string;
  onBackToList: () => void;
}

export default function CodeLabWorkspace({ exerciseId, onBackToList }: CodeLabWorkspaceProps) {
  const [exercise, setExercise] = useState<CodeExercise | null>(null);
  const [sourceCode, setSourceCode] = useState("");
  const [stdin, setStdin] = useState("");
  const [runResult, setRunResult] = useState<CodeRunResult | null>(null);
  const [explanation, setExplanation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [runError, setRunError] = useState("");
  const [explainError, setExplainError] = useState("");
  const [agentNotice, setAgentNotice] = useState("");

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    setDetailError("");
    setRunError("");
    setExplainError("");
    setAgentNotice("");
    setRunResult(null);
    setExplanation("");

    getCodeExerciseDetail(exerciseId)
      .then((detail) => {
        if (cancelled) return;

        setExercise(detail);
        setSourceCode(detail?.starter_code ?? "");
        setStdin(detail?.sample_input ?? "");
      })
      .catch(() => {
        if (!cancelled) {
          setExercise(null);
          setDetailError("题目详情加载失败，请返回题库后重试。");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [exerciseId]);

  const tags = useMemo(() => parseTags(exercise?.tags), [exercise?.tags]);

  const handleResetCode = () => {
    if (!exercise) return;
    setSourceCode(exercise.starter_code ?? "");
    setRunResult(null);
    setExplanation("");
    setRunError("");
    setExplainError("");
    setAgentNotice("");
  };

  const handleRunSample = async () => {
    if (!exercise) return;

    setIsRunning(true);
    setRunError("");
    setRunResult(null);
    setExplanation("");
    setExplainError("");
    setAgentNotice("");

    try {
      const result = await runCode({
        exerciseId: exercise.exercise_id,
        language: exercise.language || "c",
        sourceCode,
        stdin
      });

      setRunResult(result);
      setAgentNotice("已记录 CodeRunner 协同日志，可在首页最近协同记录中查看。");
    } catch {
      setRunError("运行样例失败，请确认后端 CodeLab 接口可用。");
    } finally {
      setIsRunning(false);
    }
  };

  const handleExplainRun = async () => {
    if (!exercise) return;

    if (!runResult) {
      setExplainError("请先运行一次样例，再请求 AI 解释。");
      return;
    }

    setIsExplaining(true);
    setExplainError("");
    setExplanation("");

    try {
      const result = await explainCodeRun({
        exerciseId: exercise.exercise_id,
        sourceCode,
        stdout: runResult.stdout || "",
        stderr: runResult.stderr || "",
        compileOutput: runResult.compileOutput || ""
      });

      setExplanation(result.explanation || "AI 已完成分析，但暂未返回详细文本。");
      setAgentNotice("TutorAgent 已生成运行结果解释。");
    } catch {
      setExplainError("AI 解释暂时不可用，请稍后再试。");
    } finally {
      setIsExplaining(false);
    }
  };

  return (
    <div className="fade-in font-sans space-y-5 min-w-0">
      <section className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 md:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 min-w-0">
          <div className="flex items-start gap-3 min-w-0">
            <button
              onClick={onBackToList}
              className="inline-flex shrink-0 items-center justify-center gap-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-100 px-3 py-2 rounded-xl transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              返回代码实验室
            </button>
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-black text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg">
                  {exercise?.exercise_id || exerciseId}
                </span>
                {exercise && <DifficultyBadge difficulty={exercise.difficulty} />}
                <span className="text-[11px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">
                  语言：{(exercise?.language || "c").toUpperCase()}
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-slate-950 tracking-tight break-words">
                {exercise?.title || "代码实验工作台"}
              </h2>
            </div>
          </div>

          <span className="inline-flex w-fit items-center gap-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full">
            <Code2 className="w-3.5 h-3.5" />
            样例运行演示模式
          </span>
        </div>
      </section>

      {isLoading && (
        <div className="min-h-[520px] rounded-2xl border border-slate-100 bg-white shadow-sm flex items-center justify-center gap-2 text-sm font-bold text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          正在加载代码实验...
        </div>
      )}

      {!isLoading && detailError && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5 text-sm font-bold text-rose-700">
          {detailError}
        </div>
      )}

      {!isLoading && exercise && (
        <div className="grid grid-cols-1 xl:grid-cols-[38%_minmax(0,1fr)] gap-5 items-start min-w-0">
          <aside className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 md:p-6 space-y-5 min-w-0">
            <div className="flex flex-wrap gap-2 text-[11px] font-bold">
              <span className="text-slate-600 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">
                课程：{exercise.subject}
              </span>
              <span className="text-slate-600 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">
                知识点：{exercise.knowledge_point}
              </span>
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg"
                >
                  {tag}
                </span>
              ))}
            </div>

            <DetailBlock title="题目描述" content={exercise.description} />
            <CodeBlock title="输入样例" content={exercise.sample_input || "无输入"} />
            <CodeBlock title="输出样例" content={exercise.sample_output || "暂无样例输出"} />
            <DetailBlock title="练习目标" content={exercise.explanation || "完成本题核心代码结构。"} />
          </aside>

          <section className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 md:p-6 space-y-4 min-w-0">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-600">
                <span className="bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl">
                  语言：C
                </span>
                <span className="bg-blue-50 border border-blue-100 text-blue-700 px-3 py-2 rounded-xl">
                  后端 mock runner
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handleResetCode}
                  className="inline-flex items-center justify-center gap-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-100 px-3 py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  重置代码
                </button>
                <button
                  onClick={handleRunSample}
                  disabled={isRunning}
                  className="inline-flex items-center justify-center gap-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-xl shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  {isRunning ? "正在运行样例..." : "运行样例"}
                </button>
                <button
                  onClick={handleExplainRun}
                  disabled={isExplaining}
                  className="inline-flex items-center justify-center gap-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-100 px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isExplaining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {isExplaining ? "AI 正在分析运行结果..." : "AI 解释运行结果"}
                </button>
              </div>
            </div>

            <label className="block space-y-2 min-w-0">
              <span className="text-xs font-extrabold text-slate-700">源代码</span>
              <textarea
                value={sourceCode}
                onChange={(event) => setSourceCode(event.target.value)}
                spellCheck={false}
                style={{ minHeight: 520 }}
                className="w-full min-h-[520px] max-w-full resize-y overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm leading-[1.6] text-slate-100 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
              />
            </label>

            <label className="block space-y-2 min-w-0">
              <span className="text-xs font-extrabold text-slate-700">标准输入 stdin</span>
              <textarea
                value={stdin}
                onChange={(event) => setStdin(event.target.value)}
                spellCheck={false}
                className="w-full min-h-[96px] max-w-full resize-y overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-5 text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                placeholder="样例输入"
              />
            </label>

            {runError && <InlineNotice tone="error" text={runError} />}
            {explainError && <InlineNotice tone="warning" text={explainError} />}
            {agentNotice && <InlineNotice tone="success" text={agentNotice} />}

            <RunResultPanel result={runResult} />

            {explanation && (
              <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 space-y-2 min-w-0">
                <h4 className="text-xs font-extrabold text-blue-800 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  AI 解释
                </h4>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
                  {explanation}
                </p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function DetailBlock({ title, content }: { title: string; content?: string }) {
  return (
    <div className="space-y-2 min-w-0">
      <h3 className="text-xs font-extrabold text-slate-900">{title}</h3>
      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap break-words">
        {content || "暂无内容"}
      </p>
    </div>
  );
}

function CodeBlock({ title, content }: { title: string; content?: string }) {
  return (
    <div className="space-y-2 min-w-0">
      <h3 className="text-xs font-extrabold text-slate-900">{title}</h3>
      <pre className="overflow-auto rounded-xl border border-slate-200 bg-slate-950 p-3 text-xs leading-5 text-slate-100 font-mono whitespace-pre-wrap break-words">
        {content || ""}
      </pre>
    </div>
  );
}

function RunResultPanel({ result }: { result: CodeRunResult | null }) {
  return (
    <div
      className="min-h-[180px] rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-4 min-w-0"
      style={{ minHeight: 180 }}
    >
      {!result ? (
        <p className="text-xs font-semibold text-slate-500 leading-relaxed">
          运行结果将在这里显示。当前版本不会真实执行用户代码，后端返回 mock runner 的样例运行结果。
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <ResultMeta label="运行状态" value={formatStatus(result.status)} />
            <ResultMeta label="time" value={result.time || "-"} />
            <ResultMeta label="memory" value={result.memory || "-"} />
          </div>
          <CodeBlock title="stdout" content={result.stdout || "无输出"} />
          <CodeBlock title="stderr" content={result.stderr || "无错误信息"} />
          <CodeBlock title="compileOutput" content={result.compileOutput || "无编译信息"} />
        </>
      )}
    </div>
  );
}

function ResultMeta({ label, value }: { label: string; value: string }) {
  return (
    <span className="text-[11px] font-bold text-slate-600 bg-white border border-slate-100 px-2.5 py-1 rounded-lg">
      {label}：{value}
    </span>
  );
}

function InlineNotice({ tone, text }: { tone: "success" | "warning" | "error"; text: string }) {
  const styles = {
    success: "border-emerald-100 bg-emerald-50 text-emerald-700",
    warning: "border-amber-100 bg-amber-50 text-amber-700",
    error: "border-rose-100 bg-rose-50 text-rose-700"
  }[tone];
  const Icon = tone === "success" ? CheckCircle2 : AlertCircle;

  return (
    <div className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-xs font-bold leading-relaxed ${styles}`}>
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <span>{text}</span>
    </div>
  );
}

function DifficultyBadge({ difficulty }: { difficulty?: string }) {
  const tone = difficulty === "综合"
    ? "bg-rose-50 text-rose-700 border-rose-100"
    : difficulty === "提高"
    ? "bg-amber-50 text-amber-700 border-amber-100"
    : "bg-emerald-50 text-emerald-700 border-emerald-100";

  return (
    <span className={`text-[10px] font-black px-2 py-1 rounded-lg border ${tone}`}>
      {difficulty || "基础"}
    </span>
  );
}

function formatStatus(status?: string) {
  if (status === "success") return "运行成功";
  if (status === "error") return "运行出错";
  return status || "未知";
}

function parseTags(tags?: string[] | string) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.filter(Boolean);

  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return tags
      .split(/[,\s，、]+/)
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
}
