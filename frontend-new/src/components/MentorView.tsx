import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import type { ChatSession, ChatMessage } from "../types";
import { apiRequest } from "../api";
import CitationPanel from "./knowledge/CitationPanel";
import {
  Send,
  Plus,
  MessageSquare,
  Workflow,
  Sparkles,
  BookOpen,
  Code,
  AlertTriangle,
  ArrowRight,
  Paperclip,
  Check,
  Copy,
  Hash,
  Brain,
  Cpu
} from "lucide-react";

interface MentorViewProps {
  initialPrompt?: string | null;
  onClearPrefill: () => void;
}

const INITIAL_SESSION: ChatSession = {
  id: "new-session",
  title: "新对话",
  knowledgePoints: [],
  recommendedResources: [],
  suggestedFollowups: [],
  messages: []
};

export default function MentorView({ initialPrompt, onClearPrefill }: MentorViewProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([INITIAL_SESSION]);
  const [activeSessionId, setActiveSessionId] = useState<string>(INITIAL_SESSION.id);
  const [inputText, setInputText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [requestError, setRequestError] = useState("");
  const [lastFailedPrompt, setLastFailedPrompt] = useState("");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages, isSubmitting, requestError]);

  // Handle deep-linked prefilled prompts!
  useEffect(() => {
    if (initialPrompt) {
      setInputText(initialPrompt);
      onClearPrefill();
    }
  }, [initialPrompt]);

  const handleCopyCode = (text: string, partId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(partId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateSession = () => {
    const newSession: ChatSession = {
      id: `session-${crypto.randomUUID()}`,
      title: "新对话",
      knowledgePoints: [],
      recommendedResources: [],
      suggestedFollowups: [],
      messages: []
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  const handleSubmitMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isSubmitting) return;

    const userMsg: ChatMessage = {
      id: "msg-user-" + Date.now(),
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: textToSend
    };

    // Append user message
    const updatedMessages = [...activeSession.messages, userMsg];
    
    // Update local state
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? {
              ...s,
              title: s.messages.length === 0 ? (textToSend.length > 15 ? textToSend.substring(0, 15) + "..." : textToSend) : s.title,
              messages: updatedMessages
            }
          : s
      )
    );

    setInputText("");
    setIsSubmitting(true);
    setRequestError("");
    setLastFailedPrompt("");

    try {
      const data = await apiRequest<{ parts: ChatMessage["parts"] }>("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: activeSession.messages
        })
      });

      const assistantMsg: ChatMessage = {
        id: "msg-agent-" + Date.now(),
        sender: "assistant",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        parts: data.parts
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? {
                ...s,
                messages: [...updatedMessages, assistantMsg]
              }
            : s
        )
      );

    } catch (err) {
      setRequestError(err instanceof Error ? err.message : "问答服务请求失败");
      setLastFailedPrompt(textToSend);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-12 gap-6 h-[calc(100vh-140px)] fade-in font-sans">
      {/* 1. LEFT SIDEBAR: Sessions list (3 Columns) */}
      <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col justify-between h-full">
        <div className="space-y-4 flex-grow overflow-y-auto">
          <button
            onClick={handleCreateSession}
            className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> 开启全新学术对话
          </button>

          <div className="space-y-2.5">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1.5">历史学术咨询</h4>
            
            <div className="space-y-1.5">
              {sessions.map((s) => {
                const isActive = s.id === activeSessionId;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveSessionId(s.id)}
                    className={`w-full text-left p-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                      isActive
                        ? "bg-blue-600 text-white shadow-md shadow-blue-100"
                        : "hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-transparent hover:border-slate-100"
                    }`}
                  >
                    <MessageSquare className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span className="truncate leading-tight">{s.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-3 text-[10px] text-slate-400 font-mono flex items-center gap-1 justify-center">
          <Cpu className="w-3.5 h-3.5 text-blue-500" />
          <span>知识库问答会话</span>
        </div>
      </div>

      {/* 2. MIDDLE CHAT PANEL: Message feed (6 Columns) */}
      <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-full overflow-hidden">
        {/* Chat Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Workflow className="w-4 h-4 text-blue-600" /> 计智引擎知识问答
            </h3>
            <p className="text-[10px] text-slate-400 leading-none">回答以服务端返回内容和知识库引用为准</p>
          </div>
          <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold">
            引用可核验
          </span>
        </div>

        {/* Message scroll list */}
        <div className="flex-grow p-5 overflow-y-auto space-y-5 bg-slate-50/20">
          {activeSession.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <Brain className="w-10 h-10 text-blue-600/30" />
              <div>
                <h4 className="text-xs font-bold text-slate-700">没有对话消息</h4>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs leading-relaxed">
                  输入问题后，系统会请求后端知识库问答服务；没有服务端结果时不会生成替代答案。
                </p>
              </div>
            </div>
          ) : (
            activeSession.messages.map((msg) => (
              <div key={msg.id} className="space-y-2 fade-in">
                {/* Check Sender */}
                {msg.sender === "user" ? (
                  /* User Bubble */
                  <div className="flex justify-end">
                    <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-xs font-medium max-w-md shadow-sm leading-relaxed">
                      {msg.text}
                    </div>
                  </div>
                ) : (
                  /* Assistant Bento Stack */
                  <div className="space-y-4">
                    {msg.parts?.map((part, pIdx) => {
                      const isCoordinator = part.agent === "coordinator";
                      const isTheory = part.agent === "TheoryAgent";
                      const isCode = part.agent === "CodeAgent";
                      const isReview = part.agent === "ReviewAgent";

                      return (
                        <div
                          key={pIdx}
                          className={`p-4 rounded-xl border shadow-sm leading-relaxed ${
                            isCoordinator
                              ? "bg-slate-900 text-slate-300 border-slate-800"
                              : isTheory
                              ? "bg-white border-slate-100"
                              : isCode
                              ? "bg-slate-950 text-slate-300 border-slate-900 font-mono"
                              : "bg-amber-50/20 border-amber-100"
                          }`}
                        >
                          <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-dashed border-slate-100/10">
                            <span className={`text-[11px] font-bold tracking-tight uppercase flex items-center gap-1.5 ${
                              isCoordinator ? "text-blue-400" :
                              isTheory ? "text-slate-800" :
                              isCode ? "text-amber-400" :
                              "text-emerald-700"
                            }`}>
                              {isCoordinator && <Workflow className="w-3.5 h-3.5" />}
                              {isTheory && <BookOpen className="w-3.5 h-3.5 text-blue-600" />}
                              {isCode && <Code className="w-3.5 h-3.5 text-amber-500" />}
                              {isReview && <AlertTriangle className="w-3.5 h-3.5 text-emerald-600" />}
                              {part.title}
                            </span>
                          </div>

                          {/* Render Content */}
                          <div className="text-xs space-y-2 leading-relaxed whitespace-pre-wrap">
                            {part.content}
                          </div>
                          {part.confidence && <div className="mt-2 text-[10px] text-slate-500">置信度 {part.confidence} · 引用覆盖 {Math.round((part.coverage||0)*100)}% · 检索 #{part.retrievalRunId}</div>}
                          {part.citations && <CitationPanel citations={part.citations}/>}

                          {/* If Code block exists */}
                          {part.code && (
                            <div className="mt-3 relative">
                              <div className="absolute right-2 top-2 z-10 flex gap-1.5">
                                <button
                                  onClick={() => handleCopyCode(part.code!, `${msg.id}-${pIdx}`)}
                                  className="p-1 bg-slate-850 hover:bg-slate-700 text-slate-400 rounded transition-colors text-[10px] flex items-center gap-0.5 cursor-pointer"
                                >
                                  {copiedId === `${msg.id}-${pIdx}` ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-500" /> 已复制
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" /> 复制
                                    </>
                                  )}
                                </button>
                              </div>
                              <pre className="p-3 bg-slate-900 rounded-lg text-[11px] text-slate-300 overflow-x-auto leading-normal shadow-inner font-mono">
                                {part.code}
                              </pre>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )}

          {isSubmitting && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800" role="status">
              正在等待问答服务返回结果…
            </div>
          )}
          {requestError && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800" role="alert">
              <span>请求失败：{requestError}</span>
              <button className="shrink-0 rounded-lg border border-rose-300 px-3 py-1 font-bold" onClick={() => handleSubmitMessage(lastFailedPrompt)}>
                重试
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Controls */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-2.5">
          <div className="flex gap-2">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmitMessage(inputText);
                }
              }}
              placeholder="向多维智能体提问（按 Enter 发送，或 Shift+Enter 换行）..."
              className="flex-grow min-h-[50px] max-h-[120px] p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-white text-xs font-semibold leading-relaxed"
            />
          </div>

          <div className="flex justify-between items-center">
            <div className="flex gap-1.5">
              <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">
                <Paperclip className="w-4 h-4" />
              </button>
              <button
                onClick={() => setInputText((p) => p + "\n```c\n\n```")}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer text-xs font-mono font-bold flex items-center gap-0.5"
              >
                <Code className="w-4 h-4" /> CODE
              </button>
              <button
                onClick={() => setInputText((p) => p + " $$O(N \\log N)$$")}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer text-xs font-semibold flex items-center gap-0.5"
              >
                <Hash className="w-4 h-4" /> MATH
              </button>
            </div>

            <button
              onClick={() => handleSubmitMessage(inputText)}
              disabled={isSubmitting || !inputText.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-md shadow-blue-100 hover:shadow-lg transition-all flex items-center gap-1 cursor-pointer"
            >
              发送问题
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. RIGHT SIDEBAR: Knowledge Tags / Recommended / Follow-ups (3 Columns) */}
      <div className="lg:col-span-3 space-y-6 overflow-y-auto h-full">
        {/* Knowledge tags */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
          <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1">
            <Hash className="w-3.5 h-3.5 text-blue-600" /> 关联知识标签
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {activeSession.knowledgePoints.length === 0 && <p className="text-[11px] text-slate-400">暂无服务端知识标签</p>}
            {activeSession.knowledgePoints.map((kp, i) => (
              <button
                key={i}
                onClick={() => setInputText((p) => (p ? `${p} #${kp}` : `#${kp}`))}
                className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 hover:border-slate-200 px-2.5 py-1 rounded-full cursor-pointer transition-colors"
              >
                #{kp}
              </button>
            ))}
          </div>
        </section>

        {/* Academic Materials */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
          <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 text-blue-600" /> 推荐教辅资料
          </h4>
          <div className="space-y-2.5">
            {activeSession.recommendedResources.length === 0 && <p className="text-[11px] text-slate-400">暂无服务端推荐资料</p>}
            {activeSession.recommendedResources.map((res, i) => (
              <div key={i} className="text-xs p-2.5 bg-slate-50 border border-slate-100 rounded-lg space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider">{res.type}</span>
                </div>
                <div className="font-semibold text-slate-700 leading-tight">{res.title}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Suggested Followups */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
          <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> 智能追问问题
          </h4>
          <div className="space-y-2">
            {activeSession.suggestedFollowups.length === 0 && <p className="text-[11px] text-slate-400">暂无服务端追问建议</p>}
            {activeSession.suggestedFollowups.map((fl, i) => (
              <button
                key={i}
                onClick={() => handleSubmitMessage(fl)}
                className="w-full text-left p-2.5 text-xs text-slate-600 bg-slate-50 hover:bg-blue-50/30 hover:text-blue-950 border border-slate-100 rounded-xl leading-relaxed transition-all cursor-pointer flex items-start gap-1 font-semibold"
              >
                <ArrowRight className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                <span>{fl}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
