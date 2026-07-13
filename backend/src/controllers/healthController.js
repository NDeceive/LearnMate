const { getSystemHealth } = require("../services/healthService");

async function getHealth(req, res, next) {
  try {
    const result = await getSystemHealth();
    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getHealth
};
