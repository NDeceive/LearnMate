import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile, Course, WeakPoint, ErrorRecord, QuizQuestion } from "./types";
import {
  initialProfile,
  initialCourses,
  initialWeakPoints,
  initialErrorRecords
} from "./mockData";

// Views
import Portal from "./components/Portal";
import Dashboard from "./components/Dashboard";
import QuizView from "./components/QuizView";
import MentorView from "./components/MentorView";
import ResourceView from "./components/ResourceView";
import PathView from "./components/PathView";
import AssessmentView from "./components/AssessmentView";
import ErrorView from "./components/ErrorView";
import FocusTimer from "./components/FocusTimer";
import KnowledgeGraph from "./components/KnowledgeGraph";
import CodeLabView from "./components/CodeLabView";
import SimplePlaceholderView from "./components/SimplePlaceholderView";

import {
  Award,
  BookOpen,
  Brain,
  ClipboardList,
  Code2,
  Compass,
  Cpu,
  FileText,
  GitBranch,
  Home,
  LogOut,
  MessageSquare,
  Menu,
  AlertTriangle,
  User,
  X
} from "lucide-react";

interface QuizPrefill {
  subject?: string;
  knowledgePoint?: string;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface NavigationSection {
  title?: string;
  items: NavigationItem[];
}

const TAB_PATHS: Record<string, string> = {
  dashboard: "/student",
  mentor: "/student/mentor",
  resource: "/student/resources",
  knowledge: "/student/knowledge",
  path: "/student/path",
  quiz: "/student/quiz",
  codelab: "/student/codelab",
  homework: "/student/homework",
  errors: "/student/errors",
  analytics: "/student/profile",
  report: "/student/report"
};

function getInitialTabFromPath() {
  if (typeof window === "undefined") return "dashboard";

  const pathname = window.location.pathname.toLowerCase();
  const match = Object.entries(TAB_PATHS).find(([, path]) => path.toLowerCase() === pathname);
  return match ? match[0] : "dashboard";
}

function getQuizPrefillFromLocation(): QuizPrefill | null {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const subject = params.get("subject") || undefined;
  const knowledgePoint = params.get("knowledgePoint") || undefined;

  return subject || knowledgePoint ? { subject, knowledgePoint } : null;
}

function buildStudentUrl(tab: string, prefillData?: any) {
  const path = TAB_PATHS[tab] || TAB_PATHS.dashboard;
  if (tab !== "quiz") {
    return path;
  }

  const params = new URLSearchParams();
  const subject = typeof prefillData === "object" ? prefillData?.subject : undefined;
  const knowledgePoint = typeof prefillData === "object"
    ? prefillData?.knowledgePoint
    : typeof prefillData === "string"
    ? prefillData
    : undefined;

  if (subject) params.set("subject", subject);
  if (knowledgePoint) params.set("knowledgePoint", knowledgePoint);

  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [studentName, setStudentName] = useState("张同学");

  // Core Global States
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [weakPoints, setWeakPoints] = useState<WeakPoint[]>(initialWeakPoints);
  const [errorRecords, setErrorRecords] = useState<ErrorRecord[]>(initialErrorRecords);

  // Navigations
  const [activeTab, setActiveTab] = useState<string>(() => getInitialTabFromPath());
  const [prefillPrompt, setPrefillPrompt] = useState<string | null>(null);
  const [quizPrefill, setQuizPrefill] = useState<QuizPrefill | null>(() => getQuizPrefillFromLocation());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogin = (name: string) => {
    setStudentName(name);
    setProfile((prev) => ({ ...prev, name }));
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setActiveTab("dashboard");
  };

  useEffect(() => {
    const handlePopState = () => {
      setActiveTab(getInitialTabFromPath());
      setQuizPrefill(getQuizPrefillFromLocation());
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Deep-linking navigation across tabs with optional prefilled prompts
  const handleNavigateToTab = (tab: string, prefillData?: any) => {
    setActiveTab(tab);
    if (prefillData && typeof prefillData === "string") {
      setPrefillPrompt(prefillData);
    }
    if (tab === "quiz") {
      if (prefillData && typeof prefillData === "object") {
        setQuizPrefill({
          subject: prefillData.subject,
          knowledgePoint: prefillData.knowledgePoint
        });
      } else if (typeof prefillData === "string") {
        setQuizPrefill({ knowledgePoint: prefillData });
      } else {
        setQuizPrefill(null);
      }
    }
    if (typeof window !== "undefined") {
      window.history.pushState(null, "", buildStudentUrl(tab, prefillData));
    }
  };

  // Add errored question dynamically to the local Error Bank list!
  const handleAddErrorRecord = (question: QuizQuestion, selectedIndex: number) => {
    // Avoid double adding
    if (errorRecords.some((rec) => rec.question === question.question)) return;

    const newRecord: ErrorRecord = {
      id: "err-dyn-" + Math.random().toString(36).substr(2, 9),
      title: `${question.domain} 专项测验偏误：${question.question.substring(0, 15)}...`,
      course: question.domain,
      question: question.question,
      code: question.code,
      options: question.options,
      userAnswer: selectedIndex,
      correctAnswer: question.answerIndex,
      diagnosis: {
        rootCause: `在本题关于【${question.domain}】的推演中，选错了答案选项。`,
        cognitiveTrap: "受到了相似抗干扰选项的误导，或者计算时在极端边界/计数上出现微调偏离。",
        learningPathAdjustment: "建议返回「AI智能问答」板块输入关键词并调阅该算法的执行动画。计智引擎已自动更新您的知识覆盖率和消灭进度。"
      },
      similarRecommendations: [
        `1. 关于 ${question.domain} 领域极值特性的延伸拓展题`,
        `2. 对比 ${question.domain} 不同算法在稠密条件下的表现`
      ],
      remediated: false,
      timestamp: new Date().toLocaleDateString()
    };

    setErrorRecords((prev) => [newRecord, ...prev]);

    // Adjust global weak points counters and profile stats
    setProfile((prev) => ({
      ...prev,
      weakPointsCount: prev.weakPointsCount + 1,
      pendingTasks: prev.pendingTasks + 1
    }));
  };

  // Mark specified error as remediated
  const handleRemediateRecord = (id: string) => {
    setErrorRecords((prev) =>
      prev.map((rec) => (rec.id === id ? { ...rec, remediated: true } : rec))
    );

    // Adjust profile counters
    setProfile((prev) => ({
      ...prev,
      weakPointsCount: Math.max(0, prev.weakPointsCount - 1),
      pendingTasks: Math.max(0, prev.pendingTasks - 1),
      proficiency: Math.min(100, prev.proficiency + 1)
    }));
  };

  // Handle study hour increments on completion of focus blocks
  const handleFocusComplete = (minutes: number) => {
    setProfile((prev) => ({
      ...prev,
      totalHours: Number((prev.totalHours + minutes / 60).toFixed(2))
    }));
  };

  // Handle profile updates (e.g., streak and extra points from daily challenges)
  const handleUpdateProfile = (updates: Partial<UserProfile>) => {
    setProfile((prev) => ({
      ...prev,
      ...updates
    }));
  };

  if (!isLoggedIn) {
    return <Portal onLogin={handleLogin} />;
  }

  // Define student sidebar navigation elements
  const navSections: NavigationSection[] = [
    {
      items: [
        { id: "dashboard", label: "首页", icon: <Home className="w-4 h-4" /> }
      ]
    },
    {
      title: "AI 学习",
      items: [
        { id: "mentor", label: "AI 问答", icon: <MessageSquare className="w-4 h-4" /> }
      ]
    },
    {
      title: "学习",
      items: [
        { id: "resource", label: "课程资源", icon: <BookOpen className="w-4 h-4" /> },
        { id: "knowledge", label: "知识图谱", icon: <GitBranch className="w-4 h-4" /> },
        { id: "path", label: "学习路径", icon: <Compass className="w-4 h-4" /> }
      ]
    },
    {
      title: "练习",
      items: [
        { id: "quiz", label: "每日测验", icon: <Brain className="w-4 h-4" /> },
        { id: "codelab", label: "代码实验室", icon: <Code2 className="w-4 h-4" /> },
        { id: "homework", label: "作业管理", icon: <ClipboardList className="w-4 h-4" /> },
        { id: "errors", label: "错题本", icon: <AlertTriangle className="w-4 h-4" /> }
      ]
    },
    {
      title: "成长",
      items: [
        { id: "analytics", label: "学习画像", icon: <Award className="w-4 h-4" /> },
        { id: "report", label: "评估报告", icon: <FileText className="w-4 h-4" /> }
      ]
    }
  ];

  return (
    <div className="min-h-screen glass-bg flex flex-col lg:flex-row font-sans select-none selection:bg-blue-100 selection:text-blue-950">
      {/* Ambient background glowing blobs for Glassmorphism */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-200/30 blur-[130px] animate-pulse" style={{ animationDuration: '12s' }} />
        <div className="absolute bottom-[20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-sky-200/25 blur-[140px] animate-pulse" style={{ animationDuration: '18s' }} />
        <div className="absolute top-[35%] right-[10%] w-[45%] h-[45%] rounded-full bg-sky-200/25 blur-[120px] animate-pulse" style={{ animationDuration: '14s' }} />
        <div className="absolute bottom-[-10%] left-[5%] w-[55%] h-[55%] rounded-full bg-emerald-100/20 blur-[110px] animate-pulse" style={{ animationDuration: '20s' }} />
      </div>

      {/* 1. Desktop Persistent Left Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 h-screen fixed top-0 left-0 border-r border-slate-200/50 bg-white/50 backdrop-blur-md z-30 p-6 justify-between shadow-sm shrink-0">
        <div className="space-y-5 overflow-y-auto pr-1">
          {/* Logo / Brand Header */}
          <div className="flex items-center gap-3 pb-5 border-b border-slate-100">
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-md shadow-blue-100">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-slate-950 font-sans flex items-center gap-1">
                计智引擎 <span className="text-[9px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full">v2.5</span>
              </h1>
              <p className="text-[8px] text-slate-400 font-mono tracking-widest uppercase">Multi-Agent Cognitive Learning</p>
            </div>
          </div>

          {/* Student Profile Info Card */}
          <div className="p-3 bg-blue-50/50 border border-blue-100/30 rounded-2xl flex items-center gap-3">
            <div className="p-2 bg-blue-100/50 text-blue-600 rounded-xl">
              <User className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">当前登录学生</p>
              <p className="text-xs font-bold text-slate-800">{studentName}</p>
            </div>
          </div>

          {/* Sidebar Navigation Tabs */}
          <nav className="flex flex-col gap-3">
            {navSections.map((section, sectionIndex) => (
              <div key={section.title || `section-${sectionIndex}`} className="space-y-1">
                {section.title && (
                  <p className="px-2 text-[9px] font-extrabold text-slate-400 tracking-widest uppercase">
                    {section.title}
                  </p>
                )}
                {section.items.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleNavigateToTab(tab.id)}
                      className={`w-full px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2.5 cursor-pointer text-left ${
                        isActive
                          ? "bg-blue-600 text-white shadow-md shadow-blue-100"
                          : "glass-nav-item text-slate-600 hover:text-slate-900 hover:bg-slate-100/40"
                      }`}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom Status & Sign Out */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="flex flex-col gap-1 px-1">
            <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Node-S1 Connected</span>
            </div>
            <div className="text-[9px] text-slate-400 font-mono">Security Rules: Active</div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50/50 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 border border-slate-100/80"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>退出工作台</span>
          </button>
        </div>
      </aside>

      {/* 2. Mobile Sticky Header */}
      <header className="lg:hidden px-4 py-3 flex justify-between items-center glass-header sticky top-0 z-20 shadow-sm border-b border-slate-100/60 bg-white/60 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-1.5 hover:bg-slate-100/60 rounded-xl text-slate-600 cursor-pointer"
            title="打开菜单"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg text-white">
              <Cpu className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-slate-900">计智引擎</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-600 bg-slate-50/80 border border-slate-100/40 px-2.5 py-1 rounded-lg">
            {studentName}
          </span>
          <button
            onClick={handleLogout}
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-all cursor-pointer"
            title="退出"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 3. Mobile Slide-out Drawer Navigation */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Dark blur backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-950 z-30 lg:hidden"
            />

            {/* Sidebar Drawer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed top-0 bottom-0 left-0 w-64 bg-white/95 backdrop-blur-xl border-r border-slate-200/50 shadow-2xl z-45 p-6 flex flex-col justify-between lg:hidden"
            >
              <div className="space-y-5 overflow-y-auto pr-1">
                {/* Header inside drawer */}
                <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="bg-blue-600 p-1.5 rounded-lg text-white">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-extrabold text-slate-900">计智引擎 v2.5</span>
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>

                {/* Mobile Profile Display */}
                <div className="p-3 bg-blue-50/40 border border-blue-100/30 rounded-xl flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-800">{studentName}</span>
                </div>

                {/* Mobile Menu Links */}
                <nav className="flex flex-col gap-3">
                  {navSections.map((section, sectionIndex) => (
                    <div key={section.title || `mobile-section-${sectionIndex}`} className="space-y-1">
                      {section.title && (
                        <p className="px-2 text-[9px] font-extrabold text-slate-400 tracking-widest uppercase">
                          {section.title}
                        </p>
                      )}
                      {section.items.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => {
                              handleNavigateToTab(tab.id);
                              setIsMobileMenuOpen(false); // Auto close
                            }}
                            className={`w-full px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2.5 cursor-pointer text-left ${
                              isActive
                                ? "bg-blue-600 text-white shadow-md"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                            }`}
                          >
                            {tab.icon}
                            <span>{tab.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </nav>
              </div>

              {/* Mobile Drawer Footer */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <button
                  onClick={handleLogout}
                  className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50/50 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 border border-slate-100"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>退出工作台</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 4. Right Side Content Container */}
      <div className="flex-1 flex flex-col lg:pl-64 min-h-screen overflow-y-auto">
        <main className="flex-grow max-w-7xl w-full mx-auto px-4 py-6 md:px-8">
        {activeTab === "dashboard" && (
          <Dashboard
            profile={profile}
            courses={courses}
            weakPoints={weakPoints}
            onNavigateToTab={handleNavigateToTab}
            onUpdateProfile={handleUpdateProfile}
          />
        )}

        {activeTab === "mentor" && (
          <MentorView
            initialPrompt={prefillPrompt}
            onClearPrefill={() => setPrefillPrompt(null)}
          />
        )}

        {activeTab === "quiz" && (
          <QuizView
            onAddErrorRecord={handleAddErrorRecord}
            onNavigateToTab={handleNavigateToTab}
            prefill={quizPrefill}
          />
        )}

        {activeTab === "resource" && (
          <ResourceView onNavigateToTab={handleNavigateToTab} />
        )}

        {activeTab === "knowledge" && (
          <KnowledgeGraph
            courses={courses}
            weakPoints={weakPoints}
            onNavigateToTab={handleNavigateToTab}
          />
        )}

        {activeTab === "path" && (
          <PathView
            courses={courses}
            weakPoints={weakPoints}
            onNavigateToTab={handleNavigateToTab}
          />
        )}

        {activeTab === "analytics" && (
          <AssessmentView
            profile={profile}
            courses={courses}
            weakPoints={weakPoints}
            onNavigateToTab={handleNavigateToTab}
          />
        )}

        {activeTab === "errors" && (
          <ErrorView
            errorRecords={errorRecords}
            onRemediateRecord={handleRemediateRecord}
            onNavigateToTab={handleNavigateToTab}
          />
        )}

        {activeTab === "codelab" && (
          <CodeLabView onNavigateToTab={handleNavigateToTab} />
        )}

        {activeTab === "homework" && (
          <SimplePlaceholderView
            title="作业管理"
            description="作业管理模块将用于查看课程作业、提交记录、批改反馈和智能复盘任务。本阶段先预留学生端入口。"
            actionLabel="前往课程资源"
            onAction={() => handleNavigateToTab("resource")}
          />
        )}

        {activeTab === "report" && (
          <SimplePlaceholderView
            title="评估报告"
            description="评估报告模块将汇总阶段测验、错题修复、知识掌握变化和多智能体学习建议。本阶段先预留报告入口。"
            actionLabel="查看学习画像"
            onAction={() => handleNavigateToTab("analytics")}
          />
        )}
      </main>

      {/* 3. Global Footer */}
      <footer className="py-4 border-t border-slate-100/40 text-center text-[10px] text-slate-400 bg-white/40 backdrop-blur-md flex flex-col sm:flex-row justify-between items-center px-8 gap-2 shrink-0">
        <span>© {new Date().getFullYear()} 计智引擎 (JiZhi Engine). 408 计算机专业核心课多智能体教学对齐服务.</span>
        <div className="flex items-center gap-3 font-mono">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Node-S1: Connected
          </span>
          <span>Security Rules: Active</span>
        </div>
      </footer>
      </div>

      {/* Global persistent multi-agent companion focus timer */}
      <FocusTimer onFocusComplete={handleFocusComplete} />
    </div>
  );
}
