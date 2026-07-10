const {
  ProfileAgent,
  PlannerAgent,
  ResourceAgent,
  QuizAgent,
  ReviewAgent,
  FeedbackAgent,
  TutorAgent,
  AssessmentAgent,
  AGENTS
} = require("./agents");
const { getOpenQuestionContext } = require("./openQuestionService");
const { logAgentRun: persistAgentRun } = require("./agentLogService");
const { isAIEnabled } = require("./aiService");

const CHAT_PARTS = [
  {
    agent: "coordinator",
    title: "计智引擎（综合协调）"
  },
  {
    agent: "TheoryAgent",
    title: "TheoryAgent（理论讲解智能体）"
  },
  {
    agent: "CodeAgent",
    title: "CodeAgent（代码示例智能体）"
  },
  {
    agent: "ReviewAgent",
    title: "ReviewAgent（内容审核智能体）"
  }
];

async function runLoggedAgent(agent, taskType, context = {}, prompt = "", options = {}) {
  const startTime = Date.now();
  const agentName = agent && agent.name ? agent.name : options.agentName || "coordinator";

  try {
    const output = await agent.run(context, prompt);
    const durationMs = Date.now() - startTime;

    await persistAgentRun({
      agentName,
      taskType,
      inputText: {
        context,
        prompt
      },
      outputText: output,
      status: inferAgentLogStatus(output, options.status),
      durationMs,
      source: options.source || "agent"
    });

    return output;
  } catch (error) {
    const durationMs = Date.now() - startTime;

    await persistAgentRun({
      agentName,
      taskType,
      inputText: {
        context,
        prompt
      },
      outputText: error.message,
      status: "failed",
      durationMs,
      source: options.source || "agent"
    });

    throw error;
  }
}

function inferAgentLogStatus(output, forcedStatus) {
  if (["success", "fallback", "failed"].includes(forcedStatus)) {
    return forcedStatus;
  }

  if (!isAIEnabled()) {
    return "fallback";
  }

  const text = ensureText(output).toLowerCase();
  return text.includes("fallback") ? "fallback" : "success";
}

async function orchestrateChat({ message, history = [] }) {
  const context = await withOpenQuestionContext(buildProfileContext({ message, history }), { limit: 3 });

  try {
    const profileSummary = await runLoggedAgent(
      ProfileAgent,
      "chat",
      context,
      "请判断学生问题所属课程、知识点和可能薄弱点，输出简明画像摘要。"
    );

    const tutorAnswer = await runLoggedAgent(
      TutorAgent,
      "chat",
      { ...context, profileSummary },
      "请围绕学生问题给出理论讲解，适合放在 TheoryAgent 的 content 字段中。"
    );

    const resourceAnswer = await runLoggedAgent(
      ResourceAgent,
      "chat",
      { ...context, profileSummary, tutorAnswer },
      "请给出一个简洁的代码示例或伪代码示例；如果主题适合 C 语言，请优先使用 C。"
    );

    const codeInfo = extractCodeBlock(resourceAnswer) || buildFallbackCode(message);

    const reviewAnswer = await runLoggedAgent(
      ReviewAgent,
      "chat",
      { ...context, profileSummary, tutorAnswer, resourceAnswer },
      "请审核本次回答，补充易错点、复杂度和边界条件提醒。"
    );

    return normalizeChatParts([
      {
        agent: "coordinator",
        title: CHAT_PARTS[0].title,
        content: [
          "已完成多智能体协同分工：ProfileAgent 识别学习画像，TutorAgent 负责理论讲解，ResourceAgent 组织代码示例，ReviewAgent 做质量审核。",
          "",
          profileSummary
        ].join("\n")
      },
      {
        agent: "TheoryAgent",
        title: CHAT_PARTS[1].title,
        content: tutorAnswer
      },
      {
        agent: "CodeAgent",
        title: CHAT_PARTS[2].title,
        content: summarizeCodeContent(resourceAnswer),
        code: codeInfo.code,
        codeLanguage: codeInfo.language
      },
      {
        agent: "ReviewAgent",
        title: CHAT_PARTS[3].title,
        content: reviewAnswer
      }
    ], message);
  } catch (error) {
    console.warn("orchestrateChat failed, using fallback:", error.message);
    return buildChatFallback(message);
  }
}

