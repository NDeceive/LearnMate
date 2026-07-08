const { ProfileAgent } = require("./profileAgent");
const { PlannerAgent } = require("./plannerAgent");
const { ResourceAgent } = require("./resourceAgent");
const { QuizAgent } = require("./quizAgent");
const { ReviewAgent } = require("./reviewAgent");
const { FeedbackAgent } = require("./feedbackAgent");
const { TutorAgent } = require("./tutorAgent");
const { AssessmentAgent } = require("./assessmentAgent");

const AGENTS = {
  ProfileAgent,
  PlannerAgent,
  ResourceAgent,
  QuizAgent,
  ReviewAgent,
  FeedbackAgent,
  TutorAgent,
  AssessmentAgent
};

module.exports = {
  ProfileAgent,
  PlannerAgent,
  ResourceAgent,
  QuizAgent,
  ReviewAgent,
  FeedbackAgent,
  TutorAgent,
  AssessmentAgent,
  AGENTS
};
