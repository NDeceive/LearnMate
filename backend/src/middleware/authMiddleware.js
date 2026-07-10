const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  const header = String(req.headers.authorization || "");
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const secret = process.env.JWT_SECRET;

  if (!token) {
    return res.status(401).json({ error: "请先登录", code: "AUTH_REQUIRED" });
  }

  if (!secret || secret.length < 16) {
    return res.status(503).json({ error: "认证服务尚未配置", code: "AUTH_NOT_CONFIGURED" });
  }

  try {
    const payload = jwt.verify(token, secret);
    req.user = {
      id: Number(payload.sub),
      studentId: Number(payload.sub),
      username: payload.username,
      studentNo: payload.studentNo
    };
    return next();
  } catch (error) {
    return res.status(401).json({ error: "登录状态已失效", code: "AUTH_INVALID" });
  }
}

module.exports = { authMiddleware };