async function orchestrateResourceGeneration({ subject, topic, resourceType, difficulty, personalization }) {
  const context = buildProfileContext({ subject, topic, resourceType, difficulty, personalization });

  try {
    const profileSummary = await runLoggedAgent(
      ProfileAgent,
      "resource_generation",
      context,
      "请根据课程、主题和难度分析学习目标、基础要求和可能薄弱点。"
    );

    const resourceContent = await runLoggedAgent(
      ResourceAgent,
      "resource_generation",
      { ...context, profileSummary },
      [
        "请生成 Markdown 学习资料，必须包含以下章节：",
        "# 标题",
        "## 学习目标",
        "## 核心概念",
        "## 公式或方法",
        "## 例题讲解",
        "## 易错点",
        "## 巩固练习",
        "## 学习建议",
        "如果知识点适合代码，例如 C 语言、数据结构、Python，请包含代码示例。"
      ].join("\n")
    );

    const reviewSummary = await runLoggedAgent(
      ReviewAgent,
      "resource_review",
      { ...context, profileSummary, resourceContent },
      "请检查资料是否围绕 subject/topic，难度是否匹配，是否有明显错误，并输出审核摘要。"
    );

    const learningPath = await runLoggedAgent(
      PlannerAgent,
      "path_planning",
      { ...context, profileSummary, resourceContent, reviewSummary },
      "请追加后续学习路径建议，使用 Markdown 小节输出。"
    );

    return [
      ensureRequiredResourceSections(resourceContent, context),
      "",
      reviewSummary.startsWith("##") ? reviewSummary : `## ReviewAgent 审核摘要\n\n${reviewSummary}`,
      "",
      learningPath.startsWith("##") ? learningPath : `## 后续学习路径建议\n\n${learningPath}`
    ].join("\n").trim();
  } catch (error) {
    console.warn("orchestrateResourceGeneration failed, using fallback:", error.message);
    return buildResourceFallback(context);
  }
}

async function orchestrateAdaptiveQuiz({ domain, knowledgePoint, difficulty }) {
  const context = await withOpenQuestionContext(buildProfileContext({ domain, knowledgePoint, difficulty }), { limit: 3 });

  try {
    const quizText = await runLoggedAgent(
      QuizAgent,
      "adaptive_quiz",
      context,
      [
        "请生成一道中文选择题，只输出 JSON 对象，不要使用 Markdown。",
        "字段必须为 id, domain, question, code, options, answerIndex, explanation, hint。",
        "options 必须恰好 4 项，answerIndex 必须是 0 到 3 的整数。"
      ].join("\n")
    );

    const parsed = extractJsonObject(quizText);
    if (parsed) {
      return normalizeQuestion(parsed.question || parsed, context);
    }
  } catch (error) {
    console.warn("orchestrateAdaptiveQuiz failed, using fallback:", error.message);
  }

  return buildQuestionFallback(context);
}

async function generateQuizHint({ question, code, options }) {
  const context = { question, code, options };

  try {
    const hint = await runLoggedAgent(
      QuizAgent,
      "quiz_hint",
      context,
      [
        "请为这道题生成一个中文提示，最多三句话。",
        "不要直接泄露正确选项或答案。",
        "如果题目有代码，请提醒学生关注变量变化、循环条件和返回值。"
      ].join("\n")
    );

    return sanitizeHint(hint, context);
  } catch (error) {
    console.warn("generateQuizHint failed, using fallback:", error.message);
    return buildHintFallback(context);
  }
}

async function orchestrateTutor(context = {}, extraPrompt = "") {
  const enrichedContext = await withOpenQuestionContext(normalizeAgentContext(context), { limit: 3 });
  return runLoggedAgent(TutorAgent, "chat", enrichedContext, extraPrompt || "请进行智能辅导答疑。");
}

async function orchestrateAssessment(context = {}, extraPrompt = "") {
  return runLoggedAgent(AssessmentAgent, "assessment", context, extraPrompt || "请评估学习效果并给出阶段总结。");
}

