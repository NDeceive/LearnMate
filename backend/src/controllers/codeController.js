const {
  listExercises,
  getExerciseById,
  saveSubmission
} = require("../services/codeExerciseService");
const { runCode: runMockCode } = require("../services/codeRunnerService");
const { logAgentRun } = require("../services/agentLogService");
const { orchestrateTutor } = require("../services/agentOrchestrator");
const { isAIEnabled } = require("../services/aiService");

async function listCodeExercises(req, res) {
  try {
    const exercises = await listExercises({
      subject: req.query.subject,
      knowledgePoint: req.query.knowledge_point || req.query.knowledgePoint,
      difficulty: req.query.difficulty
    });

    return res.json({ data: exercises });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || "查询代码练习失败"
    });
  }
}

async function getCodeExercise(req, res) {
  try {
    const exercise = await getExerciseById(req.params.id);

    if (!exercise) {
      return res.status(404).json({ error: "code exercise not found" });
    }

    return res.json({ data: exercise });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || "查询代码练习详情失败"
    });
  }
}

async function runCode(req, res) {
  const startTime = Date.now();

  try {
    const {
      exerciseId,
      language = "c",
      sourceCode = "",
      stdin = ""
    } = req.body || {};

    const result = await runMockCode({
      exerciseId,
      language,
      sourceCode,
      stdin
    });

    await saveSubmission({
      studentId: getStudentId(req),
      exerciseId,
      language,
      sourceCode,
      stdin,
      result
    });

    await safeLogAgentRun({
      agentName: "CodeRunner",
      taskType: "code_run",
      inputText: {
        exerciseId,
        language,
        stdin,
        sourcePreview: truncate(sourceCode, 240)
      },
      outputText: result,
      status: result.status === "success" ? "success" : "failed",
      durationMs: Date.now() - startTime,
      source: "mock_runner"
    });

    return res.json(result);
  } catch (error) {
    await safeLogAgentRun({
      agentName: "CodeRunner",
      taskType: "code_run",
      inputText: req.body || {},
      outputText: error.message,
      status: "failed",
      durationMs: Date.now() - startTime,
      source: "mock_runner"
    });

    return res.status(error.statusCode || 500).json({
      error: error.message || "代码运行失败"
    });
  }
}

async function explainCodeRun(req, res) {
  const startTime = Date.now();

  try {
    const {
      exerciseId,
      sourceCode = "",
      stdout = "",
      stderr = "",
      compileOutput = ""
    } = req.body || {};

    const exercise = exerciseId ? await getExerciseById(exerciseId) : null;
    const context = {
      message: "请解释代码实验室运行结果。",
      exerciseId,
      exerciseTitle: exercise ? exercise.title : "",
      knowledgePoint: exercise ? exercise.knowledge_point : "",
      sourceCode: truncate(sourceCode, 2000),
      stdout,
      stderr,
      compileOutput
    };

    let explanation = "";
    let logStatus = "success";

    if (isAIEnabled()) {
      try {
        explanation = await orchestrateTutor(
          context,
          [
            "请用中文解释这次代码运行结果。",
            "先判断运行状态，再说明 stdout、stderr、compileOutput 的含义。",
            "如果代码明显只是样例或 mock 输出，请提示学生继续补全核心数据结构逻辑。"
          ].join("\n")
        );
      } catch (error) {
        logStatus = "fallback";
        explanation = buildExplainFallback(context);
      }
    } else {
      logStatus = "fallback";
      explanation = buildExplainFallback(context);
    }

    await safeLogAgentRun({
      agentName: "TutorAgent",
      taskType: "code_explain",
      inputText: context,
      outputText: explanation,
      status: logStatus,
      durationMs: Date.now() - startTime,
      source: "codelab"
    });

    return res.json({ explanation });
  } catch (error) {
    await safeLogAgentRun({
      agentName: "TutorAgent",
      taskType: "code_explain",
      inputText: req.body || {},
      outputText: error.message,
      status: "failed",
      durationMs: Date.now() - startTime,
      source: "codelab"
    });

    return res.status(error.statusCode || 500).json({
      error: error.message || "解释运行结果失败"
    });
  }
}

function buildExplainFallback(context = {}) {
  const hasError = Boolean(ensureText(context.stderr) || ensureText(context.compileOutput));
  const output = ensureText(context.stdout) || "本次没有标准输出。";

  if (hasError) {
    return [
      "本次代码实验室使用的是 mock runner，没有真实编译或执行用户代码。",
      `系统检测到模拟错误信息：${ensureText(context.stderr || context.compileOutput)}`,
      "建议先确认是否包含 main 函数、头文件是否完整，以及核心数据结构函数是否已经补全。"
    ].join("\n");
  }

  return [
    "本次代码实验室使用的是 mock runner，没有真实编译或执行用户代码。",
    `当前模拟标准输出为：${output}`,
    "如果输出与样例一致，说明你可以继续关注顺序表、链表、栈、队列或树遍历等核心逻辑的补全。"
  ].join("\n");
}

async function safeLogAgentRun(payload) {
  try {
    await logAgentRun(payload);
  } catch (error) {
    console.warn("CodeLab agent log failed:", error.message);
  }
}

function getStudentId(req) {
  return req.user && req.user.id ? req.user.id : 1;
}

function truncate(value, maxLength) {
  const text = ensureText(value);
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}...`;
}

function ensureText(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}

module.exports = {
  listCodeExercises,
  getCodeExercise,
  runCode,
  explainCodeRun
};
