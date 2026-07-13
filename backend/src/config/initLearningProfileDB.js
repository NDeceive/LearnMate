const bcrypt = require("bcryptjs");

async function initLearningProfileDB(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT NOT NULL AUTO_INCREMENT,
      student_no VARCHAR(64) NOT NULL,
      username VARCHAR(100) NOT NULL,
      display_name VARCHAR(100) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'STUDENT',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_users_student_no (student_no),
      UNIQUE KEY uq_users_username (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await ensureLegacyUsersCompatibility(pool);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS student_profiles (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      student_id INT NOT NULL,
      major VARCHAR(120) NULL,
      grade VARCHAR(60) NULL,
      current_course VARCHAR(160) NULL,
      prior_knowledge_json JSON NULL,
      learning_goals_json JSON NULL,
      explanation_preference VARCHAR(255) NULL,
      resource_preferences_json JSON NULL,
      pace_preference VARCHAR(120) NULL,
      weekly_time_budget_minutes INT NULL,
      field_meta_json JSON NULL,
      profile_completeness DECIMAL(5,4) NOT NULL DEFAULT 0,
      current_version INT NOT NULL DEFAULT 0,
      confirmed_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_student_profiles_student (student_id),
      KEY idx_student_profiles_updated (student_id, updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await ensureLegacyProfilesCompatibility(pool);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS student_profile_versions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      student_id INT NOT NULL,
      version INT NOT NULL,
      snapshot_json JSON NOT NULL,
      change_reason VARCHAR(255) NOT NULL,
      evidence_json JSON NULL,
      source_type VARCHAR(60) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_profile_versions_student_version (student_id, version),
      KEY idx_profile_versions_student_created (student_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS profile_dialogue_sessions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      student_id INT NOT NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'collecting',
      round_count INT NOT NULL DEFAULT 0,
      draft_profile_json JSON NULL,
      field_meta_json JSON NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      completed_at TIMESTAMP NULL,
      PRIMARY KEY (id),
      KEY idx_profile_dialogue_student_status (student_id, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS profile_dialogue_messages (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      session_id BIGINT UNSIGNED NOT NULL,
      role VARCHAR(20) NOT NULL,
      content TEXT NOT NULL,
      extracted_fields_json JSON NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_profile_messages_session (session_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS student_learning_events (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      student_id INT NOT NULL,
      event_type VARCHAR(80) NOT NULL,
      subject VARCHAR(120) NULL,
      knowledge_point VARCHAR(160) NULL,
      payload_json JSON NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_learning_events_student_created (student_id, created_at),
      KEY idx_learning_events_student_type (student_id, event_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS student_error_patterns (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      student_id INT NOT NULL,
      subject VARCHAR(120) NOT NULL,
      knowledge_point VARCHAR(160) NOT NULL,
      error_type VARCHAR(80) NOT NULL,
      occurrence_count INT NOT NULL DEFAULT 1,
      confidence DECIMAL(5,4) NOT NULL DEFAULT 0,
      latest_evidence_json JSON NULL,
      first_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_error_patterns_scope (student_id, subject, knowledge_point, error_type),
      KEY idx_error_patterns_student_recent (student_id, last_seen_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      student_id INT NOT NULL,
      idempotency_key VARCHAR(100) NOT NULL,
      subject VARCHAR(120) NULL,
      score INT NOT NULL,
      correct_count INT NOT NULL,
      total_count INT NOT NULL,
      started_at DATETIME NULL,
      submitted_at DATETIME NOT NULL,
      result_json JSON NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_quiz_attempt_student_key (student_id, idempotency_key),
      KEY idx_quiz_attempts_student_created (student_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS quiz_attempt_answers (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      attempt_id BIGINT UNSIGNED NOT NULL,
      question_id VARCHAR(120) NOT NULL,
      selected_answer VARCHAR(20) NOT NULL,
      correct_answer VARCHAR(20) NOT NULL,
      is_correct TINYINT(1) NOT NULL,
      duration_seconds INT NULL,
      error_type VARCHAR(80) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_attempt_answer_question (attempt_id, question_id),
      KEY idx_attempt_answers_attempt (attempt_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await ensureColumn(pool, "question_bank", "option_error_types", "JSON NULL");
  await ensureColumn(pool, "quiz_attempts", "result_json", "JSON NULL");
  await seedDemoUsers(pool);
  await removeLegacyStudentDefaults(pool);
  if (process.env.SEED_DEMO_DATA === "true") await seedRedBlackTreeDemo(pool);
}

async function ensureColumn(pool, table, column, definition) {
  const [columns] = await pool.query(`SHOW COLUMNS FROM \`${table}\` LIKE ?`, [column]);
  if (columns.length === 0) {
    await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  }
}

async function ensureLegacyUsersCompatibility(pool) {
  await ensureColumn(pool, "users", "student_no", "VARCHAR(64) NULL");
  await ensureColumn(pool, "users", "display_name", "VARCHAR(100) NULL");
  await ensureColumn(pool, "users", "password_hash", "VARCHAR(255) NULL");
  await ensureColumn(pool, "users", "role", "VARCHAR(20) NOT NULL DEFAULT 'STUDENT'");
  const [legacyPassword] = await pool.query("SHOW COLUMNS FROM users LIKE 'password'");
  if (legacyPassword.length) await pool.query("ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NULL");
  const [legacyRealName] = await pool.query("SHOW COLUMNS FROM users LIKE 'real_name'");
  if (legacyRealName.length) await pool.query("ALTER TABLE users MODIFY COLUMN real_name VARCHAR(100) NULL");
  await pool.query(`UPDATE users SET student_no = CONCAT('LEGACY-', id) WHERE student_no IS NULL OR student_no = ''`);
  await pool.query(`UPDATE users SET display_name = COALESCE(NULLIF(real_name, ''), username) WHERE display_name IS NULL OR display_name = ''`).catch(async () => {
    await pool.query(`UPDATE users SET display_name = username WHERE display_name IS NULL OR display_name = ''`);
  });
  await ensureNamedIndex(pool, "users", "uq_users_student_no", "ALTER TABLE users ADD UNIQUE KEY uq_users_student_no (student_no)");
}

async function ensureLegacyProfilesCompatibility(pool) {
  const columns = {
    major: "VARCHAR(120) NULL",
    current_course: "VARCHAR(160) NULL",
    prior_knowledge_json: "JSON NULL",
    learning_goals_json: "JSON NULL",
    explanation_preference: "VARCHAR(255) NULL",
    resource_preferences_json: "JSON NULL",
    pace_preference: "VARCHAR(120) NULL",
    weekly_time_budget_minutes: "INT NULL",
    field_meta_json: "JSON NULL",
    profile_completeness: "DECIMAL(5,4) NOT NULL DEFAULT 0",
    current_version: "INT NOT NULL DEFAULT 0",
    confirmed_at: "TIMESTAMP NULL"
  };
  for (const [name, definition] of Object.entries(columns)) await ensureColumn(pool, "student_profiles", name, definition);
  await ensureNamedIndex(pool, "student_profiles", "uq_student_profiles_student", "ALTER TABLE student_profiles ADD UNIQUE KEY uq_student_profiles_student (student_id)");
}

async function ensureNamedIndex(pool, table, name, ddl) {
  const [indexes] = await pool.query(`SHOW INDEX FROM \`${table}\` WHERE Key_name = ?`, [name]);
  if (indexes.length === 0) await pool.query(ddl);
}

async function removeLegacyStudentDefaults(pool) {
  const [owners] = await pool.query("SELECT id FROM users ORDER BY id LIMIT 1");
  for (const table of ["wrong_questions", "student_knowledge_mastery", "code_submissions"]) {
    try {
      if (owners[0]) await pool.query(`UPDATE \`${table}\` SET student_id = ? WHERE student_id IS NULL`, [owners[0].id]);
      await pool.query(`ALTER TABLE \`${table}\` MODIFY COLUMN student_id INT NOT NULL`);
    } catch (error) {
      console.warn(`移除 ${table}.student_id 默认值失败：${error.message}`);
    }
  }
}

async function seedDemoUsers(pool) {
  const password = String(process.env.DEMO_PASSWORD || "").trim();
  if (!password || password.startsWith("请设置")) {
    console.warn("未设置 DEMO_PASSWORD，跳过演示账号初始化。");
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  const users = [
    ["20260001", "zhangsan", "张同学"],
    ["20260002", "lisi", "李同学"],
    ["20260003", "wangwu", "王同学"]
  ];
  for (const [studentNo, username, displayName] of users) {
    await pool.query(
      `INSERT INTO users (student_no, username, display_name, password_hash)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE student_no = VALUES(student_no), display_name = VALUES(display_name), password_hash = VALUES(password_hash)`,
      [studentNo, username, displayName, hash]
    );
  }
}

async function seedRedBlackTreeDemo(pool) {
  await pool.query(
    `INSERT INTO question_bank (
       question_id, subject, chapter, knowledge_point, question_type, difficulty,
       stem, code_context, option_a, option_b, option_c, option_d, answer,
       analysis, hint, ability_dimension, tags, stage, is_core, source, option_error_types
     ) VALUES (?, ?, ?, ?, 'single_choice', '提高', ?, '', ?, ?, ?, ?, 'A', ?, ?, ?, ?, '核心', 1, 'system_seed', ?)
     ON DUPLICATE KEY UPDATE
       stem = VALUES(stem), option_a = VALUES(option_a), option_b = VALUES(option_b),
       option_c = VALUES(option_c), option_d = VALUES(option_d), answer = VALUES(answer),
       analysis = VALUES(analysis), option_error_types = VALUES(option_error_types)`,
    [
      "DS-RBT-ROTATE-001", "数据结构", "树", "红黑树旋转",
      "对红黑树结点 X 做左旋时，旋转后的局部子树根以及 X 的位置分别是什么？",
      "X 的右孩子成为局部根，X 成为该结点的左孩子",
      "X 的左孩子成为局部根，X 成为该结点的右孩子",
      "X 仍是局部根，只交换左右子树",
      "X 的父结点成为局部根，X 成为其右孩子",
      "左旋以 X 的右孩子为支点：右孩子上升为局部根，X 下沉为其左孩子，同时保持二叉搜索树次序。",
      "画出 X、右孩子 Y 和 Y 的左子树 β，跟踪三条父子指针变化。",
      "操作顺序与结构推演",
      JSON.stringify(["红黑树", "旋转", "演示闭环"]),
      JSON.stringify({ B: "procedure_confusion", C: "concept_misunderstanding", D: "procedure_confusion" })
    ]
  );

  const [users] = await pool.query("SELECT id FROM users WHERE username = 'zhangsan' LIMIT 1");
  if (users[0]) {
    const studentId = users[0].id;
    await pool.query(
      `INSERT INTO student_knowledge_mastery
         (student_id, subject, knowledge_point, mastery, wrong_count, practice_count)
       VALUES (?, '数据结构', '红黑树旋转', 45, 0, 0)
       ON DUPLICATE KEY UPDATE mastery = IF(practice_count = 0, 45, mastery)`,
      [studentId]
    );
    const draft = {
      majorAndGrade: { major: "计算机科学与技术", grade: "大二" },
      currentCourse: "数据结构",
      priorKnowledge: ["已学习 C 语言、树与二叉搜索树基础"],
      learningGoals: ["掌握数据结构并通过课程考试"],
      explanationPreference: "图解和代码示例",
      resourcePreferences: ["思维导图", "代码练习", "讲义"],
      paceAndTimeBudget: { pacePreference: "稳步", weeklyTimeBudgetMinutes: 300 }
    };
    const fieldMeta = Object.fromEntries(Object.keys(draft).map((field) => [field, {
      confidence: 1, evidence: "演示账号已确认的初始画像", source: "demo_seed"
    }]));
    await pool.query(
      `INSERT INTO student_profiles
         (student_id, major, grade, current_course, prior_knowledge_json, learning_goals_json,
          explanation_preference, resource_preferences_json, pace_preference,
          weekly_time_budget_minutes, field_meta_json, profile_completeness, current_version, confirmed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE
         major=IF(current_version=0, VALUES(major), major), grade=IF(current_version=0, VALUES(grade), grade),
         current_course=IF(current_version=0, VALUES(current_course), current_course),
         prior_knowledge_json=IF(current_version=0, VALUES(prior_knowledge_json), prior_knowledge_json),
         learning_goals_json=IF(current_version=0, VALUES(learning_goals_json), learning_goals_json),
         explanation_preference=IF(current_version=0, VALUES(explanation_preference), explanation_preference),
         resource_preferences_json=IF(current_version=0, VALUES(resource_preferences_json), resource_preferences_json),
         pace_preference=IF(current_version=0, VALUES(pace_preference), pace_preference),
         weekly_time_budget_minutes=IF(current_version=0, VALUES(weekly_time_budget_minutes), weekly_time_budget_minutes),
         field_meta_json=IF(current_version=0, VALUES(field_meta_json), field_meta_json),
         profile_completeness=IF(current_version=0, 1, profile_completeness),
         current_version=IF(current_version=0, 1, current_version)`,
      [studentId, draft.majorAndGrade.major, draft.majorAndGrade.grade, draft.currentCourse,
        JSON.stringify(draft.priorKnowledge), JSON.stringify(draft.learningGoals), draft.explanationPreference,
        JSON.stringify(draft.resourcePreferences), draft.paceAndTimeBudget.pacePreference,
        draft.paceAndTimeBudget.weeklyTimeBudgetMinutes, JSON.stringify(fieldMeta)]
    );
    await pool.query(
      `INSERT IGNORE INTO student_profile_versions
         (student_id, version, snapshot_json, change_reason, evidence_json, source_type)
       VALUES (?, 1, ?, '演示账号初始画像', ?, 'demo_seed')`,
      [studentId, JSON.stringify({ ...draft, knowledgeMastery: [{ subject: "数据结构", knowledgePoint: "红黑树旋转", mastery: 45 }], errorPatterns: [] }), JSON.stringify(fieldMeta)]
    );
  }
}

module.exports = { initLearningProfileDB, seedRedBlackTreeDemo };
