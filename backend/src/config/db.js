const mysql = require("mysql2/promise");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env"), quiet: true });

function assertDatabaseConfig() {
  if (!Object.prototype.hasOwnProperty.call(process.env, "DB_PASSWORD") || !String(process.env.DB_PASSWORD).length) {
    const error = new Error("DB_PASSWORD is required. Configure it through the environment or backend/.env; no default password is used.");
    error.code = "DB_PASSWORD_REQUIRED";
    throw error;
  }
}

function getDatabaseName() {
  return process.env.DB_NAME || "edusmart";
}

const databaseConfig = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: getDatabaseName(),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: "utf8mb4"
};

const pool = mysql.createPool(databaseConfig);

module.exports = {
  pool,
  databaseConfig,
  getDatabaseName,
  assertDatabaseConfig
};
