import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { QuizQuestion, QuizSettings } from "../types";
import { initialQuizQuestions } from "../mockData";
import {
  Brain,
  HelpCircle,
  Timer,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Sparkles,
  BookOpen,
  CornerDownRight,
  ClipboardCheck
} from "lucide-react";

interface QuizViewProps {
  onAddErrorRecord: (question: QuizQuestion, selectedIndex: number) => void;
  onNavigateToTab: (tab: string, prefillData?: any) => void;
}

export default function QuizView({ onAddErrorRecord, onNavigateToTab }: QuizViewProps) {
  // Config
  const [settings, setSettings] = useState<QuizSettings>({
    domain: "数据结构与算法",
    numQuestions: 5,
    difficulty: "advanced"
  });

  const [questions, setQuestions] = useState<QuizQuestion[]>(initialQuizQuestions);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: number }>({});
  const [marked, setMarked] = useState<number[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [timer, setTimer] = useState(450); // 7 mins 30 secs
  const [abilityEstimate, setAbilityEstimate] = useState(1.45);
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Hint State
  const [hintText, setHintText] = useState("");
  const [loadingHint, setLoadingHint] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Start countdown
  useEffect(() => {
    if (!isCompleted && timer > 0) {
      timerRef.current = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleCompleteQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timer, isCompleted]);

  // Request Hint from AI
  const handleRequestHint = async () => {
    const currentQ = questions[currentIndex];
    setShowHint(true);
    if (hintText) return; // already loaded or displayed

    setLoadingHint(true);
    try {
      const res = await fetch("/api/quiz-hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: currentQ.question,
          code: currentQ.code,
          options: currentQ.options
        })
      });
      const data = await res.json();
      setHintText(data.hint);
    } catch (err) {
      setHintText(currentQ.hint); // fallback
    } finally {
      setLoadingHint(false);
    }
  };

  // When changing questions, reset hint
  useEffect(() => {
    setHintText("");
    setShowHint(false);
  }, [currentIndex]);

  // Generate dynamic test using Gemini!
  const handleGenerateQuiz = async () => {
    setIsGenerating(true);
    setLoading(true);
    setCurrentIndex(0);
    setUserAnswers({});
    setMarked([]);
    setIsCompleted(false);
    setTimer(settings.numQuestions * 90); // 1.5 mins per question
    setAbilityEstimate(settings.difficulty === 'basic' ? 0.65 : settings.difficulty === 'advanced' ? 1.45 : 2.25);

    try {
      // We will fetch N questions from the AI sequentially or in parallel.
      // Let's create an array of promises
      const generatedQuestions: QuizQuestion[] = [];
      
      // Let's call the API to generate questions
      const fetchPromises = Array.from({ length: settings.numQuestions }).map(async (_, i) => {
        const response = await fetch("/api/generate-question", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain: settings.domain,
            difficulty: settings.difficulty
          })
        });
        const data = await response.json();
        return data.question;
      });

      const results = await Promise.all(fetchPromises);
      setQuestions(results);
    } catch (err) {
      console.error("Failed to generate dynamic quiz, falling back to mock bank:", err);
      // Fallback: randomized slice
      const randomized = [...initialQuizQuestions].sort(() => 0.5 - Math.random());
      setQuestions(randomized.slice(0, settings.numQuestions));
    } finally {
      setLoading(false);
      setIsGenerating(false);
    }
  };

  const handleSelectOption = (optionIndex: number) => {
    setUserAnswers((prev) => ({
      ...prev,
      [currentIndex]: optionIndex
    }));

    // Dynamic ability adjustment animation (mocking QuizAgent feedback)
    const currentQ = questions[currentIndex];
    const isCorrect = optionIndex === currentQ.answerIndex;
    setAbilityEstimate((prev) => {
      const delta = isCorrect ? 0.08 : -0.12;
      return parseFloat((prev + delta).toFixed(2));
    });
  };

  const handleToggleMark = () => {
    setMarked((prev) => {
      if (prev.includes(currentIndex)) {
        return prev.filter((idx) => idx !== currentIndex);
      } else {
        return [...prev, currentIndex];
      }
    });
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleCompleteQuiz = () => {
    setIsCompleted(true);
    if (timerRef.current) clearInterval(timerRef.current);

    // Auto add incorrect answers to the global error bank
    questions.forEach((q, idx) => {
      const userAns = userAnswers[idx];
      if (userAns !== undefined && userAns !== q.answerIndex) {
        onAddErrorRecord(q, userAns);
      }
    });
  };

  // Format timer MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  // Calculate results statistics
  const answeredCount = Object.keys(userAnswers).length;
  const correctCount = questions.reduce((acc, q, idx) => {
    return acc + (userAnswers[idx] === q.answerIndex ? 1 : 0);
  }, 0);
  const scorePercent = Math.round((correctCount / questions.length) * 100);

  return (
    <div className="grid lg:grid-cols-12 gap-6 fade-in font-sans">
      {/* LEFT: Config + Agent Status (4 Columns) */}
      <div className="lg:col-span-4 space-y-6">
        {/* Test Parameters Settings Card */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
          <h3 className="text-xs font-bold text-slate-950 uppercase tracking-wider flex items-center gap-1.5">
            <RefreshCw className="w-4 h-4 text-blue-600" /> 自适应测验配置
          </h3>
          <p className="text-xs text-slate-500">根据当前专业课复习大纲，由 QuizAgent 动态合成专项试卷。</p>

          <div className="space-y-4 pt-2">
            {/* Subject Domain Selection */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 block">专项考查领域</label>
              <select
                value={settings.domain}
                onChange={(e) => setSettings((prev) => ({ ...prev, domain: e.target.value }))}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="数据结构与算法">数据结构与算法 (树/图/哈希)</option>
                <option value="操作系统">操作系统 (并发/死锁/虚拟内存)</option>
                <option value="C语言程序设计">C语言程序设计 (指针/内存越界)</option>
                <option value="计算机网络">计算机网络 (TCP拥塞/三次握手)</option>
                <option value="计算机组成原理">计算机组成原理 (Cache命中/流水线)</option>
              </select>
            </div>

            {/* Question Count */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 block">拟定题目总数</label>
              <div className="flex gap-2">
                {[3, 5, 10].map((num) => (
                  <button
                    key={num}
                    onClick={() => setSettings((prev) => ({ ...prev, numQuestions: num }))}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      settings.numQuestions === num
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-slate-200 hover:border-slate-300 text-slate-600"
                    }`}
                  >
                    {num} 题
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty Target */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 block">自适应目标难度</label>
              <div className="flex gap-2">
                {["basic", "advanced", "challenge"].map((diff) => (
                  <button
                    key={diff}
                    onClick={() => setSettings((prev) => ({ ...prev, difficulty: diff as any }))}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer uppercase ${
                      settings.difficulty === diff
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-slate-200 hover:border-slate-300 text-slate-600"
                    }`}
                  >
                    {diff === "basic" ? "基础" : diff === "advanced" ? "进阶" : "挑战"}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerateQuiz}
              disabled={isGenerating}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold text-xs py-2.5 rounded-xl shadow-md shadow-blue-100 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              {isGenerating ? "正在智能组卷中..." : "🎯 组卷并开始测验"}
            </button>
          </div>
        </section>

        {/* QuizAgent Stats Panel */}
        <section className="bg-slate-900 text-slate-300 rounded-2xl border border-slate-800 p-5 space-y-3.5 shadow-sm font-mono text-xs">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
            <span className="text-white font-bold flex items-center gap-1">
              <Brain className="w-4 h-4 text-blue-400" /> QuizAgent Status
            </span>
            <span className="bg-emerald-950 text-emerald-400 border border-emerald-900 text-[9px] font-bold px-2 py-0.5 rounded uppercase">
              Online
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span>当前学术能力评估系数</span>
              <span className={`text-sm font-bold font-mono ${abilityEstimate >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {abilityEstimate >= 0 ? "+" : ""}{abilityEstimate}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              随着正确率波动，协同引擎将实时调节后续抽题难度。连续答对将向上浮动解锁高级拓扑理论。
            </p>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg text-[10px] text-slate-500 leading-relaxed border border-slate-800">
            &gt; Initialized with adaptive factor = {(abilityEstimate * 0.9).toFixed(2)}
            <br />
            &gt; Model pipeline: gemini-3.5-flash
            <br />
            &gt; Listening to Student Response loops...
          </div>
        </section>
      </div>

      {/* MIDDLE & RIGHT: The interactive exam interface (8 Columns) */}
      <div className="lg:col-span-8">
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-sm flex flex-col items-center justify-center min-h-[450px] space-y-4">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
            <div>
              <h4 className="text-sm font-bold text-slate-800">QuizAgent 正在拟定并校验专业考题...</h4>
              <p className="text-xs text-slate-400 mt-1">正在基于大纲深度检索，编写代码上下文并核实答案唯一性。</p>
            </div>
          </div>
        ) : isCompleted ? (
          /* RESULT VIEW */
          <div className="bg-white rounded-2xl border border-slate-100 p-6 md:p-8 shadow-sm space-y-6 fade-in">
            {/* Header / Score Dial */}
            <div className="text-center py-6 border-b border-slate-100 space-y-3">
              <div className="inline-flex p-3 bg-blue-50 text-blue-700 rounded-full">
                <ClipboardCheck className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">专项测验已结束</h3>
              <p className="text-xs text-slate-500">学习画像已经基于本次答题数据调整，错题已归档至错题本。</p>

              <div className="flex justify-center items-center gap-8 pt-4">
                <div className="space-y-0.5">
                  <div className="text-2.5xl font-extrabold text-slate-900">{correctCount} <span className="text-sm text-slate-400">/ {questions.length}</span></div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">正确答对</div>
                </div>
                <div className="h-8 w-px bg-slate-200"></div>
                <div className="space-y-0.5">
                  <div className="text-2.5xl font-extrabold text-blue-600">{scorePercent}%</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">能力评分</div>
                </div>
              </div>
            </div>

            {/* Diagnosis / Insights */}
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-blue-950 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" /> ProfileAgent 协同诊断结果
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {scorePercent === 100
                  ? "太棒了！您本次测验取得了满分。您对该领域的理论推导、代码实现细节和极端边界的掌控可以说是无懈可击！可以点击下方前往工作台开始新的阶段规划。"
                  : `您在本次专项测验中，在「${settings.domain}」下的部分高精细题目中暴露出偏误。未做对的题目已被 FeedbackAgent 深度溯源，诊断其错因并提供治愈路线。相关错题已经存入「错题本」，您可以随时进行再练。`}
              </p>
            </div>

            {/* Detailed Question Review List */}
            <div className="space-y-5">
              <h4 className="text-xs font-bold text-slate-900">考题深度温盘与学术解析</h4>

              {questions.map((q, idx) => {
                const userAns = userAnswers[idx];
                const isCorrect = userAns === q.answerIndex;

                return (
                  <div key={q.id} className="p-5 border border-slate-100 rounded-xl space-y-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">Q{idx + 1} ({q.domain})</span>
                        <p className="text-xs font-bold text-slate-800">{q.question}</p>
                      </div>
                      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        isCorrect ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {isCorrect ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" /> 回答正确
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" /> 回答错误
                          </>
                        )}
                      </span>
                    </div>

                    {q.code && (
                      <pre className="p-3 bg-slate-50 text-[11px] font-mono rounded-lg border border-slate-100 overflow-x-auto text-slate-600">
                        {q.code}
                      </pre>
                    )}

                    <div className="grid sm:grid-cols-2 gap-2 text-xs">
                      {q.options.map((opt, oIdx) => {
                        const isChosen = userAns === oIdx;
                        const isRight = q.answerIndex === oIdx;
                        return (
                          <div
                            key={oIdx}
                            className={`p-2.5 rounded-lg border ${
                              isRight
                                ? "border-emerald-300 bg-emerald-50 text-emerald-900 font-medium"
                                : isChosen
                                ? "border-rose-300 bg-rose-50 text-rose-900"
                                : "border-slate-100 bg-white text-slate-600"
                            }`}
                          >
                            <span className="font-mono font-bold mr-1.5">
                              {String.fromCharCode(65 + oIdx)}.
                            </span>
                            {opt}
                          </div>
                        );
                      })}
                    </div>

                    {/* Academic Explanation */}
                    <div className="bg-blue-50/30 p-3 rounded-lg border border-blue-50/60 text-xs text-slate-600 space-y-1.5">
                      <div className="font-bold text-blue-950 flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5" /> 学术深度解析 (Detailed Explanation)
                      </div>
                      <p className="leading-relaxed text-slate-600">{q.explanation}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <button
                onClick={() => onNavigateToTab("errors")}
                className="text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                前往错题本闭环复习
              </button>
              <button
                onClick={() => onNavigateToTab("dashboard")}
                className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                返回工作台 dashboard
              </button>
            </div>
          </div>
        ) : (
          /* ACTIVE EXAM INTERFACE */
          <div className="grid lg:grid-cols-12 gap-6">
            {/* The Main Question Card (8 Columns of the interior split) */}
            <div className="lg:col-span-9 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
                {/* Header Info */}
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full font-sans uppercase">
                        {questions[currentIndex]?.domain}
                      </span>
                      {marked.includes(currentIndex) && (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full flex items-center gap-0.5">
                          <Bookmark className="w-3 h-3 fill-amber-600" /> 已标记
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-bold text-slate-800">
                      第 {currentIndex + 1} 题 <span className="text-slate-400">/ {questions.length} 题</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                    <Timer className="w-4 h-4 text-slate-500" />
                    <span className="font-mono">{formatTime(timer)}</span>
                  </div>
                </div>

                {/* Question Text */}
                <div className="text-sm font-semibold text-slate-900 leading-relaxed">
                  {questions[currentIndex]?.question}
                </div>

                {/* Preformatted Code Block */}
                {questions[currentIndex]?.code && (
                  <pre className="p-4 bg-slate-50 text-[11px] font-mono rounded-xl border border-slate-100 overflow-x-auto text-slate-600 leading-relaxed shadow-inner">
                    {questions[currentIndex]?.code}
                  </pre>
                )}

                {/* Options list */}
                <div className="space-y-2.5 pt-2">
                  {questions[currentIndex]?.options.map((opt, oIdx) => {
                    const isSelected = userAnswers[currentIndex] === oIdx;
                    return (
                      <button
                        key={oIdx}
                        onClick={() => handleSelectOption(oIdx)}
                        className={`w-full text-left p-4 rounded-xl border transition-all text-xs font-medium flex items-center gap-3.5 cursor-pointer ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/30 text-blue-900 ring-2 ring-blue-50"
                            : "border-slate-150 hover:border-slate-350 bg-white text-slate-700"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center font-mono font-bold text-[11px] transition-all ${
                          isSelected
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-300 text-slate-500 bg-slate-50"
                        }`}>
                          {String.fromCharCode(65 + oIdx)}
                        </div>
                        <span className="leading-relaxed">{opt}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Action Controls */}
                <div className="flex justify-between items-center border-t border-slate-100 pt-5 mt-4">
                  <div className="flex gap-2">
                    <button
                      onClick={handlePrev}
                      disabled={currentIndex === 0}
                      className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleToggleMark}
                      className={`text-xs font-semibold px-4 py-2.5 rounded-xl border transition-colors cursor-pointer flex items-center gap-1 ${
                        marked.includes(currentIndex)
                          ? "border-amber-400 bg-amber-50 text-amber-700"
                          : "border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                      }`}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${marked.includes(currentIndex) ? 'fill-amber-700' : ''}`} />
                      {marked.includes(currentIndex) ? "取消标记" : "标记本题"}
                    </button>
                  </div>

                  <div className="flex gap-2">
                    {/* Ask hint from AI */}
                    <button
                      onClick={handleRequestHint}
                      className="text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <HelpCircle className="w-3.5 h-3.5" /> AI 提示
                    </button>

                    {currentIndex < questions.length - 1 ? (
                      <button
                        onClick={handleNext}
                        className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-xl transition-colors shadow-sm cursor-pointer"
                      >
                        下一题
                      </button>
                    ) : (
                      <button
                        onClick={handleCompleteQuiz}
                        className="text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 rounded-xl transition-colors shadow-sm cursor-pointer"
                      >
                        交卷评分
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* HINT POPOVER INLINE */}
              {showHint && (
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-xs text-blue-900 leading-relaxed flex items-start gap-2.5 fade-in">
                  <Sparkles className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <span className="font-bold block">HintAgent 认知线索启发：</span>
                    {loadingHint ? (
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>正在实时解读本题考点...</span>
                      </div>
                    ) : (
                      <p>{hintText || questions[currentIndex]?.hint}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ANSWER GRID (3 Columns of the interior split) */}
            <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 h-fit space-y-4">
              <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">答题卡状态 (Progress)</h4>
              
              <div className="grid grid-cols-4 gap-2">
                {questions.map((_, idx) => {
                  const isCurrent = currentIndex === idx;
                  const isAnswered = userAnswers[idx] !== undefined;
                  const isMarked = marked.includes(idx);

                  return (
                    <button
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-9 text-xs font-bold font-mono rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                        isCurrent
                          ? "border-blue-600 bg-blue-50 text-blue-800 ring-2 ring-blue-100"
                          : isMarked
                          ? "border-amber-400 bg-amber-50 text-amber-700"
                          : isAnswered
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-slate-200 hover:border-slate-300 text-slate-500 bg-slate-50"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-2 text-[10px] text-slate-500 font-semibold">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-blue-600 rounded"></div>
                  <span>已作答 ({answeredCount} 题)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-amber-50 border border-amber-400 rounded"></div>
                  <span>标记重点回顾 ({marked.length} 题)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-slate-50 border border-slate-200 rounded"></div>
                  <span>未作答 ({questions.length - answeredCount} 题)</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
