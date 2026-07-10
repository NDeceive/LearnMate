import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, Brain, Code2, Loader2, Search, SlidersHorizontal } from "lucide-react";
import { CodeExercise, getCodeExercises } from "../api";
import CodeLabWorkspace from "./CodeLabWorkspace";

interface CodeLabViewProps {
  routePath: string;
  onNavigateToTab: (tab: string, prefillData?: any) => void;
  onNavigateToExercise: (exerciseId: string) => void;
  onNavigateToList: () => void;
}

const SUBJECT_OPTIONS = ["数据结构"];
const KNOWLEDGE_OPTIONS = ["全部", "顺序表", "链表", "栈", "队列", "二叉树", "查找", "排序", "哈希表"];
const DIFFICULTY_OPTIONS = ["全部", "基础", "提高", "综合"];

export default function CodeLabView({
  routePath,
  onNavigateToTab,
  onNavigateToExercise,
  onNavigateToList
}: CodeLabViewProps) {
  const routeExerciseId = useMemo(() => getExerciseIdFromRoute(routePath), [routePath]);
  const [subject, setSubject] = useState("数据结构");
  const [knowledgePoint, setKnowledgePoint] = useState("全部");
  const [difficulty, setDifficulty] = useState("全部");
  const [exercises, setExercises] = useState<CodeExercise[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const activeKnowledgePoint = knowledgePoint === "全部" ? undefined : knowledgePoint;
  const activeDifficulty = difficulty === "全部" ? undefined : difficulty;

  useEffect(() => {
    if (routeExerciseId) return;

    let cancelled = false;
    setIsLoading(true);
    setError("");

    getCodeExercises({
      subject,
      knowledgePoint: activeKnowledgePoint,
      difficulty: activeDifficulty
    })
      .then((items) => {
        if (!cancelled) {
          setExercises(items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setExercises([]);
          setError("暂时无法加载代码练习，请确认后端服务已启动。");
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
  }, [activeDifficulty, activeKnowledgePoint, routeExerciseId, subject]);

  if (routeExerciseId) {
    return (
      <CodeLabWorkspace
        exerciseId={routeExerciseId}
        onBackToList={onNavigateToList}
      />
    );
  }

  return (
    <div className="fade-in font-sans space-y-5">
      <section className="bg-white border border-blue-100 rounded-2xl p-5 md:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
              <Code2 className="w-3.5 h-3.5" />
              CodeLab 演示模式
            </span>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-950 tracking-tight">代码实验室</h2>
              <p className="text-sm text-slate-600 leading-relaxed max-w-4xl">
                当前版本为样例运行演示模式，支持数据结构代码练习、样例输出查看与 AI 解释。
                正式 OJ 判题将在后续接入沙箱运行环境。
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onNavigateToTab("quiz")}
              className="inline-flex items-center justify-center gap-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              <Brain className="w-4 h-4" />
              返回每日测验
            </button>
            <button
              onClick={() =>
                onNavigateToTab("resource", {
                  subject: "数据结构",
                  topic: "数据结构代码练习"
                })
              }
              className="inline-flex items-center justify-center gap-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-100 px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              查看数据结构资源
            </button>
          </div>
        </div>
      </section>

      <section className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 md:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div className="space-y-2">
            <h3 className="text-lg font-black text-slate-950 flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-600" />
              代码实验题库
            </h3>
            <p className="text-xs font-semibold text-slate-500">
              共 {exercises.length} 道练习。选择题目后进入独立工作台编写和运行样例。
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto lg:min-w-[620px]">
            <FilterSelect label="课程" value={subject} options={SUBJECT_OPTIONS} onChange={setSubject} />
            <FilterSelect
              label="知识点"
              value={knowledgePoint}
              options={KNOWLEDGE_OPTIONS}
              onChange={setKnowledgePoint}
            />
            <FilterSelect
              label="难度"
              value={difficulty}
              options={DIFFICULTY_OPTIONS}
              onChange={setDifficulty}
            />
          </div>
        </div>

        {error && <InlineNotice text={error} />}

        {isLoading && (
          <div className="min-h-[260px] flex items-center justify-center gap-2 text-sm font-bold text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            正在加载代码实验题...
          </div>
        )}

        {!isLoading && exercises.length === 0 && !error && (
          <div className="min-h-[220px] flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center p-6">
            <SlidersHorizontal className="w-8 h-8 text-slate-400" />
            <p className="text-sm font-bold text-slate-600">暂无符合筛选条件的代码实验题。</p>
          </div>
        )}

        {!isLoading && exercises.length > 0 && (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {exercises.map((exercise) => (
              <article
                key={exercise.exercise_id}
                className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-blue-100 transition-all min-w-0 space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-[11px] font-black text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg">
                      {exercise.exercise_id}
                    </span>
                    <h4 className="mt-3 text-sm font-black text-slate-950 leading-snug">
                      {exercise.title}
                    </h4>
                  </div>
                  <DifficultyBadge difficulty={exercise.difficulty} />
                </div>

                <div className="flex flex-wrap gap-2 text-[11px] font-bold">
                  <span className="text-slate-600 bg-white border border-slate-100 px-2.5 py-1 rounded-lg">
                    {exercise.knowledge_point}
                  </span>
                  <span className="text-slate-600 bg-white border border-slate-100 px-2.5 py-1 rounded-lg">
                    {(exercise.language || "c").toUpperCase()}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 min-h-[60px]">
                  {summarizeDescription(exercise.description)}
                </p>

                <button
                  onClick={() => onNavigateToExercise(exercise.exercise_id)}
                  className="w-full inline-flex items-center justify-center gap-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-xl shadow-sm transition-colors cursor-pointer"
                >
                  开始实验
                  <ArrowRight className="w-4 h-4" />
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1.5 block">
      <span className="text-[11px] font-extrabold text-slate-600">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function DifficultyBadge({ difficulty }: { difficulty?: string }) {
  const tone = difficulty === "综合"
    ? "bg-rose-50 text-rose-700 border-rose-100"
    : difficulty === "提高"
    ? "bg-amber-50 text-amber-700 border-amber-100"
    : "bg-emerald-50 text-emerald-700 border-emerald-100";

  return (
    <span className={`shrink-0 text-[10px] font-black px-2 py-1 rounded-lg border ${tone}`}>
      {difficulty || "基础"}
    </span>
  );
}

function InlineNotice({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
      {text}
    </div>
  );
}

function summarizeDescription(description?: string) {
  if (!description) return "暂无题目描述。";
  return description.length > 120 ? `${description.slice(0, 120)}...` : description;
}

function getExerciseIdFromRoute(routePath: string) {
  const pathname = routePath.split("?")[0].replace(/\/$/, "");
  const prefix = "/student/codelab/";

  if (!pathname.toLowerCase().startsWith(prefix)) {
    return "";
  }

  return decodeURIComponent(pathname.slice(prefix.length));
}
