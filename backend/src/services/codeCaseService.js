function buildCodeCase(context) {
  const exercise = (context.codeEvidence || [])[0];
  if (!exercise) return buildGeneratedCase(context);
  return {
    caseBackground: exercise.description || `在 CodeLab 中完成${context.knowledgePoint}的真实练习。`,
    learningObjectives: context.stageGoals.slice(0, 5).length ? context.stageGoals.slice(0, 5) : [`掌握${context.knowledgePoint}的实现`],
    language: exercise.language || "c",
    starterCode: exercise.starterCode || "// 请在 CodeLab 中查看并完成初始代码",
    tasks: [`完成 CodeLab 练习“${exercise.title}”`, "使用给定样例检查输出", "解释关键状态与复杂度"],
    inputDescription: exercise.sampleInput ? `样例输入：${exercise.sampleInput}` : "输入格式以 CodeLab 练习说明为准。",
    outputDescription: exercise.sampleOutput ? `预期输出：${exercise.sampleOutput}` : "输出格式以 CodeLab 练习说明为准。",
    testCases: [{ input: exercise.sampleInput || "", expectedOutput: exercise.sampleOutput || "", description: "来自已验证 CodeLab 练习的样例" }],
    boundaryConditions: ["空输入或最小规模输入", "达到题目约束上限的输入", "容易触发当前错误模式的输入"],
    aiExplanation: `该案例直接复用已验证练习 ${exercise.exerciseId}。实现时先确认数据表示，再逐步跟踪状态变化；AI 讲解不替代 CodeLab 的提交结果。`,
    commonErrors: [context.errorPatterns[0]?.errorType || "遗漏边界条件", "循环或递归终止条件错误", "输出格式与题目要求不一致"],
    advancedChallenges: ["分析时间和空间复杂度", "补充一个反例测试", "比较另一种实现方案"],
    verificationStatus: "verified",
    codeExerciseId: exercise.exerciseId
  };
}

function buildGeneratedCase(context) {
  return {
    caseBackground: `当前路径阶段未绑定 CodeLab 练习。以下${context.knowledgePoint}案例由模型模板生成，仅用于讲解和草稿练习。`,
    learningObjectives: context.stageGoals.slice(0, 5).length ? context.stageGoals.slice(0, 5) : [`理解${context.knowledgePoint}的实现步骤`],
    language: "c",
    starterCode: "#include <stdio.h>\n\nint main(void) {\n    /* TODO: 根据任务补全实现 */\n    return 0;\n}",
    tasks: [`补全与${context.knowledgePoint}相关的核心步骤`, "自行核对输入输出约束", "在真实沙箱验证前不要将结果视为通过"],
    inputDescription: "由学习者根据当前知识点补充输入约束。",
    outputDescription: "由学习者根据任务目标补充预期输出。",
    testCases: [{ input: "", expectedOutput: "", description: "占位边界样例，尚未经过真实代码沙箱验证" }],
    boundaryConditions: ["最小规模输入", "空输入", "最大规模输入"],
    aiExplanation: "这是未验证的生成案例。它可用于理解任务拆分，但必须进入真实 CodeLab 或代码沙箱验证后，才能形成路径完成证据。",
    commonErrors: [context.errorPatterns[0]?.errorType || "遗漏边界条件", "直接把示例输出当作真实执行结果"],
    advancedChallenges: ["绑定一个真实 CodeLab 练习后重新生成", "补充可自动判定的测试用例"],
    verificationStatus: "generated",
    codeExerciseId: null
  };
}

module.exports = { buildCodeCase, buildGeneratedCase };
