require("dotenv").config({ quiet: true });
process.env.JWT_SECRET = "test-only-secret-with-more-than-32-characters";

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../src/app");
const { pool } = require("../src/config/db");

let zhangToken;
let liToken;
const testStartedAt = new Date(Date.now() - 2000);

test("正确账号密码可以登录", async () => {
  const response = await request(app).post("/api/auth/login").send({ identifier: "zhangsan", password: "123456" });
  assert.equal(response.status, 200);
  assert.ok(response.body.token);
  zhangToken = response.body.token;
});

test("错误密码不能登录", async () => {
  const response = await request(app).post("/api/auth/login").send({ identifier: "zhangsan", password: "wrong-password" });
  assert.equal(response.status, 401);
});

test("未认证不能读取画像", async () => {
  const response = await request(app).get("/api/profile/me");
  assert.equal(response.status, 401);
});

test("不同学生读取到隔离的画像数据", async () => {
  const login = await request(app).post("/api/auth/login").send({ identifier: "lisi", password: "123456" });
  liToken = login.body.token;
  const [zhang, li] = await Promise.all([
    request(app).get("/api/profile/me").set("Authorization", `Bearer ${zhangToken}`),
    request(app).get("/api/profile/me").set("Authorization", `Bearer ${liToken}`)
  ]);
  assert.equal(zhang.status, 200);
  assert.equal(li.status, 200);
  assert.ok(zhang.body.profile.knowledgeMastery.some((item) => item.knowledgePoint === "红黑树旋转"));
  assert.equal(li.body.profile.knowledgeMastery.some((item) => item.knowledgePoint === "红黑树旋转"), false);
});

test("画像确认生成持久化版本", async () => {
  const start = await request(app).post("/api/profile/dialogue/start").set("Authorization", `Bearer ${liToken}`).send();
  const confirmedProfile = {
    majorAndGrade: { major: "软件工程", grade: "大二" }, currentCourse: "数据结构",
    priorKnowledge: ["学过 C 语言"], learningGoals: ["通过课程考试"],
    explanationPreference: "图解和代码示例", resourcePreferences: ["代码练习", "讲义"],
    paceAndTimeBudget: { pacePreference: "稳步", weeklyTimeBudgetMinutes: 300 }
  };
  const response = await request(app).post("/api/profile/dialogue/confirm").set("Authorization", `Bearer ${liToken}`).send({ sessionId: start.body.sessionId, confirmedProfile });
  assert.equal(response.status, 200);
  assert.ok(response.body.version >= 1);
  const history = await request(app).get("/api/profile/history").set("Authorization", `Bearer ${liToken}`);
  assert.ok(history.body.data.length >= 1);
});

