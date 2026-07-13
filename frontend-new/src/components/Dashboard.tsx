import React, { useCallback, useEffect, useState } from "react";
import { Activity, AlertTriangle, ArrowRight, BookOpen, Brain, CheckCircle, Code2, Compass, RefreshCw, Target } from "lucide-react";
import { getStudentOverview, type StudentOverview } from "../api";

interface Props { onNavigateToTab: (tab: string, data?: unknown) => void }

const displayMetric = (value: number | null, suffix = "") => value === null ? "尚无数据" : `${value}${suffix}`;
const formatTime = (value: string) => Number.isNaN(new Date(value).getTime()) ? "时间未知" : new Date(value).toLocaleString("zh-CN");

export default function Dashboard({ onNavigateToTab }: Props) {
  const [data, setData] = useState<StudentOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true); setError("");
    getStudentOverview().then(setData).catch((reason) => setError(reason instanceof Error ? reason.message : "首页数据加载失败")).finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  if (loading) return <PageState text="正在汇总真实学习记录…" />;
  if (error) return <PageError message={error} onRetry={load} />;
  if (!data) return <PageError message="未读取到首页数据" onRetry={load} />;

  const hasLearningEvidence = data.profile.overallMastery !== null || data.quiz.attemptCount > 0 || data.resources.totalCount > 0 || data.codeLab.submissionCount > 0;
  const weakCourse = data.courses.filter((item) => item.mastery !== null).sort((a, b) => (a.mastery ?? 101) - (b.mastery ?? 101))[0];

  return <div className="space-y-6 fade-in">
    <section className="rounded-3xl bg-slate-950 p-6 md:p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-5">
      <div className="space-y-2">
        <p className="text-xs font-bold text-blue-300">学生学习状态 · 画像 V{data.profile.version}</p>
        <h2 className="text-2xl font-black">欢迎回来，{data.studentName}</h2>
        <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
          {weakCourse ? `当前优先关注 ${weakCourse.subject}，已有掌握记录 ${weakCourse.mastery}%。` : "尚未形成知识掌握数据，建议先完成画像和一次测验。"}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => onNavigateToTab("quiz")} className="rounded-xl bg-white text-slate-950 px-4 py-2.5 text-xs font-bold">开始每日测验</button>
        <button onClick={() => onNavigateToTab("path")} className="rounded-xl border border-slate-600 px-4 py-2.5 text-xs font-bold">查看学习路径</button>
      </div>
    </section>

    {!hasLearningEvidence && <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-sm text-blue-900">
      <p className="font-bold">当前还没有可统计的学习证据</p>
      <p className="mt-1 text-xs leading-relaxed">完成对话式画像和一次测验后，首页会展示掌握度、薄弱点、路径与活动记录。</p>
    </section>}

    <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4" aria-label="真实学习统计">
      <Metric icon={<Target />} label="总体掌握度" value={displayMetric(data.profile.overallMastery, "%")} note={data.profile.overallMastery === null ? "等待测验形成掌握记录" : `${data.courses.length} 门课程有掌握证据`} />
      <Metric icon={<Brain />} label="测验次数" value={`${data.quiz.attemptCount} 次`} note={data.quiz.averageAccuracy === null ? "尚无正确率" : `平均正确率 ${data.quiz.averageAccuracy}%`} />
      <Metric icon={<AlertTriangle />} label="薄弱点" value={`${data.profile.weakPointCount} 个`} note={`${data.profile.errorPatternCount} 类已识别错误模式`} />
      <Metric icon={<Compass />} label="当前路径进度" value={displayMetric(data.path?.progress ?? null, "%")} note={data.path ? `路径 V${data.path.version} · ${data.path.stages} 个阶段` : "尚未生成学习路径"} />
      <Metric icon={<BookOpen />} label="已完成资源" value={`${data.resources.completedCount} 个`} note={`共 ${data.resources.totalCount} 个真实资源记录`} />
      <Metric icon={<Code2 />} label="CodeLab 表现" value={displayMetric(data.codeLab.successRate, "%")} note={`${data.codeLab.successCount}/${data.codeLab.submissionCount} 次提交成功`} />
    </section>

    <div className="grid lg:grid-cols-2 gap-6">
      <section className="rounded-2xl border border-slate-100 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between"><h3 className="font-bold text-sm">课程掌握情况</h3><button onClick={() => onNavigateToTab("analytics")} className="text-xs font-bold text-blue-600">查看画像 <ArrowRight className="inline w-3 h-3" /></button></div>
        {data.courses.length === 0 ? <Empty text="尚未形成知识掌握数据，建议先完成画像和一次测验。" /> : data.courses.map((course) => <div key={course.subject} className="rounded-xl border border-slate-100 p-4 space-y-2">
          <div className="flex justify-between gap-3 text-xs"><strong>{course.subject}</strong><span>{displayMetric(course.mastery, "%")}</span></div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-blue-600" style={{ width: `${course.mastery ?? 0}%` }} /></div>
          <p className="text-[11px] text-slate-500">{course.knowledgePointCount} 个知识点 · {course.practiceCount} 次练习 · {course.wrongCount} 次错误</p>
        </div>)}
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between"><h3 className="font-bold text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-blue-600" />最近学习活动</h3><span className="text-[10px] text-slate-400">最多 10 条</span></div>
        {data.recentActivities.length === 0 ? <Empty text="暂无真实学习活动，完成画像、测验、资源或 CodeLab 后将在这里显示。" /> : data.recentActivities.map((item, index) => <div key={`${item.type}-${item.time}-${index}`} className="flex gap-3 border-b border-slate-50 pb-3 last:border-0">
          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /><div><p className="text-xs text-slate-700">{item.text}</p><p className="text-[10px] text-slate-400 mt-1">{formatTime(item.time)}</p></div>
        </div>)}
      </section>
    </div>
  </div>;
}

function Metric({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note: string }) {
  return <div className="rounded-2xl border border-slate-100 bg-white p-5 min-h-32"><div className="flex justify-between text-xs text-slate-500"><span className="font-bold">{label}</span><span className="w-5 h-5 text-blue-600">{icon}</span></div><p className="text-xl font-black text-slate-950 mt-4">{value}</p><p className="text-[11px] text-slate-400 mt-1">{note}</p></div>;
}
function Empty({ text }: { text: string }) { return <div className="rounded-xl bg-slate-50 p-5 text-xs text-slate-500 leading-relaxed">{text}</div>; }
function PageState({ text }: { text: string }) { return <div className="rounded-2xl border border-slate-100 bg-white p-10 text-sm text-slate-500" role="status">{text}</div>; }
function PageError({ message, onRetry }: { message: string; onRetry: () => void }) { return <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6 text-sm text-rose-800" role="alert"><p>首页加载失败：{message}</p><button onClick={onRetry} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-700 text-white px-4 py-2 text-xs font-bold"><RefreshCw className="w-4 h-4" />重试</button></div>; }
