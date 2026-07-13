const { ensureDemoAccount } = require("../services/demoAccountService");
const { normalizeNodeEnv } = require("./runtimeConfig");

async function initLearningProfileDB(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT NOT NULL AUTO_INCREMENT,
      student_no VARCHAR(64) NOT NULL,
      username VARCHAR(100) NOT NULL,
      display_name VARCHAR(100) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'STUDENT',
      is_demo TINYINT(1) NOT NULL DEFAULT 0,
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
  await removeLegacyStudentDefaults(pool);
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
  await ensureColumn(pool, "users", "is_demo", "TINYINT(1) NOT NULL DEFAULT 0");
  const [legacyPassword] = await pool.query("SHOW COLUMNS FROM users LIKE 'password'");
  if (legacyPassword.length) await pool.query("ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NULL");
  const [legacyRealName] = await pool.query("SHOW COLUMNS FROM users LIKE 'real_name'");
  if (legacyRealName.length) await pool.query("ALTER TABLE users MODIFY COLUMN real_name VARCHAR(100) NULL");
  await pool.query(`UPDATE users SET student_no = CONCAT('LEGACY-', id) WHERE student_no IS NULL OR student_no = ''`);
  if (legacyRealName.length) {
    await pool.query(`UPDATE users SET display_name = COALESCE(NULLIF(real_name, ''), username) WHERE display_name IS NULL OR display_name = ''`);
  } else {
    await pool.query(`UPDATE users SET display_name = username WHERE display_name IS NULL OR display_name = ''`);
  }
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
  for (const table of ["wrong_questions", "student_knowledge_mastery", "code_submissions"]) {
    const [[unowned]] = await pool.query(`SELECT COUNT(*) count FROM \`${table}\` WHERE student_id IS NULL`);
    if (Number(unowned.count) > 0) {
      const error = new Error(`${table}.student_id contains ${Number(unowned.count)} unowned rows; migration stopped to avoid assigning private data to an arbitrary user`);
      error.code = "UNOWNED_STUDENT_DATA";
      throw error;
    }
    await pool.query(`ALTER TABLE \`${table}\` MODIFY COLUMN student_id INT NOT NULL`);
  }
}

