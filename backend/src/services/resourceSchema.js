const crypto = require("crypto");

const RESOURCE_TYPES = new Set(["study_note", "mind_map", "pptx", "quiz_pack", "code_case"]);
const NODE_TYPES = new Set(["root", "concept", "condition", "step", "example", "warning", "misconception", "formula", "code", "summary"]);
const IMPORTANCE = new Set(["high", "medium", "low"]);
const SLIDE_TYPES = new Set(["title", "objectives", "concept", "process", "comparison", "misconception", "misconceptions", "example", "code", "quiz", "summary", "next_steps"]);
const REVIEW_STATUS = new Set(["approved", "needs_revision", "rejected"]);
const SEVERITIES = new Set(["low", "medium", "high", "critical"]);
const CATEGORIES = new Set(["factuality", "relevance", "structure", "clarity", "difficulty", "safety", "citation", "duplication", "formatting", "resource_reference"]);
const DIFFICULTIES = new Set(["foundation", "intermediate", "advanced"]);

function validateResourceEnvelope(value, context) {
  object(value, "resource");
  whitelist(value, ["resourceType", "title", "subject", "knowledgePoint", "learningObjectives", "targetLearnerSummary", "estimatedMinutes", "generationRationale", "content", "retrievalRunId", "citations"], "resource");
  if (!RESOURCE_TYPES.has(value.resourceType)) fail("unsupported resourceType");
  if (value.resourceType !== context.resourceType || value.subject !== context.subject || value.knowledgePoint !== context.knowledgePoint) fail("resource context mismatch");
  text(value.title, 255); text(value.subject, 120); text(value.knowledgePoint, 160);
  strings(value.learningObjectives, 1, 8, 240); text(value.targetLearnerSummary, 500);
  integer(value.estimatedMinutes, 5, 240); strings(value.generationRationale, 1, 8, 300);
  const validators = {
    study_note: () => validateStudyNote(value.content),
    mind_map: () => validateMindMap(value.content),
    pptx: () => validatePptx(value.content, new Set(context.allowedQuestionIds || [])),
    quiz_pack: () => validateQuizPack(value.content, new Set(context.allowedQuestionIds || [])),
    code_case: () => validateCodeCase(value.content, new Set(context.allowedCodeExerciseIds || []))
  };
  const content = validators[value.resourceType]();
  if (value.retrievalRunId !== undefined) integer(value.retrievalRunId, 1, Number.MAX_SAFE_INTEGER);
  if (value.citations !== undefined) validateCitationCatalog(value.citations);
  return { ...value, content };
}

function validateStudyNote(value) {
  object(value, "studyNote");
  whitelist(value, ["personalizedObjectives", "foundationSummary", "coreConcepts", "diagrams", "methodsAndFormulas", "workedExamples", "commonMistakes", "practiceTasks", "studyAdvice", "citationBasis"], "studyNote");
  strings(value.personalizedObjectives, 1, 8, 240); text(value.foundationSummary, 800);
  structuredItems(value.coreConcepts, 1, 12, "coreConcept", ["title", "explanation", "importance"], (item) => { text(item.title, 120); text(item.explanation, 900); if (!IMPORTANCE.has(item.importance)) fail("invalid importance"); });
  structuredItems(value.diagrams, 1, 8, "diagram", ["title", "description", "steps"], (item) => { text(item.title, 120); text(item.description, 700); strings(item.steps, 1, 10, 300); });
  structuredItems(value.methodsAndFormulas, 1, 10, "method", ["title", "expression", "explanation", "conditions"], (item) => { text(item.title, 120); text(item.expression, 300); text(item.explanation, 700); strings(item.conditions, 0, 8, 240); });
  structuredItems(value.workedExamples, 1, 8, "workedExample", ["question", "steps", "answer"], (item) => { text(item.question, 600); strings(item.steps, 1, 12, 500); text(item.answer, 600); });
  structuredItems(value.commonMistakes, 1, 10, "commonMistake", ["mistake", "reason", "correction"], (item) => { text(item.mistake, 400); text(item.reason, 500); text(item.correction, 500); });
  structuredItems(value.practiceTasks, 1, 10, "practiceTask", ["prompt", "hint", "answerGuide"], (item) => { text(item.prompt, 500); text(item.hint, 400); text(item.answerGuide, 600); });
  strings(value.studyAdvice, 1, 8, 300); strings(value.citationBasis, 1, 8, 300);
  return value;
}

