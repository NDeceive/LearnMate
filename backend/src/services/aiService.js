const crypto = require("crypto");
const WebSocket = require("ws");

const DEFAULT_TIMEOUT_MS = 20000;

function getSparkConfig() {
  return {
    appId: process.env.SPARK_APP_ID || "",
    apiKey: process.env.SPARK_API_KEY || process.env.AI_API_KEY || "",
    apiSecret: process.env.SPARK_API_SECRET || "",
    apiUrl: process.env.SPARK_API_URL || process.env.AI_API_URL || "",
    model: process.env.SPARK_MODEL || process.env.AI_MODEL || "lite",
    timeoutMs: Number(process.env.SPARK_TIMEOUT_MS || DEFAULT_TIMEOUT_MS)
  };
}

function isWebSocketUrl(url) {
  return /^wss?:\/\//i.test(url);
}

function isAIEnabled() {
  const config = getSparkConfig();

  if (!config.apiUrl) {
    return false;
  }

  if (isWebSocketUrl(config.apiUrl)) {
    return Boolean(config.appId && config.apiKey && config.apiSecret);
  }

  return Boolean(config.apiKey);
}

async function generateText({ messages, prompt, temperature = 0.5, maxTokens = 2048 }) {
  const config = getSparkConfig();

  if (!isAIEnabled()) {
    return null;
  }

  const normalizedMessages = normalizeMessages(messages, prompt);

  if (isWebSocketUrl(config.apiUrl)) {
    return callSparkWebSocket(config, normalizedMessages, { temperature, maxTokens });
  }

  return callSparkHttp(config, normalizedMessages, { temperature, maxTokens });
}

async function generateJson(options) {
  const text = await generateText(options);

  if (!text) {
    return null;
  }

  return parseJsonFromText(text);
}

function normalizeMessages(messages, prompt) {
  if (Array.isArray(messages) && messages.length > 0) {
    return messages.map((item) => ({
      role: item.role || "user",
      content: String(item.content || "")
    }));
  }

  return [{ role: "user", content: String(prompt || "") }];
}

async function callSparkHttp(config, messages, options) {
  if (typeof fetch !== "function") {
    throw new Error("当前 Node.js 版本不支持 fetch，请使用 Node.js 18 或更高版本。");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(config.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        stream: false,
        temperature: options.temperature,
        max_tokens: options.maxTokens
      }),
      signal: controller.signal
    });

    const bodyText = await response.text();

    if (!response.ok) {
      throw new Error(`Spark HTTP ${response.status}: ${bodyText.slice(0, 300)}`);
    }

    const payload = tryParseJson(bodyText);
    return extractSparkContent(payload) || bodyText;
  } finally {
    clearTimeout(timer);
  }
}

function callSparkWebSocket(config, messages, options) {
  return new Promise((resolve, reject) => {
    const authUrl = createSparkAuthUrl(config.apiUrl, config.apiKey, config.apiSecret);
    const ws = new WebSocket(authUrl);
    let answer = "";
    let finished = false;

    const timer = setTimeout(() => {
      finish(new Error("Spark WebSocket request timeout"));
    }, config.timeoutMs);

    function finish(error, value) {
      if (finished) {
        return;
      }

      finished = true;
      clearTimeout(timer);

      try {
        ws.close();
      } catch (closeError) {
        // Ignore close errors after the response has settled.
      }

      if (error) {
        reject(error);
      } else {
        resolve(value);
      }
    }

    ws.on("open", () => {
      ws.send(JSON.stringify(buildSparkWebSocketPayload(config, messages, options)));
    });

    ws.on("message", (raw) => {
      try {
        const payload = JSON.parse(raw.toString());
        const code = payload.header && payload.header.code;

        if (typeof code === "number" && code !== 0) {
          finish(new Error(`Spark WebSocket ${code}: ${payload.header.message || "unknown error"}`));
          return;
        }

        const textItems =
          payload.payload &&
          payload.payload.choices &&
          Array.isArray(payload.payload.choices.text)
            ? payload.payload.choices.text
            : [];

        for (const item of textItems) {
          answer += item.content || "";
        }

        const status =
          (payload.header && payload.header.status) ||
          (payload.payload && payload.payload.choices && payload.payload.choices.status);

        if (status === 2) {
          finish(null, answer);
        }
      } catch (error) {
        finish(error);
      }
    });

    ws.on("error", (error) => finish(error));
  });
}

function createSparkAuthUrl(rawUrl, apiKey, apiSecret) {
  const url = new URL(rawUrl);
  const host = url.host;
  const date = new Date().toUTCString();
  const path = url.pathname || "/";
  const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;
  const signature = crypto
    .createHmac("sha256", apiSecret)
    .update(signatureOrigin)
    .digest("base64");
  const authorizationOrigin =
    `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;

  url.searchParams.set("authorization", Buffer.from(authorizationOrigin).toString("base64"));
  url.searchParams.set("date", date);
  url.searchParams.set("host", host);

  return url.toString();
}

function buildSparkWebSocketPayload(config, messages, options) {
  return {
    header: {
      app_id: config.appId,
      uid: "edusmart-backend"
    },
    parameter: {
      chat: {
        domain: config.model,
        temperature: options.temperature,
        max_tokens: options.maxTokens
      }
    },
    payload: {
      message: {
        text: messages
      }
    }
  };
}

function parseJsonFromText(text) {
  const cleaned = String(text || "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    const arrayStart = cleaned.indexOf("[");
    const objectStart = cleaned.indexOf("{");
    const starts = [arrayStart, objectStart].filter((index) => index >= 0);

    if (starts.length === 0) {
      throw error;
    }

    const start = Math.min(...starts);
    const endChar = cleaned[start] === "[" ? "]" : "}";
    const end = cleaned.lastIndexOf(endChar);

    if (end <= start) {
      throw error;
    }

    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}

function extractSparkContent(payload) {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  if (Array.isArray(payload.choices) && payload.choices[0]) {
    const choice = payload.choices[0];
    return (
      (choice.message && choice.message.content) ||
      (choice.delta && choice.delta.content) ||
      choice.text ||
      ""
    );
  }

  if (payload.payload && payload.payload.choices && Array.isArray(payload.payload.choices.text)) {
    return payload.payload.choices.text.map((item) => item.content || "").join("");
  }

  return payload.content || payload.text || "";
}

module.exports = {
  generateText,
  generateJson,
  isAIEnabled
};
