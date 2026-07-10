import React from "react";
import type { ProfileResponse } from "../../api";

export default function ProfileEvidence({ items }: { items: ProfileResponse["evidenceSummary"] }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
      <h3 className="text-xs font-extrabold text-slate-900">画像证据与来源</h3>
      {items.length === 0 ? <p className="text-xs text-slate-400">画像确认后将在这里保留来源与更新依据。</p> : (
        <div className="space-y-2">
          {items.slice(0, 10).map((item, index) => (
            <div key={`${item.field}-${index}`} className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <strong className="text-slate-800">{item.field}</strong> · {item.evidence || item.source || "学习行为记录"}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
