import React from "react";
import { motion } from "motion/react";
import { UserProfile, Course, WeakPoint } from "../types";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import {
  Award,
  BookOpen,
  Calendar,
  Layers,
  AlertTriangle,
  Compass,
  ArrowUpRight,
  TrendingUp,
  Brain,
  MessageSquare
} from "lucide-react";

interface AssessmentViewProps {
  profile: UserProfile;
  courses: Course[];
  weakPoints: WeakPoint[];
  onNavigateToTab: (tab: string, prefillData?: any) => void;
}

export default function AssessmentView({ profile, courses, weakPoints, onNavigateToTab }: AssessmentViewProps) {
  // Chart 1: Course Mastery Radar Map
  const radarData = courses.map((course) => ({
    subject: course.name,
    score: course.proficiency,
    fullMark: 100
  }));

  // Chart 2: Monthly Learning Progress Trend
  const trendData = [
    { month: "9月", proficiency: 65, hours: 25 },
    { month: "10月", proficiency: 71, hours: 48 },
    { month: "11月", proficiency: 74, hours: 68 },
    { month: "12月", proficiency: 80, hours: 92 },
    { month: "1月", proficiency: 84, hours: 110 },
    { month: "2月", proficiency: 88, hours: 124 }
  ];

  return (
    <div className="space-y-6 fade-in font-sans">
      {/* 1. Header Overview Bento Split */}
      <section className="grid lg:grid-cols-12 gap-6">
        {/* Overall dial */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col justify-between items-center text-center">
          <div className="space-y-1 w-full text-left">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
              <Award className="w-4 h-4 text-blue-600" /> 专业掌握度总报告
            </h3>
            <p className="text-xs text-slate-400 font-medium">ProfileAgent 动态生成的全能能力画像系数</p>
          </div>

          <div className="my-6 relative flex items-center justify-center">
            {/* Simple elegant CSS circular progress ring */}
            <div className="w-36 h-36 rounded-full border-8 border-slate-100 flex flex-col items-center justify-center relative shadow-inner">
              {/* Outer stroke indicator */}
              <div className="absolute inset-0 rounded-full border-8 border-blue-600/25 animate-pulse"></div>
              <span className="text-3.5xl font-black text-slate-950 tracking-tight font-sans">{profile.proficiency}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Overall Score</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 w-full border-t border-slate-100 pt-4 text-xs">
            <div className="space-y-0.5">
              <div className="font-extrabold text-slate-800">{profile.totalHours} h</div>
              <div className="text-[9px] font-bold text-slate-400 uppercase">累计总工时</div>
            </div>
            <div className="space-y-0.5 border-x border-slate-100">
              <div className="font-extrabold text-slate-800">{profile.completionRate}%</div>
              <div className="text-[9px] font-bold text-slate-400 uppercase">大纲通关率</div>
            </div>
            <div className="space-y-0.5">
              <div className="font-extrabold text-slate-800">{profile.knowledgeCoverage}%</div>
              <div className="text-[9px] font-bold text-slate-400 uppercase">考纲覆盖度</div>
            </div>
          </div>
        </div>

        {/* Dynamic analysis Radar and Line Charts */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
              <TrendingUp className="w-4 h-4 text-blue-600" /> 专业知识雷达图 (Mastery Radar Map)
            </h3>
            <p className="text-xs text-slate-400 font-medium">覆盖计算机统考五大核心科目，多级掌握度权重呈现。</p>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#f1f5f9" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "#64748b", fontSize: 10, fontWeight: 600 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#cbd5e1", fontSize: 10 }} />
                <Radar name="知识掌握度" dataKey="score" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.15} />
                <Tooltip wrapperClassName="font-mono text-xs rounded-xl shadow-lg border-slate-100" />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* 2. Monthly Learning Trend Line Chart */}
      <section className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
        <div className="space-y-1">
          <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
            <Calendar className="w-4 h-4 text-blue-600" /> 掌握曲线动态追踪 (Learning Trend)
          </h3>
          <p className="text-xs text-slate-400 font-medium">过去 6 个月内由于自适应练习和资源温盘带来的掌握度稳步攀升趋势曲线。</p>
        </div>

        <div className="h-60 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 10, fontWeight: 600 }} />
              <YAxis domain={[50, 100]} tick={{ fill: "#64748b", fontSize: 10, fontWeight: 600 }} />
              <Tooltip contentStyle={{ fontSize: '11px', fontFamily: 'monospace', borderRadius: '10px' }} />
              <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 600 }} />
              <Line type="monotone" dataKey="proficiency" name="学科掌握度得分" stroke="#4f46e5" strokeWidth={3} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="hours" name="累计工时 (h)" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 3. Detailed Weak Points Table review */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <div className="space-y-1">
          <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> 知识薄弱点深度剖析 (Weak Points Deep Dive)
          </h3>
          <p className="text-xs text-slate-400 font-medium">根据 FeedbackAgent 对错题频次的归因模型，量化各细分难点的消灭进度。</p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-xs text-left text-slate-600 font-medium leading-normal">
            <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-100 font-mono">
              <tr>
                <th className="px-5 py-3">核心考察知识点</th>
                <th className="px-5 py-3">所属专业课</th>
                <th className="px-5 py-3 text-center">薄弱等级</th>
                <th className="px-5 py-3 text-center">累计触发错题</th>
                <th className="px-5 py-3">温盘治愈进度</th>
                <th className="px-5 py-3 text-right">联动诊疗动作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {weakPoints.map((wp) => (
                <tr key={wp.id} className="hover:bg-slate-50/40 transition-colors">
                  <td className="px-5 py-4 font-bold text-slate-900">{wp.name}</td>
                  <td className="px-5 py-4">
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px]">{wp.course}</span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                      wp.level === 'High' ? 'bg-rose-50 text-rose-600' :
                      wp.level === 'Medium' ? 'bg-amber-50 text-amber-600' :
                      'bg-emerald-50 text-emerald-600'
                    }`}>
                      {wp.level === 'High' ? '高' : wp.level === 'Medium' ? '中' : '低'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center font-mono font-bold text-slate-900">{wp.count} 次</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 max-w-[120px]">
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full rounded-full" style={{ width: `${wp.remediationProgress}%` }}></div>
                      </div>
                      <span className="font-mono text-[10px] text-slate-500">{wp.remediationProgress}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => onNavigateToTab("mentor", `我想深度对齐提问知识点【${wp.name}】的理论及具体实现代码。`)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="AI 导师问答"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onNavigateToTab("quiz", wp.name)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="自适应专项练习"
                      >
                        <Brain className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