async function analyzeWrongQuestion(context = {}, extraPrompt = "") {
  const enrichedContext = await withOpenQuestionContext(normalizeAgentContext(context), { limit: 3 });
  const feedback = await runLoggedAgent(
    FeedbackAgent,
    "wrong_question_feedback",
    enrichedContext,
    extraPrompt ||
      [
        "请分析本次错题，必须返回 JSON 对象。",
        "字段：error_reason、feedback_suggestion、recommended_action。",
        "如果 openQuestionCheckpoints 不为空，请优先指出学生漏掉的评分点。"
      ].join("\n")
  );

  return normalizeWrongQuestionFeedback(feedback, enrichedContext);
}

function normalizeWrongQuestionFeedback(feedback, context = {}) {
  const fallback = buildWrongQuestionFeedbackFallback(context);

  if (feedback && typeof feedback === "object" && !Array.isArray(feedback)) {
    return {
      error_reason: ensureText(feedback.error_reason || feedback.errorReason || feedback.reason) || fallback.error_reason,
      feedback_suggestion:
        ensureText(feedback.feedback_suggestion || feedback.feedbackSuggestion || feedback.suggestion) ||
        fallback.feedback_suggestion,
      recommended_action:
        ensureText(feedback.recommended_action || feedback.recommendedAction || feedback.action) ||
        fallback.recommended_action
    };
  }

  const parsed = extractJsonObject(feedback);
  if (parsed) {
    return normalizeWrongQuestionFeedback(parsed, context);
  }

  const text = ensureText(feedback);
  if (text) {
    return {
      error_reason: text,
      feedback_suggestion: fallback.feedback_suggestion,
      recommended_action: fallback.recommended_action
    };
  }

  return fallback;
}

function buildWrongQuestionFeedbackFallback(context = {}) {
  const subject = ensureText(context.subject || context.domain) || "当前科目";
  const topic = ensureText(context.knowledgePoint || context.topic) || "当前知识点";
  const selected = ensureText(context.selectedAnswer || context.selected_answer);
  const correct = ensureText(context.correctAnswer || context.correct_answer);
  const checkpoints = Array.isArray(context.openQuestionCheckpoints)
    ? context.openQuestionCheckpoints.map((item) => ensureText(typeof item === "string" ? item : JSON.stringify(item))).filter(Boolean)
    : [];
  const checkpointText = checkpoints.slice(0, 3).join("；");
  const analysis = ensureText(context.analysis || (context.question && context.question.analysis));
  const basis = checkpointText || analysis || `${topic} 的定义、适用条件和题干关键信息`;

  return {
    error_reason: `本题属于 ${subject} 的 ${topic}。你选择 ${selected || "当前答案"}，正确答案是 ${correct || "标准答案"}；需要重点补齐：${basis}。`,
    feedback_suggestion: checkpointText
      ? `优先对照开放追问题库评分点复盘：${checkpointText}。`
      : `先回顾 ${topic} 的核心概念，再结合本题解析复盘错误选项。`,
    recommended_action: `重做本题，并完成 2 道 ${topic} 同类基础题。`
  };
}

async function generateSimilarQuestions(context = {}, extraPrompt = "") {
  const enrichedContext = await withOpenQuestionContext(normalizeAgentContext(context), { limit: 3 });
  const text = await runLoggedAgent(
    QuizAgent,
    "quiz_generation",
    enrichedContext,
    extraPrompt || "请生成 3 道同类练习题，题目应围绕同一知识点但改变情境或边界条件。"
  );
  const parsed = extractJsonArray(text);
  return parsed.length > 0 ? parsed : [buildQuestionFallback(enrichedContext)];
}

function normalizeAgentContext(context = {}) {
  return {
    ...context,
    ...buildProfileContext(context)
  };
}

async function withOpenQuestionContext(context = {}, { limit = 3 } = {}) {
  const subject = context.subject || context.domain;
  const knowledgePoint = context.knowledgePoint || context.topic;

  if (!subject && !knowledgePoint) {
    return {
      ...context,
      openQuestionContext: [],
      openQuestionCheckpoints: []
    };
  }

  const openQuestionContext = await getOpenQuestionContext({
    subject,
    knowledgePoint,
    limit
  });

  return {
    ...context,
    openQuestionContext,
    openQuestionCheckpoints: openQuestionContext.flatMap((item) => item.checkpoints || [])
  };
}

