import React from "react";
import type { ProfileFieldMeta } from "../../api";

interface Props { title: string; value: React.ReactNode; meta?: ProfileFieldMeta; }

export default function ProfileDimensionCard({ title, value, meta }: Props) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-xs font-extrabold text-slate-800">{title}</h4>
        <span className="text-[10px] font-bold rounded-full bg-blue-50 text-blue-700 px-2 py-1">
          {meta?.source === "student_dialogue" ? "来自学生对话" : meta?.source === "student_edit" ? "学生确认修改" : "来自学习行为"}
        </span>
      </div>
      <div className="text-sm text-slate-700 leading-relaxed">{value || <span className="text-slate-400">待补充</span>}</div>
      {meta?.evidence && <p className="text-[11px] text-slate-400">依据：{meta.evidence}</p>}
      {typeof meta?.confidence === "number" && <p className="text-[10px] text-slate-400">置信度 {Math.round(meta.confidence * 100)}%</p>}
    </div>
  );
}
