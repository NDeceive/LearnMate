const { generateText, isAIEnabled } = require("../aiService");
const { validateReview } = require("../resourceSchema");

async function reviewStructuredResource(content, context) {
  const deterministic = deterministicReview(content, context);
  if (process.env.MULTIMODAL_REVIEW_AI_ENABLED !== "true" || !isAIEnabled()) return validateReview(deterministic);
  try {
    const raw = await generateText({ messages: [{ role: "system", content: "You are ReviewAgent. Return strict JSON only. Never invent resource IDs." }, { role: "user", content: JSON.stringify({ content, deterministicReview: deterministic, context: { subject: context.subject, knowledgePoint: context.knowledgePoint, mastery: context.mastery, stageGoals: context.stageGoals, allowedQuestionIds: context.allowedQuestionIds, allowedCodeExerciseIds: context.allowedCodeExerciseIds } }) }], temperature: 0.1, maxTokens: 2500 });
    if (!raw?.trim().startsWith("{") || !raw.trim().endsWith("}")) return validateReview(deterministic);
    const ai = validateReview(JSON.parse(raw.trim()));
    const issues = dedupeIssues([...deterministic.issues, ...ai.issues]);
    return validateReview(finalizeReview(issues, deterministic.checks, ai.correctedContent, `确定性审核：${deterministic.summary} AI审核：${ai.summary}`));
  } catch {
    return validateReview(deterministic);
  }
}

function deterministicReview(resource, context) {
  const issues = [];
  const checks = [];
  check("课程与知识点匹配", resource.subject === context.subject && resource.knowledgePoint === context.knowledgePoint, "资源上下文必须与当前路径阶段一致", "critical", "relevance", "resource", issues, checks);
  const rationale = (resource.generationRationale || []).join(" ");
  check("包含个性化依据", rationale.includes(String(context.mastery)) && rationale.includes(context.stageTitle), "生成依据应包含掌握度和路径阶段", "high", "relevance", "generationRationale", issues, checks);
  const citations = resource.citations || [];
  check("引用结构有效", citations.length === 0 || citations.every((item) => Number.isInteger(Number(item.chunkId)) && item.sourceKey && item.sourceTitle), citations.length ? `已核验 ${citations.length} 条引用结构` : "当前资源没有外部检索引用，仅保留数据库或路径依据", "low", "citation", "citations", issues, checks, true);
  const referenceCheck = validateReferences(resource, context);
  check("资源ID真实", referenceCheck.passed, referenceCheck.detail, "critical", "resource_reference", "content", issues, checks);
  const complete = structureComplete(resource);
  check("内容结构完整", complete, complete ? "必需章节和字段完整" : "缺少资源类型要求的必需结构", "high", "structure", "content", issues, checks);
  const serialized = JSON.stringify(resource.content);
  check("文本长度合理", serialized.length >= 200 && serialized.length <= 50000, `结构化内容长度 ${serialized.length}`, "medium", "formatting", "content", issues, checks);
  const duplicate = duplicateRatio(resource.content);
  check("无明显重复", duplicate < 0.35, `重复文本比例 ${Math.round(duplicate * 100)}%`, "medium", "duplication", "content", issues, checks);
  check("无安全风险", !/<script|javascript:|https?:\/\/|data:text\/html|vbscript:/i.test(serialized), "未发现 HTML、脚本或 URL 注入", "critical", "safety", "content", issues, checks);
  const difficulty = difficultyMatches(resource, context.mastery);
  check("难度匹配掌握度", difficulty.passed, difficulty.detail, "medium", "difficulty", "content", issues, checks);
  return finalizeReview(issues, checks, null, "已执行课程、个性化、引用、真实ID、结构、长度、重复、安全与难度规则审核。");
}

function validateReferences(resource, context) {
  if (resource.resourceType === "quiz_pack") { const ids = resource.content.questions.map((item) => item.questionId); const invalid = ids.filter((id) => !context.allowedQuestionIds.includes(id)); return { passed: invalid.length === 0, detail: invalid.length ? `无效题目ID：${invalid.join("、")}` : `全部 ${ids.length} 个题目ID来自真实题库` }; }
  if (resource.resourceType === "code_case") { const { verificationStatus, codeExerciseId } = resource.content; if (verificationStatus === "generated") return { passed: codeExerciseId === null, detail: "生成案例未冒用已验证练习ID，且不会形成路径完成证据" }; return { passed: context.allowedCodeExerciseIds.includes(codeExerciseId), detail: `CodeLab练习ID：${codeExerciseId}` }; }
  return { passed: true, detail: "该资源类型未声明题库或CodeLab引用" };
}
function structureComplete(resource) { const c = resource.content || {}; const required = { study_note: ["personalizedObjectives", "foundationSummary", "coreConcepts", "workedExamples", "commonMistakes", "practiceTasks", "studyAdvice", "citationBasis"], mind_map: ["root", "recommendedSequence"], pptx: ["theme", "slides"], quiz_pack: ["difficultyDistribution", "generationBasis", "questions"], code_case: ["caseBackground", "learningObjectives", "starterCode", "tasks", "testCases", "verificationStatus"] }; return required[resource.resourceType].every((key) => c[key] !== undefined && c[key] !== null); }
function difficultyMatches(resource, mastery) { if (resource.resourceType !== "quiz_pack") return { passed: true, detail: `资源难度依据当前掌握度 ${mastery}` }; const d = resource.content.difficultyDistribution; const expected = mastery < 50 ? "foundation" : mastery < 75 ? "intermediate" : "advanced"; const max = Math.max(d.foundation, d.intermediate, d.advanced); return { passed: d[expected] === max || d[expected] >= 2, detail: `掌握度 ${mastery}，目标难度 ${expected}，分布 ${d.foundation}/${d.intermediate}/${d.advanced}` }; }
function duplicateRatio(value) { const texts = []; collectStrings(value, texts); const normalized = texts.map((item) => item.trim()).filter((item) => item.length >= 12); if (normalized.length < 2) return 0; return (normalized.length - new Set(normalized).size) / normalized.length; }
function collectStrings(value, output) { if (typeof value === "string") output.push(value); else if (Array.isArray(value)) value.forEach((item) => collectStrings(item, output)); else if (value && typeof value === "object") Object.values(value).forEach((item) => collectStrings(item, output)); }
function check(name, passed, detail, severity, category, location, issues, checks, informational = false) { checks.push({ name, passed: Boolean(passed), detail }); if (!passed && !informational) issues.push({ severity, category, location, message: detail, suggestedFix: `修复“${name}”后重新审核。` }); }
function finalizeReview(issues, checks, correctedContent, summary) { const weights = { low: 3, medium: 8, high: 18, critical: 35 }; const score = Math.max(0, 100 - issues.reduce((sum, item) => sum + weights[item.severity], 0)); const status = issues.some((item) => item.severity === "critical") || score < 60 ? "rejected" : issues.length || score < 85 ? "needs_revision" : "approved"; return { status, score, issues, correctedContent: correctedContent || null, summary, checks }; }
function dedupeIssues(issues) { const seen = new Set(); return issues.filter((item) => { const key = `${item.category}:${item.location}:${item.message}`; if (seen.has(key)) return false; seen.add(key); return true; }).slice(0, 30); }

module.exports = { reviewStructuredResource, deterministicReview };