async function syncProfileFromActivity(context = {}, extraPrompt = "") {
  return runLoggedAgent(
    ProfileAgent,
    "profile_update",
    context,
    extraPrompt || "请根据学习活动更新画像摘要，包括掌握点、薄弱点和下一步建议。"
  );
}

function buildProfileContext(input = {}) {
  const message = ensureText(input.message || input.question);

  return {
    message,
    history: Array.isArray(input.history) ? input.history : [],
    subject: ensureText(input.subject || input.domain || inferSubject(message)),
    domain: ensureText(input.domain || input.subject || inferSubject(message)),
    topic: ensureText(input.topic || input.knowledgePoint || inferTopic(message)),
    knowledgePoint: ensureText(input.knowledgePoint || input.topic || inferTopic(message)),
    resourceType: ensureText(input.resourceType || "LectureNotes"),
    difficulty: ensureText(input.difficulty || "advanced"),
    raw: input
  };
}

function extractJsonArray(text) {
  const sources = getJsonCandidateSources(text);

  for (const source of sources) {
    for (let index = source.indexOf("["); index >= 0; index = source.indexOf("[", index + 1)) {
      const end = findMatchingBracket(source, index, "[", "]");
      if (end < 0) {
        continue;
      }

      try {
        const parsed = JSON.parse(source.slice(index, end + 1));
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (error) {
        // Try the next candidate.
      }
    }
  }

  return [];
}

function logAgentRun(agentName, payload = {}) {
  console.log(`[agent:${agentName}]`, {
    status: payload.status || "planned",
    usedFallback: Boolean(payload.usedFallback)
  });
}

function normalizeChatParts(parts, message) {
  const fallback = buildChatFallback(message);

  return CHAT_PARTS.map((partInfo, index) => {
    const matched =
      parts.find((item) => item && item.agent === partInfo.agent) ||
      parts[index] ||
      {};

    const normalized = {
      agent: partInfo.agent,
      title: partInfo.title,
      content: ensureText(matched.content) || fallback[index].content
    };

    if (partInfo.agent === "CodeAgent") {
      normalized.code = ensureText(matched.code) || fallback[index].code;
      normalized.codeLanguage = ensureText(matched.codeLanguage) || fallback[index].codeLanguage || "c";
    }

    return normalized;
  });
}

function normalizeQuestion(question, context = {}) {
  const fallback = buildQuestionFallback(context);
  const options = Array.isArray(question.options) ? question.options.map(String).slice(0, 4) : [];
  const answerIndex = Number(question.answerIndex);

  if (options.length !== 4 || !Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex > 3) {
    return fallback;
  }

  return {
    id: ensureText(question.id) || fallback.id,
    domain: ensureText(question.domain) || context.domain || context.subject || fallback.domain,
    question: ensureText(question.question) || fallback.question,
    code: ensureText(question.code),
    options,
    answerIndex,
    explanation: ensureText(question.explanation) || fallback.explanation,
    hint: ensureText(question.hint) || fallback.hint
  };
}

function ensureRequiredResourceSections(content, context) {
  const normalized = ensureText(content) || buildResourceFallback(context);
  const requiredSections = [
    "## 学习目标",
    "## 核心概念",
    "## 公式或方法",
    "## 例题讲解",
    "## 易错点",
    "## 巩固练习",
    "## 学习建议"
  ];

  const missing = requiredSections.filter((section) => !normalized.includes(section));
  if (missing.length === 0 && normalized.includes("# ")) {
    return normalized;
  }

  return buildResourceFallback(context);
}

function buildChatFallback(message) {
  const isTree = isTopicMatch(message, ["树", "二叉", "遍历", "traversal"]);

  if (isTree) {
    return [
      {
        agent: "coordinator",
        title: "计智引擎（综合协调）",
        content: "已完成多智能体协同：ProfileAgent 判断该问题属于数据结构中的树与二叉树遍历；TutorAgent 负责讲解遍历顺序；ResourceAgent 提供 C 语言示例；ReviewAgent 补充边界与复杂度。"
      },
      {
        agent: "TheoryAgent",
        title: "TheoryAgent（理论讲解智能体）",
        content: [
          "二叉树遍历的关键是“根节点在什么时候被访问”。",
          "前序遍历：根-左-右，常用于复制树、输出表达式前缀形式。",
          "中序遍历：左-根-右，若对象是二叉搜索树，中序结果会递增。",
          "后序遍历：左-右-根，常用于释放树、计算目录大小或表达式求值。",
          "层序遍历：按深度从上到下访问，通常借助队列。"
        ].join("\n")
      },
      {
        agent: "CodeAgent",
        title: "CodeAgent（代码示例智能体）",
        content: "下面是递归实现。递归出口是 root == NULL，每个节点只会被访问一次。",
        code: buildTreeTraversalCode(),
        codeLanguage: "c"
      },
      {
        agent: "ReviewAgent",
        title: "ReviewAgent（内容审核智能体）",
        content: [
          "复杂度：三种深度优先遍历的时间复杂度都是 O(n)，递归栈空间为 O(h)，h 是树高。",
          "易错点：不要把中序遍历直接等同于有序输出，只有二叉搜索树才满足这个性质。",
          "工程提醒：若树退化成链表，递归深度可能接近 n，可以改用显式栈降低栈溢出风险。"
        ].join("\n")
      }
    ];
  }

  return [
    {
      agent: "coordinator",
      title: "计智引擎（综合协调）",
      content: `已收到问题：“${message}”。当前使用多智能体 fallback 流程，保持前端 parts 返回结构不变。`
    },
    {
      agent: "TheoryAgent",
      title: "TheoryAgent（理论讲解智能体）",
      content: "建议先定位课程领域、核心定义、输入输出关系和约束条件，再从性质、方法、复杂度三个层次展开。"
    },
    {
      agent: "CodeAgent",
      title: "CodeAgent（代码示例智能体）",
      content: "可先写出最小可运行框架，再补充边界条件与异常输入处理。",
      code: [
        "#include <stdio.h>",
        "",
        "int main(void) {",
        "    printf(\"JiZhi Engine fallback demo\\n\");",
        "    return 0;",
        "}"
      ].join("\n"),
      codeLanguage: "c"
    },
    {
      agent: "ReviewAgent",
      title: "ReviewAgent（内容审核智能体）",
      content: "请重点检查：空输入、极端规模、重复元素、内存释放、时间复杂度是否满足题目约束。"
    }
  ];
}

function buildResourceFallback(context) {
  const subject = context.subject || context.domain || "计算机专业课程";
  const topic = context.topic || context.knowledgePoint || "核心知识点";
  const difficulty = context.difficulty || "Advanced";
  const codeSection = shouldIncludeCode(subject, topic)
    ? [
        "",
        "```c",
        "#include <stdio.h>",
        "",
        "typedef struct TreeNode {",
        "    int value;",
        "    struct TreeNode *left;",
        "    struct TreeNode *right;",
        "} TreeNode;",
        "",
        "void preorder(TreeNode *root) {",
        "    if (root == NULL) return;",
        "    printf(\"%d \", root->value);",
        "    preorder(root->left);",
        "    preorder(root->right);",
        "}",
        "```"
      ].join("\n")
    : "";

  return [
    `# ${topic}`,
    "",
    "## 学习目标",
    "",
    `- 理解「${subject}」中「${topic}」的定义、性质和适用场景。`,
    `- 能够完成 ${difficulty} 难度下的概念辨析、例题推导和边界检查。`,
    "",
    "## 核心概念",
    "",
    `${topic} 的学习重点是把抽象定义转化为可推导、可实现、可验证的过程。`,
    "",
    "## 公式或方法",
    "",
    "- 明确输入规模 n。",
    "- 列出关键操作的执行次数。",
    "- 分析时间复杂度、空间复杂度和最坏情况。",
    "",
    "## 例题讲解",
    "",
    `例题：请说明「${topic}」在解题中如何处理边界情况。`,
    "",
    "思路：先构造最小样例，再构造极端样例，观察状态变化是否符合定义。",
    codeSection,
    "",
    "## 易错点",
    "",
    "1. 只记结论，不理解适用条件。",
    "2. 混淆逻辑结构、存储结构和算法过程。",
    "3. 忽略空输入、单元素、退化结构和复杂度上界。",
    "",
    "## 巩固练习",
    "",
    `请用自己的话解释「${topic}」的核心思想，并给出一个反例说明常见误解。`,
    "",
    "## 学习建议",
    "",
    "先画图或列状态表，再写伪代码，最后补充复杂度与边界条件。"
  ].join("\n");
}

function buildQuestionFallback(context = {}) {
  const domain = context.domain || context.subject || "数据结构";
  const point = context.knowledgePoint || context.topic || "树与二叉树";
  const text = `${domain} ${point}`.toLowerCase();

  if (isTopicMatch(text, ["树", "二叉", "遍历"])) {
    return {
      id: "DS_TREE_001",
      domain,
      question: "关于二叉树前序、中序和后序遍历，下列说法哪一项是正确的？",
      code: "",
      options: [
        "前序遍历的访问顺序是根节点、左子树、右子树",
        "中序遍历一定能让任意二叉树输出递增序列",
        "后序遍历的第一个访问节点一定是根节点",
        "层序遍历属于深度优先遍历"
      ],
      answerIndex: 0,
      explanation: "前序遍历定义为根-左-右。中序只有在二叉搜索树上才天然有序；后序最后访问根节点；层序遍历是广度优先遍历。",
      hint: "先抓住根节点的访问时机，再比较三种深度优先遍历。"
    };
  }

  if (isTopicMatch(text, ["组成", "cache", "缓存", "主存", "虚拟存储", "存储系统"])) {
    return {
      id: "CO_CACHE_001",
      domain,
      question: "关于 Cache 与主存之间的关系，下列说法哪一项是正确的？",
      code: "",
      options: [
        "Cache 利用程序访问的局部性原理提升平均访存速度",
        "Cache 容量越大，命中率一定达到 100%",
        "直接映射 Cache 不会发生冲突失效",
        "虚拟存储的页表可以完全替代 Cache"
      ],
      answerIndex: 0,
      explanation: "Cache 的核心依据是时间局部性和空间局部性。容量增大不保证 100% 命中；直接映射会有冲突失效；页表解决地址转换，不替代 Cache。",
      hint: "回忆局部性原理，再区分 Cache、主存和虚拟存储各自解决的问题。"
    };
  }

  if (isTopicMatch(text, ["操作系统", "进程", "线程", "调度", "死锁"])) {
    return {
      id: "OS_SCHED_001",
      domain,
      question: "关于进程调度算法，下列说法哪一项是正确的？",
      code: "",
      options: [
        "时间片轮转算法通常适合分时系统，能够改善交互响应",
        "先来先服务算法一定能获得最短平均等待时间",
        "短作业优先算法不会造成长作业饥饿",
        "优先级调度不需要考虑优先级反转问题"
      ],
      answerIndex: 0,
      explanation: "时间片轮转通过周期性切换让交互任务较快获得响应。FCFS 不保证最短平均等待时间；SJF 可能导致长作业饥饿；优先级调度需要处理优先级反转。",
      hint: "关注每种调度算法最想优化的指标，以及它可能牺牲的公平性。"
    };
  }

  if (isTopicMatch(text, ["网络", "tcp", "可靠传输", "拥塞", "连接"])) {
    return {
      id: "NET_TCP_001",
      domain,
      question: "关于 TCP 可靠传输机制，下列说法哪一项是正确的？",
      code: "",
      options: [
        "TCP 通过序号、确认、重传和滑动窗口等机制实现可靠传输",
        "TCP 三次握手只用于提高传输速率",
        "拥塞控制只发生在接收端缓存不足时",
        "UDP 和 TCP 都保证数据按序可靠到达"
      ],
      answerIndex: 0,
      explanation: "TCP 可靠性来自序号、ACK、超时/快速重传、滑动窗口等机制。三次握手用于建立连接并同步序号；拥塞控制关注网络负载；UDP 不保证可靠有序。",
      hint: "把可靠传输、连接建立、流量控制和拥塞控制分开看。"
    };
  }

  if (isTopicMatch(text, ["python", "列表", "字典", "函数", "list", "dict"])) {
    return {
      id: "PY_LIST_001",
      domain,
      question: "关于 Python 列表和字典，下列说法哪一项是正确的？",
      code: "items = [1, 2, 3]\nlookup = {'a': 1, 'b': 2}",
      options: [
        "列表适合按位置访问元素，字典适合按键查找值",
        "列表和字典的键都必须是不可变对象",
        "字典会自动按值从小到大排序",
        "列表 append 操作会返回修改后的新列表"
      ],
      answerIndex: 0,
      explanation: "列表是有序序列，常按下标访问；字典是键值映射，适合按键查找。字典的键需可哈希，列表没有键；字典不按值自动排序；append 原地修改并返回 None。",
      hint: "先区分序列和映射，再关注操作是原地修改还是返回新对象。"
    };
  }

  return {
    id: "CS_GENERAL_001",
    domain,
    question: `关于「${point}」的学习方法，下列哪一项最合理？`,
    code: "",
    options: [
      "先明确定义和约束，再结合例题分析复杂度与边界条件",
      "只记住最终结论，不需要理解适用场景",
      "所有问题都可以用同一种数据结构解决",
      "只要代码能运行，就不需要分析复杂度"
    ],
    answerIndex: 0,
    explanation: "计算机专业课程的学习需要同时关注定义、约束、实现和复杂度。只背结论或忽略复杂度都会导致迁移能力不足。",
    hint: "优先选择同时覆盖定义、条件、实现和复杂度的选项。"
  };
}

function buildHintFallback({ question, code, options }) {
  const questionText = String(question || "");

  if (code) {
    return "提示：先沿着代码执行顺序手动跟踪变量变化，再检查循环条件、递归出口或返回值；不要直接从选项猜答案。";
  }

  if (isTopicMatch(questionText, ["遍历", "前序", "中序", "后序", "二叉树"])) {
    return "提示：把注意力放在根节点的访问时机上，前序、中序、后序的区别就是根节点分别出现在访问序列的不同位置。";
  }

  if (Array.isArray(options) && options.length > 0) {
    return "提示：先排除描述过于绝对或混淆概念的选项，再回到题干中的限制条件判断。";
  }

  return "提示：先回到概念定义，再判断题干中的限制条件是否改变了常规结论。";
}

function sanitizeHint(hint, context) {
  const text = ensureText(hint);
  if (!text || text.includes("QuizAgent fallback")) {
    return buildHintFallback(context);
  }

  const answerPatterns = [
    /正确答案\s*(是|为)?\s*[A-D]/i,
    /答案\s*(是|为)?\s*[A-D]/i,
    /选\s*[A-D]/i,
    /answer\s*(is|:)?\s*[A-D]/i
  ];

  if (answerPatterns.some((pattern) => pattern.test(text))) {
    return buildHintFallback(context);
  }

  return text;
}

function extractJsonObject(text) {
  const sources = getJsonCandidateSources(text);

  for (const source of sources) {
    for (let index = source.indexOf("{"); index >= 0; index = source.indexOf("{", index + 1)) {
      const end = findMatchingBracket(source, index, "{", "}");
      if (end < 0) {
        continue;
      }

      try {
        const parsed = JSON.parse(source.slice(index, end + 1));
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed;
        }
      } catch (error) {
        // Try the next candidate.
      }
    }
  }

  return null;
}

