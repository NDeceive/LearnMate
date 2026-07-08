const { isAIEnabled } = require("../services/aiService");

function getHealth(req, res) {
  res.json({
    status: "ok",
    message: "计智引擎后端运行正常",
    aiEnabled: isAIEnabled()
  });
}

module.exports = {
  getHealth
};
