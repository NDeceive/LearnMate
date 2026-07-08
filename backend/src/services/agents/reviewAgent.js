const { generateText } = require("../aiService");

const ReviewAgent = {
  name: "ReviewAgent",
  description: "内容质量审核智能体",
  systemPrompt: "你是计智引擎的内容质量审核智能体。你负责审核学习资料、题目和答疑内容是否准确、完整、符合课程范围和难度，并指出易错点、边界条件与改进建议。",
  async run(context = {}, extraPrompt = "") {
    const prompt = [
      this.systemPrompt,
      "",
      "【上下文】",
      JSON.stringify(context, null, 2),
      "",
      "【任务】",
      extraPrompt || "请审核内容质量并给出简洁结论。"
    ].join("\n");

    try {
      const content = await generateText({
        messages: [
          { role: "system", content: this.systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        maxTokens: 1200
      });

      return content && content.trim() ? content.trim() : buildReviewFallback(context);
    } catch (error) {
      return buildReviewFallback(context);
    }
  }
};

function buildReviewFallback(context) {
  const topic = context.topic || context.knowledgePoint || "当前内容";

  return [
    "## ReviewAgent 审核摘要",
    "",
    `- 内容应继续围绕「${topic}」展开，避免偏离课程主题。`,
    "- 建议保留定义、方法、例题、易错点和练习闭环。",
    "- 若包含代码，请检查空输入、边界条件、复杂度和内存安全。"
  ].join("\n");
}

module.exports = {
  ReviewAgent
};
