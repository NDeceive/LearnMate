const mysql = require("mysql2/promise");

function getDatabaseName() {
  return process.env.DB_NAME || "edusmart";
}

const databaseConfig = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "123456",
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
  getDatabaseName
};
