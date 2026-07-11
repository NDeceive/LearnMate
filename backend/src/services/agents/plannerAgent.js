const { generateText } = require("../aiService");

const PlannerAgent = {
  name: "PlannerAgent",
  description: "学习路径规划智能体",
  systemPrompt: "你是计智引擎的学习路径规划智能体。你负责根据学习画像、课程、知识点和掌握情况生成学习路径、复习顺序、训练建议和后续任务安排。",
  async run(context = {}, extraPrompt = "") {
    const prompt = [
      this.systemPrompt,
      "",
      "【上下文】",
      JSON.stringify(context, null, 2),
      "",
      "【任务】",
      extraPrompt || "请生成后续学习路径建议。"
    ].join("\n");

    try {
      const content = await generateText({
        messages: [
          { role: "system", content: this.systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.35,
        maxTokens: 1200
      });

      return content && content.trim() ? content.trim() : buildPlannerFallback(context);
    } catch (error) {
      return buildPlannerFallback(context);
    }
  },
  async planPath({ catalog, profile }) {
    const prompt = [
      "You are PlannerAgent. Return one strict JSON object and nothing else.",
      "Use only the exact knowledgePoint, questionId, and exerciseId values present in catalog.",
      "Allowed root fields: title, stages.",
      "Allowed stage fields: key,title,subject,durationMinutes,goals,knowledgePoints,questionIds,codeExerciseIds,completion,dependsOn.",
      "completion must contain only type and ids; type is quiz or codelab.",
      "Dependencies must be acyclic. Do not duplicate stages or references.",
      JSON.stringify({ catalog, profile })
    ].join("\n");
    const content = await generateText({
      messages: [{ role: "system", content: "Return strict JSON only." }, { role: "user", content: prompt }],
      temperature: 0.1,
      maxTokens: 1800
    });
    if (!content || content.trim()[0] !== "{" || content.trim().slice(-1) !== "}") {
      throw new Error("PlannerAgent did not return strict JSON");
    }
    return JSON.parse(content.trim());
  }
};

function buildPlannerFallback(context) {
  const topic = context.topic || context.knowledgePoint || "当前知识点";

  return [
    "## 后续学习路径建议",
    "",
    `1. 先复述「${topic}」的定义、关键性质和适用条件。`,
    "2. 再完成 2-3 个基础例题，确保能独立推导步骤。",
    "3. 接着练习带边界条件的代码题或综合题，重点检查复杂度。",
    "4. 最后整理一页错因清单，把易混概念和典型反例写清楚。"
  ].join("\n");
}

module.exports = {
  PlannerAgent
};
