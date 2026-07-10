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

function currentUser(req, res) {
  return res.json({ user: req.user });
}

module.exports = { login, currentUser };
