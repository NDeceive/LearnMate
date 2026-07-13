const { runChat } = require("../services/agentOrchestrator");
const { generateAgentTaskDescriptions } = require("../services/agentTaskDescriptionService");
const { generateGroundedAnswer } = require("../services/groundedAnswerService");
const { pool } = require("../config/db");

async function handleChat(req, res, next) {
  try {
    const { message, history = [] } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message is required" });
    }

    const grounded = await generateGroundedAnswer(pool, { studentId: req.user.studentId, subject: "数据结构", query: message, knowledgePoint: req.body.knowledgePoint });
    const parts = grounded.status === "grounded" ? [
      { agent:"coordinator",title:"LearnMate 检索协调",content:`已完成知识库检索与确定性引用校验。检索运行 #${grounded.retrievalRunId}` },
      { agent:"TheoryAgent",title:"TutorAgent（基于课程证据）",content:grounded.answer,citations:grounded.citations,confidence:grounded.confidence,coverage:grounded.coverage,retrievalRunId:grounded.retrievalRunId },
      { agent:"CodeAgent",title:"ResourceAgent（证据约束）",content:"本次只呈现知识库能够支持的内容；未从资料中检索到的代码不会补写。" },
      { agent:"ReviewAgent",title:"ReviewAgent（事实与引用审核）",content:`引用覆盖率 ${Math.round(grounded.coverage*100)}%，后端置信度 ${grounded.confidence}。` }
    ] : [
      { agent:"coordinator",title:"LearnMate 检索协调",content:"检索完成，但证据不足。" },
      { agent:"TheoryAgent",title:"TutorAgent（拒绝编造）",content:grounded.answer,citations:[],confidence:"insufficient",coverage:0,retrievalRunId:grounded.retrievalRunId },
      { agent:"CodeAgent",title:"ResourceAgent（未生成）",content:"无足够依据，因此未生成代码或扩展材料。" },
      { agent:"ReviewAgent",title:"ReviewAgent（审核未通过）",content:"缺少可验证引用，拒绝输出确定性结论。" }
    ];
    return res.json({ parts });
  } catch (error) {
    return next(error);
  }
}

async function handleAgentTaskDescriptions(req, res) {
  const { question } = req.body || {};

  if (!question || typeof question !== "string" || !question.trim()) {
    return res.status(400).json({ error: "question is required" });
  }

  const descriptions = await generateAgentTaskDescriptions(question);
  return res.json(descriptions);
}

module.exports = {
  handleChat,
  handleAgentTaskDescriptions
};
