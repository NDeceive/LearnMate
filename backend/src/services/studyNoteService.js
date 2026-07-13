function buildStudyNote(context) {
  const goal = context.stageGoals[0] || `掌握${context.knowledgePoint}`;
  const error = context.errorPatterns[0]?.errorType || "暂未发现稳定的高频错误模式";
  const pace = context.paceAndTimeBudget?.pacePreference || "适中";
  return {
    personalizedObjectives: context.stageGoals.slice(0, 5).length ? context.stageGoals.slice(0, 5) : [goal],
    foundationSummary: `当前${context.knowledgePoint}掌握度为 ${context.mastery}，已有基础为${context.priorKnowledge.join("、") || "尚未记录"}。讲解采用${context.explanationPreference}方式，并按${pace}节奏安排。`,
    coreConcepts: [
      { title: "概念边界", explanation: `先明确${context.knowledgePoint}的定义、输入、输出和适用范围，避免把相邻概念混为一谈。`, importance: "high" },
      { title: "关键状态", explanation: `跟踪${context.knowledgePoint}执行过程中的关键状态变化，并说明每一步为什么成立。`, importance: "high" },
      { title: "复杂度与取舍", explanation: "比较不同实现的时间、空间代价以及适用场景。", importance: "medium" }
    ],
    diagrams: [{ title: "结构—过程—验证图", description: `以${context.knowledgePoint}为中心，将前置条件、执行步骤和结果验证串联。`, steps: ["确认前置条件", "标记关键状态", "逐步执行", "用边界输入验证结果"] }],
    methodsAndFormulas: [{ title: "分步验证法", expression: "前置条件 → 状态变化 → 输出 → 反例检查", explanation: "每一步都写出依据，完成后使用边界条件和反例复核。", conditions: ["输入定义明确", "步骤顺序可追踪", "结果可验证"] }],
    workedExamples: [{ question: `如何分析一个${context.knowledgePoint}问题？`, steps: ["识别题目给出的对象和约束", "选择与目标匹配的表示或操作", "逐步记录状态变化", "检查边界情况并总结复杂度"], answer: `得到可解释、可复核的${context.knowledgePoint}分析过程，而不只给出最终结论。` }],
    commonMistakes: [{ mistake: error, reason: "忽略定义边界、执行顺序或中间状态，容易造成结论与过程脱节。", correction: "按条件、步骤、结果三栏复盘，并优先检查最近的高频错误证据。" }],
    practiceTasks: [{ prompt: `用自己的话解释${context.knowledgePoint}的核心定义和适用条件。`, hint: "先说对象，再说操作，最后说明限制。", answerGuide: "答案应包含定义、至少一个适用条件和一个边界情况。" }, { prompt: `针对“${error}”设计一次纠错检查。`, hint: "逐步记录每次状态变化。", answerGuide: "指出错误发生步骤、正确依据和验证方法。" }],
    studyAdvice: [`按${pace}节奏分段学习，建议本次投入 ${context.estimatedMinutes} 分钟。`, `优先处理“${error}”，完成后再做综合迁移。`, `结合偏好“${context.resourcePreferences.join("、") || "结构化资源"}”选择复习方式。`],
    citationBasis: [`学习路径 V${context.pathVersion} 阶段：${context.stageTitle}`, `掌握度记录：${context.mastery}`, context.questionEvidence.length ? `真实题库证据：${context.questionEvidence.slice(0, 3).map((item) => item.questionId).join("、")}` : "当前阶段暂无绑定题目，未虚构题目来源"]
  };
}

module.exports = { buildStudyNote };
