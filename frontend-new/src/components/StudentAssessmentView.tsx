import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, BarChart3, CheckCircle, ClipboardCheck, RefreshCw, ShieldAlert, Sparkles, Target } from "lucide-react";
import { getStudentAssessment, type AssessmentConclusion, type LearningResourceType, type StudentAssessment } from "../api";

const metric = (value: number | null, suffix = "") => value === null ? "证据不足" : `${value}${suffix}`;
const resourceLabels: Record<LearningResourceType, string> = {
  study_note: "学习笔记", mind_map: "思维导图", pptx: "PPT 课件", quiz_pack: "练习包", code_case: "代码案例"
};

export default function StudentAssessmentView({ onNavigateToTab }: { onNavigateToTab: (tab: string, data?: unknown) => void }) {
  const [data, setData] = useState<StudentAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    setLoading(true); setError("");
    getStudentAssessment().then(setData).catch((reason) => setError(reason instanceof Error ? reason.message : "评估报告加载失败")).finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  if (loading) return <div className="rounded-2xl border border-slate-100 bg-white p-10 text-sm text-slate-500" role="status">正在根据真实学习证据生成评估视图…</div>;
  if (error || !data) return <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6 text-sm text-rose-800" role="alert"><p>评估报告加载失败：{error || "未返回报告数据"}</p><button onClick={load} className="mt-4 rounded-xl bg-rose-700 text-white px-4 py-2 text-xs font-bold"><RefreshCw className="inline w-4 h-4 mr-2" />重试</button></div>;

  return <div className="space-y-6 fade-in">
    <header className="rounded-3xl bg-slate-950 text-white p-6 md:p-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div><p className="text-xs font-bold text-blue-300">学生学习评估 · 画像 V{data.profileVersion}</p><h2 className="text-2xl font-black mt-1">评估报告</h2><p className="text-xs text-slate-400 mt-2">生成时间：{formatTime(data.generatedAt)} · 依据 {data.evidenceCount} 条核心学习证据</p></div>
      {data.latestPersistedReport && <div className="rounded-xl border border-slate-700 px-4 py-2 text-xs">已有教师审核报告 V{data.latestPersistedReport.version}<br/><span className="text-slate-400">{formatTime(data.latestPersistedReport.generatedAt)}</span></div>}
    </header>

    {!data.evidenceSufficient && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"><strong>当前学习证据不足，完成一次测验或CodeLab实践后将生成更准确的评估。</strong><div className="mt-3 flex gap-2"><button onClick={() => onNavigateToTab("quiz")} className="rounded-lg bg-amber-900 text-white px-3 py-2 text-xs font-bold">参加测验</button><button onClick={() => onNavigateToTab("codelab")} className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-bold">进入 CodeLab</button></div></section>}

    <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <Metric label="总体掌握度" value={metric(data.metrics.overallMastery, "%")} detail={`${data.mastery.length} 个知识点有掌握记录`} />
      <Metric label="学习路径进度" value={metric(data.metrics.pathProgress, "%")} detail="来自当前路径完成证据" />
      <Metric label="已完成资源" value={`${data.metrics.completedResources}/${data.metrics.resourceCount}`} detail="来自资源进度记录" />
      <Metric label="测验表现" value={metric(data.metrics.quiz.averageAccuracy, "%")} detail={`${data.metrics.quiz.attemptCount} 次测验`} />
      <Metric label="CodeLab 表现" value={metric(data.metrics.codeLab.successRate, "%")} detail={`${data.metrics.codeLab.successCount}/${data.metrics.codeLab.submissionCount} 次成功`} />
    </section>

    <section className="rounded-2xl border border-slate-100 bg-white p-5">
      <h3 className="font-bold text-sm">五类个性化资源证据</h3>
      <p className="mt-1 text-xs text-slate-500">分别展示已生成与已验证完成数量；未验证的生成代码案例不会计入完成证据。</p>
      <div className="mt-4 grid sm:grid-cols-2 xl:grid-cols-5 gap-3">
        {(Object.keys(resourceLabels) as LearningResourceType[]).map((type) => {
          const counts = data.metrics.resourcesByType[type];
          return <div key={type} className="rounded-xl bg-slate-50 p-4 min-w-0">
            <p className="text-xs font-bold text-slate-700">{resourceLabels[type]}</p>
            <p className="mt-2 text-lg font-black">{counts.completedCount}/{counts.generatedCount}</p>
            <p className="text-[10px] text-slate-400">完成 / 已生成{counts.inProgressCount ? ` · 进行中 ${counts.inProgressCount}` : ""}</p>
          </div>;
        })}
      </div>
    </section>

    <section className="rounded-2xl border border-slate-100 bg-white p-5 space-y-4">
      <div><h3 className="font-bold flex items-center gap-2"><BarChart3 className="w-4 h-4 text-blue-600" />知识点掌握图</h3><p className="text-xs text-slate-500 mt-1">文字摘要：{masterySummary(data)}</p></div>
      {data.mastery.length === 0 ? <Empty text="尚未形成知识点掌握数据。" /> : <div className="grid md:grid-cols-2 gap-3">{data.mastery.map((item) => <div key={`${item.subject}-${item.knowledgePoint}`} className="rounded-xl bg-slate-50 p-4 min-w-0">
        <div className="flex justify-between gap-3 text-xs"><span className="font-bold truncate" title={item.knowledgePoint}>{item.knowledgePoint}</span><span>{metric(item.mastery, "%")}</span></div>
        <p className="text-[10px] text-slate-400 mt-1">{item.subject} · 练习 {item.practiceCount} 次 · 错误 {item.wrongCount} 次</p>
        <div className="h-2 bg-slate-200 rounded-full mt-3 overflow-hidden" role="img" aria-label={`${item.knowledgePoint}掌握度${metric(item.mastery, "%")}`}><div className="h-full bg-blue-600" style={{ width: `${item.mastery ?? 0}%` }} /></div>
      </div>)}</div>}
    </section>

    <div className="grid lg:grid-cols-2 gap-6">
      <ConclusionSection icon={<Target />} title="主要薄弱点" items={data.weaknesses} empty="当前证据未识别出低于 60% 的知识点。" />
      <ConclusionSection icon={<AlertTriangle />} title="错误模式" items={data.errorPatterns} empty="当前没有可用的错误模式记录。" />
      <ConclusionSection icon={<CheckCircle />} title="主要优势" items={data.strengths} empty="当前证据尚不足以确认稳定优势。" />
      <ConclusionSection icon={<ShieldAlert />} title="学习风险" items={data.risks} empty="当前证据未发现明确学习风险。" />
    </div>
    <ConclusionSection icon={<Sparkles />} title="下一步建议" items={data.recommendations} empty="继续按当前学习路径推进。" />

    <footer className="rounded-2xl bg-blue-50 border border-blue-100 p-5"><h3 className="text-xs font-bold text-blue-900 flex items-center gap-2"><ClipboardCheck className="w-4 h-4" />本报告数据来源</h3><p className="text-xs text-blue-800 mt-2 leading-relaxed">{data.dataSources.join("、")}。缺失数据不会被推测或用固定评价补齐。</p></footer>
  </div>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="rounded-2xl bg-white border border-slate-100 p-5"><p className="text-xs font-bold text-slate-500">{label}</p><p className="text-xl font-black mt-3">{value}</p><p className="text-[11px] text-slate-400 mt-1">{detail}</p></div>; }
