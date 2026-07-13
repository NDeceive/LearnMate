const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
const { initDB } = require("../src/config/initDB");
const { pool } = require("../src/config/db");
const { seedCompetitionDemo } = require("../src/services/competitionDemoService");

async function main() {
  if (!await initDB()) throw new Error("Database initialization failed");
  const result = await seedCompetitionDemo();
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => pool.end());
}
module.exports = { main };
