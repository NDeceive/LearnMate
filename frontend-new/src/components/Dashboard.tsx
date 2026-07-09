import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { UserProfile, Course, WeakPoint, QuizQuestion } from "../types";
import { AgentLogSummary, fetchApiData } from "../api";
import {
  Award,
  BookOpen,
  CheckCircle,
  AlertTriangle,
  History,
  Workflow,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Search,
  BookMarked,
  Brain,
  Terminal,
  Activity,
  TrendingUp,
  Flame,
  Coins,
  Target,
  X
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-950/95 backdrop-blur-md border border-slate-800/80 p-3.5 rounded-xl shadow-xl text-xs font-sans text-slate-200 space-y-1.5">
        <p className="font-bold text-slate-100">{label}</p>
        <div className="h-px bg-slate-800/80 my-1" />
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.stroke || entry.color }} />
              {entry.name}
            </span>
            <span className="font-mono font-bold text-slate-100">
              {entry.value}{entry.name === "知识点覆盖率" ? "%" : " 小时"}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const CHALLENGE_QUESTION_POOL: QuizQuestion[] = [
  {
    id: "dc-1",
    domain: "数据结构与算法",
    question: "给定一棵二叉树，其前序序列为 ABDECFG，中序序列为 DBEAFCG。请问该二叉树的后序遍历序列是什么？",
    code: "前序 (Pre-order): ABDECFG\n中序 (In-order) : DBEAFCG",
    options: ["DEBFGCA", "DEBFCGA", "EDBFCGA", "DEBAFGC"],
    answerIndex: 0,
    explanation: "通过前序和中序唯一确定树结构：A为根，左孩子B（有左D右E），右孩子C（有左F右G）。其后序遍历为：D -> E -> B -> F -> G -> C -> A，即 DEBFGCA。",
    hint: "前序第一个是根节点，中序中根节点左边是左子树，右边是右子树。"
  },
  {
    id: "dc-2",
    domain: "操作系统",
    question: "在进程管理中，使用PV操作解决生产者-消费者问题，假定缓冲区大小为 N，互斥信号量为 mutex，消费者进程中正确的PV操作顺序为：",
    code: "void Consumer() {\n    while(true) {\n        [位置①];\n        [位置②];\n        TakeItem();\n        [位置③];\n        [位置④];\n        ConsumeItem();\n    }\n}",
    options: [
      "① P(empty), ② P(mutex), ③ V(mutex), ④ V(full)",
      "① P(full), ② P(mutex), ③ V(mutex), ④ V(empty)",
      "① P(mutex), ② P(full), ③ V(empty), ④ V(mutex)",
      "① P(full), ② P(mutex), ③ V(empty), ④ V(mutex)"
    ],
    answerIndex: 1,
    explanation: "消费者必须先检查缓冲区是否有商品（P(full)），然后再加锁（P(mutex)），顺序相反会造成消费者持锁等待生产者，导致死锁。释放时先V(mutex)释放锁，再V(empty)释放空间。",
    hint: "先检查同步信号量，后操作互斥信号量，防止互斥锁死锁。"
  },
  {
    id: "dc-3",
    domain: "数据结构与算法",
    question: "以下实现斐波那契数列第 n 项的递归 C 语言函数，其时间复杂度是多少？如果采用动态规划（自底向上）优化，时间复杂度可降低到多少？",
    code: "int fib(int n) {\n    if (n <= 1) return n;\n    return fib(n - 1) + fib(n - 2);\n}",
    options: [
      "O(2^n) 优化后为 O(n)",
      "O(n^2) 优化后为 O(n)",
      "O(2^n) 优化后为 O(log n)",
      "O(n log n) 优化后为 O(n)"
    ],
    answerIndex: 0,
    explanation: "原始递归函数由于重复计算子问题，时间复杂度呈指数级 O(2^n)。动态规划使用数组存储已计算过的状态，每个状态仅计算一次，时间复杂度降为 O(n) 并节约了栈开销。",
    hint: "递归产生重复分支，而动态规划缓存了子问题的结果。"
  },
  {
    id: "dc-4",
    domain: "计算机网络",
    question: "TCP 三次握手过程中，为了防止“已失效的连接请求报文段突然又传送到了服务端”从而引发服务端单方面建立错误连接，主要是由哪一次握手解决的？",
    code: "Client ---> SYN ---> Server\nClient <--- SYN-ACK <--- Server\nClient ---> ACK ---> Server",
    options: ["第一次握手 (SYN)", "第二次握手 (SYN-ACK)", "第三次握手 (ACK)", "超时重发机制"],
    answerIndex: 2,
    explanation: "第三次握手（Client 发送 ACK）是确保客户端仍然活跃且确实想要建立连接。如果客户端因网络滞后而重发了 SYN，滞后的 SYN 最终到达 Server 时，Server 会回送 SYN-ACK，但由于客户端并没有发起新的请求，所以不会回送 ACK，从而避免了 Server 单方面误建连接而浪费系统资源。",
    hint: "三次握手的最后一步是客户端对服务端确认报文的再确认。"
  },
  {
    id: "dc-5",
    domain: "计算机组成原理",
    question: "主存地址 32 位，块大小 64 字节。Cache 采用直接映射，若主存字块标记（Tag）为 18 位，请问该 Cache 共有多少行（Line）？",
    code: "主存地址: 32 bit\n块大小 (Block Size): 64 Byte\n主存字块标记 (Tag): 18 bit",
    options: ["256 行", "512 行", "1024 行", "2048 行"],
    answerIndex: 0,
    explanation: "在直接映射下，主存地址划分为：Tag (18位) + Cache行号 (Index) + 块内地址 (Offset)。Offset = log2(64) = 6位。所以 Index 占 32 - 18 - 6 = 8位。Cache 行数 = 2^8 = 256 行。",
    hint: "直接映射地址结构：Tag + Cache行号 + 块内地址。块内地址由块大小决定。"
  }
];

