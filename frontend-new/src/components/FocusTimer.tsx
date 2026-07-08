import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
  Maximize2,
  Minimize2,
  Sparkles,
  Coffee,
  CheckCircle,
  Brain,
  MessageSquare,
  Award,
  BookOpen
} from "lucide-react";

interface FocusTimerProps {
  onFocusComplete?: (minutes: number) => void;
}

export default function FocusTimer({ onFocusComplete }: FocusTimerProps) {
  // Toggle states
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Timer configuration states
  const [duration, setDuration] = useState(25); // in minutes (range: 25 - 50)
  const [timeLeft, setTimeLeft] = useState(25 * 60); // in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false); // Focus vs Break mode

  // Audio setup states
  const [noiseType, setNoiseType] = useState<"none" | "brown" | "white">("none");
  const [chimeEnabled, setChimeEnabled] = useState(true);

  // Completion modal / suggestion popup state
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completedMinutes, setCompletedMinutes] = useState(0);

  // Web Audio references
  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Active agent quotes to display for companion feel
  const agentQuotes = {
    idle: [
      { agent: "TheoryAgent", text: "已加载学术强化引擎。建议在红黑树、408操作系统难点突围前，先开启一次 35分钟 的沉浸研读。" },
      { agent: "ProfileAgent", text: "设定 25-50 分钟的工作时长是避开认知疲劳、让突触高效重塑的最佳生物周期。" },
      { agent: "CodeAgent", text: "代码沙盒与推演面板已就绪。万事俱备，只等您点击开始专注于核心架构。" }
    ],
    focus: [
      { agent: "TheoryAgent", text: "深层概念编码中... 建议关闭其他网页，只留计智伴学工作台。" },
      { agent: "CodeAgent", text: "编译链路正在为您静默监听，已为您隔离 408 课外无关的嘈杂电波。" },
      { agent: "ProfileAgent", text: "心流指标完美对齐。脑叶突触处于高活跃度状态，请保持高效理解速率。" },
      { agent: "ReviewAgent", text: "不要焦虑。遇阻时，让思维在计时器走动中进入发散态，稍后复盘即可。" }
    ],
    break: [
      { agent: "ProfileAgent", text: "⚠️ 警告：检测到视疲劳累积。请立刻离开座椅，进行 20-20-20 护眼凝视。" },
      { agent: "ReviewAgent", text: "在脑力小憩期，海马体会自动给刚才理解的操作系统多线程信号量归档，休息非常必要。" },
      { agent: "TheoryAgent", text: "补充水分并适度伸展，能使前额叶皮层快速排毒，为下一轮冲刺储能。" }
    ]
  };

  const [activeQuote, setActiveQuote] = useState(agentQuotes.idle[0]);

  // Rotate quotes occasionally
  useEffect(() => {
    const quotes = isBreak ? agentQuotes.break : isRunning ? agentQuotes.focus : agentQuotes.idle;
    const randomIndex = Math.floor(Math.random() * quotes.length);
    setActiveQuote(quotes[randomIndex]);
  }, [isRunning, isBreak]);

  // Sync timeLeft when duration changes (only if idle)
  useEffect(() => {
    if (!isRunning && !isBreak) {
      setTimeLeft(duration * 60);
    }
  }, [duration, isRunning, isBreak]);

  // Web Audio Context initializer
  const initAudioContext = () => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtxRef.current = new AudioContextClass();
      }
    }
  };

  // Play a beautiful synthesized "double-tone" chime when completed
  const playChimeSound = () => {
    if (!chimeEnabled) return;
    try {
      initAudioContext();
      const ctx = audioCtxRef.current;
      if (!ctx) return;

      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const playTone = (freq: number, start: number, durationTime: number) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, start);

        gainNode.gain.setValueAtTime(0.2, start);
        gainNode.gain.exponentialRampToValueAtTime(0.001, start + durationTime);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + durationTime);
      };

      const now = ctx.currentTime;
      playTone(523.25, now, 0.6); // C5
      playTone(659.25, now + 0.15, 0.6); // E5
      playTone(783.99, now + 0.3, 0.9); // G5
    } catch (e) {
      console.warn("Audio Context block or unsupported", e);
    }
  };

  // Synthesize background noise (Cozy Brown or Pure White)
  const startNoiseSynthesis = (type: "brown" | "white") => {
    try {
      initAudioContext();
      const ctx = audioCtxRef.current;
      if (!ctx) return;

      // Ensure resumed
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      // Stop previous
      stopNoiseSynthesis();

      const bufferSize = 2 * ctx.sampleRate;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      if (type === "white") {
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
      } else if (type === "brown") {
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          data[i] = (lastOut + 0.02 * white) / 1.02;
          lastOut = data[i];
          data[i] *= 3.5; // Gain compensation
        }
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.setValueAtTime(type === "brown" ? 350 : 600, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(type === "brown" ? 0.08 : 0.04, ctx.currentTime);

      source.connect(lowpass);
      lowpass.connect(gain);
      gain.connect(ctx.destination);

      source.start();
      noiseSourceRef.current = source;
      gainNodeRef.current = gain;
    } catch (e) {
      console.warn("Audio synthesis block or unsupported", e);
    }
  };

  const stopNoiseSynthesis = () => {
    if (noiseSourceRef.current) {
      try {
        noiseSourceRef.current.stop();
      } catch (e) {}
      noiseSourceRef.current = null;
    }
  };

  // Manage noise whenever noiseType, running state, or break state change
  useEffect(() => {
    if (isRunning && noiseType !== "none" && !isBreak) {
      startNoiseSynthesis(noiseType);
    } else {
      stopNoiseSynthesis();
    }
    return () => stopNoiseSynthesis();
  }, [noiseType, isRunning, isBreak]);

  // Main countdown interval effect
  useEffect(() => {
    let intervalId: any = null;

    if (isRunning) {
      intervalId = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Timer expired!
            clearInterval(intervalId);
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalId) clearInterval(intervalId);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isRunning, isBreak]);

  // Handle completion actions
  const handleTimerComplete = () => {
    setIsRunning(false);
    stopNoiseSynthesis();
    playChimeSound();

    if (!isBreak) {
      // Completed focus block
      setCompletedMinutes(duration);
      setShowCompletionModal(true);
      if (onFocusComplete) {
        onFocusComplete(duration);
      }
    } else {
      // Completed break block
      setIsBreak(false);
      setTimeLeft(duration * 60);
      alert("🍃 休息时间已结束，身体已经完成充能！开始下一轮专注于 408 难关攻克吧。");
    }
  };

  // Controls click handlers
  const handleStartPause = () => {
    initAudioContext();
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    stopNoiseSynthesis();
    if (isBreak) {
      setTimeLeft(5 * 60); // 5 min break
    } else {
      setTimeLeft(duration * 60);
    }
  };

  const handleSkipBreak = () => {
    setIsRunning(false);
    setIsBreak(false);
    setTimeLeft(duration * 60);
    stopNoiseSynthesis();
  };

  const handleStartBreak = () => {
    setShowCompletionModal(false);
    setIsBreak(true);
    setTimeLeft(5 * 60); // 5 min break
    setIsRunning(true);
  };

  const handleSetPreset = (min: number) => {
    if (!isRunning && !isBreak) {
      setDuration(min);
      setTimeLeft(min * 60);
    }
  };

  // Convert seconds to MM:SS
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Progress metrics
  const totalSeconds = isBreak ? 5 * 60 : duration * 60;
  const progressPercent = ((totalSeconds - timeLeft) / totalSeconds) * 100;

  // Circular progress SVG metrics
  const radius = 54;
  const strokeWidth = 5;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (timeLeft / totalSeconds) * circumference;

  return (
    <>
      {/* 1. Floating Action Launcher Button (Bottom Right) */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
        {/* Tiny Active Status Indicator Bubble */}
        {isRunning && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`px-3 py-1 text-[10px] font-bold rounded-full shadow-lg flex items-center gap-1.5 backdrop-blur-md ${
              isBreak
                ? "bg-emerald-500/90 text-white"
                : "bg-blue-600/95 text-white"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
            <span>{isBreak ? "休憩中" : "专注中"}: {formatTime(timeLeft)}</span>
          </motion.div>
        )}

        <motion.button
          onClick={() => {
            setIsOpen(!isOpen);
            setIsMinimized(false);
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`p-4 rounded-full shadow-xl text-white flex items-center justify-center cursor-pointer transition-all duration-300 relative ${
            isBreak
              ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200/50"
              : isRunning
              ? "bg-blue-600 hover:bg-blue-700 shadow-blue-200/50 animate-pulse"
              : "bg-slate-800 hover:bg-slate-900 shadow-slate-300/40"
          }`}
          style={{ animationDuration: "3s" }}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Timer className="w-6 h-6" />}
          {/* Subtle glowing ring if active */}
          {isRunning && (
            <span className="absolute inset-0 rounded-full border-2 border-white/50 animate-ping" />
          )}
        </motion.button>
      </div>

      {/* 2. Expanded Focus Space Dashboard Component */}
      <AnimatePresence>
        {isOpen && !isMinimized && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-80 sm:w-96 rounded-3xl glass-card-dense shadow-2xl border border-white/60 p-6 z-40 flex flex-col gap-4 text-slate-800 select-none overflow-hidden"
          >
            {/* Embedded glowing ambient backgrounds */}
            <div className="absolute inset-0 -z-10 bg-gradient-to-tr from-blue-500/5 via-transparent to-sky-500/5 pointer-events-none" />

            {/* Header */}
            <div className="flex justify-between items-center pb-2 border-b border-slate-100/60">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${isBreak ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"}`}>
                  {isBreak ? <Coffee className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    {isBreak ? "专注小憩 (Break)" : "学术专注空间 (Focus)"}
                  </h3>
                  <p className="text-[9px] text-slate-400 font-mono tracking-wider">PROFILE-AGENT MONITOR</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  title="最小化"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                  title="关闭"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Main Circular Timer Visualizer */}
            <div className="flex flex-col items-center justify-center py-4 relative">
              <div className="relative w-36 h-36 flex items-center justify-center">
                {/* SVG circular track and bar */}
                <svg className="absolute w-full h-full -rotate-90">
                  <circle
                    cx="72"
                    cy="72"
                    r={radius}
                    className="stroke-slate-100 fill-none"
                    strokeWidth={strokeWidth}
                  />
                  <motion.circle
                    cx="72"
                    cy="72"
                    r={radius}
                    className={`fill-none transition-all duration-300 ${
                      isBreak ? "stroke-emerald-500" : "stroke-blue-600"
                    }`}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    animate={{ strokeDashoffset }}
                    strokeLinecap="round"
                  />
                </svg>

                {/* Inner countdown numbers */}
                <div className="text-center flex flex-col items-center justify-center z-10">
                  <span className="text-3xl font-extrabold font-mono tracking-tight text-slate-900 leading-none">
                    {formatTime(timeLeft)}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 mt-1.5 rounded-full ${
                    isBreak ? "bg-emerald-50 text-emerald-700" : "bg-blue-50/80 text-blue-700"
                  }`}>
                    {isBreak ? "小憩状态" : "深度沉浸期"}
                  </span>
                </div>
              </div>
            </div>

            {/* Adaptive Smart Agent Companion Advice Box */}
            <div className="p-3 bg-white/60 border border-slate-100 rounded-2xl flex gap-2.5 items-start">
              <div className="p-1 bg-blue-50 rounded-lg text-blue-600 shrink-0 mt-0.5">
                <MessageSquare className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold font-mono tracking-wider text-blue-600 uppercase">
                  {activeQuote.agent} · 智慧反馈
                </span>
                <p className="text-[11px] leading-relaxed text-slate-500 font-medium">
                  "{activeQuote.text}"
                </p>
              </div>
            </div>

            {/* Slider Duration Configuration - Only if idle and not a break */}
            {!isRunning && !isBreak && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700">设置浸入时长</span>
                  <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">
                    {duration} 分钟
                  </span>
                </div>
                <input
                  type="range"
                  min="25"
                  max="50"
                  step="1"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                />

                {/* Preset Fast Actions */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {[25, 35, 50].map((min) => (
                    <button
                      key={min}
                      onClick={() => handleSetPreset(min)}
                      className={`py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                        duration === min
                          ? "border-blue-600 bg-blue-50 text-blue-700 font-extrabold"
                          : "border-slate-100 hover:border-slate-200 bg-white/40 hover:bg-white/80 text-slate-600"
                      }`}
                    >
                      {min === 25 ? "25m 番茄" : min === 35 ? "35m 深度" : "50m 极限"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sound & Ambient Noise Synthesis Controller */}
            {!isBreak && (
              <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-2.5 flex flex-col gap-2">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wide px-1">
                  <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-blue-500" /> 白噪音脑波对齐</span>
                  <button
                    onClick={() => setChimeEnabled(!chimeEnabled)}
                    className="flex items-center gap-0.5 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {chimeEnabled ? <Volume2 className="w-3 h-3 text-emerald-500" /> : <VolumeX className="w-3 h-3" />}
                    <span>{chimeEnabled ? "铃声开" : "铃声关"}</span>
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: "none", label: "静音环境" },
                    { id: "brown", label: "深沉褐噪" },
                    { id: "white", label: "极致白噪" }
                  ].map((noise) => (
                    <button
                      key={noise.id}
                      onClick={() => setNoiseType(noise.id as any)}
                      className={`py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                        noiseType === noise.id
                          ? "border-slate-400 bg-slate-800 text-white font-semibold shadow-sm"
                          : "border-slate-100 hover:border-slate-200 bg-white/80 text-slate-600"
                      }`}
                    >
                      {noise.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Control Actions Panel */}
            <div className="flex gap-2.5 pt-2">
              {isBreak ? (
                <>
                  <button
                    onClick={handleStartPause}
                    className={`flex-1 py-3 text-xs font-bold rounded-xl text-white transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer ${
                      isRunning ? "bg-amber-500 hover:bg-amber-600 shadow-amber-100" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100"
                    }`}
                  >
                    {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    <span>{isRunning ? "暂停休息" : "继续休息"}</span>
                  </button>
                  <button
                    onClick={handleSkipBreak}
                    className="px-4 py-3 text-xs font-bold border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-all cursor-pointer shrink-0"
                  >
                    跳过休息
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleStartPause}
                    className={`flex-grow py-3 text-xs font-extrabold rounded-xl text-white transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer ${
                      isRunning
                        ? "bg-rose-500 hover:bg-rose-600 shadow-rose-100"
                        : "bg-blue-600 hover:bg-blue-700 shadow-blue-150"
                    }`}
                  >
                    {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    <span>{isRunning ? "暂时搁置 (Pause)" : "开始专注 (Start)"}</span>
                  </button>
                  {(isRunning || timeLeft !== duration * 60) && (
                    <button
                      onClick={handleReset}
                      className="p-3 text-slate-600 border border-slate-200/80 hover:bg-slate-50 rounded-xl transition-all cursor-pointer shrink-0"
                      title="重置计时"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Minimized Tiny Pill Float Panel */}
      <AnimatePresence>
        {isOpen && isMinimized && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 15 }}
            onClick={() => setIsMinimized(false)}
            className="fixed bottom-24 right-6 px-4 py-2.5 rounded-full glass-card-dense shadow-xl border border-white/60 flex items-center gap-3 cursor-pointer hover:shadow-2xl transition-all z-40 group select-none"
          >
            <div className={`p-1 rounded-full shrink-0 animate-pulse ${isBreak ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"}`}>
              {isBreak ? <Coffee className="w-3.5 h-3.5" /> : <Brain className="w-3.5 h-3.5" />}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-extrabold text-slate-800 leading-tight">
                {isBreak ? "休息中" : "专注研读中"}
              </span>
              <span className="text-[9px] text-slate-400 font-mono font-bold">
                {formatTime(timeLeft)}
              </span>
            </div>
            <div className="w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 group-hover:text-slate-600">
              <Maximize2 className="w-3 h-3" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Beautiful Celebration Modal & Break Suggestion Overlay Dialog (Popup) */}
      <AnimatePresence>
        {showCompletionModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white/95 rounded-3xl p-6 md:p-8 max-w-md w-full border border-slate-100 shadow-2xl flex flex-col gap-5 text-slate-800"
            >
              {/* Confetti & Medal Icon Header */}
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner relative">
                  <Award className="w-10 h-10 animate-bounce" />
                  <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-blue-400 animate-ping"></span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">专注达成！完成了一次学术深潜</h3>
                  <p className="text-xs text-slate-400 font-mono">STAGES COMPLETED · JIZHI ENGINE</p>
                </div>
              </div>

              {/* Congratulatory message */}
              <p className="text-xs text-slate-600 text-center leading-relaxed">
                恭喜同学！您成功达成了持续的 <span className="font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">{completedMinutes} 分钟</span> 高强度计算机专业课心流体验。
              </p>

              {/* ProfileAgent Scientifically Recommended Break Tips */}
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-3.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Coffee className="w-4 h-4 text-emerald-500" />
                  <span>ProfileAgent 的学术生理调节建议</span>
                </div>
                
                <div className="space-y-2.5 text-xs text-slate-600">
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 font-extrabold flex items-center justify-center shrink-0 mt-0.5 text-[9px]">1</div>
                    <div>
                      <p className="font-semibold text-slate-800">闭眼进行 3 组长周期深呼吸</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">调节植物神经，缓解视觉睫状肌的充血压力。</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 font-extrabold flex items-center justify-center shrink-0 mt-0.5 text-[9px]">2</div>
                    <div>
                      <p className="font-semibold text-slate-800">喝一杯 150ml 左右的温水</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">补充体液消耗，促进多脑区毛细血管的氧气运输。</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 font-extrabold flex items-center justify-center shrink-0 mt-0.5 text-[9px]">3</div>
                    <div>
                      <p className="font-semibold text-slate-800">站立离开座椅，向远处极目眺望</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">放松久坐压迫的腰椎关节，激活视网膜光敏敏捷度。</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={handleStartBreak}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-100 hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Coffee className="w-4 h-4" />
                  <span>开启 5 分钟小憩并舒缓神经</span>
                </button>
                <button
                  onClick={() => setShowCompletionModal(false)}
                  className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-500 text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
                >
                  我知道了，稍后再开始
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
