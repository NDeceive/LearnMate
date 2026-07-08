import React, { useState } from "react";
import { motion } from "motion/react";
import { ErrorRecord } from "../types";
import {
  ClipboardCopy,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  BookOpen,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Workflow,
  RefreshCw,
  Cpu,
  Tag,
  Download
} from "lucide-react";

export function autoClassifyRecord(rec: ErrorRecord): string[] {
  const tags: string[] = [];
  const text = `${rec.title} ${rec.question} ${rec.course} ${rec.code || ""} ${rec.diagnosis?.rootCause || ""}`.toLowerCase();
  
  // Rule-based keyword matching
  if (text.includes("二叉树") || text.includes("树") || text.includes("红黑树") || text.includes("avl") || text.includes("链表") || text.includes("栈") || text.includes("队列") || text.includes("数据结构")) {
    tags.push("数据结构");
  }
  if (text.includes("遍历") || text.includes("算法") || text.includes("morris") || text.includes("递归") || text.includes("复杂度") || text.includes("排序") || text.includes("dijkstra")) {
    tags.push("算法");
  }
  if (text.includes("进程") || text.includes("死锁") || text.includes("信号量") || text.includes("操作系统") || text.includes("pv") || text.includes("调度") || text.includes("内核") || text.includes("内存管理") || text.includes("银行家")) {
    tags.push("操作系统");
  }
  if (text.includes("cache") || text.includes("主存") || text.includes("映射") || text.includes("寄存器") || text.includes("指令") || text.includes("体系结构") || text.includes("组成原理") || text.includes("tag") || text.includes("行号")) {
    tags.push("计算机组成原理");
  }
  if (text.includes("tcp") || text.includes("握手") || text.includes("syn") || text.includes("网络") || text.includes("ip") || text.includes("协议") || text.includes("http")) {
    tags.push("计算机网络");
  }
  
  // Fallback classification based on Course/Domain
  if (tags.length === 0) {
    if (rec.course.includes("数据结构") || rec.course.includes("算法")) {
      tags.push("数据结构", "算法");
    } else if (rec.course.includes("操作系统")) {
      tags.push("操作系统");
    } else if (rec.course.includes("组成原理") || rec.course.includes("计算机组成")) {
      tags.push("计算机组成原理");
    } else if (rec.course.includes("网络") || rec.course.includes("计算机网络")) {
      tags.push("计算机网络");
    } else {
      tags.push("其他");
    }
  }
  
  return Array.from(new Set(tags));
}

interface ErrorViewProps {
  errorRecords: ErrorRecord[];
  onRemediateRecord: (id: string) => void;
  onNavigateToTab: (tab: string, prefillData?: any) => void;
}