function validateMindMap(value) {
  object(value, "mindMap"); whitelist(value, ["root", "crossLinks", "highlightNodeIds", "misconceptionNodeIds", "recommendedSequence"], "mindMap");
  const ids = new Set(); let count = 0;
  function visit(node, depth, ancestors) {
    object(node, "node"); whitelist(node, ["id", "label", "description", "nodeType", "importance", "children", "citations"], "node");
    const id = identifier(node.id); if (ids.has(id)) fail(`duplicate node id: ${id}`); if (ancestors.has(node)) fail("cyclic mind map object");
    ids.add(id); count += 1; if (depth > 6) fail("mind map depth exceeds 6");
    text(node.label, 120); text(node.description || "", 500, true);
    if (!NODE_TYPES.has(node.nodeType)) fail("invalid nodeType"); if (!IMPORTANCE.has(node.importance)) fail("invalid importance");
    if (!Array.isArray(node.children)) fail("children must be an array"); if (node.citations !== undefined) citationIds(node.citations);
    const next = new Set(ancestors); next.add(node); node.children.forEach((child) => visit(child, depth + 1, next));
  }
  visit(value.root, 1, new Set()); if (value.root.nodeType !== "root") fail("root nodeType required"); if (count < 8 || count > 40) fail("mind map must contain 8 to 40 nodes");
  const crossLinks = array(value.crossLinks, 0, 40).map((link) => { object(link, "crossLink"); whitelist(link, ["sourceId", "targetId", "label"], "crossLink"); if (!ids.has(link.sourceId) || !ids.has(link.targetId) || link.sourceId === link.targetId) fail("invalid crossLink"); text(link.label, 120); return link; });
  for (const field of ["highlightNodeIds", "misconceptionNodeIds", "recommendedSequence"]) strings(value[field], 0, 40, 80).forEach((id) => { if (!ids.has(id)) fail(`${field} contains unknown node`); });
  return { ...value, crossLinks };
}

function validatePptx(value, allowedQuestionIds) {
  object(value, "pptx"); whitelist(value, ["theme", "slides", "references"], "pptx"); object(value.theme, "theme"); whitelist(value.theme, ["name", "primaryTone", "density"], "theme"); text(value.theme.name, 60); text(value.theme.primaryTone, 30); text(value.theme.density, 30);
  const slides = array(value.slides, 6, 15).map((slide, index) => validateSlide(slide, index, allowedQuestionIds));
  const types = new Set(slides.map((s) => s.slideType));
  for (const required of ["title", "objectives", "concept", "summary"]) if (!types.has(required)) fail(`missing ${required} slide`);
  if (!types.has("misconception") && !types.has("misconceptions")) fail("missing misconception slide");
  if (value.references !== undefined) array(value.references, 0, 20).forEach((reference) => { object(reference, "reference"); whitelist(reference, ["sourceKey", "title", "chapter", "section", "version", "license"], "reference"); Object.values(reference).forEach((item) => text(item || "", 500, true)); });
  return { theme: value.theme, slides, references: value.references || [] };
}

function validateSlide(slide, index, allowedQuestionIds) {
  object(slide, `slide[${index}]`); const allowed = ["slideType", "title", "subtitle", "speakerNotes", "bullets", "body", "steps", "left", "right", "items", "language", "code", "explanation", "questionIds", "nextSteps", "citations"];
  whitelist(slide, allowed, `slide[${index}]`); if (!SLIDE_TYPES.has(slide.slideType)) fail("invalid slideType"); text(slide.title, 160); text(slide.subtitle || "", 240, true); text(slide.speakerNotes || "", 1000, true); text(slide.body || "", 1200, true); text(slide.code || "", 2500, true); text(slide.explanation || "", 800, true);
  for (const field of ["bullets", "nextSteps", "questionIds"]) if (slide[field] !== undefined) strings(slide[field], 0, 12, 300);
  if (slide.questionIds) slide.questionIds.forEach((id) => { if (!allowedQuestionIds.has(id)) fail(`invalid questionId: ${id}`); }); if (slide.citations !== undefined) citationIds(slide.citations);
  if (slide.steps !== undefined) structuredItems(slide.steps, 0, 12, "step", ["title", "description"], (step) => { text(step.title, 160); text(step.description, 500); });
  if (slide.items !== undefined) array(slide.items, 0, 12).forEach((item) => { if (typeof item === "string") text(item, 300); else { object(item, "item"); whitelist(item, ["mistake", "correction", "title", "description"], "item"); Object.values(item).forEach((v) => text(v, 500)); } });
  for (const field of ["left", "right"]) if (slide[field] !== undefined) { object(slide[field], field); whitelist(slide[field], ["title", "items"], field); text(slide[field].title, 160); strings(slide[field].items, 0, 12, 300); }
  return slide;
}

