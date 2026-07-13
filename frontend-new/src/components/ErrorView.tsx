import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, BookOpen, Brain, CheckCircle, RefreshCw, Search } from "lucide-react";
import { fetchApiData, updateWrongQuestionStatus, type WrongQuestionRecord } from "../api";

interface Props { onNavigateToTab: (tab: string, data?: unknown) => void }

export default function ErrorView({ onNavigateToTab }: Props) {
  const [items, setItems] = useState<WrongQuestionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [subject, setSubject] = useState("全部");
  const [expanded, setExpanded] = useState<string | number | null>(null);
  const [updating, setUpdating] = useState<string | number | null>(null);

  const load = useCallback(() => {
    setLoading(true); setError("");
    fetchApiData<WrongQuestionRecord>("/api/wrong-questions")
      .then((records) => { setItems(records); setExpanded(records[0]?.id ?? null); })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "错题本加载失败"))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const subjects = useMemo(() => ["全部", ...new Set(items.map((item) => item.subject).filter(Boolean))], [items]);
  const visible = subject === "全部" ? items : items.filter((item) => item.subject === subject);
  const pending = items.filter((item) => item.status !== "已掌握").length;

  const setMastered = async (item: WrongQuestionRecord) => {
    setUpdating(item.id); setError("");
    try {
      await updateWrongQuestionStatus(item.id, "已掌握");
      setItems((current) => current.map((record) => record.id === item.id ? { ...record, status: "已掌握", updated_at: new Date().toISOString() } : record));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "错题状态更新失败"); }
    finally { setUpdating(null); }
  };

  if (loading) return <State text="正在读取后端错题记录…" />;
  if (error && items.length === 0) return <Failure message={error} retry={load} />;

  return <div className="space-y-6 fade-in">
    <section className="rounded-2xl border border-slate-100 bg-white p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div><p className="text-xs font-bold text-rose-600">真实错题记录</p><h2 className="text-xl font-black mt-1">错题本</h2><p className="text-xs text-slate-500 mt-1">共 {items.length} 道，{pending} 道待复习；状态更新会保存到后端。</p></div>
      <button onClick={() => onNavigateToTab("quiz")} className="rounded-xl bg-blue-600 text-white px-4 py-2.5 text-xs font-bold inline-flex items-center justify-center gap-2"><Brain className="w-4 h-4" />前往同类练习</button>
    </section>

    {error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900" role="alert">状态更新失败：{error}<button onClick={load} className="ml-3 font-bold underline">重新读取</button></div>}

    {items.length === 0 ? <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center"><CheckCircle className="w-9 h-9 text-emerald-500 mx-auto" /><p className="font-bold text-sm mt-3">当前没有错题记录</p><p className="text-xs text-slate-500 mt-1">完成一次测验后，答错题目及反馈会自动保存到这里。</p></div> : <div className="grid lg:grid-cols-12 gap-6">
      <aside className="lg:col-span-3 rounded-2xl border border-slate-100 bg-white p-4 h-fit space-y-3">
        <h3 className="text-xs font-bold flex items-center gap-2"><Search className="w-4 h-4" />按课程筛选</h3>
        {subjects.map((name) => <button key={name} onClick={() => setSubject(name)} className={`w-full rounded-xl border px-3 py-2 text-left text-xs font-bold ${subject === name ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-100 text-slate-600"}`}>{name}</button>)}
      </aside>

      <main className="lg:col-span-9 space-y-4 min-w-0">
        {visible.length === 0 ? <div className="rounded-2xl bg-white border border-slate-100 p-8 text-xs text-slate-500">该课程下没有错题记录。</div> : visible.map((item) => {
          const open = expanded === item.id;
          return <article key={item.id} className="rounded-2xl border border-slate-100 bg-white p-5 min-w-0">
            <button onClick={() => setExpanded(open ? null : item.id)} className="w-full text-left flex items-start justify-between gap-4" aria-expanded={open}>
              <div className="min-w-0"><div className="flex flex-wrap gap-2 text-[10px]"><span className="font-bold text-blue-600">{item.subject || "未分类课程"}</span><span className="text-slate-400">{item.knowledge_point || "未关联知识点"}</span><span className={item.status === "已掌握" ? "text-emerald-600" : "text-rose-600"}>{item.status || "待复习"}</span></div><h3 className="text-sm font-bold mt-2 leading-relaxed">{item.question_text}</h3></div>
              <span className="text-xs font-bold text-blue-600 shrink-0">{open ? "收起" : "查看反馈"}</span>
            </button>
            {open && <div className="mt-5 pt-5 border-t border-slate-100 space-y-4">
              <div className="grid md:grid-cols-2 gap-3"><Fact label="你的答案" value={item.selected_answer} tone="rose" /><Fact label="正确答案" value={item.correct_answer} tone="emerald" /></div>
              <Detail label="题目解析" value={item.analysis} />
              <Detail label="错误原因" value={item.error_reason} />
              <Detail label="反馈建议" value={item.feedback_suggestion} />
              <Detail label="推荐操作" value={item.recommended_action} />
              <p className="text-[11px] text-slate-400">关联知识点：{item.knowledge_point || "未记录"} · 更新时间：{formatTime(item.updated_at)}</p>
              <div className="flex flex-wrap gap-2">
                {item.status !== "已掌握" && <button disabled={updating === item.id} onClick={() => setMastered(item)} className="rounded-xl bg-emerald-600 disabled:bg-slate-300 text-white px-4 py-2 text-xs font-bold">{updating === item.id ? "正在保存…" : "完成修复并标记已掌握"}</button>}
                <button onClick={() => onNavigateToTab("quiz", { subject: item.subject, knowledgePoint: item.knowledge_point })} className="rounded-xl border border-blue-200 text-blue-700 px-4 py-2 text-xs font-bold">练习同类题 <ArrowRight className="inline w-3 h-3" /></button>
                <button onClick={() => onNavigateToTab("mentor", `请结合这道错题帮我理解${item.knowledge_point || item.subject}：${item.question_text}`)} className="rounded-xl border border-slate-200 text-slate-700 px-4 py-2 text-xs font-bold">向 AI 问答</button>
              </div>
            </div>}
          </article>;
        })}
      </main>
    </div>}
  </div>;
}

