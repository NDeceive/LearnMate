import React from "react";
import { ArrowRight, BookOpen, Brain, Code2, Terminal } from "lucide-react";

interface CodeLabViewProps {
  onNavigateToTab: (tab: string, prefillData?: any) => void;
}

export default function CodeLabView({ onNavigateToTab }: CodeLabViewProps) {
  return (
    <div className="fade-in font-sans">
      <section className="bg-white rounded-2xl border border-slate-100 p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 border-b border-slate-100 pb-6">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
              <Code2 className="w-3.5 h-3.5" /> 代码实验室
            </span>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-950 tracking-tight">代码实验室</h2>
              <p className="text-sm text-slate-500 leading-relaxed max-w-2xl">
                支持数据结构、C 语言、Python 的在线代码练习与样例运行。
              </p>
            </div>
          </div>

          <div className="bg-slate-950 text-slate-300 border border-slate-800 rounded-2xl p-4 font-mono text-xs min-w-[240px] shadow-md">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold mb-2">
              <Terminal className="w-3.5 h-3.5" />
              Sandbox Status
            </div>
            <div>&gt; 后续将接入代码运行沙箱</div>
            <div>&gt; Language: C / Python</div>
            <div>&gt; Judge: Preparing</div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {[
            { title: "数据结构练习", desc: "链表、栈、队列、树、图的代码训练入口预留。" },
            { title: "C 语言专项", desc: "指针、结构体、内存布局与边界调试能力训练。" },
            { title: "Python 样例运行", desc: "用于算法原型验证与复杂度对比实验。" }
          ].map((item) => (
            <div key={item.title} className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2">
              <h3 className="text-xs font-extrabold text-slate-900">{item.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => onNavigateToTab("quiz")}
            className="inline-flex items-center justify-center gap-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <Brain className="w-4 h-4" />
            返回每日测验
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onNavigateToTab("resource", {
              subject: "数据结构与算法",
              topic: "数据结构代码练习"
            })}
            className="inline-flex items-center justify-center gap-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-100 px-5 py-3 rounded-xl transition-colors cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            查看数据结构资源
          </button>
        </div>
      </section>
    </div>
  );
}
