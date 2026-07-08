const {
  listAgentLogs,
  buildAgentLogSummary
} = require("../services/agentLogService");

async function listAgentLogItems(req, res) {
  try {
    const logs = await listAgentLogs({ limit: req.query.limit });

    return res.json({
      data: logs.map(buildAgentLogSummary)
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || "查询智能体协同记录失败"
    });
  }
}

module.exports = {
  listAgentLogItems
};
