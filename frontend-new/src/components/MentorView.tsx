import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { ChatSession, ChatMessage, MessagePart } from "../types";
import { initialSessions } from "../mockData";
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
  Terminal,
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

export default function MentorView({ initialPrompt, onClearPrefill }: MentorViewProps) {
  const [sessions, setSessions] = useState<ChatSession[]>(initialSessions);
  const [activeSessionId, setActiveSessionId] = useState<string>("session-1");
  const [inputText, setInputText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // For multi-agent live synergy visualization
  const [synergyStep, setSynergyStep] = useState<number>(0);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages, isSubmitting, synergyStep]);

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
      id: "session-" + Math.random().toString(36).substr(2, 9),
      title: "全新学术问答会话",
      knowledgePoints: ["二叉树", "操作系统", "算法分析"],
      recommendedResources: [
        { title: "《算法导论》第1章", type: "书籍章节" },
        { title: "LeetCode 基础特训", type: "在线自测" }
      ],
      suggestedFollowups: [
        "红黑树是如何进行左右旋转的？",
        "多线程同步中 mutex 和 semaphore 的本质区别是什么？"
      ],
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

    // Multi-Agent Collaboration Panel Animation
    setSynergyStep(1); // Coordinator starts
    const timer1 = setTimeout(() => setSynergyStep(2), 1200); // TheoryAgent working
    const timer2 = setTimeout(() => setSynergyStep(3), 2800); // CodeAgent working
    const timer3 = setTimeout(() => setSynergyStep(4), 4200); // ReviewAgent working

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: activeSession.messages
        })
      });

      const data = await response.json();

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
      console.error("Failed to query API, fallback will trigger", err);
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setSynergyStep(0);
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
          <span>JiZhi LLM Node: G-3.5</span>
        </div>
      </div>

      {/* 2. MIDDLE CHAT PANEL: Message feed (6 Columns) */}
      <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-full overflow-hidden">
        {/* Chat Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Workflow className="w-4 h-4 text-blue-600 animate-pulse" /> 计智引擎 (综合协调者)
            </h3>
            <p className="text-[10px] text-slate-400 leading-none">系统已挂载 TheoryAgent, CodeAgent, ReviewAgent 实时研讨</p>
          </div>
          <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> 协同解题就绪
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
                  请输入关于数据结构、算法时空分析、操作系统死锁或计组原理的问题。多维智能体将协作给予解答。
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

          {/* SYNERGY LOGS CARDS ON SUBMISSION */}
          {synergyStep > 0 && (
            <div className="bg-slate-900 text-slate-300 p-4 rounded-xl border border-slate-800 space-y-3 font-mono text-xs fade-in">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-white font-bold flex items-center gap-1.5">
                  <Workflow className="w-4 h-4 text-blue-400 animate-spin" /> Cognitive Synergy Meeting
                </span>
                <span className="text-[10px] text-slate-500">Live Workspace</span>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span>&gt; 综合协调者 (Coordinator) 正在分发问题权重...</span>
                  <span className={synergyStep >= 1 ? "text-emerald-400" : "text-slate-600"}>
                    {synergyStep >= 1 ? "✓ COMPLETE" : "● PENDING"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>&gt; 学术理论智能体 (TheoryAgent) 正在提炼核心数学模型...</span>
                  <span className={synergyStep >= 2 ? "text-emerald-400" : "text-slate-600"}>
                    {synergyStep === 1 ? "★ RUNNING" : synergyStep >= 2 ? "✓ COMPLETE" : "● PENDING"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>&gt; 代码工程智能体 (CodeAgent) 正在组织最佳指针递推逻辑...</span>
                  <span className={synergyStep >= 3 ? "text-emerald-400" : "text-slate-600"}>
                    {synergyStep === 2 ? "★ RUNNING" : synergyStep >= 3 ? "✓ COMPLETE" : "● PENDING"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>&gt; 评估审查智能体 (ReviewAgent) 正在撰写边界条件与时空评测表...</span>
                  <span className={synergyStep >= 4 ? "text-emerald-400" : "text-slate-600"}>
                    {synergyStep === 3 ? "★ RUNNING" : synergyStep >= 4 ? "✓ COMPLETE" : "● PENDING"}
                  </span>
                </div>
              </div>
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
