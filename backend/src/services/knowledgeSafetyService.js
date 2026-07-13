const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i, /system\s*prompt/i,
  /JWT_SECRET|API[_ -]?KEY|password|secret/i, /执行.{0,8}(命令|代码|工具)/i,
  /忽略.{0,12}(指令|规则|要求)/i, /泄露.{0,12}(密钥|提示词|令牌)/i
];
function inspectKnowledgeText(text) {
  const matches = INJECTION_PATTERNS.filter((pattern) => pattern.test(String(text || ""))).map(String);
  return { safe: matches.length === 0, status: matches.length ? "prompt_injection" : "safe", matches };
}
function sanitizeEvidence(text, maxLength = 1800) { return String(text || "").replace(/<\/?(?:script|iframe|object)[^>]*>/gi, "").slice(0, maxLength); }
module.exports = { inspectKnowledgeText, sanitizeEvidence, INJECTION_PATTERNS };