function ConclusionSection({ icon, title, items, empty }: { icon: React.ReactNode; title: string; items: AssessmentConclusion[]; empty: string }) { return <section className="rounded-2xl bg-white border border-slate-100 p-5 space-y-3"><h3 className="font-bold text-sm flex items-center gap-2"><span className="w-4 h-4 text-blue-600">{icon}</span>{title}</h3>{items.length === 0 ? <Empty text={empty} /> : items.map((item, index) => <article key={`${item.text}-${index}`} className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-800">{item.text}</p><div className="mt-2 text-[11px] text-slate-500 leading-relaxed"><strong>数据依据：</strong>{item.evidence.join("；") || "当前记录未提供更多依据"}</div></article>)}</section>; }
function Empty({ text }: { text: string }) { return <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500">{text}</p>; }
function masterySummary(data: StudentAssessment) { const values = data.mastery.filter((item) => item.mastery !== null); if (!values.length) return "暂无可汇总的掌握度记录。"; const top = [...values].sort((a, b) => (b.mastery ?? 0) - (a.mastery ?? 0))[0]; const low = [...values].sort((a, b) => (a.mastery ?? 0) - (b.mastery ?? 0))[0]; return `共 ${values.length} 个知识点；最高为${top.knowledgePoint} ${top.mastery}%，最低为${low.knowledgePoint} ${low.mastery}%。`; }
function formatTime(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "未记录" : date.toLocaleString("zh-CN"); }
