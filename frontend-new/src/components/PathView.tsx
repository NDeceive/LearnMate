import React, { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Award, Brain, CheckCircle, ChevronDown, ChevronUp, Clock, Code2, Compass, History, Loader2, Lock, RefreshCw } from "lucide-react";
import type { Course, LearningPathResponse, LearningPathVersion, PathStage, WeakPoint } from "../types";
import { generateLearningPath, getLearningPath, getLearningPathVersions, listLearningResources, type LearningResource } from "../api";
import KnowledgeGraph from "./KnowledgeGraph";

interface PathViewProps {
  courses: Course[];
  weakPoints: WeakPoint[];
  onNavigateToTab: (tab: string, prefillData?: unknown) => void;
  onNavigateToExercise: (exerciseId: string) => void;
}

export default function PathView({ courses, weakPoints, onNavigateToTab, onNavigateToExercise }: PathViewProps) {
  const [path, setPath] = useState<LearningPathResponse | null>(null);
  const [versions, setVersions] = useState<LearningPathVersion[]>([]);
  const [expandedStageId, setExpandedStageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [stageResources, setStageResources] = useState<Record<string, LearningResource[]>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const current = await getLearningPath();
      setPath(current);
      setExpandedStageId((current.stages.find((stage) => stage.status === "active") || current.stages[0])?.key || null);
      setVersions(await getLearningPathVersions());
      const resources=await listLearningResources({status:"approved",limit:100});
      setStageResources(resources.filter(r=>r.pathVersion===current.version).reduce<Record<string,LearningResource[]>>((groups,item)=>{(groups[item.stageKey]??=[]).push(item);return groups;},{}));
    } catch (requestError) {
      const status = (requestError as Error & { status?: number }).status;
      if (status !== 404) setError(requestError instanceof Error ? requestError.message : "学习路径加载失败");
      setPath(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const generate = async () => {
    setGenerating(true);
    setError("");
    try {
      const next = await generateLearningPath();
      setPath(next);
      setExpandedStageId((next.stages.find((stage) => stage.status === "active") || next.stages[0])?.key || null);
      setVersions(await getLearningPathVersions());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "路径生成失败");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div className="flex min-h-72 items-center justify-center text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" />正在读取数据库中的学习路径…</div>;

  if (!path) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
      <Compass className="mx-auto mb-4 h-10 w-10 text-blue-600" />
      <h2 className="text-xl font-bold text-slate-900">生成动态个性化学习路径</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">PlannerAgent 只会使用数据库中真实存在的知识点、题目与 CodeLab 练习，并由后端控制阶段解锁和完成状态。</p>
      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      <button disabled={generating} onClick={generate} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
        {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Compass className="h-4 w-4" />}开始规划
      </button>
    </div>;
  }

  return <div className="space-y-6 font-sans">
    <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm md:p-8">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
        <div>
          <span className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700"><Compass className="h-3.5 w-3.5" />PlannerAgent 数据库约束规划</span>
          <h2 className="mt-3 text-2xl font-bold text-slate-900">{path.title}</h2>
          <p className="mt-2 text-sm text-slate-500">当前 V{path.version} · {path.changeReason}</p>
        </div>
        <button disabled={generating} onClick={generate} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60">
          <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} />重新评估
        </button>
      </div>
      <div className="mt-5 flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${path.progress}%` }} /></div><strong className="text-sm text-blue-700">{path.progress}%</strong></div>
      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
    </section>

    <KnowledgeGraph courses={courses} weakPoints={weakPoints} onNavigateToTab={onNavigateToTab} />

    <section className="space-y-4">
      <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Award className="h-4 w-4 text-blue-600" />数据库路径阶段</h3>
      {path.stages.map((stage, index) => <StageCard key={stage.key} stage={stage} resources={stageResources[stage.key]||[]} index={index} expanded={expandedStageId === stage.key} onToggle={() => setExpandedStageId((value) => value === stage.key ? null : stage.key)} onQuiz={() => onNavigateToTab("quiz", { subject: stage.subject, knowledgePoint: stage.knowledgePoints[0] })} onCode={() => stage.codeExerciseIds[0] && onNavigateToExercise(stage.codeExerciseIds[0])} onResource={(resourceType) => onNavigateToTab("resource", { resourceType, subject: stage.subject, knowledgePointId: stage.knowledgePoints[0], stageKey: stage.key, pathVersion: path.version })} />)}
    </section>

    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><History className="h-4 w-4 text-blue-600" />版本历史（来自数据库）</h3>
      <div className="mt-3 space-y-2">{versions.map((version) => <div key={version.version} className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600"><strong className="text-slate-900">V{version.version}</strong> · {version.changeReason}<span className="ml-2 text-slate-400">新增 {version.diff.added.length} / 移除 {version.diff.removed.length} / 调整 {version.diff.changed.length}{version.diff.reordered ? " / 顺序调整" : ""}</span></div>)}</div>
    </section>
  </div>;
}

function StageCard({ stage, resources, index, expanded, onToggle, onQuiz, onCode, onResource }: { key?: React.Key; stage: PathStage; resources: LearningResource[]; index: number; expanded: boolean; onToggle: () => void; onQuiz: () => void; onCode: () => void; onResource: (type: "mind_map"|"pptx") => void }) {
  const completed = stage.status === "completed";
  const active = stage.status === "active";
  return <div className={`rounded-2xl border bg-white p-5 shadow-sm ${active ? "border-blue-300 ring-2 ring-blue-50" : "border-slate-100"}`}>
    <button onClick={onToggle} className="flex w-full items-start justify-between gap-4 text-left">
      <div className="flex gap-3">{completed ? <CheckCircle className="h-5 w-5 text-emerald-500" /> : active ? <Clock className="h-5 w-5 text-blue-600" /> : <Lock className="h-5 w-5 text-slate-400" />}<div><p className="text-xs font-semibold text-slate-400">阶段 {index + 1} · {stage.durationMinutes} 分钟</p><h4 className="mt-1 font-bold text-slate-900">{stage.title}</h4><p className="mt-1 text-xs text-slate-500">{completed ? "已由后端学习证据验证完成" : active ? `进行中 · ${stage.progress}%` : "前置阶段尚未完成，当前锁定"}</p></div></div>
      {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
    </button>
    {expanded && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 space-y-4 border-t border-slate-100 pt-4">
      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">{stage.goals.map((goal) => <li key={goal}>{goal}</li>)}</ul>
      <div className="flex flex-wrap gap-2">{stage.knowledgePoints.map((point) => <span key={point} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{point}</span>)}</div>
      <div className="space-y-1 text-xs text-slate-500">{stage.resources.map((resource) => <div key={resource}>&gt; {resource}</div>)}</div>
      {resources.length>0&&<div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">{resources.map(r=><div key={r.id}>已生成 {r.resourceType} · V{r.version} · 审核 {r.review.score} 分 · 进度 {r.progress?.progressPercent||0}%</div>)}</div>}
      {active && <div className="flex flex-wrap gap-2">{stage.completion.type === "quiz" ? <button onClick={onQuiz} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white"><Brain className="h-4 w-4" />开始后端验收测验<ArrowRight className="h-4 w-4" /></button> : stage.completion.type === "codelab" ? <button onClick={onCode} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white"><Code2 className="h-4 w-4" />进入 CodeLab<ArrowRight className="h-4 w-4" /></button> : <><button onClick={()=>onResource("mind_map")} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white">{resources.some(r=>r.resourceType==="mind_map")?"继续学习思维导图":"生成思维导图"}</button><button onClick={()=>onResource("pptx")} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white">{resources.some(r=>r.resourceType==="pptx")?"继续学习课件":"生成个性化课件"}</button></>}</div>}
    </motion.div>}
  </div>;
}
