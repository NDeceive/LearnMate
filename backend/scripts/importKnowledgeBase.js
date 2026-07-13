const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
const { pool, assertDatabaseConfig } = require("../src/config/db");
const { importBundledKnowledgeBase } = require("../src/services/knowledgeBootstrapService");

async function main() {
  assertDatabaseConfig();
  const report = await importBundledKnowledgeBase();
  console.log(JSON.stringify(report, null, 2));
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}

module.exports = { main };
