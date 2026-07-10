import React from "react";
import type { LearningProfileDraft } from "../../api";

export default function ProfileConfirmation({ draft, submitting, onConfirm }: { draft: LearningProfileDraft; submitting: boolean; onConfirm: () => void }) {
  return (
    <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 space-y-3">
      <div className="text-xs font-bold text-emerald-900">画像已整理完成</div>
      <p className="text-xs text-emerald-800">课程：{draft.currentCourse || "待补充"}；偏好：{draft.explanationPreference || "待补充"}；每周预算：{draft.paceAndTimeBudget.weeklyTimeBudgetMinutes ? `${draft.paceAndTimeBudget.weeklyTimeBudgetMinutes / 60} 小时` : "待补充"}</p>
      <button disabled={submitting} onClick={onConfirm} className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-xs font-bold disabled:opacity-50">
        {submitting ? "正在保存画像…" : "确认并生成画像版本"}
      </button>
    </div>
  );
}
