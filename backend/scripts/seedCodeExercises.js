const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env"), quiet: true });

const { pool } = require("../src/config/db");
const { initDB } = require("../src/config/initDB");

const codeExercisePath = path.resolve(
  __dirname,
  "../data/code-exercises/base_code_exercises.json"
);

async function main() {
  const dbReady = await initDB();
  if (!dbReady) {
    console.error("代码练习导入终止：数据库连接或初始化失败。");
    process.exitCode = 1;
    return;
  }

  const exercises = readCodeExerciseJson(codeExercisePath);
  const existingIds = await loadExistingExerciseIds();
  const stats = {
    total: exercises.length,
    inserted: 0,
    updated: 0,
    failed: 0
  };

  for (const exercise of exercises) {
    try {
      validateExercise(exercise);
      await upsertExercise(exercise);

      if (existingIds.has(exercise.exercise_id)) {
        stats.updated += 1;
      } else {
        stats.inserted += 1;
        existingIds.add(exercise.exercise_id);
      }
    } catch (error) {
      stats.failed += 1;
      console.error(`代码练习导入失败：${exercise && exercise.exercise_id ? exercise.exercise_id : "未知题号"}，${error.message}`);
    }
  }

  console.log(`读取代码练习数量：${stats.total}`);
  console.log(`新增数量：${stats.inserted}`);
  console.log(`更新数量：${stats.updated}`);
  console.log(`失败数量：${stats.failed}`);

  if (stats.failed > 0) {
    process.exitCode = 1;
  }
}

function readCodeExerciseJson(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(content);

    if (!Array.isArray(parsed)) {
      throw new Error("JSON 顶层必须是数组。");
    }

    return parsed;
  } catch (error) {
    console.error(`代码练习 JSON 读取或解析失败：${filePath}`);
    console.error(`错误：${error.message}`);
    process.exit(1);
  }
}

async function loadExistingExerciseIds() {
  try {
    const [rows] = await pool.query("SELECT exercise_id FROM code_exercises");
    return new Set(rows.map((row) => row.exercise_id));
  } catch (error) {
    console.error(`读取已有代码练习题号失败，请检查数据库连接：${error.message}`);
    process.exit(1);
  }
}

function validateExercise(exercise) {
  const requiredFields = [
    "exercise_id",
    "subject",
    "knowledge_point",
    "title",
    "description",
    "language",
    "difficulty",
    "starter_code",
    "sample_output",
    "explanation"
  ];

  for (const field of requiredFields) {
    if (!exercise[field]) {
      throw new Error(`缺少必填字段 ${field}`);
    }
  }

  if (!["基础", "提高", "综合"].includes(exercise.difficulty)) {
    throw new Error("difficulty 必须是：基础 / 提高 / 综合");
  }

  if (String(exercise.language).toLowerCase() !== "c") {
    throw new Error("language 当前必须是 c");
  }

  if (!Array.isArray(exercise.tags)) {
    throw new Error("tags 必须是数组");
  }
}

async function upsertExercise(exercise) {
  const values = [
    exercise.exercise_id,
    exercise.subject,
    exercise.knowledge_point || "",
    exercise.title,
    exercise.description || "",
    String(exercise.language || "c").toLowerCase(),
    exercise.difficulty || "基础",
    exercise.starter_code || "",
    exercise.sample_input || "",
    exercise.sample_output || "",
    exercise.explanation || "",
    JSON.stringify(exercise.tags || []),
    exercise.source || "system_seed"
  ];

  await pool.query(
    `
      INSERT INTO code_exercises (
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
        source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        subject = VALUES(subject),
        knowledge_point = VALUES(knowledge_point),
        title = VALUES(title),
        description = VALUES(description),
        language = VALUES(language),
        difficulty = VALUES(difficulty),
        starter_code = VALUES(starter_code),
        sample_input = VALUES(sample_input),
        sample_output = VALUES(sample_output),
        explanation = VALUES(explanation),
        tags = VALUES(tags),
        source = VALUES(source)
    `,
    values
  );
}

main()
  .catch((error) => {
    console.error(`代码练习导入失败：${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
