const crypto = require("crypto");
const fs = require("fs/promises");
const packageJson = require("../../package.json");
const { pool } = require("../config/db");
const resourceStorage = require("./resourceStorageService");
const reportStorage = require("./teacherReportStorageService");

async function checkDatabase(db = pool) {
  await db.query("SELECT 1 AS healthy");
  return "ok";
}

async function checkWritableDirectory(directory, fileSystem = fs) {
  await fileSystem.mkdir(directory, { recursive: true });
  const probe = require("path").join(directory, `.health-${process.pid}-${crypto.randomUUID()}`);
  const renamedProbe = `${probe}.renamed`;
  let completed = false;
  try {
    await fileSystem.writeFile(probe, "ok", { flag: "wx" });
    await fileSystem.rename(probe, renamedProbe);
    await fileSystem.rm(renamedProbe);
    completed = true;
  } finally {
    if (!completed) {
      await Promise.allSettled([
        fileSystem.rm(probe, { force: true }),
        fileSystem.rm(renamedProbe, { force: true })
      ]);
    }
  }
  return "ok";
}

async function checkStorage({
  roots = [resourceStorage.STORAGE_ROOT, reportStorage.STORAGE_ROOT],
  fileSystem = fs
} = {}) {
  await Promise.all(roots.map((root) => checkWritableDirectory(root, fileSystem)));
  return "ok";
}

function createHealthChecker({
  databaseCheck = () => checkDatabase(),
  storageCheck = () => checkStorage(),
  version = packageJson.version
} = {}) {
  return async function healthCheck() {
    const result = {
      status: "ok",
      database: "ok",
      storage: "ok",
      version,
      timestamp: new Date().toISOString()
    };
    const [database, storage] = await Promise.allSettled([databaseCheck(), storageCheck()]);
    if (database.status === "rejected") result.database = "error";
    if (storage.status === "rejected") result.storage = "error";
    if (result.database !== "ok" || result.storage !== "ok") result.status = "unavailable";
    return { statusCode: result.status === "ok" ? 200 : 503, body: result };
  };
}

const getSystemHealth = createHealthChecker();

module.exports = {
  checkDatabase,
  checkWritableDirectory,
  checkStorage,
  createHealthChecker,
  getSystemHealth
};
