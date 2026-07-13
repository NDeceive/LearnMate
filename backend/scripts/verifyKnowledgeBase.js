const { pool, assertDatabaseConfig } = require("../src/config/db");
async function count(sql) { const [[row]] = await pool.query(sql); return Number(row.count); }
async function main() {
  assertDatabaseConfig();
  const report = {
    activeSources: await count("SELECT COUNT(*) count FROM knowledge_sources WHERE status='active'"),
    activeChunks: await count("SELECT COUNT(*) count FROM knowledge_chunks WHERE status='active' AND safety_status='safe'"),
    knowledgePoints: await count("SELECT COUNT(*) count FROM knowledge_points WHERE status='active' AND subject='数据结构'"),
    aliases: await count("SELECT COUNT(*) count FROM knowledge_point_aliases"),
    prerequisites: await count("SELECT COUNT(*) count FROM knowledge_point_prerequisites"),
    unlinkedChunks: await count("SELECT COUNT(*) count FROM knowledge_chunks c LEFT JOIN knowledge_chunk_links l ON l.chunk_id=c.id WHERE c.status='active' AND l.id IS NULL"),
    rejectedSources: await count("SELECT COUNT(*) count FROM knowledge_sources WHERE status='rejected' OR quality_grade='Rejected'"),
    promptInjectionChunks: await count("SELECT COUNT(*) count FROM knowledge_chunks WHERE safety_status='prompt_injection'")
  };
  report.minimums = { sources: report.activeSources >= 15, chunks: report.activeChunks >= 150, knowledgePoints: report.knowledgePoints >= 60, aliases: report.aliases >= 80, prerequisites: report.prerequisites >= 30 };
  report.passed = Object.values(report.minimums).every(Boolean);
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exitCode = 1;
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => pool.end());
