const express = require("express");
const { login, currentUser } = require("../controllers/authController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();
router.post("/auth/login", login);
router.get("/auth/me", authMiddleware, currentUser);

module.exports = router;
