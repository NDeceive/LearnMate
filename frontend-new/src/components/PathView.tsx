import React, { useState } from "react";
import { motion } from "motion/react";
import { PathStage, Course, WeakPoint } from "../types";
import { initialPathStages } from "../mockData";
import KnowledgeGraph from "./KnowledgeGraph";
import {
  Compass,
  CheckCircle,
  Clock,
  Lock,
  ArrowRight,
  BookOpen,
  Sparkles,
  Award,
  ChevronDown,
  ChevronUp,
  Brain,
  MessageSquare
} from "lucide-react";

interface PathViewProps {
  courses: Course[];
  weakPoints: WeakPoint[];
  onNavigateToTab: (tab: string, prefillData?: any) => void;
}

export default function PathView({ courses, weakPoints, onNavigateToTab }: PathViewProps) {
  const [stages, setStages] = useState<PathStage[]>(initialPathStages);
  const [expandedStageId, setExpandedStageId] = useState<string | null>("stage-2");

  const overallProgress = Math.round(
    stages.reduce((acc, stage) => {
      return acc + (stage.status === 'completed' ? 100 : stage.status === 'active' ? stage.progress : 0);
    }, 0) / stages.length
  );

  const toggleExpand = (id: string) => {
    setExpandedStageId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6 fade-in font-sans">
      {/* Overview Card */}
      <section className="bg-white rounded-2xl border border-slate-100 p-6 md:p-8 shadow-sm grid md:grid-cols-12 gap-6 items-center">
        <div className="md:col-span-8 space-y-4">
          <div className="space-y-1.5">
            <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-blue-100 inline-flex items-center gap-1">
              <Compass className="w-3.5 h-3.5" /> PlannerAgent 协同规划中
            </span>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 leading-tight">
              核心规划目标：树论与高阶图论算法通关路径
            </h2>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
              PlannerAgent 已根据您的 CS 专业基础画像，将树、红黑树、图论基础、最短路径（408 核心考点）有机打通，智能估算 4 个里程碑阶段。
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-slate-400">通关总进度</span>
              <span className="text-blue-600 font-bold">{overallProgress}%</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${overallProgress}%` }}></div>
            </div>
          </div>
        </div>

        <div className="md:col-span-4 bg-slate-900 rounded-2xl p-5 text-white font-mono text-xs space-y-3 shadow-md">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2 text-slate-400">
            <span>PlannerAgent Status</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
          <div className="space-y-1.5 text-slate-300">
            <div>&gt; Target: BST/R-B/Graph Theory</div>
            <div>&gt; Syllabus: 计算机核心统考408对齐</div>
            <div>&gt; Est. Duration: 4 - 6 周</div>
            <div>&gt; Last Updated: 刚刚 (自适应调整)</div>
          </div>
        </div>
      </section>

      {/* Interactive Discipline Knowledge Graph */}
      <KnowledgeGraph courses={courses} weakPoints={weakPoints} onNavigateToTab={onNavigateToTab} />

      {/* Timeline stages */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold text-slate-950 uppercase tracking-wider pl-1.5 flex items-center gap-1">
          <Award className="w-4 h-4 text-blue-600" /> 通关大纲里程碑
        </h3>

        <div className="space-y-4 relative pl-4 md:pl-8 border-l-2 border-slate-150 ml-4 md:ml-8 py-2">
          {stages.map((stage, sIdx) => {
            const isCompleted = stage.status === "completed";
            const isActive = stage.status === "active";
            const isLocked = stage.status === "locked";
            const isExpanded = expandedStageId === stage.id;

            return (
              <div key={stage.id} className="relative mb-8 fade-in">
                {/* Visual marker dot */}
                <span className={`absolute -left-[25px] md:-left-[41px] top-1.5 w-5 h-5 rounded-full border-4 flex items-center justify-center transition-all z-10 ${
                  isCompleted
                    ? "border-emerald-100 bg-emerald-500 text-white"
                    : isActive
                    ? "border-blue-100 bg-blue-600 text-white animate-pulse"
                    : "border-slate-100 bg-slate-200 text-slate-400"
                }`}>
                  {isCompleted && <CheckCircle className="w-3.5 h-3.5" />}
                  {isActive && <Clock className="w-3.5 h-3.5" />}
                  {isLocked && <Lock className="w-2.5 h-2.5" />}
                </span>

                <div className={`p-5 rounded-2xl border transition-all ${
                  isActive
                    ? "border-blue-600 ring-2 ring-blue-50 bg-blue-50/5"
                    : "border-slate-100 bg-white hover:border-slate-200"
                }`}>
                  {/* Top header row */}
                  <div
                    onClick={() => toggleExpand(stage.id)}
                    className="flex justify-between items-start md:items-center gap-4 cursor-pointer select-none"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">第 {sIdx + 1} 阶段 ({stage.duration})</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isCompleted ? "bg-emerald-50 text-emerald-700" :
                          isActive ? "bg-blue-50 text-blue-700" :
                          "bg-slate-50 text-slate-400"
                        }`}>
                          {isCompleted ? "已通关" : isActive ? `进行中 · 已完成 ${stage.progress}%` : "未解锁"}
                        </span>
                      </div>
                      <h4 className="text-xs md:text-sm font-bold text-slate-900 leading-tight">
                        {stage.title}
                      </h4>
                    </div>

                    <button className="p-1.5 hover:bg-slate-50 text-slate-400 rounded-lg">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Expanded Body Content */}
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="pt-5 border-t border-slate-100 mt-4 space-y-4"
                    >
                      {/* Goals section */}
                      <div className="space-y-1.5 text-xs">
                        <h5 className="font-bold text-slate-800 flex items-center gap-1">🎯 阶段目标</h5>
                        <ul className="list-disc pl-5 space-y-1.5 text-slate-500 leading-relaxed font-semibold">
                          {stage.goals.map((g, i) => <li key={i}>{g}</li>)}
                        </ul>
                      </div>

                      {/* Knowledge Points */}
                      <div className="space-y-1.5 text-xs">
                        <h5 className="font-bold text-slate-800">📌 重点考察核心知识点</h5>
                        <div className="flex flex-wrap gap-1.5">
                          {stage.points.map((p, i) => (
                            <span key={i} className="text-[10px] font-bold bg-slate-50 text-slate-500 px-2.5 py-0.5 rounded border border-slate-100">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Action Links & Resources */}
                      <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
                        <div className="space-y-1 flex-grow">
                          <h5 className="font-bold text-slate-800">📖 阶段教辅资源推荐</h5>
                          <div className="space-y-1 text-slate-400 font-semibold leading-relaxed">
                            {stage.resources.map((r, i) => <div key={i}>&gt; {r}</div>)}
                          </div>
                        </div>

                        {isActive && (
                          <div className="flex gap-2 w-full md:w-auto shrink-0">
                            <button
                              onClick={() => onNavigateToTab("mentor", `我想针对【${stage.title}】的阶段难点（如红黑树、AVL旋转）进行一次专门的学术答疑，请帮我分析核心算法指针细节。`)}
                              className="flex-1 md:flex-initial text-xs font-semibold text-blue-600 bg-white hover:bg-blue-50 border border-slate-200 px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <MessageSquare className="w-3.5 h-3.5" /> 关联答疑
                            </button>
                            <button
                              onClick={() => onNavigateToTab("quiz")}
                              className="flex-1 md:flex-initial text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl shadow-md transition-all flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Brain className="w-3.5 h-3.5 text-amber-300 animate-pulse" /> 开始阶段练习 <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
