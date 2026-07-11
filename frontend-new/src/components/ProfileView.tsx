import React, { useEffect, useState } from "react";
import { apiRequest, type ProfileResponse } from "../api";
import ProfileDialogue from "./profile/ProfileDialogue";
import ProfileDimensionCard from "./profile/ProfileDimensionCard";
import ProfileEvidence from "./profile/ProfileEvidence";
import ProfileVersionHistory from "./profile/ProfileVersionHistory";

export default function ProfileView({ onNavigateToTab }: { onNavigateToTab: (tab: string, data?: unknown) => void }) {
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [showDialogue, setShowDialogue] = useState(false);

  const load = () => {
    setLoading(true); setError("");
    apiRequest<ProfileResponse>("/api/profile/me")
      .then((value) => { setData(value); setShowDialogue(value.version === 0 || value.completeness < 1); })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "画像加载失败"))
      .finally(() => setLoading(false));
  };
  useEffect(load, [refreshKey]);

  if (loading) return <div className="rounded-2xl bg-white border border-slate-100 p-10 text-sm text-slate-500">正在读取真实学生画像…</div>;
  if (error) return <div className="rounded-2xl bg-rose-50 border border-rose-100 p-6 text-sm text-rose-700">{error}</div>;
  if (!data) return null;
  const profile = data.profile;
  const refreshed = () => { setShowDialogue(false); setRefreshKey((value) => value + 1); };
  const list = (items: string[]) => items.length ? items.join("、") : "";

  return (
    <div className="space-y-6 fade-in">
      <section className="rounded-2xl bg-slate-950 text-white p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div><p className="text-xs text-blue-300 font-bold">动态学生画像 · V{data.version}</p><h2 className="text-xl font-extrabold mt-1">画像完整度 {Math.round(data.completeness * 100)}%</h2><p className="text-xs text-slate-400 mt-2">最后更新：{data.updatedAt ? new Date(data.updatedAt).toLocaleString() : "尚未确认"}</p></div>
        <button onClick={() => setShowDialogue(true)} className="rounded-xl bg-white text-slate-900 px-4 py-2 text-xs font-bold">{data.version ? "继续完善画像" : "开始画像对话"}</button>
      </section>
      {showDialogue && <ProfileDialogue onConfirmed={refreshed} />}
      <section className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        <ProfileDimensionCard title="专业与年级" value={[profile.majorAndGrade.major, profile.majorAndGrade.grade].filter(Boolean).join(" · ")} meta={data.fieldMeta.majorAndGrade} />
        <ProfileDimensionCard title="当前课程" value={profile.currentCourse} meta={data.fieldMeta.currentCourse} />
        <ProfileDimensionCard title="先修知识基础" value={list(profile.priorKnowledge)} meta={data.fieldMeta.priorKnowledge} />
        <ProfileDimensionCard title="学习目标" value={list(profile.learningGoals)} meta={data.fieldMeta.learningGoals} />
        <ProfileDimensionCard title="认知与讲解偏好" value={profile.explanationPreference} meta={data.fieldMeta.explanationPreference} />
        <ProfileDimensionCard title="资源形式偏好" value={list(profile.resourcePreferences)} meta={data.fieldMeta.resourcePreferences} />
        <ProfileDimensionCard title="学习节奏与时间" value={`${profile.paceAndTimeBudget.pacePreference || ""}${profile.paceAndTimeBudget.weeklyTimeBudgetMinutes ? ` · 每周 ${profile.paceAndTimeBudget.weeklyTimeBudgetMinutes / 60} 小时` : ""}`} meta={data.fieldMeta.paceAndTimeBudget} />
        <ProfileDimensionCard title="知识点掌握向量" value={profile.knowledgeMastery.length ? profile.knowledgeMastery.slice(0, 4).map((item) => `${item.knowledgePoint} ${item.mastery}%`).join("；") : "暂无真实测验数据"} />
        <ProfileDimensionCard title="常见错误类型" value={profile.errorPatterns.length ? profile.errorPatterns.slice(0, 4).map((item) => `${item.knowledgePoint} · ${item.errorType} ×${item.occurrenceCount}`).join("；") : "暂无错题归因"} />
      </section>
      {data.latestChange && <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs text-blue-900">最近变化：V{data.latestChange.version} · {data.latestChange.reason}</div>}
      <div className="grid lg:grid-cols-2 gap-5"><ProfileEvidence items={data.evidenceSummary} /><ProfileVersionHistory refreshKey={refreshKey} /></div>
      <button onClick={() => onNavigateToTab("quiz", { subject: profile.currentCourse || "数据结构" })} className="rounded-xl bg-blue-600 text-white px-5 py-3 text-xs font-bold">使用当前画像开始测验</button>
    </div>
  );
}