interface DashboardProps {
  profile: UserProfile;
  courses: Course[];
  weakPoints: WeakPoint[];
  onNavigateToTab: (tab: string, prefillData?: any) => void;
  onUpdateProfile?: (updates: Partial<UserProfile>) => void;
}

function formatLogTime(value: string) {
  if (!value) return "时间未知";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatDuration(durationMs: number) {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return "0 ms";
  if (durationMs < 1000) return `${Math.round(durationMs)} ms`;
  return `${(durationMs / 1000).toFixed(1)} 秒`;
}

export default function Dashboard({ profile, courses, weakPoints, onNavigateToTab, onUpdateProfile }: DashboardProps) {
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string | null>(null);
  const [agentLogs, setAgentLogs] = useState<AgentLogSummary[]>([]);
  const [agentLogsLoading, setAgentLogsLoading] = useState(true);

  // Daily challenge states
  const [challengeStep, setChallengeStep] = useState<'idle' | 'answering' | 'completed'>('idle');
  const [challengeQuestions, setChallengeQuestions] = useState<QuizQuestion[]>([]);
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState<number>(0);
  const [challengeAnswers, setChallengeAnswers] = useState<{ [key: number]: number }>({});
  const [hasSubmittedAnswer, setHasSubmittedAnswer] = useState<boolean>(false);
  const [challengeCorrectCount, setChallengeCorrectCount] = useState<number>(0);
  const [alreadyCompletedToday, setAlreadyCompletedToday] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    fetchApiData<AgentLogSummary>("/api/agent-logs?limit=6")
      .then((data) => {
        if (!cancelled) {
          setAgentLogs(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAgentLogs([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAgentLogsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const startChallenge = () => {
    // Shuffle and pick 3 random questions
    const shuffled = [...CHALLENGE_QUESTION_POOL].sort(() => 0.5 - Math.random());
    setChallengeQuestions(shuffled.slice(0, 3));
    setChallengeStep('answering');
    setCurrentChallengeIndex(0);
    setChallengeAnswers({});
    setHasSubmittedAnswer(false);
    setChallengeCorrectCount(0);
  };

  const selectChallengeOption = (optionIndex: number) => {
    if (hasSubmittedAnswer) return;
    
    setChallengeAnswers(prev => ({
      ...prev,
      [currentChallengeIndex]: optionIndex
    }));
    setHasSubmittedAnswer(true);

    const currentQ = challengeQuestions[currentChallengeIndex];
    if (optionIndex === currentQ.answerIndex) {
      setChallengeCorrectCount(prev => prev + 1);
    }
  };

  const nextChallengeQuestion = () => {
    if (currentChallengeIndex < 2) {
      setCurrentChallengeIndex(prev => prev + 1);
      setHasSubmittedAnswer(false);
    } else {
      setChallengeStep('completed');
    }
  };

  const claimChallengeReward = () => {
    if (onUpdateProfile) {
      onUpdateProfile({
        streak: profile.streak + 1,
        extraPoints: (profile.extraPoints || 0) + 100,
        testsTaken: profile.testsTaken + 1
      });
    }
    setAlreadyCompletedToday(true);
    setChallengeStep('idle');
  };

  const filteredWeakPoints = selectedCourseFilter
    ? weakPoints.filter(wp => wp.course === selectedCourseFilter)
    : weakPoints;

  const recentEvents = [
    { type: "test", text: "完成了「自适应测验第12关：二叉树性质专项」，得分 88", time: "2小时前" },
    { type: "resource", text: "一键生成了《多线程同步与死锁避免》精炼温盘资料", time: "1天前" },
    { type: "error", text: "通过了对错题「进程同步PV序列」的第2次重新尝试，已标记为已消灭", time: "2天前" },
    { type: "qa", text: "向 AI 导师提问关于「斐波那契递归时空复杂度」，获得多维智能体协作答疑", time: "3天前" }
  ];

  // Calculate today's focus hours based on profile.totalHours difference
  // Baseline totalHours is 124. Any hours above 124 are added to today's study hours!
  const baselineHours = 124;
  const todayFocusHours = Math.max(1.2, Number((1.2 + (profile.totalHours - baselineHours)).toFixed(2)));
  const currentCoverage = Math.min(100, profile.knowledgeCoverage);

  const trendData = [
    { day: "周二 (6/30)", hours: 1.5, coverage: 76 },
    { day: "周三 (7/1)", hours: 2.2, coverage: 78 },
    { day: "周四 (7/2)", hours: 1.8, coverage: 79 },
    { day: "周五 (7/3)", hours: 3.5, coverage: 82 },
    { day: "周六 (7/4)", hours: 4.2, coverage: 83 },
    { day: "周日 (7/5)", hours: 5.0, coverage: 85 },
    { day: "今天 (周一)", hours: todayFocusHours, coverage: currentCoverage },
  ];

  return (
    <div className="space-y-6 fade-in font-sans">
      {/* 1. Greeting Panel */}
      <div className="bg-gradient-to-r from-blue-950/80 to-blue-900/80 backdrop-blur-md rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-lg border border-white/10">
        {/* Decorative ambient blobs */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-sky-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>

        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <span className="bg-blue-700/50 text-blue-200 text-xs font-semibold px-2.5 py-1 rounded-full border border-blue-600/30 inline-flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> 计智引擎 · 个性伴学中
            </span>
            <h2 className="text-2.5xl font-bold tracking-tight flex flex-wrap items-center gap-2">
              欢迎回来，{profile.name}！
              <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-500/30">
                <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-400" /> {profile.streak} 天连胜
              </span>
              <span className="inline-flex items-center gap-1 bg-blue-500/20 text-blue-300 text-xs font-bold px-2.5 py-1 rounded-full border border-blue-500/30">
                <Coins className="w-3.5 h-3.5 text-blue-300" /> {profile.extraPoints || 0} 额外积分
              </span>
            </h2>
            <p className="text-blue-200/90 text-sm max-w-xl leading-relaxed">
              您的 ProfileAgent 诊断出您目前在 <span className="font-semibold underline decoration-wavy decoration-rose-400 text-white">数据结构（红黑树平衡）</span> 与 <span className="font-semibold underline decoration-wavy decoration-rose-400 text-white">操作系统（多线程信号量）</span> 存在重度知识重叠漏洞。建议立刻生成一份个性化温盘，或进行 10 分钟自适应测验。
            </p>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <button
              onClick={() => onNavigateToTab("quiz")}
              className="flex-1 md:flex-initial bg-white text-blue-900 hover:bg-slate-100 font-semibold text-xs px-5 py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Brain className="w-4 h-4 text-blue-600" /> 开始自适应测验
            </button>
            <button
              onClick={() => onNavigateToTab("resource")}
              className="flex-1 md:flex-initial bg-blue-700/80 hover:bg-blue-700 text-white border border-blue-600/50 font-semibold text-xs px-5 py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" /> 生成学习资源
            </button>
          </div>
        </div>
      </div>

      {/* 2. Quick Metrics Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Core Proficiency */}
        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between h-28 hover:shadow-md transition-all">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-semibold tracking-tight">综合专业课掌握度</span>
            <Award className="w-5 h-5 text-blue-600" />
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-slate-900">{profile.proficiency}</span>
              <span className="text-xs text-slate-400 font-medium">/ 100</span>
            </div>
            <div className="w-full bg-slate-200/50 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-600 h-full rounded-full" style={{ width: `${profile.proficiency}%` }}></div>
            </div>
          </div>
        </div>

        {/* Tests Completed */}
        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between h-28 hover:shadow-md transition-all">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-semibold tracking-tight">自适应已测验关卡</span>
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="space-y-0.5">
            <div className="text-2xl font-bold text-slate-900">{profile.testsTaken} 次</div>
            <p className="text-[11px] text-slate-400 font-medium">通关覆盖率 85%，超越 91% 同学</p>
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between h-28 hover:shadow-md transition-all">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-semibold tracking-tight">今日待温盘任务</span>
            <Activity className="w-5 h-5 text-amber-500 animate-pulse" />
          </div>
          <div className="space-y-0.5">
            <div className="text-2xl font-bold text-slate-900">{profile.pendingTasks} 项</div>
            <p className="text-[11px] text-slate-400 font-medium">2个高优先漏洞急需消灭</p>
          </div>
        </div>

        {/* Weak Points Counter */}
        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between h-28 hover:shadow-md transition-all">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-semibold tracking-tight">知识漏洞(薄弱项)</span>
            <AlertTriangle className="w-5 h-5 text-rose-500" />
          </div>
          <div className="space-y-0.5">
            <div className="text-2xl font-bold text-slate-900">{profile.weakPointsCount} 个</div>
            <p className="text-[11px] text-slate-400 font-medium">新增1个，建议进入错题本消灭</p>
          </div>
        </div>
      </div>

      {/* 3. Main Dashboard Structure: Left / Right Column Grid */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left 8 Columns: Course Matrix & Weak Points review */}
        <div className="lg:col-span-8 space-y-6">
          {/* Learning Progress Trend Chart */}
          <section className="glass-card rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 pb-4">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-blue-600 animate-pulse" /> 本周成长航迹 (Weekly Progress Trend)
                </h3>
                <p className="text-xs text-slate-400">结合自适应推荐与专注时长，ProfileAgent 实时测算的双轴成长趋势图。</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> 学习时长 (h)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> 知识点覆盖率 (%)
                </span>
              </div>
            </div>

            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.12)" />
                  <XAxis
                    dataKey="day"
                    stroke="#94a3b8"
                    fontSize={10}
                    fontWeight={500}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="#6366f1"
                    fontSize={10}
                    fontWeight={600}
                    tickLine={false}
                    axisLine={false}
                    unit="h"
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#10b981"
                    fontSize={10}
                    fontWeight={600}
                    tickLine={false}
                    axisLine={false}
                    unit="%"
                    domain={[60, 100]}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="hours"
                    name="今日学时"
                    stroke="#6366f1"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="coverage"
                    name="知识点覆盖率"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Course Master Matrix */}
          <section className="glass-card rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <BookMarked className="w-4 h-4 text-blue-600" /> 课程掌握矩阵 (Course Matrix)
                </h3>
                <p className="text-xs text-slate-400">点击特定专业课，可快速检索过滤其在下方列出的薄弱知识点。</p>
              </div>
              {selectedCourseFilter && (
                <button
                  onClick={() => setSelectedCourseFilter(null)}
                  className="text-xs text-blue-600 font-semibold hover:underline bg-blue-50/80 px-2 py-1 rounded-md"
                >
                  清除过滤
                </button>
              )}
            </div>

            <div className="grid sm:grid-cols-5 gap-3.5">
              {courses.map((course) => {
                const isSelected = selectedCourseFilter === course.name;
                return (
                  <button
                    key={course.id}
                    onClick={() => setSelectedCourseFilter(isSelected ? null : course.name)}
                    className={`p-4 rounded-xl border text-left flex flex-col justify-between h-28 transition-all relative overflow-hidden group cursor-pointer ${
                      isSelected
                        ? "border-blue-600 ring-2 ring-blue-50 bg-blue-50/40"
                        : "border-white/40 bg-white/40 hover:border-white/60 hover:bg-white/75 hover:shadow-md"
                    }`}
                  >
                    {/* Tiny accent tag */}
                    <span className={`absolute top-0 left-0 w-full h-1 ${
                      course.color === 'blue' ? 'bg-blue-500' :
                      course.color === 'indigo' ? 'bg-blue-500' :
                      course.color === 'sky' ? 'bg-sky-400' :
                      course.color === 'purple' ? 'bg-sky-400' :
                      course.color === 'emerald' ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}></span>

                    <div className="space-y-0.5 mt-1.5">
                      <span className="text-[10px] font-mono font-bold text-slate-400">{course.code}</span>
                      <h4 className="text-xs font-bold text-slate-800 leading-tight group-hover:text-blue-600 transition-colors">
                        {course.name}
                      </h4>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[11px] font-semibold">
                        <span className="text-slate-400">掌握度</span>
                        <span className="text-slate-700">{course.proficiency}%</span>
                      </div>
                      <div className="w-full bg-slate-200/50 h-1 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            course.color === 'blue' ? 'bg-blue-500' :
                            course.color === 'indigo' ? 'bg-blue-500' :
                            course.color === 'sky' ? 'bg-sky-400' :
                            course.color === 'purple' ? 'bg-sky-400' :
                            course.color === 'emerald' ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${course.proficiency}%` }}
                        ></div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Weak Points Review Panel */}
          <section className="glass-card rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" /> 薄弱知识点温盘 (Weak Points Analysis)
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedCourseFilter ? `正在筛选【${selectedCourseFilter}】薄弱项` : "当前追踪到的核心 CS 掌握度薄弱项。可通过智能联动直接提问或专项测试。"}
                </p>
              </div>
              <button
                onClick={() => onNavigateToTab("analytics")}
                className="text-xs text-blue-600 font-semibold hover:underline inline-flex items-center gap-0.5 animate-pulse"
              >
                查看完整诊断报告 <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-3">
              {filteredWeakPoints.length > 0 ? (
                filteredWeakPoints.map((wp) => (
                  <div
                    key={wp.id}
                    className="p-4 rounded-xl border border-white/40 hover:border-white/60 bg-white/30 hover:bg-white/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all"
                  >
                    <div className="space-y-1.5 flex-grow">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">{wp.name}</span>
                        <span className="text-[10px] font-medium bg-blue-50/80 text-blue-600 border border-blue-100/30 px-2 py-0.5 rounded-full">
                          {wp.course}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          wp.level === 'High' ? 'bg-rose-50 text-rose-600' :
                          wp.level === 'Medium' ? 'bg-amber-50 text-amber-600' :
                          'bg-emerald-50 text-emerald-600'
                        }`}>
                          薄弱度: {wp.level === 'High' ? '高' : wp.level === 'Medium' ? '中' : '低'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="flex-grow max-w-xs flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-medium">修复进度</span>
                          <div className="w-full bg-slate-200/50 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${wp.remediationProgress}%` }}></div>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono font-semibold">{wp.remediationProgress}%</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">错题触发 {wp.count} 次</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => onNavigateToTab("mentor", `我想深度咨询薄弱知识点【${wp.name}】的学术原理与典型代码。`)}
                        className="flex-1 sm:flex-initial text-xs font-semibold text-blue-600 bg-white/80 hover:bg-blue-50 border border-slate-200/50 px-3.5 py-2 rounded-lg transition-colors cursor-pointer"
                      >
                        AI 答疑
                      </button>
                      <button
                        onClick={() => onNavigateToTab("quiz", wp.name)}
                        className="flex-1 sm:flex-initial text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-2 rounded-lg transition-colors shadow-sm cursor-pointer"
                      >
                        针对性练习
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  暂无匹配的薄弱知识点。这代表该细分科目的掌握情况非常好！
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right 4 Columns: Synergy dynamic logs & recent activity */}
        <div className="lg:col-span-4 space-y-6">
          {/* 每日学习挑战 (Daily Learning Challenge) */}
          <section className="glass-card rounded-2xl p-5 border border-blue-100/30 shadow-sm space-y-4 bg-white/60 relative overflow-hidden">
            {/* Ambient Background Glow for the Challenge Card */}
            <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-blue-500/5 rounded-full filter blur-xl text-slate-100 pointer-events-none"></div>
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="bg-amber-100/80 text-amber-600 p-1.5 rounded-xl">
                  <Flame className="w-4 h-4 fill-amber-500 text-amber-500 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-none">每日学习挑战</h3>
                  <p className="text-[10px] text-slate-400 mt-1">Daily Learning Challenge</p>
                </div>
              </div>
              <span className="text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200/50 px-2 py-0.5 rounded-md">
                今日奖励 +100 积分
              </span>
            </div>

            {challengeStep === 'idle' && (
              <div className="space-y-4">
                {alreadyCompletedToday ? (
                  <div className="text-center py-4 space-y-3">
                    <div className="w-12 h-12 bg-emerald-100/80 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                      <CheckCircle className="w-6 h-6 stroke-[2.5]" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-800">今日挑战圆满通关！</p>
                      <p className="text-[11px] text-slate-400">已成功获取 100 额外积分奖励！</p>
                    </div>
                    <div className="flex justify-center gap-3 py-1">
                      <div className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl text-center">
                        <p className="text-[9px] text-slate-400 font-medium">当前连胜</p>
                        <p className="text-sm font-bold text-amber-600">🔥 {profile.streak} 天</p>
                      </div>
                      <div className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl text-center">
                        <p className="text-[9px] text-slate-400 font-medium">累计积分</p>
                        <p className="text-sm font-bold text-blue-600">🪙 {profile.extraPoints || 0}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setAlreadyCompletedToday(false)}
                      className="text-xs text-blue-600 font-semibold hover:underline bg-blue-50/50 px-3 py-1.5 rounded-lg border border-blue-100/20 cursor-pointer"
                    >
                      再次练习 (温旧知新)
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                      计智引擎每天为你精选 <span className="font-bold text-blue-600">3 道</span> 专业核心选择题，测试并稳固高频考点。连续挑战不仅能激活伴学大脑，还能赢取额外积分提升连胜等级！
                    </p>
                    <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-3 space-y-2">
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold">
                        <Target className="w-3.5 h-3.5 text-blue-500" />
                        <span>考点：数据结构/操作系统/网络/计组</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold">
                        <Flame className="w-3.5 h-3.5 text-amber-500" />
                        <span>当前连胜天数：<strong className="text-slate-800 font-black">{profile.streak} 天</strong></span>
                      </div>
                    </div>
                    <button
                      onClick={startChallenge}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xs font-bold py-3 rounded-xl transition-all shadow-md shadow-blue-100 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Brain className="w-4 h-4 text-white animate-pulse" /> 立即开启今日挑战
                    </button>
                  </div>
                )}
              </div>
            )}

            {challengeStep === 'answering' && (
              <div className="space-y-4">
                {/* Stepper progress indicator */}
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                  <span>挑战进度 CHALLENGE</span>
                  <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    {currentChallengeIndex + 1} / 3
                  </span>
                </div>
                
                {/* ProgressBar */}
                <div className="w-full bg-slate-150 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-blue-600 h-full rounded-full transition-all duration-300" 
                    style={{ width: `${((currentChallengeIndex + (hasSubmittedAnswer ? 1 : 0)) / 3) * 100}%` }}
                  ></div>
                </div>

                {/* Question & Code Block */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md border border-blue-100/30">
                      {challengeQuestions[currentChallengeIndex]?.domain}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-850 leading-relaxed">
                    {challengeQuestions[currentChallengeIndex]?.question}
                  </p>
                  
                  {challengeQuestions[currentChallengeIndex]?.code && (
                    <pre className="font-mono text-[9px] bg-slate-950 text-slate-200 p-2.5 rounded-xl overflow-x-auto border border-slate-800 leading-relaxed my-1.5 select-text">
                      <code>{challengeQuestions[currentChallengeIndex].code}</code>
                    </pre>
                  )}
                </div>

                {/* Option list */}
                <div className="space-y-2 pt-1">
                  {challengeQuestions[currentChallengeIndex]?.options.map((opt, oIdx) => {
                    const isSelected = challengeAnswers[currentChallengeIndex] === oIdx;
                    const isCorrectOption = oIdx === challengeQuestions[currentChallengeIndex].answerIndex;
                    
                    let btnStyle = "border-slate-200 bg-white/50 text-slate-700 hover:bg-slate-50";
                    
                    if (hasSubmittedAnswer) {
                      if (isCorrectOption) {
                        btnStyle = "border-emerald-500 bg-emerald-50 text-emerald-800 font-semibold";
                      } else if (isSelected) {
                        btnStyle = "border-rose-400 bg-rose-50 text-rose-800";
                      } else {
                        btnStyle = "border-slate-100 bg-white/30 text-slate-400 opacity-60";
                      }
                    } else if (isSelected) {
                      btnStyle = "border-blue-600 bg-blue-50/50 text-blue-700 font-semibold";
                    }

                    return (
                      <button
                        key={oIdx}
                        disabled={hasSubmittedAnswer}
                        onClick={() => selectChallengeOption(oIdx)}
                        className={`w-full text-left p-3 text-xs rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${btnStyle}`}
                      >
                        <span className={`font-bold rounded-md px-1.5 py-0.5 text-[10px] ${
                          hasSubmittedAnswer && isCorrectOption ? "bg-emerald-500 text-white" :
                          hasSubmittedAnswer && isSelected ? "bg-rose-500 text-white" :
                          "bg-slate-100 text-slate-500"
                        }`}>
                          {String.fromCharCode(65 + oIdx)}
                        </span>
                        <span className="flex-1 leading-normal">{opt}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Instant Explanation Feedback */}
                {hasSubmittedAnswer && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-150 space-y-2"
                  >
                    <div className="flex items-center gap-1.5">
                      {challengeAnswers[currentChallengeIndex] === challengeQuestions[currentChallengeIndex].answerIndex ? (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                          ✓ 回答正确
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100 flex items-center gap-1">
                          ✗ 回答错误
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 font-bold">正确答案: {String.fromCharCode(65 + challengeQuestions[currentChallengeIndex].answerIndex)}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold leading-relaxed select-text">
                      <strong>解析说明：</strong>{challengeQuestions[currentChallengeIndex].explanation}
                    </p>
                    
                    <button
                      onClick={nextChallengeQuestion}
                      className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      {currentChallengeIndex < 2 ? "下一题" : "完成挑战并结算"}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                )}
              </div>
            )}

            {challengeStep === 'completed' && (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
                  <Award className="w-9 h-9 animate-pulse" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-sm font-extrabold text-slate-900">恭喜你，今日挑战全部通关！</h4>
                  <p className="text-xs text-slate-400">你随机抽取的 3 道 CS 考点真题已作答完毕</p>
                </div>

                <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto py-2">
                  <div className="p-3 bg-emerald-50/50 border border-emerald-100/30 rounded-2xl">
                    <p className="text-[10px] text-emerald-600 font-bold">正确数</p>
                    <p className="text-lg font-extrabold text-emerald-700 font-mono">{challengeCorrectCount} / 3</p>
                  </div>
                  <div className="p-3 bg-blue-50/50 border border-blue-100/30 rounded-2xl">
                    <p className="text-[10px] text-blue-600 font-bold">获取额外奖赏</p>
                    <p className="text-xs font-extrabold text-blue-700 flex items-center justify-center gap-1">
                      <Coins className="w-4 h-4 text-amber-500 fill-amber-400" /> +100 积分
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl max-w-xs mx-auto text-center">
                  <p className="text-[10px] text-slate-500 leading-relaxed flex items-center justify-center gap-1.5 font-semibold">
                    <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                    <span>连胜加成：<strong>{profile.streak} → {profile.streak + 1}</strong> 天</span>
                  </p>
                </div>

                <button
                  onClick={claimChallengeReward}
                  className="w-full max-w-xs mx-auto bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-xs font-bold py-3 rounded-xl transition-all shadow-md shadow-emerald-100 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" /> 满载而归，收下奖励
                </button>
              </div>
            )}
          </section>

          {/* Multi-Agent Collaboration Timeline */}
          <section className="glass-card-dense bg-slate-900/80 backdrop-blur-xl border border-slate-850/80 text-slate-300 p-5 space-y-4 shadow-lg font-mono relative overflow-hidden">
            {/* Terminal scanner beam effect */}
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-30 animate-pulse"></div>

            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                <Workflow className="w-4 h-4 text-blue-400 animate-spin" style={{ animationDuration: '6s' }} /> 多智能体协同时间线
              </h3>
              <span className="text-[9px] bg-blue-900/50 text-blue-300 border border-blue-800 px-2 py-0.5 rounded-md font-bold uppercase tracking-widest">
                最近 6 条
              </span>
            </div>

            {agentLogsLoading ? (
              <div className="py-8 text-center text-[11px] text-slate-500">
                正在读取协同记录...
              </div>
            ) : agentLogs.length > 0 ? (
              <div className="space-y-0 relative">
                <div className="absolute left-2 top-2 bottom-2 w-px bg-slate-800" />
                {agentLogs.map((log, i) => (
                  <div key={log.id || i} className="relative pl-7 pb-5 last:pb-0 text-xs">
                    <span className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 ${
                      log.status_label === "失败"
                        ? "bg-rose-500 border-rose-300"
                        : log.status_label === "已兜底"
                        ? "bg-amber-500 border-amber-300"
                        : "bg-emerald-500 border-emerald-300"
                    }`} />

                    <div className="space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <div className="space-y-0.5">
                          <p className="text-white font-bold leading-tight">{log.agent_label}</p>
                          <p className="text-[10px] text-blue-300 font-bold">{log.task_label}</p>
                        </div>
                        <div className="flex items-center gap-2 text-[9px] text-slate-500">
                          <span className="px-2 py-0.5 rounded-md border border-slate-700 bg-slate-950/40 text-slate-300">
                            {log.status_label}
                          </span>
                          <span>{formatLogTime(log.created_at)}</span>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-[11px] leading-relaxed text-slate-400">
                        <p><span className="text-slate-500">输入摘要：</span>{log.input_summary || "暂无输入摘要"}</p>
                        <p><span className="text-slate-500">分析摘要：</span>{log.analysis_summary || "暂无分析摘要"}</p>
                        <p><span className="text-slate-500">输出摘要：</span>{log.output_summary || "暂无输出摘要"}</p>
                      </div>

                      <div className="text-[9px] text-slate-600">
                        执行耗时：{formatDuration(log.duration_ms)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <Workflow className="w-6 h-6 text-slate-700 mx-auto" />
                <p className="text-xs font-bold text-slate-500">暂无智能体协同记录</p>
                <p className="text-[10px] text-slate-600">接口暂不可用或还没有新的学习任务记录。</p>
              </div>
            )}

            <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500">
              <span>记录数量：{agentLogs.length} 条</span>
              <span className="flex items-center gap-1">
                <Terminal className="w-3 h-3 text-blue-400" /> 协同日志
              </span>
            </div>
          </section>

          {/* Recent Activity Logs */}
          <section className="glass-card rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
              <History className="w-4 h-4 text-slate-500" /> 近期学习动态 (Recent History)
            </h3>

            <div className="space-y-4">
              {recentEvents.map((evt, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className={`p-1.5 rounded-lg mt-0.5 ${
                    evt.type === 'test' ? 'bg-emerald-50 text-emerald-600' :
                    evt.type === 'resource' ? 'bg-blue-50 text-blue-600' :
                    evt.type === 'error' ? 'bg-rose-50 text-rose-600' :
                    'bg-slate-50 text-slate-600'
                  }`}>
                    {evt.type === 'test' ? <Brain className="w-3.5 h-3.5" /> :
                     evt.type === 'resource' ? <Sparkles className="w-3.5 h-3.5" /> :
                     evt.type === 'error' ? <AlertTriangle className="w-3.5 h-3.5" /> :
                     <Activity className="w-3.5 h-3.5" />}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-slate-700 leading-relaxed">{evt.text}</p>
                    <span className="text-[10px] text-slate-400 font-medium">{evt.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