export default function ErrorView({ errorRecords, onRemediateRecord, onNavigateToTab }: ErrorViewProps) {
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>("all");
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>("err-1");
  const [retryAnswers, setRetryAnswers] = useState<{ [key: string]: number }>({});
  const [retryFeedback, setRetryFeedback] = useState<{ [key: string]: { success: boolean; msg: string } }>({});

  const filteredRecords = errorRecords.filter(r => {
    const matchesCourse = selectedCourseFilter === "all" || r.course === selectedCourseFilter;
    const matchesTag = selectedTagFilter === "all" || autoClassifyRecord(r).includes(selectedTagFilter);
    return matchesCourse && matchesTag;
  });

  const handleRetrySubmit = (record: ErrorRecord) => {
    const chosen = retryAnswers[record.id];
    if (chosen === undefined) return;

    const success = chosen === record.correctAnswer;
    if (success) {
      setRetryFeedback((prev) => ({
        ...prev,
        [record.id]: { success: true, msg: "恭喜！您已成功解答该相似题，成功治愈该专业课认知漏洞！已联动 ProfileAgent 更新画像权重。" }
      }));
      onRemediateRecord(record.id);
    } else {
      setRetryFeedback((prev) => ({
        ...prev,
        [record.id]: { success: false, msg: "回答错误。不要气馁，建议查阅下方 FeedbackAgent 深度归因，并点击 AI 导师获取帮助。" }
      }));
    }
  };

  const exportAsMarkdown = () => {
    if (filteredRecords.length === 0) return;
    
    const dateStr = new Date().toLocaleDateString("zh-CN");
    let mdContent = `# 计智伴学系统 - 错题集导出报告\n\n`;
    mdContent += `**导出时间**：${dateStr}\n`;
    mdContent += `**筛选学科**：${selectedCourseFilter === "all" ? "全部核心科目" : selectedCourseFilter}\n`;
    mdContent += `**筛选维度**：${selectedTagFilter === "all" ? "全部维度" : selectedTagFilter}\n`;
    mdContent += `**总计题目**：${filteredRecords.length} 道错题\n\n`;
    mdContent += `> 💡 说明：本导出用于离线打印、复习回顾和学术归档。可通过 AI 导师进行针对性的对齐与重塑。\n\n`;
    mdContent += `---\n\n`;

    filteredRecords.forEach((rec, idx) => {
      const recordTags = autoClassifyRecord(rec);
      mdContent += `## ${idx + 1}. 【${rec.course}】${rec.title}\n`;
      mdContent += `- **错题状态**：${rec.remediated ? "✅ 已消灭" : "❌ 未消灭 · 待温盘"}\n`;
      mdContent += `- **关联维度**：${recordTags.join(" / ")}\n`;
      mdContent += `- **录入时间**：${rec.timestamp}\n\n`;
      mdContent += `### 📌 题目内容\n`;
      mdContent += `> ${rec.question}\n\n`;
      
      if (rec.code) {
        mdContent += `\`\`\`${rec.course.includes("代码") || rec.course.includes("算法") ? "cpp" : ""}\n${rec.code}\n\`\`\`\n\n`;
      }

      mdContent += `#### 选项列表\n`;
      rec.options.forEach((opt, oIdx) => {
        mdContent += `- [ ] **${String.fromCharCode(65 + oIdx)}**. ${opt}\n`;
      });
      mdContent += `\n**正确答案**：**${String.fromCharCode(65 + rec.correctAnswer)}**\n\n`;

      mdContent += `### 🧠 FeedbackAgent 偏误溯源诊断\n`;
      mdContent += `- **偏误根因分析**：${rec.diagnosis.rootCause}\n`;
      mdContent += `- **认知缺陷陷阱**：${rec.diagnosis.cognitiveTrap}\n`;
      mdContent += `- **学习路径重塑**：${rec.diagnosis.learningPathAdjustment}\n\n`;

      mdContent += `### 📖 类似考题推荐\n`;
      rec.similarRecommendations.forEach((sim) => {
        mdContent += `- ${sim}\n`;
      });
      
      mdContent += `\n---\n\n`;
    });

    const blob = new Blob([mdContent], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `计智错题本_${selectedCourseFilter}_${selectedTagFilter}_${dateStr.replace(/\//g, "-")}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAsCSV = () => {
    if (filteredRecords.length === 0) return;

    const escapeCSV = (str: string) => {
      if (!str) return '""';
      const escaped = str.replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const headers = [
      "序号",
      "学科科目",
      "自动标签",
      "题目标题",
      "题目内容",
      "选项A",
      "选项B",
      "选项C",
      "选项D",
      "正确答案",
      "消灭状态",
      "录入时间",
      "诊断根因",
      "认知陷阱",
      "路径调整建议"
    ];

    const csvRows = [headers.join(",")];

    filteredRecords.forEach((rec, idx) => {
      const recordTags = autoClassifyRecord(rec);
      const row = [
        (idx + 1).toString(),
        rec.course,
        recordTags.join(" | "),
        rec.title,
        rec.question,
        rec.options[0] || "",
        rec.options[1] || "",
        rec.options[2] || "",
        rec.options[3] || "",
        String.fromCharCode(65 + rec.correctAnswer),
        rec.remediated ? "已消灭" : "未消灭",
        rec.timestamp,
        rec.diagnosis.rootCause,
        rec.diagnosis.cognitiveTrap,
        rec.diagnosis.learningPathAdjustment
      ];
      csvRows.push(row.map(escapeCSV).join(","));
    });

    const csvContent = "\uFEFF" + csvRows.join("\n"); // Add UTF-8 BOM for Excel compatibility
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dateStr = new Date().toLocaleDateString("zh-CN");
    link.setAttribute("download", `计智错题本_${selectedCourseFilter}_${selectedTagFilter}_${dateStr.replace(/\//g, "-")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const coursesList = ["all", ...Array.from(new Set(errorRecords.map(r => r.course)))];
  const allTagsList = ["all", "数据结构", "算法", "操作系统", "计算机组成原理", "计算机网络"];
  
  const getTagCount = (tag: string) => {
    if (tag === "all") return errorRecords.length;
    return errorRecords.filter(r => autoClassifyRecord(r).includes(tag)).length;
  };

  // Stats
  const totalCount = errorRecords.length;
  const remediatedCount = errorRecords.filter(r => r.remediated).length;
  const pendingCount = totalCount - remediatedCount;

  return (
    <div className="grid lg:grid-cols-12 gap-6 fade-in font-sans">
      {/* LEFT: Stats & Filters (4 Columns) */}
      <div className="lg:col-span-4 space-y-6">
        {/* Error Bank Metrics */}
        <section className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-950 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3">
            <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" /> 错题本深度诊断舱
          </h3>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-100/50 space-y-1">
              <div className="text-2xl font-black text-rose-600 font-mono">{pendingCount}</div>
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">待温盘漏洞</div>
            </div>
            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100/50 space-y-1">
              <div className="text-2xl font-black text-emerald-600 font-mono">{remediatedCount}</div>
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">已修复漏洞</div>
            </div>
          </div>

          <div className="space-y-1 pt-1">
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
              <span>错题反馈消灭率</span>
              <span>{totalCount > 0 ? Math.round((remediatedCount / totalCount) * 100) : 100}%</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${totalCount > 0 ? (remediatedCount / totalCount) * 100 : 100}%` }}></div>
            </div>
          </div>
        </section>

        {/* Filter Selection Panel */}
        <section className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-3">
          <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1">
            <Search className="w-3.5 h-3.5 text-slate-400" /> 学科精准筛选
          </h4>
          <div className="space-y-2">
            {coursesList.map((courseName) => (
              <button
                key={courseName}
                onClick={() => setSelectedCourseFilter(courseName)}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center justify-between ${
                  selectedCourseFilter === courseName
                    ? "border-blue-600 bg-blue-50 text-blue-700 font-bold"
                    : "border-slate-100 hover:border-slate-200 text-slate-600"
                }`}
              >
                <span>{courseName === "all" ? "全部核心科目" : courseName}</span>
                <span className="font-mono text-[10px] text-slate-400">
                  ({courseName === "all" ? errorRecords.length : errorRecords.filter(r => r.course === courseName).length} 题)
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Dimension Filter Panel */}
        <section className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-3">
          <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-slate-400" /> 知识维度筛选 (Auto Tags)
          </h4>
          <div className="space-y-1.5">
            {allTagsList.map((tag) => {
              const count = getTagCount(tag);
              const isSelected = selectedTagFilter === tag;
              
              let tagStyle = isSelected
                ? "border-emerald-650 bg-emerald-50/70 text-emerald-800 font-bold"
                : "border-slate-100 hover:border-slate-200 text-slate-600";
              
              if (isSelected) {
                if (tag === "数据结构") tagStyle = "border-sky-600 bg-sky-50 text-sky-700 font-bold";
                if (tag === "算法") tagStyle = "border-amber-600 bg-amber-50 text-amber-750 font-bold";
                if (tag === "操作系统") tagStyle = "border-blue-600 bg-blue-50 text-blue-700 font-bold";
                if (tag === "计算机组成原理") tagStyle = "border-rose-600 bg-rose-50 text-rose-700 font-bold";
                if (tag === "计算机网络") tagStyle = "border-teal-600 bg-teal-50 text-teal-800 font-bold";
              }

              return (
                <button
                  key={tag}
                  onClick={() => setSelectedTagFilter(tag)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center justify-between ${tagStyle}`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      tag === "all" ? "bg-slate-400" :
                      tag === "数据结构" ? "bg-sky-500" :
                      tag === "算法" ? "bg-amber-500" :
                      tag === "操作系统" ? "bg-blue-500" :
                      tag === "计算机组成原理" ? "bg-rose-500" : "bg-teal-500"
                    }`} />
                    <span>{tag === "all" ? "全部核心维度" : tag}</span>
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    ({count} 题)
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Profile Tuning Progress Log */}
        <section className="bg-slate-900 text-slate-300 rounded-2xl border border-slate-800 p-5 space-y-3 shadow-md font-mono text-xs">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
            <span className="text-white font-bold flex items-center gap-1.5">
              <Workflow className="w-4 h-4 text-blue-400 animate-spin" style={{ animationDuration: '8s' }} /> Profile Tuner
            </span>
            <span className="text-[9px] uppercase font-bold text-slate-500">Live Feedback</span>
          </div>

          <div className="space-y-2 text-[10px] text-slate-400 leading-relaxed">
            <div>&gt; Listening to PV operation retry...</div>
            <div className="text-emerald-400">&gt; SUCCESS: Record err-2 updated to [Remediated].</div>
            <div>&gt; Delta updated: Operating Systems index +1.2%</div>
            <div>&gt; Scheduling next check: 24h review loop...</div>
          </div>
        </section>
      </div>

      {/* RIGHT: Detailed Error Bank List (8 Columns) */}
      <div className="lg:col-span-8 space-y-4">
        {/* Export Wrong Questions Panel */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4.5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse"></span>
              当前错题清单 ({filteredRecords.length} 题)
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
              当前筛选：科目 <span className="font-semibold text-blue-600">{selectedCourseFilter === "all" ? "全部" : selectedCourseFilter}</span> · 
              维度 <span className="font-semibold text-blue-600">{selectedTagFilter === "all" ? "全部" : selectedTagFilter}</span>
            </p>
          </div>
          
          {filteredRecords.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={exportAsMarkdown}
                className="text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3.5 py-1.5 rounded-xl border border-blue-100/50 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow"
                title="导出为格式化的 Markdown 文件，适合打印或阅读"
              >
                <Download className="w-3.5 h-3.5" /> 导出 Markdown
              </button>
              <button
                onClick={exportAsCSV}
                className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-1.5 rounded-xl border border-emerald-100/50 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow"
                title="导出为 CSV 表格文件，方便 Excel 编辑或打印"
              >
                <Download className="w-3.5 h-3.5" /> 导出 CSV
              </button>
            </div>
          )}
        </div>

        {filteredRecords.length > 0 ? (
          filteredRecords.map((rec) => {
            const isExpanded = expandedId === rec.id;
            const chosenAns = retryAnswers[rec.id];
            const feedback = retryFeedback[rec.id];
            const recordTags = autoClassifyRecord(rec);

            return (
              <div
                key={rec.id}
                className={`p-5 rounded-2xl border transition-all ${
                  isExpanded
                    ? "border-rose-400 ring-2 ring-rose-50 bg-white"
                    : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm"
                }`}
              >
                {/* Header Row */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                  className="flex justify-between items-start md:items-center gap-4 cursor-pointer select-none"
                >
                  <div className="space-y-1.5 flex-grow">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">{rec.course}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        rec.remediated ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                      }`}>
                        {rec.remediated ? "已消灭" : "未消灭 · 待温盘"}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium font-mono">{rec.timestamp}</span>
                      
                      {/* Interactive auto-tags */}
                      {recordTags.map(tag => {
                        let colorClasses = "bg-slate-50 text-slate-500 border-slate-200/50";
                        if (tag === "数据结构") colorClasses = "bg-sky-50 text-sky-700 border-sky-100/50";
                        if (tag === "算法") colorClasses = "bg-amber-50 text-amber-700 border-amber-100/50";
                        if (tag === "操作系统") colorClasses = "bg-blue-50 text-blue-700 border-blue-100/50";
                        if (tag === "计算机组成原理") colorClasses = "bg-rose-50 text-rose-700 border-rose-100/50";
                        if (tag === "计算机网络") colorClasses = "bg-teal-50 text-teal-700 border-teal-100/50";
                        
                        return (
                          <span key={tag} className={`text-[9px] font-bold px-2 py-0.5 rounded-md border inline-flex items-center gap-1 ${colorClasses}`}>
                            <Tag className="w-2.5 h-2.5 opacity-85" /> {tag}
                          </span>
                        );
                      })}
                    </div>
                    <h4 className="text-xs md:text-sm font-bold text-slate-900 leading-tight">
                      {rec.title}
                    </h4>
                  </div>
                  <button className="text-xs text-rose-500 hover:underline font-bold shrink-0">
                    {isExpanded ? "收起详情" : "展开诊断与再练"}
                  </button>
                </div>

                {/* Expanded Details Panel */}
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="pt-5 border-t border-slate-100 mt-4 space-y-5 text-xs md:text-sm"
                  >
                    {/* The original question */}
                    <div className="space-y-2">
                      <h5 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                        <BookOpen className="w-4 h-4 text-blue-600" /> 原题重现
                      </h5>
                      <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                        {rec.question}
                      </p>
                      {rec.code && (
                        <pre className="p-3 bg-slate-50 rounded-lg text-[11px] text-slate-600 font-mono border border-slate-100 overflow-x-auto leading-relaxed shadow-inner">
                          {rec.code}
                        </pre>
                      )}
                    </div>

                    {/* Interactive retry workspace */}
                    <div className="p-4 bg-slate-50 border border-slate-200/50 rounded-xl space-y-3">
                      <h5 className="font-bold text-slate-950 flex items-center gap-1 text-xs">
                        <RefreshCw className="w-3.5 h-3.5 text-blue-600" /> 专项漏洞重练
                      </h5>

                      <div className="space-y-2">
                        {rec.options.map((opt, oIdx) => {
                          const isSelected = chosenAns === oIdx;
                          return (
                            <button
                              key={oIdx}
                              onClick={() => setRetryAnswers((prev) => ({ ...prev, [rec.id]: oIdx }))}
                              className={`w-full text-left p-2.5 rounded-lg border text-xs flex items-center gap-2.5 transition-all cursor-pointer ${
                                isSelected
                                  ? "border-blue-600 bg-blue-50/50 text-blue-900 font-bold"
                                  : "border-slate-150 bg-white hover:border-slate-250 text-slate-700"
                              }`}
                            >
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center font-mono text-[9px] font-bold ${
                                isSelected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 text-slate-500"
                              }`}>
                                {String.fromCharCode(65 + oIdx)}
                              </div>
                              <span className="leading-relaxed">{opt}</span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        <span className="text-[10px] text-slate-400 font-medium">回答错误已录入系统，本题支持无限次训练消灭。</span>
                        <button
                          onClick={() => handleRetrySubmit(rec)}
                          disabled={chosenAns === undefined}
                          className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer"
                        >
                          提交回答消灭漏洞
                        </button>
                      </div>

                      {/* Retry feedback */}
                      {feedback && (
                        <div className={`p-2.5 rounded-lg text-xs leading-relaxed flex items-start gap-2 ${
                          feedback.success ? "bg-emerald-50 text-emerald-900 border border-emerald-100" : "bg-rose-50 text-rose-900 border border-rose-100"
                        }`}>
                          {feedback.success ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
                          <p className="font-semibold">{feedback.msg}</p>
                        </div>
                      )}
                    </div>

                    {/* FeedbackAgent Diagnosis report */}
                    <div className="p-4 bg-rose-50/30 border border-rose-100/40 rounded-xl space-y-3">
                      <h5 className="font-bold text-rose-950 flex items-center gap-1.5 text-xs">
                        <Sparkles className="w-3.5 h-3.5 text-rose-600 animate-pulse" /> FeedbackAgent 偏误溯源报告 (Root-Cause Diagnosis)
                      </h5>

                      <div className="grid md:grid-cols-3 gap-4 text-xs">
                        <div className="space-y-1.5 p-3 bg-white rounded-lg shadow-sm border border-slate-100/50">
                          <span className="font-bold text-rose-900 block border-b border-rose-50 pb-1 flex items-center gap-0.5">
                            <span className="w-1.5 h-3 bg-rose-500 rounded-full inline-block"></span> 偏误根因分析
                          </span>
                          <p className="text-slate-500 leading-relaxed">{rec.diagnosis.rootCause}</p>
                        </div>

                        <div className="space-y-1.5 p-3 bg-white rounded-lg shadow-sm border border-slate-100/50">
                          <span className="font-bold text-rose-900 block border-b border-rose-50 pb-1 flex items-center gap-0.5">
                            <span className="w-1.5 h-3 bg-rose-500 rounded-full inline-block"></span> 认知缺陷陷阱
                          </span>
                          <p className="text-slate-500 leading-relaxed">{rec.diagnosis.cognitiveTrap}</p>
                        </div>

                        <div className="space-y-1.5 p-3 bg-white rounded-lg shadow-sm border border-slate-100/50">
                          <span className="font-bold text-blue-950 block border-b border-blue-50 pb-1 flex items-center gap-0.5">
                            <span className="w-1.5 h-3 bg-blue-500 rounded-full inline-block"></span> 学习路径重塑
                          </span>
                          <p className="text-slate-500 leading-relaxed">{rec.diagnosis.learningPathAdjustment}</p>
                        </div>
                      </div>
                    </div>

                    {/* Similar questions list */}
                    <div className="space-y-1.5 text-xs">
                      <h5 className="font-bold text-slate-800">📖 类似考题推荐</h5>
                      <div className="space-y-1">
                        {rec.similarRecommendations.map((recItem, rIdx) => (
                          <div key={rIdx} className="text-slate-500 leading-relaxed pl-2.5 border-l-2 border-slate-200 py-0.5">
                            {recItem}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Outer Links */}
                    <div className="flex gap-2 justify-end pt-2 border-t border-slate-100 text-xs">
                      <button
                        onClick={() => onNavigateToTab("mentor", `我想深度对齐提问错题【${rec.title}】的理论及实现细节，请帮我分析其 FeedbackAgent 诊断报告并编写最安全的防护代码。`)}
                        className="text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-colors cursor-pointer"
                      >
                        联动 AI 导师学术会诊
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 text-slate-400 text-xs shadow-sm">
            本核心科目下没有任何待修复的错题。做得好！
          </div>
        )}
      </div>
    </div>
  );
}
