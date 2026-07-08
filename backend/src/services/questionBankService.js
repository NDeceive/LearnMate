const { pool } = require("../config/db");

function normalizeDifficulty(input) {
  const value = String(input || "").trim().toLowerCase();

  if (["基础", "basic", "easy", "beginner", "elementary"].includes(value)) {
    return "基础";
  }

  if (["提高", "advanced", "medium", "intermediate"].includes(value)) {
    return "提高";
  }

  if (["综合", "hard", "challenge", "challenging"].includes(value)) {
    return "综合";
  }

  if (["冲刺", "sprint", "expert"].includes(value)) {
    return "冲刺";
  }

  return "基础";
}

function normalizeSubject(input) {
  const value = String(input || "").trim();
  const lowered = value.toLowerCase().replace(/\s+/g, "");

  if (["c", "c语言", "c语言程序设计", "clang"].includes(lowered)) {
    return "C 语言程序设计";
  }

  if (["ds", "数据结构", "datastructure", "datastructures"].includes(lowered)) {
    return "数据结构";
  }

  if (["co", "组成原理", "计算机组成", "计算机组成原理", "computerorganization"].includes(lowered)) {
    return "计算机组成原理";
  }

  if (["os", "操作系统", "operatingsystem"].includes(lowered)) {
    return "操作系统";
  }

  if (["cn", "网络", "计算机网络", "computernetwork", "computernetworks"].includes(lowered)) {
    return "计算机网络";
  }

  if (["python", "py"].includes(lowered)) {
    return "Python";
  }

  return value || "数据结构";
}

async function listQuestions({ subject, knowledgePoint, difficulty, limit } = {}) {
  const normalizedSubject = normalizeSubject(subject);
  const normalizedDifficulty = difficulty ? normalizeDifficulty(difficulty) : "";
  const normalizedLimit = normalizeLimit(limit);
  const params = [normalizedSubject];
  const where = ["subject = ?"];

  if (knowledgePoint) {
    where.push("knowledge_point = ?");
    params.push(String(knowledgePoint).trim());
  }

  if (normalizedDifficulty) {
    where.push("difficulty = ?");
    params.push(normalizedDifficulty);
  }

  params.push(normalizedLimit);

  try {
    const [rows] = await pool.query(
      `
        SELECT
          question_id,
          subject,
          chapter,
          knowledge_point,
          question_type,
          difficulty,
          stem,
          code_context,
          option_a,
          option_b,
          option_c,
          option_d,
          answer,
          analysis,
          hint,
          ability_dimension,
          tags,
          stage,
          is_core,
          source
        FROM question_bank
        WHERE ${where.join(" AND ")}
        ORDER BY id ASC
        LIMIT ?
      `,
      params
    );

    return rows.map(normalizeQuestionRow);
  } catch (error) {
    throw createDatabaseError("查询题库失败", error);
  }
}

async function getQuestionById(questionId) {
  if (!questionId) {
    return null;
  }

  try {
    const [rows] = await pool.query(
      `
        SELECT
          question_id,
          subject,
          chapter,
          knowledge_point,
          question_type,
          difficulty,
          stem,
          code_context,
          option_a,
          option_b,
          option_c,
          option_d,
          answer,
          analysis,
          hint,
          ability_dimension,
          tags,
          stage,
          is_core,
          source
        FROM question_bank
        WHERE question_id = ?
        LIMIT 1
      `,
      [String(questionId).trim()]
    );

    return rows[0] ? normalizeQuestionRow(rows[0]) : null;
  } catch (error) {
    throw createDatabaseError("查询题目详情失败", error);
  }
}

function toPublicQuestion(row) {
  return {
    question_id: row.question_id,
    subject: row.subject,
    chapter: row.chapter,
    knowledge_point: row.knowledge_point,
    difficulty: row.difficulty,
    stem: row.stem,
    code_context: row.code_context || "",
    options: [
      { key: "A", content: row.option_a || "" },
      { key: "B", content: row.option_b || "" },
      { key: "C", content: row.option_c || "" },
      { key: "D", content: row.option_d || "" }
    ],
    hint: row.hint || "",
    ability_dimension: row.ability_dimension || "",
    tags: normalizeTags(row.tags)
  };
}

function toFrontendQuestion(row) {
  return {
    id: row.question_id,
    domain: row.subject,
    question: row.stem,
    code: row.code_context || "",
    options: [row.option_a || "", row.option_b || "", row.option_c || "", row.option_d || ""],
    answerIndex: answerToIndex(row.answer),
    explanation: row.analysis || "",
    hint: row.hint || ""
  };
}

function answerToIndex(answer) {
  const normalized = String(answer || "").trim().toUpperCase();
  return Math.max(0, ["A", "B", "C", "D"].indexOf(normalized));
}

function normalizeQuestionRow(row) {
  return {
    ...row,
    tags: normalizeTags(row.tags),
    is_core: Boolean(row.is_core)
  };
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) {
    return tags;
  }

  if (!tags) {
    return [];
  }

  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function normalizeLimit(limit) {
  const value = Number(limit || 5);
  if (!Number.isFinite(value) || value <= 0) {
    return 5;
  }

  return Math.min(Math.floor(value), 50);
}

function createDatabaseError(message, error) {
  const wrapped = new Error(`${message}：${error.message}`);
  wrapped.statusCode = 503;
  wrapped.code = "QUESTION_BANK_DB_ERROR";
  return wrapped;
}

module.exports = {
  listQuestions,
  getQuestionById,
  normalizeDifficulty,
  normalizeSubject,
  toPublicQuestion,
  toFrontendQuestion,
  answerToIndex
};
