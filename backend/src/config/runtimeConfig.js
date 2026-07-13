const PLACEHOLDER_PATTERN = /^(?:请|change[-_ ]?me|replace[-_ ]?me|example|your[-_ ])/i;
const SUPPORTED_NODE_ENVS = new Set(["development", "test", "production"]);

function isEnabled(value) {
  return String(value || "").trim().toLowerCase() === "true";
}

function isMissingOrPlaceholder(value) {
  const text = String(value || "").trim();
  return !text || PLACEHOLDER_PATTERN.test(text);
}

function positiveInteger(value, fallback, name) {
  const candidate = value === undefined || value === "" ? fallback : Number(value);
  if (!Number.isInteger(candidate) || candidate <= 0) {
    throw configError(`${name} must be a positive integer`);
  }
  return candidate;
}

function normalizeNodeEnv(value = "development") {
  const normalized = String(value || "development").trim().toLowerCase();
  if (!SUPPORTED_NODE_ENVS.has(normalized)) {
    throw configError("NODE_ENV must be development, test, or production");
  }
  return normalized;
}

function validateRuntimeConfig(env = process.env) {
  const nodeEnv = normalizeNodeEnv(env.NODE_ENV);
  const production = nodeEnv === "production";
  const port = positiveInteger(env.PORT, 5800, "PORT");
  const dbPort = positiveInteger(env.DB_PORT, 3306, "DB_PORT");

  if (production && isMissingOrPlaceholder(env.DB_PASSWORD)) {
    throw configError("DB_PASSWORD is required in production and must not be an example value");
  }

  const jwtSecret = String(env.JWT_SECRET || "");
  if (production && (jwtSecret.length < 32 || isMissingOrPlaceholder(jwtSecret))) {
    throw configError("JWT_SECRET must contain at least 32 non-placeholder characters in production");
  }

  const allowedOrigins = String(env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (production && allowedOrigins.includes("*")) {
    throw configError("CORS_ALLOWED_ORIGINS must not contain '*' in production");
  }

  if (production && isEnabled(env.SEED_DEMO_DATA)) {
    const password = String(env.DEMO_PASSWORD || "").trim();
    if (password.length < 12 || isMissingOrPlaceholder(password)) {
      throw configError("A strong DEMO_PASSWORD (at least 12 characters) is required when production demo seeding is enabled");
    }
  }

  return {
    nodeEnv,
    production,
    port,
    dbPort,
    seedDemoData: isEnabled(env.SEED_DEMO_DATA),
    importKnowledgeOnStart: isEnabled(env.KNOWLEDGE_IMPORT_ON_START),
    aiEnabled: isEnabled(env.AI_ENABLED),
    allowedOrigins
  };
}

function configError(message) {
  const error = new Error(message);
  error.code = "INVALID_RUNTIME_CONFIG";
  return error;
}

module.exports = {
  isEnabled,
  isMissingOrPlaceholder,
  normalizeNodeEnv,
  validateRuntimeConfig
};
