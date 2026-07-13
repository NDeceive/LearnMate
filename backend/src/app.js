const express = require("express");
const cors = require("cors");

const healthRoutes = require("./routes/health");
const chatRoutes = require("./routes/chat");
const resourceRoutes = require("./routes/resources");
const quizRoutes = require("./routes/quiz");
const openQuestionRoutes = require("./routes/openQuestions");
const wrongQuestionRoutes = require("./routes/wrongQuestions");
const profileRoutes = require("./routes/profile");
const agentLogRoutes = require("./routes/agentLogs");
const codeRoutes = require("./routes/code");
const authRoutes = require("./routes/auth");
const learningPathRoutes = require("./routes/learningPath");
const knowledgeRoutes = require("./routes/knowledge");
const teacherRoutes = require("./routes/teacher");

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.use("/api", healthRoutes);
app.use("/api", authRoutes);
app.use("/api", chatRoutes);
app.use("/api", resourceRoutes);
app.use("/api", quizRoutes);
app.use("/api", openQuestionRoutes);
app.use("/api", wrongQuestionRoutes);
app.use("/api", profileRoutes);
app.use("/api", learningPathRoutes);
app.use("/api", knowledgeRoutes);
app.use("/api", teacherRoutes);
app.use("/api/agent-logs", agentLogRoutes);
app.use("/api/code", codeRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

app.use((err, req, res, next) => {
  console.error("Unhandled backend error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

module.exports = app;
