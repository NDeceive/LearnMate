const path = require("path");
const { pool } = require("../config/db");
const { initKnowledgeBaseDB } = require("../config/initKnowledgeBaseDB");
const { seedKnowledgePoints } = require("./knowledgePointService");
const { importKnowledgeBase } = require("./knowledgeIngestionService");

const SOURCE_DEFAULTS = {
  "ds-team-complexity": "complexity",
  "ds-team-linear-lists": "array",
  "ds-team-stack-queue": "stack",
  "ds-team-binary-tree": "binary-tree",
  "ds-team-bst": "bst",
  "ds-team-avl": "avl",
  "ds-team-notes-balanced-tree": "red-black-tree",
  "ds-team-heap": "heap",
  "ds-team-graph-representation": "graph",
  "ds-team-graph-traversal": "bfs",
  "ds-team-shortest-mst": "shortest-path",
  "ds-team-search-hash": "hash-table",
  "ds-team-basic-sorts": "insertion-sort",
  "ds-team-advanced-sorts": "quick-sort",
  "ds-team-algorithm-design": "divide-conquer"
};

async function importBundledKnowledgeBase({ db = pool, rootDir } = {}) {
  await initKnowledgeBaseDB(db);
  const raw = require("../../data/knowledge-base/data-structures/catalog.json");
  const catalog = {
    points: raw.points.map(([key, name, description, chapter, difficulty, aliases]) => ({
      key, name, description, chapter, difficulty, aliases
    })),
    relations: raw.relations
  };
  await seedKnowledgePoints(db, catalog);
  const report = await importKnowledgeBase({
    db,
    rootDir: rootDir || path.resolve(__dirname, "../../data/knowledge-base/data-structures")
  });

  await db.query(`INSERT IGNORE INTO knowledge_chunk_links(chunk_id,knowledge_point_id,relevance_score,annotation_source)
    SELECT c.id,kp.id,0.7,'manual' FROM knowledge_chunks c
    JOIN knowledge_documents d ON d.id=c.document_id
    JOIN knowledge_points kp ON kp.subject COLLATE utf8mb4_unicode_ci=c.subject COLLATE utf8mb4_unicode_ci
      AND kp.chapter COLLATE utf8mb4_unicode_ci=d.chapter COLLATE utf8mb4_unicode_ci AND kp.status='active'
    LEFT JOIN knowledge_chunk_links existing ON existing.chunk_id=c.id
    WHERE c.status='active' AND existing.id IS NULL`);

  for (const [sourceKey, pointKey] of Object.entries(SOURCE_DEFAULTS)) {
    await db.query(`INSERT IGNORE INTO knowledge_chunk_links(chunk_id,knowledge_point_id,relevance_score,annotation_source)
      SELECT c.id,kp.id,0.7,'manual' FROM knowledge_chunks c
      JOIN knowledge_sources s ON s.id=c.source_id
      JOIN knowledge_points kp ON kp.point_key=? AND kp.subject='数据结构'
      LEFT JOIN knowledge_chunk_links existing ON existing.chunk_id=c.id
      WHERE s.source_key=? AND c.status='active' AND existing.id IS NULL`, [pointKey, sourceKey]);
  }

  if (report.failed) {
    const error = new Error("Bundled knowledge base import did not complete successfully");
    error.code = "KNOWLEDGE_IMPORT_FAILED";
    error.report = report;
    throw error;
  }
  return report;
}

module.exports = { importBundledKnowledgeBase, SOURCE_DEFAULTS };