test("真实测验忽略前端分数并完成画像闭环", async () => {
  const key = `integration-${Date.now()}`;
  const before = await request(app).get("/api/profile/me").set("Authorization", `Bearer ${zhangToken}`);
  const beforeMastery = before.body.profile.knowledgeMastery.find((item) => item.knowledgePoint === "红黑树旋转").mastery;
  const response = await request(app).post("/api/quiz/submit").set("Authorization", `Bearer ${zhangToken}`).send({
    idempotencyKey: key, subject: "数据结构", score: 100,
    answers: [{ questionId: "DS-RBT-ROTATE-001", answer: "B", durationSeconds: 34 }],
    submittedAt: new Date().toISOString()
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.score, 0);
  assert.equal(response.body.masteryChanges[0].before, beforeMastery);
  assert.equal(response.body.masteryChanges[0].after, Math.max(0, beforeMastery - 6));
  assert.equal(response.body.errorAttributions[0].errorType, "procedure_confusion");
  assert.ok(response.body.profileUpdate.currentVersion > response.body.profileUpdate.previousVersion);
  assert.ok(response.body.recommendations.some((item) => item.resourceType === "code_lab"));

  const duplicate = await request(app).post("/api/quiz/submit").set("Authorization", `Bearer ${zhangToken}`).send({
    idempotencyKey: key, subject: "数据结构", answers: [{ questionId: "DS-RBT-ROTATE-001", answer: "B" }]
  });
  assert.equal(duplicate.body.attemptId, response.body.attemptId);
});

test("错题和错误模式已持久化且接口结构稳定", async () => {
  const [wrongRows] = await pool.query("SELECT * FROM wrong_questions w JOIN users u ON u.id=w.student_id WHERE u.username='zhangsan' AND w.question_id='DS-RBT-ROTATE-001'");
  const [patterns] = await pool.query("SELECT * FROM student_error_patterns p JOIN users u ON u.id=p.student_id WHERE u.username='zhangsan' AND p.knowledge_point='红黑树旋转'");
  assert.ok(wrongRows.length >= 1);
  assert.ok(patterns.some((item) => item.error_type === "procedure_confusion"));
});

test("无效题目触发事务回滚，不产生半完成 attempt", async () => {
  const key = `rollback-${Date.now()}`;
  const response = await request(app).post("/api/quiz/submit").set("Authorization", `Bearer ${zhangToken}`).send({
    idempotencyKey: key, answers: [{ questionId: "NOT-EXISTS", answer: "A" }]
  });
  assert.equal(response.status, 400);
  const [rows] = await pool.query("SELECT id FROM quiz_attempts WHERE idempotency_key = ?", [key]);
  assert.equal(rows.length, 0);
});

test.after(async () => {
  const [[zhang]] = await pool.query("SELECT id FROM users WHERE username='zhangsan'");
  const [[li]] = await pool.query("SELECT id FROM users WHERE username='lisi'");
  if (zhang) {
    const [attempts] = await pool.query("SELECT id FROM quiz_attempts WHERE student_id=? AND idempotency_key LIKE 'integration-%'", [zhang.id]);
    const ids = attempts.map((item) => item.id);
    if (ids.length) {
      await pool.query(`DELETE FROM quiz_attempt_answers WHERE attempt_id IN (${ids.map(() => "?").join(",")})`, ids);
      await pool.query(`DELETE FROM student_learning_events WHERE student_id=? AND event_type='quiz_submitted' AND JSON_EXTRACT(payload_json,'$.attemptId') IN (${ids.map(() => "?").join(",")})`, [zhang.id, ...ids]);
    }
    await pool.query("DELETE FROM quiz_attempts WHERE student_id=? AND (idempotency_key LIKE 'integration-%' OR idempotency_key LIKE 'rollback-%')", [zhang.id]);
    await pool.query("DELETE FROM wrong_questions WHERE student_id=? AND question_id='DS-RBT-ROTATE-001'", [zhang.id]);
    await pool.query("DELETE FROM student_error_patterns WHERE student_id=? AND knowledge_point='红黑树旋转'", [zhang.id]);
    await pool.query("UPDATE student_knowledge_mastery SET mastery=45,wrong_count=0,practice_count=0 WHERE student_id=? AND subject='数据结构' AND knowledge_point='红黑树旋转'", [zhang.id]);
    await pool.query("DELETE FROM student_profile_versions WHERE student_id=? AND source_type='quiz_submission' AND created_at>=?", [zhang.id, testStartedAt]);
    const [[latest]] = await pool.query("SELECT COALESCE(MAX(version),0) AS version FROM student_profile_versions WHERE student_id=?", [zhang.id]);
    await pool.query("UPDATE student_profiles SET current_version=? WHERE student_id=?", [latest.version, zhang.id]);
  }
  if (li) {
    await pool.query("DELETE FROM profile_dialogue_messages WHERE session_id IN (SELECT id FROM profile_dialogue_sessions WHERE student_id=? AND created_at>=?)", [li.id, testStartedAt]);
    await pool.query("DELETE FROM profile_dialogue_sessions WHERE student_id=? AND created_at>=?", [li.id, testStartedAt]);
    await pool.query("DELETE FROM student_profile_versions WHERE student_id=? AND source_type='dialogue_confirmation' AND created_at>=?", [li.id, testStartedAt]);
    await pool.query("DELETE FROM student_profiles WHERE student_id=?", [li.id]);
    await pool.query("DELETE FROM student_learning_events WHERE student_id=? AND event_type='profile_confirmed' AND created_at>=?", [li.id, testStartedAt]);
  }
  await pool.end();
});
