import React, { useEffect, useState } from "react";
import { apiRequest } from "../../api";

interface VersionItem { version: number; reason: string; sourceType: string; createdAt: string; }

export default function ProfileVersionHistory({ refreshKey }: { refreshKey: number }) {
  const [items, setItems] = useState<VersionItem[]>([]);
  useEffect(() => {
    apiRequest<VersionItem[]>("/api/profile/history").then((value) => setItems(value || [])).catch(() => setItems([]));
  }, [refreshKey]);
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
      <h3 className="text-xs font-extrabold text-slate-900">画像版本历史</h3>
      {items.length === 0 ? <p className="text-xs text-slate-400">暂无版本记录</p> : items.slice(0, 6).map((item) => (
        <div key={item.version} className="border-l-2 border-blue-200 pl-3 py-1">
          <div className="text-xs font-bold text-slate-800">V{item.version} · {item.reason}</div>
          <div className="text-[10px] text-slate-400">{new Date(item.createdAt).toLocaleString()} · {item.sourceType}</div>
        </div>
      ))}
    </section>
  );
}