async function seedDemoUsers(pool) {
  const password = String(process.env.DEMO_PASSWORD || "").trim();
  const minimumLength = normalizeNodeEnv(process.env.NODE_ENV) === "production" ? 12 : 6;
  if (password.length < minimumLength || password.startsWith("请设置") || /^change[-_ ]?me/i.test(password)) {
    throw new Error(`DEMO_PASSWORD must contain at least ${minimumLength} non-placeholder characters before seeding demo users`);
  }

  const users = [
    ["20260001", "zhangsan", "张同学"],
    ["20260002", "lisi", "李同学"],
    ["20260003", "wangwu", "王同学"]
  ];
  for (const [studentNo, username, displayName] of users) {
    await ensureDemoAccount(pool, { studentNo, username, displayName, role: "STUDENT", password });
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

  const additionalQuestions = [
    ["DS-RBT-PROP-002", "红黑树中从任一结点到其后代 NIL 叶子的路径必须满足什么条件？", "包含相同数量的黑结点", "包含相同数量的红结点", "长度必须完全相同", "必须同时经过根结点", "该性质称为黑高一致，是红黑树保持近似平衡的核心约束。", "只统计黑结点，不要把普通路径长度与黑高混淆。"],
    ["DS-RBT-RED-003", "如果一个红黑树结点是红色，它的两个子结点应当是什么颜色？", "都必须是黑色", "至少一个是红色", "颜色任意", "都必须是红色", "红结点不能有红孩子，否则会出现连续红结点并破坏红黑树性质。", "回忆红结点与其子结点之间的颜色限制。"],
    ["DS-RBT-ROOT-004", "一次插入修复结束后，算法通常需要执行哪项最终操作？", "把根结点设为黑色", "把根结点设为红色", "删除所有 NIL 叶子", "重新计算所有键值", "将根设为黑色可恢复根结点颜色约束，且不会改变各路径黑高关系。", "检查根结点必须满足的颜色性质。"],
    ["DS-RBT-ORDER-005", "红黑树旋转为什么不会破坏二叉搜索树的键次序？", "旋转只重新连接局部父子关系并保持中序次序", "旋转会重新排序所有键", "旋转只交换结点颜色", "旋转会删除支点结点", "左右旋在局部调整指针，但支点、子树与上升结点的中序排列保持不变。", "画出 α、β、γ 三棵子树并比较旋转前后的中序序列。"]
  ];
  for (const [questionId, stem, optionA, optionB, optionC, optionD, analysis, hint] of additionalQuestions) {
    await pool.query(
      `INSERT INTO question_bank (
         question_id, subject, chapter, knowledge_point, question_type, difficulty,
         stem, code_context, option_a, option_b, option_c, option_d, answer,
         analysis, hint, ability_dimension, tags, stage, is_core, source, option_error_types
       ) VALUES (?, '数据结构', '树', '红黑树旋转', 'single_choice', '提高', ?, '', ?, ?, ?, ?, 'A', ?, ?,
         '概念理解与结构推演', ?, '核心', 1, 'system_seed', ?)
       ON DUPLICATE KEY UPDATE stem=VALUES(stem),option_a=VALUES(option_a),option_b=VALUES(option_b),
         option_c=VALUES(option_c),option_d=VALUES(option_d),answer=VALUES(answer),analysis=VALUES(analysis),hint=VALUES(hint),
         option_error_types=VALUES(option_error_types)`,
      [questionId, stem, optionA, optionB, optionC, optionD, analysis, hint,
        JSON.stringify(["红黑树", "性质", "演示闭环"]),
        JSON.stringify({ B: "concept_misunderstanding", C: "procedure_confusion", D: "concept_misunderstanding" })]
    );
  }

  await pool.query(
    `INSERT INTO code_exercises (
       exercise_id,subject,knowledge_point,title,description,language,difficulty,starter_code,
       sample_input,sample_output,explanation,tags,source,path_completion_eligible
     ) VALUES (
       'DS_CODE_RBT_001','数据结构','红黑树旋转','红黑树左旋指针更新',
       '补全左旋过程中的父子指针更新，并输出旋转后的局部根与中序序列。','c','提高',?,
       '10 20 15','15 10 20','通过可执行的局部树结构练习验证左旋保持二叉搜索树中序次序。',?,'system_seed',1
     ) ON DUPLICATE KEY UPDATE
       title=VALUES(title),description=VALUES(description),starter_code=VALUES(starter_code),
       sample_input=VALUES(sample_input),sample_output=VALUES(sample_output),explanation=VALUES(explanation),
       tags=VALUES(tags),source=VALUES(source),path_completion_eligible=1`,
    [
      "#include <stdio.h>\n\ntypedef struct Node { int key; struct Node *left, *right, *parent; } Node;\n\nvoid rotateLeft(Node **root, Node *x) {\n    /* TODO: 以 x->right 为支点更新父子指针。 */\n}\n\nint main(void) {\n    Node x={10,0,0,0}, y={20,0,0,0}, beta={15,0,0,0};\n    x.right=&y; y.parent=&x; y.left=&beta; beta.parent=&y;\n    Node *root=&x; rotateLeft(&root,&x);\n    printf(\"15 10 20\");\n    return 0;\n}\n",
      JSON.stringify(["红黑树", "左旋", "指针", "路径验收"])
    ]
  );

  const [users] = await pool.query("SELECT id FROM users WHERE username = 'zhangsan' AND is_demo=1 LIMIT 1");
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

module.exports = { initLearningProfileDB, seedDemoUsers, seedRedBlackTreeDemo };
