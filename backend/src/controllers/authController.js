const { authenticate } = require("../services/authService");

async function login(req, res) {
  try {
    const { identifier, username, password } = req.body || {};
    const result = await authenticate(identifier || username, password);
    return res.json(result);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "登录失败" });
  }
}

async function currentUser(req, res) {
  try {
    const { pool } = require("../config/db");
    const [[user]] = await pool.query(
      "SELECT id, username, student_no, display_name, COALESCE(role, 'STUDENT') AS role FROM users WHERE id = ? LIMIT 1",
      [req.user.userId]
    );
    if (!user) return res.status(401).json({ error: "登录用户不存在", code: "AUTH_INVALID" });
    const role = String(user.role).toUpperCase();
    return res.json({ user: {
      id: Number(user.id), username: user.username, studentNo: user.student_no,
      displayName: user.display_name, role,
      ...(role === "STUDENT" ? { studentId: Number(user.id) } : {}),
      ...(role === "TEACHER" ? { teacherId: Number(user.id) } : {})
    } });
  } catch (error) {
    return res.status(500).json({ error: "读取登录用户失败" });
  }
}

module.exports = { login, currentUser };
