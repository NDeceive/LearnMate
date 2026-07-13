const DEVELOPMENT_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "http://localhost:5700",
  "http://127.0.0.1:5700",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:8081",
  "http://127.0.0.1:8081"
];
const { normalizeNodeEnv } = require("./runtimeConfig");

function configuredOrigins(env = process.env) {
  const configured = String(env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
  if (normalizeNodeEnv(env.NODE_ENV) === "production") return configured;
  return [...new Set([...DEVELOPMENT_ORIGINS, ...configured])];
}

function isOriginAllowed(origin, env = process.env) {
  if (!origin) return true;
  return configuredOrigins(env).includes(String(origin).replace(/\/$/, ""));
}

function createCorsOptions(env = process.env) {
  return {
    origin(origin, callback) {
      if (isOriginAllowed(origin, env)) return callback(null, true);
      const error = new Error("Origin is not allowed by the LearnMate CORS policy");
      error.statusCode = 403;
      error.code = "CORS_ORIGIN_DENIED";
      return callback(error);
    },
    credentials: false,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type", "X-Request-Id", "Idempotency-Key"],
    exposedHeaders: ["X-Request-Id", "Content-Disposition"],
    maxAge: 600,
    optionsSuccessStatus: 204
  };
}

module.exports = { DEVELOPMENT_ORIGINS, configuredOrigins, isOriginAllowed, createCorsOptions };