function validateQuizPack(value, allowedQuestionIds) {
  object(value, "quizPack"); whitelist(value, ["title", "difficultyDistribution", "generationBasis", "questions", "evidenceStatus"], "quizPack");
  text(value.title, 200); object(value.difficultyDistribution, "difficultyDistribution"); whitelist(value.difficultyDistribution, ["foundation", "intermediate", "advanced"], "difficultyDistribution");
  let total = 0; for (const key of DIFFICULTIES) total += integer(value.difficultyDistribution[key], 0, 10); if (total < 5 || total > 10) fail("difficulty distribution must total 5 to 10");
  strings(value.generationBasis, 1, 8, 300); if (value.evidenceStatus !== "sufficient") fail("quiz evidence is insufficient");
  const seen = new Set();
  const questions = array(value.questions, 5, 10).map((question, index) => {
    object(question, `question[${index}]`); whitelist(question, ["questionId", "questionType", "stem", "options", "scoringPoints", "correctAnswer", "analysis", "personalizedHint", "knowledgePoints", "difficulty"], `question[${index}]`);
    const id = text(question.questionId, 120); if (!allowedQuestionIds.has(id)) fail(`invalid questionId: ${id}`); if (seen.has(id)) fail(`duplicate questionId: ${id}`); seen.add(id);
    text(question.questionType, 60); text(question.stem, 1200); if (!DIFFICULTIES.has(question.difficulty)) fail("invalid difficulty");
    const options = strings(question.options, 0, 4, 600); const points = strings(question.scoringPoints, 0, 8, 300); if (options.length !== 4 && points.length === 0) fail("question requires four options or scoring points");
    text(question.correctAnswer, 500); text(question.analysis, 1200); text(question.personalizedHint, 500); strings(question.knowledgePoints, 1, 5, 120);
    return { ...question, options, scoringPoints: points };
  });
  return { ...value, questions };
}

function validateCodeCase(value, allowedExerciseIds) {
  object(value, "codeCase"); whitelist(value, ["caseBackground", "learningObjectives", "language", "starterCode", "tasks", "inputDescription", "outputDescription", "testCases", "boundaryConditions", "aiExplanation", "commonErrors", "advancedChallenges", "verificationStatus", "codeExerciseId"], "codeCase");
  text(value.caseBackground, 1000); strings(value.learningObjectives, 1, 8, 240); text(value.language, 50); codeText(value.starterCode, 5000); strings(value.tasks, 1, 10, 500); text(value.inputDescription, 800); text(value.outputDescription, 800);
  structuredItems(value.testCases, 1, 12, "testCase", ["input", "expectedOutput", "description"], (item) => { text(item.input || "", 1000, true); text(item.expectedOutput || "", 1000, true); text(item.description, 500); });
  strings(value.boundaryConditions, 1, 10, 400); text(value.aiExplanation, 1600); strings(value.commonErrors, 1, 10, 500); strings(value.advancedChallenges, 1, 8, 500);
  if (!new Set(["verified", "generated"]).has(value.verificationStatus)) fail("invalid verificationStatus");
  if (value.verificationStatus === "verified") { const id = text(value.codeExerciseId, 120); if (!allowedExerciseIds.has(id)) fail(`invalid codeExerciseId: ${id}`); }
  else if (value.codeExerciseId !== null) fail("generated code must not claim an exercise ID");
  return value;
}

