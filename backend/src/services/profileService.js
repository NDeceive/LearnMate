const { pool } = require("../config/db");

async function updateMasteryAfterAnswer({ studentId, subject, knowledgePoint, isCorrect }) {
  const normalizedStudentId = normalizeStudentId(studentId);
  const normalizedSubject = ensureProfileText(subject, "未分类科目");
  const normalizedKnowledgePoint = ensureProfileText(knowledgePoint, "综合知识点");
  const correct = Boolean(isCorrect);
  const initialMastery = correct ? 75 : 60;
  const initialWrongCount = correct ? 0 : 1;

  await pool.query(
    `
      INSERT INTO student_knowledge_mastery (
        student_id,
        subject,
        knowledge_point,
        mastery,
        wrong_count,
        practice_count
      )
      VALUES (?, ?, ?, ?, ?, 1)
      ON DUPLICATE KEY UPDATE
        mastery = CASE
          WHEN ? THEN LEAST(100, mastery + 3)
          ELSE GREATEST(0, mastery - 6)
        END,
        wrong_count = wrong_count + ?,
        practice_count = practice_count + 1,
        last_updated = CURRENT_TIMESTAMP
    `,
    [
      normalizedStudentId,
      normalizedSubject,
      normalizedKnowledgePoint,
      initialMastery,
      initialWrongCount,
      correct,
      correct ? 0 : 1
    ]
  );

  const [rows] = await pool.query(
    `
      SELECT
        subject,
        knowledge_point,
        mastery,
        wrong_count,
        practice_count,
        last_updated
      FROM student_knowledge_mastery
      WHERE student_id = ? AND subject = ? AND knowledge_point = ?
      LIMIT 1
    `,
    [normalizedStudentId, normalizedSubject, normalizedKnowledgePoint]
  );

  return rows[0] || null;
}

async function listKnowledgeMastery({ studentId, subject } = {}) {
  const where = ["student_id = ?", "subject <> ''", "knowledge_point <> ''"];
  const params = [normalizeStudentId(studentId)];

  if (subject) {
    where.push("subject = ?");
    params.push(String(subject).trim());
  }

  const [rows] = await pool.query(
    `
      SELECT
        subject,
        knowledge_point,
        mastery,
        wrong_count,
        practice_count,
        last_updated
      FROM student_knowledge_mastery
      WHERE ${where.join(" AND ")}
      ORDER BY subject ASC, mastery ASC, wrong_count DESC, last_updated DESC
    `,
    params
  );

  return rows;
}

async function getWeakPoints({ studentId, limit } = {}) {
  const [rows] = await pool.query(
    `
      SELECT
        subject,
        knowledge_point,
        mastery,
        wrong_count,
        practice_count,
        last_updated
      FROM student_knowledge_mastery
      WHERE student_id = ? AND subject <> '' AND knowledge_point <> ''
      ORDER BY wrong_count DESC, mastery ASC, last_updated DESC
      LIMIT ?
    `,
    [normalizeStudentId(studentId), normalizeLimit(limit)]
  );

  return rows;
}

function normalizeStudentId(studentId) {
  const value = Number(studentId);
  if (!Number.isInteger(value) || value <= 0) throw new Error("studentId 无效");
  return value;
}

function normalizeLimit(limit) {
  const value = Number(limit || 5);
  if (!Number.isFinite(value) || value <= 0) {
    return 5;
  }

  return Math.min(Math.floor(value), 50);
}

function ensureProfileText(value, fallback) {
  const text = String(value || "").trim();
  return text || fallback;
}

module.exports = {
  updateMasteryAfterAnswer,
  listKnowledgeMastery,
  getWeakPoints
};