function getJsonCandidateSources(text) {
  const raw = String(text || "");
  const sources = [];
  const fencePattern = /```(?:json)?\s*([\s\S]*?)```/gi;
  let match = fencePattern.exec(raw);

  while (match) {
    sources.push(match[1].trim());
    match = fencePattern.exec(raw);
  }

  sources.push(
    raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim()
  );

  return sources.filter(Boolean);
}

function findMatchingBracket(text, start, openChar, closeChar) {
  let depth = 0;
  let inString = false;
  let quote = "";
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        inString = false;
      }
      continue;
    }

    if (char === "\"" || char === "'") {
      inString = true;
      quote = char;
      continue;
    }

    if (char === openChar) {
      depth += 1;
    } else if (char === closeChar) {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function extractCodeBlock(text) {
  const content = String(text || "");
  const match = content.match(/```([a-zA-Z0-9+#-]*)\s*([\s\S]*?)```/);

  if (!match) {
    return null;
  }

  return {
    language: normalizeCodeLanguage(match[1]),
    code: match[2].trim()
  };
}

function summarizeCodeContent(text) {
  const content = ensureText(text);
  if (!content) {
    return "ResourceAgent 已准备代码示例。";
  }

  return content.replace(/```[\s\S]*?```/g, "").trim() || "ResourceAgent 已准备代码示例，重点关注边界条件和复杂度。";
}

function buildFallbackCode(message) {
  if (isTopicMatch(message, ["树", "二叉", "遍历", "traversal"])) {
    return {
      language: "c",
      code: buildTreeTraversalCode()
    };
  }

  return {
    language: "c",
    code: [
      "#include <stdio.h>",
      "",
      "int main(void) {",
      "    printf(\"JiZhi Engine fallback demo\\n\");",
      "    return 0;",
      "}"
    ].join("\n")
  };
}

function buildTreeTraversalCode() {
  return [
    "#include <stdio.h>",
    "",
    "typedef struct TreeNode {",
    "    int value;",
    "    struct TreeNode *left;",
    "    struct TreeNode *right;",
    "} TreeNode;",
    "",
    "void preorder(TreeNode *root) {",
    "    if (root == NULL) return;",
    "    printf(\"%d \", root->value);",
    "    preorder(root->left);",
    "    preorder(root->right);",
    "}",
    "",
    "void inorder(TreeNode *root) {",
    "    if (root == NULL) return;",
    "    inorder(root->left);",
    "    printf(\"%d \", root->value);",
    "    inorder(root->right);",
    "}",
    "",
    "void postorder(TreeNode *root) {",
    "    if (root == NULL) return;",
    "    postorder(root->left);",
    "    postorder(root->right);",
    "    printf(\"%d \", root->value);",
    "}"
  ].join("\n");
}

function normalizeCodeLanguage(language) {
  const normalized = String(language || "c").trim().toLowerCase();

  if (["c", "cpp", "c++", "python", "py", "java", "javascript", "js"].includes(normalized)) {
    return normalized === "c++" ? "cpp" : normalized === "py" ? "python" : normalized === "js" ? "javascript" : normalized;
  }

  return "c";
}

function inferSubject(text) {
  if (isTopicMatch(text, ["树", "二叉", "链表", "栈", "队列", "图", "算法"])) {
    return "数据结构";
  }
  if (isTopicMatch(text, ["进程", "线程", "调度", "死锁", "内存管理"])) {
    return "操作系统";
  }
  if (isTopicMatch(text, ["cache", "缓存", "主存", "流水线", "组成"])) {
    return "计算机组成原理";
  }
  if (isTopicMatch(text, ["tcp", "ip", "拥塞", "网络", "可靠传输"])) {
    return "计算机网络";
  }
  if (isTopicMatch(text, ["python", "列表", "字典", "函数"])) {
    return "Python";
  }
  return "计算机专业课程";
}

function inferTopic(text) {
  if (isTopicMatch(text, ["前序", "中序", "后序", "二叉", "树"])) {
    return "树与二叉树";
  }
  if (isTopicMatch(text, ["cache", "缓存", "主存"])) {
    return "存储系统";
  }
  if (isTopicMatch(text, ["进程", "调度"])) {
    return "进程调度";
  }
  if (isTopicMatch(text, ["tcp", "连接", "拥塞"])) {
    return "TCP 可靠传输";
  }
  if (isTopicMatch(text, ["python", "列表", "字典"])) {
    return "Python 容器";
  }
  return "综合知识点";
}

function shouldIncludeCode(subject, topic) {
  return isTopicMatch(`${subject} ${topic}`, ["c", "python", "数据结构", "算法", "树", "二叉树", "链表", "栈", "队列", "图", "遍历", "代码"]);
}

function isTopicMatch(text, keywords) {
  const source = String(text || "").toLowerCase();
  return keywords.some((keyword) => source.includes(String(keyword).toLowerCase()));
}

function ensureText(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}

const runChat = orchestrateChat;
const runResourceGeneration = orchestrateResourceGeneration;
const runQuestionGeneration = orchestrateAdaptiveQuiz;
const runQuizHint = generateQuizHint;

module.exports = {
  AGENTS,
  orchestrateChat,
  orchestrateResourceGeneration,
  orchestrateAdaptiveQuiz,
  generateQuizHint,
  orchestrateTutor,
  orchestrateAssessment,
  analyzeWrongQuestion,
  generateSimilarQuestions,
  syncProfileFromActivity,
  buildProfileContext,
  extractJsonArray,
  logAgentRun,
  runChat,
  runResourceGeneration,
  runQuestionGeneration,
  runQuizHint
};
