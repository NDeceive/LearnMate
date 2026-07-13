const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const controller = require("../controllers/studentInsightController");

const router = express.Router();
router.use(authMiddleware);
router.get("/student/overview", controller.overview);
router.get("/student/assessment", controller.assessment);

module.exports = router;