function validateReview(value) {
  object(value, "review"); whitelist(value, ["status", "score", "issues", "correctedContent", "summary", "checks"], "review"); if (!REVIEW_STATUS.has(value.status)) fail("invalid review status"); integer(value.score, 0, 100); text(value.summary, 600);
  const issues = array(value.issues, 0, 30).map((issue) => { object(issue, "issue"); whitelist(issue, ["severity", "category", "location", "message", "suggestedFix"], "issue"); if (!SEVERITIES.has(issue.severity) || !CATEGORIES.has(issue.category)) fail("invalid review issue"); text(issue.location, 160); text(issue.message, 500); text(issue.suggestedFix, 500); return issue; });
  if (value.checks !== undefined) structuredItems(value.checks, 1, 20, "check", ["name", "passed", "detail"], (check) => { text(check.name, 100); if (typeof check.passed !== "boolean") fail("invalid check result"); text(check.detail, 400); });
  if (value.correctedContent !== null && value.correctedContent !== undefined) object(value.correctedContent, "correctedContent"); return { ...value, issues, checks: value.checks || [] };
}

function fingerprint(value) { return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
function citationIds(value) { return array(value, 0, 8).map((id) => integer(id, 1, Number.MAX_SAFE_INTEGER)); }
function validateCitationCatalog(value) { return array(value, 0, 8).map((citation) => { object(citation, "citation"); whitelist(citation, ["label", "chunkId", "sourceKey", "sourceTitle", "chapter", "section", "license", "version", "excerpt", "supportScore"], "citation"); text(citation.label, 20); integer(citation.chunkId, 1, Number.MAX_SAFE_INTEGER); for (const field of ["sourceKey", "sourceTitle", "chapter", "section", "license", "version", "excerpt"]) text(citation[field] || "", field === "excerpt" ? 500 : 255, true); if (citation.supportScore !== undefined && (!Number.isFinite(Number(citation.supportScore)) || Number(citation.supportScore) < 0 || Number(citation.supportScore) > 1)) fail("invalid citation supportScore"); return citation; }); }
function structuredItems(value, min, max, name, fields, validate) { return array(value, min, max).map((item) => { object(item, name); whitelist(item, fields, name); validate(item); return item; }); }
function object(v, p) { if (!v || typeof v !== "object" || Array.isArray(v)) fail(`${p} must be object`); }
function array(v, min, max) { if (!Array.isArray(v) || v.length < min || v.length > max) fail("invalid array length"); return v; }
function whitelist(v, allowed, p) { const set = new Set(allowed); const unknown = Object.keys(v).filter((k) => !set.has(k)); if (unknown.length) fail(`${p} unknown fields: ${unknown.join(",")}`); }
function text(v, max, empty = false) { if (typeof v !== "string" || (!empty && !v.trim()) || v.length > max) fail("invalid text"); if (/<\/?[a-z][^>]*>|javascript:|data:text\/html|https?:\/\/|vbscript:/i.test(v)) fail("unsafe HTML or URL"); return v.trim(); }
function codeText(v, max) { if (typeof v !== "string" || !v.trim() || v.length > max) fail("invalid code text"); if (/<\/?(?:html|body|img|a|div|span|style|form|input|video|audio|link|meta|script|iframe|object|embed|svg)\b|\bon\w+\s*=|javascript:|data:text\/html|https?:\/\/|vbscript:/i.test(v)) fail("unsafe code content"); return v; }
function strings(v, min, max, len) { return array(v, min, max).map((x) => text(x, len)); }
function integer(v, min, max) { if (!Number.isInteger(Number(v)) || Number(v) < min || Number(v) > max) fail("invalid integer"); return Number(v); }
function identifier(v) { const s = text(v, 80); if (!/^[A-Za-z0-9_-]+$/.test(s)) fail("invalid identifier"); return s; }
function fail(message) { const e = new Error(message); e.statusCode = 422; e.code = "INVALID_RESOURCE"; throw e; }

module.exports = { RESOURCE_TYPES, validateResourceEnvelope, validateStudyNote, validateMindMap, validatePptx, validateQuizPack, validateCodeCase, validateReview, fingerprint };
