import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { ResourceGenerationInput, GeneratedResource } from "../types";
import MarkdownRenderer from "./MarkdownRenderer";
import { apiRequest } from "../api";
import {
  Sparkles,
  Layers,
  GraduationCap,
  Sliders,
  Terminal,
  Activity,
  Download,
  BookOpen,
  ArrowRight,
  BookmarkPlus,
  RefreshCw,
  Cpu,
  BookmarkCheck
} from "lucide-react";

interface ResourceViewProps {
  onNavigateToTab: (tab: string, prefillData?: any) => void;
  initialRecommendation?: { resourceType?: string; title?: string; reason?: string; knowledgePointId?: string } | null;
}

export default function ResourceView({ onNavigateToTab, initialRecommendation }: ResourceViewProps) {
  const [input, setInput] = useState<ResourceGenerationInput>({
    subject: "数据结构与算法",
    topic: "红黑树的自平衡旋转与插入调整规则",
    resourceType: "LectureNotes",
    difficulty: "Advanced"
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [resource, setResource] = useState<GeneratedResource | null>(null);
  
  // Terminal animation states
  const [logs, setLogs] = useState<string[]>([]);
  const [logIndex, setLogIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(false);

  const logsRef = useRef<HTMLDivElement | null>(null);
  const logIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!initialRecommendation) return;
    const resourceType = initialRecommendation.resourceType === "code_lab" ? "CaseStudy"
      : initialRecommendation.resourceType === "cheat_sheet" ? "CheatSheet"
      : "LectureNotes";
    setInput((current) => ({
      ...current,
      topic: initialRecommendation.knowledgePointId || initialRecommendation.title || current.topic,
      resourceType
    }));
  }, [initialRecommendation]);

  const terminalSequence = [
    "ProfileAgent: 读取学生学习画像与薄弱知识点。",
    "PlannerAgent: 规划资料结构，确定学习目标、核心概念、例题和练习模块。",
    "ResourceAgent: 启动讯飞星火学习资源生成模型，正在生成课程讲义...",
    "ResourceAgent: 调用讯飞星火生成学习资源正文。",
    "ReviewAgent: 检查内容准确性、完整性和难度匹配。",
    "PlannerAgent: 生成后续学习路径建议。",
    "ProfileAgent: 整合画像上下文，准备渲染学习资源。"
  ];

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  // Handle generation action
  const handleGenerate = async () => {
    setIsGenerating(true);
    setLogs([]);
    setLogIndex(0);
    setResource(null);
    setIsSaved(false);

    // 1. Kick off the visual terminal logger
    let localIndex = 0;
    setLogs([`[${new Date().toLocaleTimeString()}] 系统协调智能体：调度多维专业辅导智能体开始研讨...`]);

    logIntervalRef.current = setInterval(() => {
      if (localIndex < terminalSequence.length) {
        const time = new Date().toLocaleTimeString();
        setLogs((prev) => [...prev, `[${time}] ${terminalSequence[localIndex]}`]);
        localIndex++;
        setLogIndex(localIndex);
      } else {
        if (logIntervalRef.current) clearInterval(logIntervalRef.current);
      }
    }, 750);

    // 2. Fire the real API request to server-side resource generation API.
    try {
      const data = await apiRequest<{ content: string }>("/api/generate-resource", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: input.subject,
          topic: input.topic,
          resourceType: input.resourceType,
          difficulty: input.difficulty,
          recommendationReason: initialRecommendation?.reason,
          errorType: initialRecommendation?.resourceType
        })
      });

      // Wait until the terminal animation finishes or runs at least 4 lines to show realism,
      // then display the result!
      const minAnimationTime = 4000; // at least 4 seconds
      setTimeout(() => {
        setResource({
          id: "res-" + Math.random().toString(36).substr(2, 9),
          subject: input.subject,
          topic: input.topic,
          resourceType: input.resourceType,
          difficulty: input.difficulty,
          content: data.content,
          createdDate: new Date().toLocaleDateString()
        });
        setIsGenerating(false);
        if (logIntervalRef.current) clearInterval(logIntervalRef.current);
      }, minAnimationTime);

    } catch (err) {
      console.error("Resource generation API failed:", err);
      setIsGenerating(false);
      if (logIntervalRef.current) clearInterval(logIntervalRef.current);
    }
  };

  const handleSaveResource = () => {
    setIsSaved(true);
  };

  return (
    <div className="grid lg:grid-cols-12 gap-6 fade-in font-sans h-[calc(100vh-140px)]">
      {/* LEFT COLUMN: Input Configuration & Terminal (4 Columns) */}
      <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col justify-between h-full overflow-y-auto space-y-5">
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3">
            <Sliders className="w-4 h-4 text-blue-600" /> 学习资源生成设置
          </h3>

          <div className="space-y-4">
            {/* Subject Selection */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 block">目标学科分类</label>
              <select
                value={input.subject}
                onChange={(e) => setInput((p) => ({ ...p, subject: e.target.value }))}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all font-semibold"
              >
                <option value="数据结构与算法">数据结构与算法</option>
                <option value="操作系统">操作系统</option>
                <option value="C语言程序设计">C语言程序设计</option>
                <option value="计算机组成原理">计算机组成原理</option>
                <option value="计算机网络">计算机网络</option>
              </select>
            </div>

            {/* Custom Topic text field */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 block">主题/知识点主题 (Topic)</label>
              <input
                type="text"
                value={input.topic}
                onChange={(e) => setInput((p) => ({ ...p, topic: e.target.value }))}
                placeholder="请输入详细的知识考查点主题..."
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all font-semibold text-slate-800"
              />
            </div>

            {/* Resource Type */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 block">生成资源类型</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "LectureNotes", label: "精炼学术讲义", desc: "理论公式+代码剖析" },
                  { value: "Homework", label: "专项练习作业", desc: "分层练习+答案详解" },
                  { value: "CaseStudy", label: "工程案例分析", desc: "工业实践+时空折衷" },
                  { value: "CheatSheet", label: "冲刺必背小抄", desc: "核心要点+记忆口诀" }
                ].map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setInput((p) => ({ ...p, resourceType: t.value as any }))}
                    className={`p-2 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer h-16 ${
                      input.resourceType === t.value
                        ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-50"
                        : "border-slate-150 bg-white hover:border-slate-250 hover:shadow-sm"
                    }`}
                  >
                    <span className="text-[10px] font-bold text-slate-900 leading-tight block">{t.label}</span>
                    <span className="text-[9px] text-slate-400 font-medium leading-none block">{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty Level */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 block">内容大纲难度</label>
              <div className="flex gap-2">
                {["Elementary", "Intermediate", "Advanced"].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setInput((p) => ({ ...p, difficulty: lvl as any }))}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer uppercase ${
                      input.difficulty === lvl
                        ? "border-blue-600 bg-blue-50 text-blue-700 font-bold"
                        : "border-slate-200 hover:border-slate-300 text-slate-600"
                    }`}
                  >
                    {lvl === "Elementary" ? "初阶" : lvl === "Intermediate" ? "中等" : "高阶"}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs py-2.5 rounded-xl shadow-md shadow-blue-100 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              {isGenerating ? "多智能体协同编写中..." : "🌟 开始智能合成资源"}
            </button>
          </div>
        </div>

        {/* Specialized Agents Flow Log Terminal Simulation */}
        {(isGenerating || logs.length > 0) && (
          <div className="bg-slate-950 border border-slate-900 rounded-xl p-3.5 font-mono text-[9px] text-slate-400 space-y-2 h-44 flex flex-col justify-between overflow-hidden shadow-inner relative">
            {/* Terminal scanner ray */}
            <div className="absolute top-0 left-0 w-full h-0.5 bg-blue-500 opacity-20 animate-pulse"></div>
            
            <div className="flex justify-between items-center border-b border-slate-900 pb-1.5 text-slate-500">
              <span className="flex items-center gap-1">
                <Terminal className="w-3.5 h-3.5 text-blue-500" /> AGENTS LIVE FLOW
              </span>
              <span className="animate-pulse text-blue-400 text-[8px] font-bold">● PROCESSING</span>
            </div>

            <div ref={logsRef} className="flex-grow overflow-y-auto space-y-1.5 pr-2 select-text scroll-smooth">
              {logs.map((log, i) => (
                <div key={i} className="leading-relaxed whitespace-pre-wrap">
                  {log.includes("COMPLETE") || log.includes("成功") ? (
                    <span className="text-emerald-400">{log}</span>
                  ) : log.includes("讯飞星火") || log.includes("启动") ? (
                    <span className="text-amber-400">{log}</span>
                  ) : (
                    log
                  )}
                </div>
              ))}
            </div>

            <div className="text-[8px] text-slate-600 border-t border-slate-900 pt-1 flex justify-between">
              <span>通道: ProfileAgent-PlannerAgent-Core</span>
              <span>进度: {Math.round((logIndex / terminalSequence.length) * 100)}%</span>
            </div>
          </div>
        )}
      </div>

      {/* MIDDLE/MAIN COLUMN: The generated resource content (8 Columns) */}
      <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-100 shadow-sm h-full flex flex-col justify-between overflow-hidden">
        {isGenerating ? (
          /* LOADING STATE */
          <div className="flex-grow flex flex-col items-center justify-center text-center p-12 space-y-4">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-800">ResourceAgent 正在精心书写讲义...</h4>
              <p className="text-[11px] text-slate-400 max-w-sm leading-relaxed">
                正在组织核心概念、例题解析和练习任务，并根据学习画像调整内容难度。请耐心等待。
              </p>
            </div>
          </div>
        ) : resource ? (
          /* CONTENT READY VIEW */
          <div className="flex-grow flex flex-col h-full overflow-hidden">
            {/* Resource SubHeader toolbar */}
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-slate-900">
                  {resource.topic} <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded ml-1.5">{resource.resourceType === 'LectureNotes' ? '学术讲义' : '专项作业'}</span>
                </h4>
                <p className="text-[10px] text-slate-400">大纲拟定：{resource.difficulty === 'Advanced' ? '高阶学习难度' : '中等复习大纲'} | 生成日期：{resource.createdDate}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSaveResource}
                  className={`text-xs font-semibold py-1.5 px-3 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                    isSaved
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 hover:border-slate-300 text-slate-600 bg-white"
                  }`}
                >
                  {isSaved ? (
                    <>
                      <BookmarkCheck className="w-3.5 h-3.5" /> 已存入自习室
                    </>
                  ) : (
                    <>
                      <BookmarkPlus className="w-3.5 h-3.5 text-blue-600" /> 存入我的自习室
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Rendered content */}
            <div className="flex-grow p-6 overflow-y-auto bg-white/50">
              <MarkdownRenderer content={resource.content} />
            </div>

            {/* Bottom action bar */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center shrink-0 text-xs">
              <span className="text-slate-400 font-semibold font-mono flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-blue-500" /> 模型：讯飞星火 · 计智引擎课程生成模型
              </span>

              <div className="flex gap-2.5">
                <button
                  onClick={() => onNavigateToTab("mentor", `我想针对今天生成的《${resource.topic}》讲义内容进行深度的提问答疑！`)}
                  className="text-xs font-semibold text-blue-600 bg-white hover:bg-blue-50 border border-slate-200 px-4 py-2 rounded-xl transition-colors cursor-pointer"
                >
                  向 AI 导师对齐提问
                </button>
                <button
                  onClick={() => onNavigateToTab("quiz", resource.topic)}
                  className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl shadow-sm transition-colors cursor-pointer flex items-center gap-0.5"
                >
                  生成针对性测试题 <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* EMPTY PLACEHOLDER STATE */
          <div className="flex-grow flex flex-col items-center justify-center text-center p-12 space-y-4">
            <BookOpen className="w-12 h-12 text-slate-300/60" />
            <div>
              <h4 className="text-xs font-bold text-slate-800">学习资源展示大厅</h4>
              <p className="text-[11px] text-slate-400 max-w-sm leading-relaxed mt-1">
                请在左侧配置您想强化的学科分类与知识主题，点击「开始智能合成资源」后，AI 协同群将为您编撰高学术水准教材讲义。
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
