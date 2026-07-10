const { getExerciseById } = require("./codeExerciseService");

async function runCode({ language, sourceCode, stdin, exerciseId } = {}) {
  const normalizedSource = ensureText(sourceCode);

  if (!normalizedSource) {
    return buildErrorResult("源码不能为空。");
  }

  if (!hasMainFunction(normalizedSource)) {
    return buildErrorResult("mock-compile: 未找到 main 函数，请补充 int main() 作为程序入口。");
  }

  if (/printf\s*\(\s*"hello"\s*\)/i.test(normalizedSource)) {
    return buildSuccessResult("hello");
  }

  const exercise = exerciseId ? await getExerciseById(exerciseId) : null;
  const sampleOutput = ensureText(exercise && exercise.sample_output);

  return buildSuccessResult(sampleOutput || "mock runner: 程序已模拟运行完成。");
}

function hasMainFunction(sourceCode) {
  return /\b(?:int|void)\s+main\s*\(/i.test(sourceCode) || /\bmain\s*\(/i.test(sourceCode);
}

function buildSuccessResult(stdout) {
  return {
    status: "success",
    stdout,
    stderr: "",
    compileOutput: "",
    time: "0.01s",
    memory: "mock"
  };
}

function buildErrorResult(message) {
  return {
    status: "error",
    stdout: "",
    stderr: message,
    compileOutput: message,
    time: "0.00s",
    memory: "mock"
  };
}

function ensureText(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}

module.exports = {
  runCode
};
