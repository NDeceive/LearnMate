const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");

async function authenticate(identifier, password) {
  const normalizedIdentifier = String(identifier || "").trim();
  const normalizedPassword = String(password || "");

  if (!normalizedIdentifier || normalizedIdentifier.length > 100 || !normalizedPassword || normalizedPassword.length > 200) {
    const error = new Error("用户名或密码错误");
    error.statusCode = 401;
    throw error;
  }

  const [rows] = await pool.query(
    `SELECT id, student_no, username, display_name, password_hash
       FROM users
      WHERE student_no = ? OR username = ?
      LIMIT 1`,
    [normalizedIdentifier, normalizedIdentifier]
  );
  const user = rows[0];
  const valid = user ? await bcrypt.compare(normalizedPassword, user.password_hash) : false;

  if (!valid) {
    const error = new Error("用户名或密码错误");
    error.statusCode = 401;
    throw error;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    const error = new Error("JWT_SECRET 未配置或长度不足");
    error.statusCode = 503;
    throw error;
  }

  const token = jwt.sign(
    { username: user.username, studentNo: user.student_no },
    secret,
    { subject: String(user.id), expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
  );

  return {
    token,
    user: {
      id: user.id,
      studentId: user.id,
      studentNo: user.student_no,
      username: user.username,
      displayName: user.display_name
    }
  };
}

module.exports = { authenticate };
