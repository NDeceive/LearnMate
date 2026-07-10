import React, { useEffect, useState } from "react";
import { apiRequest, type ProfileDialogueResponse } from "../../api";
import ProfileConfirmation from "./ProfileConfirmation";

export default function ProfileDialogue({ onConfirmed }: { onConfirmed: () => void }) {
  const [session, setSession] = useState<ProfileDialogueResponse | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setBusy(true);
    apiRequest<ProfileDialogueResponse>("/api/profile/dialogue/start", { method: "POST" })
      .then(setSession).catch((reason) => setError(reason instanceof Error ? reason.message : "画像会话加载失败"))
      .finally(() => setBusy(false));
  }, []);

  const send = async () => {
    if (!session || !message.trim() || busy) return;
    setBusy(true); setError("");
    try {
      const next = await apiRequest<ProfileDialogueResponse>("/api/profile/dialogue/message", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.sessionId, message })
      });
      setSession(next); setMessage("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "发送失败"); }
    finally { setBusy(false); }
  };

  const confirm = async () => {
    if (!session || busy) return;
    setBusy(true); setError("");
    try {
      await apiRequest("/api/profile/dialogue/confirm", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.sessionId, confirmedProfile: session.currentDraft })
      });
      onConfirmed();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "确认失败"); }
    finally { setBusy(false); }
  };

  return (
    <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div><h3 className="text-sm font-extrabold text-slate-900">ProfileAgent 对话式画像</h3><p className="text-xs text-slate-400">每次只回答一个问题，可以输入“跳过”。</p></div>
        <span className="text-xs font-bold text-blue-600">{Math.round((session?.progress || 0) * 100)}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-blue-600 transition-all" style={{ width: `${(session?.progress || 0) * 100}%` }} /></div>
      <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-sm text-blue-950 leading-relaxed">
        {busy && !session ? "正在恢复画像会话…" : session?.assistantMessage || "正在准备第一个问题…"}
      </div>
      {session?.status === "ready_for_confirmation" ? (
        <ProfileConfirmation draft={session.currentDraft} submitting={busy} onConfirm={confirm} />
      ) : (
        <div className="flex gap-2">
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={1000} rows={3} placeholder="用自然语言回答…" className="flex-1 rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-500" />
          <button disabled={busy || !message.trim()} onClick={send} className="self-end rounded-xl bg-blue-600 text-white px-5 py-3 text-xs font-bold disabled:opacity-50">{busy ? "分析中…" : "发送"}</button>
        </div>
      )}
      {error && <p className="text-xs text-rose-600">{error}</p>}
      {session && !session.modelAvailable && session.messages && <p className="text-[10px] text-amber-600">模型不可用时仅保留学生明确表达的信息，画像不会被虚构内容覆盖。</p>}
    </section>
  );
}
