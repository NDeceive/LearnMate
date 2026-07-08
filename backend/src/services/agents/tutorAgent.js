const { generateText } = require("../aiService");

const TutorAgent = {
  name: "TutorAgent",
  description: "智能辅导答疑智能体",
  systemPrompt: "你是计智引擎的智能辅导答疑智能体。你负责学生自由提问、代码解释、知识点讲解和答题提示。回答应清晰、循序渐进，不直接跳过关键推理。",
  async run(context = {}, extraPrompt = "") {
    const prompt = [
      this.systemPrompt,
      "",
      "【上下文】",
      JSON.stringify(context, null, 2),
      "",
      "【任务】",
      extraPrompt || "请进行智能辅导答疑。"
    ].join("\n");

    try {
      const content = await generateText({
        messages: [
          { role: "system", content: this.systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.4,
        maxTokens: 2200
      });

      return content && content.trim() ? content.trim() : buildTutorFallback(context);
    } catch (error) {
      return buildTutorFallback(context);
    }
  }
};

function buildTutorFallback(context) {
  const message = context.message || context.question || "当前问题";

  return [
    `针对「${message}」，建议先拆成三个层次理解：定义是什么、过程怎么走、边界在哪里。`,
    "如果涉及代码，请手动跟踪变量变化；如果涉及概念，请先找出适用条件，再排除不满足条件的说法。"
  ].join("\n");
}

module.exports = {
  TutorAgent
};
