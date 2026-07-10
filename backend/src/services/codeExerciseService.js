const { pool } = require("../config/db");

async function listExercises({ subject, knowledgePoint, difficulty } = {}) {
  const where = ["exercise_id IS NOT NULL", "exercise_id <> ''"];
  const params = [];

  if (subject) {
    where.push("subject = ?");
    params.push(ensureText(subject));
  }

  if (knowledgePoint) {
    where.push("knowledge_point = ?");
    params.push(ensureText(knowledgePoint));
  }

  if (difficulty) {
    where.push("difficulty = ?");
    params.push(ensureText(difficulty));
  }

  const [rows] = await pool.query(
    `
      SELECT
        id,
        exercise_id,
        subject,
        knowledge_point,
        title,
        description,
        language,
        difficulty,
        starter_code,
        sample_input,
        sample_output,
        explanation,
        tags,
        source,
        created_at,
        updated_at
      FROM code_exercises
      WHERE ${where.join(" AND ")}
      ORDER BY exercise_id ASC
    `,
    params
  );

  return rows.map(toCodeExercise);
}

async function getExerciseById(exerciseId) {
  const [rows] = await pool.query(
    `
      SELECT
        id,
        exercise_id,
        subject,
        knowledge_point,
        title,
        description,
        language,
        difficulty,
        starter_code,
        sample_input,
        sample_output,
        explanation,
        tags,
        source,
        created_at,
        updated_at
      FROM code_exercises
      WHERE exercise_id = ?
      LIMIT 1
    `,
    [ensureText(exerciseId)]
  );

  return rows[0] ? toCodeExercise(rows[0]) : null;
}

async function saveSubmission({
  studentId,
  exerciseId,
  language,
  sourceCode,
  stdin,
  result
} = {}) {
  const normalizedResult = result || {};

  const [insertResult] = await pool.query(
    `
      INSERT INTO code_submissions (
        student_id,
        exercise_id,
        language,
        source_code,
        stdin,
        stdout,
        stderr,
        compile_output,
        status,
        time_used,
        memory_used
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      normalizeStudentId(studentId),
      ensureText(exerciseId),
      ensureText(language || "c"),
      ensureText(sourceCode),
      ensureText(stdin),
      ensureText(normalizedResult.stdout),
      ensureText(normalizedResult.stderr),
      ensureText(normalizedResult.compileOutput),
      ensureText(normalizedResult.status),
      ensureText(normalizedResult.time),
      ensureText(normalizedResult.memory)
    ]
  );

  return {
    id: insertResult.insertId,
    student_id: normalizeStudentId(studentId),
    exercise_id: ensureText(exerciseId),
    status: ensureText(normalizedResult.status)
  };
}

function toCodeExercise(row = {}) {
  return {
    id: row.id,
    exercise_id: ensureText(row.exercise_id),
    subject: ensureText(row.subject),
    knowledge_point: ensureText(row.knowledge_point),
    title: ensureText(row.title),
    description: ensureText(row.description),
    language: ensureText(row.language),
    difficulty: ensureText(row.difficulty),
    starter_code: ensureText(row.starter_code),
    sample_input: ensureText(row.sample_input),
    sample_output: ensureText(row.sample_output),
    explanation: ensureText(row.explanation),
    tags: parseTags(row.tags),
    source: ensureText(row.source),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function parseTags(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value) {
    return [];
  }

  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function normalizeStudentId(studentId) {
  const value = Number(studentId);
  if (!Number.isInteger(value) || value <= 0) throw new Error("studentId 无效");
  return value;
}

function ensureText(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}

module.exports = {
  listExercises,
  getExerciseById,
  saveSubmission
};
