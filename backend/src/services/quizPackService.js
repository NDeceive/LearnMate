function buildQuizPack(context) {
  const evidence = uniqueBy(context.questionEvidence || [], (item) => item.questionId).filter(isUsableEvidence).slice(0, 10);
  if (evidence.length < 5) throw evidenceError(`当前课程与知识点仅找到 ${evidence.length} 道真实题目，生成练习包至少需要 5 道，请先补充题库或调整学习路径。`);
  const selected = selectAdaptive(evidence, context.mastery).slice(0, Math.min(10, Math.max(5, evidence.length)));
  const counts = { foundation: 0, intermediate: 0, advanced: 0 };
  const questions = selected.map((item) => {
    const difficulty = normalizeDifficulty(item.difficulty); counts[difficulty] += 1;
    const options = [item.optionA, item.optionB, item.optionC, item.optionD].filter((value) => typeof value === "string" && value.trim());
    return {
      questionId: item.questionId,
      questionType: item.questionType || (options.length === 4 ? "single_choice" : "short_answer"),
      stem: item.stem,
      options: options.length === 4 ? options : [],
      scoringPoints: options.length === 4 ? [] : [item.answer || "覆盖题目要求的关键结论"],
      correctAnswer: item.answer,
      analysis: item.analysis,
      personalizedHint: personalizedHint(context, item),
      knowledgePoints: [item.knowledgePoint || context.knowledgePoint],
      difficulty
    };
  });
  return {
    title: `${context.knowledgePoint}自适应练习包`,
    difficultyDistribution: counts,
    generationBasis: [`当前掌握度：${context.mastery}`, `路径目标：${context.stageGoals.join("；")}`, context.errorPatterns[0] ? `高频错误：${context.errorPatterns[0].errorType}` : "暂无高频错误模式", `真实题库题目数：${questions.length}`],
    questions,
    evidenceStatus: "sufficient"
  };
}

function selectAdaptive(items, mastery) {
  const target = Number(mastery) < 50 ? ["foundation", "intermediate", "advanced"] : Number(mastery) < 75 ? ["intermediate", "foundation", "advanced"] : ["advanced", "intermediate", "foundation"];
  return [...items].sort((a, b) => target.indexOf(normalizeDifficulty(a.difficulty)) - target.indexOf(normalizeDifficulty(b.difficulty)));
}
function normalizeDifficulty(value) { const text = String(value || "").toLowerCase(); if (["提高", "medium", "intermediate"].includes(text)) return "intermediate"; if (["综合", "冲刺", "hard", "advanced", "expert"].includes(text)) return "advanced"; return "foundation"; }
function personalizedHint(context, item) { const error = context.errorPatterns[0]?.errorType; return error ? `先检查是否再次出现“${error}”，再从${item.knowledgePoint || context.knowledgePoint}的定义和条件入手。` : `先回忆${item.knowledgePoint || context.knowledgePoint}的定义，再逐项排除。`; }
function isUsableEvidence(item) { const options = [item.optionA, item.optionB, item.optionC, item.optionD].filter((value) => typeof value === "string" && value.trim()); return Boolean(item.questionId && item.stem && item.answer && item.analysis && (options.length === 4 || item.questionType !== "single_choice")); }
function uniqueBy(items, key) { const seen = new Set(); return items.filter((item) => { const value = key(item); if (!value || seen.has(value)) return false; seen.add(value); return true; }); }
function evidenceError(message) { const error = new Error(message); error.statusCode = 422; error.code = "INSUFFICIENT_QUESTION_EVIDENCE"; error.details = { evidenceStatus: "insufficient", minimum: 5 }; return error; }

module.exports = { buildQuizPack, normalizeDifficulty };