function Fact({ label, value, tone }: { label: string; value?: string; tone: "rose" | "emerald" }) { return <div className={`rounded-xl p-4 ${tone === "rose" ? "bg-rose-50 text-rose-900" : "bg-emerald-50 text-emerald-900"}`}><p className="text-[10px] font-bold">{label}</p><p className="text-sm font-black mt-1 break-words">{value || "未记录"}</p></div>; }
function Detail({ label, value }: { label: string; value?: string }) { return <section className="rounded-xl bg-slate-50 p-4"><h4 className="text-xs font-bold flex items-center gap-2"><BookOpen className="w-4 h-4 text-blue-600" />{label}</h4><p className="text-xs text-slate-600 mt-2 leading-relaxed whitespace-pre-wrap">{value || "本次记录未包含该项信息。"}</p></section>; }
function formatTime(value?: string) { if (!value) return "未记录"; const date = new Date(value); return Number.isNaN(date.getTime()) ? "未记录" : date.toLocaleString("zh-CN"); }
function State({ text }: { text: string }) { return <div className="rounded-2xl bg-white border border-slate-100 p-10 text-sm text-slate-500" role="status">{text}</div>; }
function Failure({ message, retry }: { message: string; retry: () => void }) { return <div className="rounded-2xl bg-rose-50 border border-rose-100 p-6 text-sm text-rose-800" role="alert"><p><AlertTriangle className="inline w-4 h-4 mr-2" />错题本加载失败：{message}</p><button onClick={retry} className="mt-4 rounded-xl bg-rose-700 text-white px-4 py-2 text-xs font-bold"><RefreshCw className="inline w-4 h-4 mr-2" />重试</button></div>; }
