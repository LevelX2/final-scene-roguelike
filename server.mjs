import http from "node:http";
import path from "node:path";
import { promises as fs, readFileSync } from "node:fs";
import { injectTestModeBootstrap } from "./server-test-mode.mjs";

const ROOT_DIR = process.cwd();
const DEFAULT_PORT = 4173;

const MIME_TYPES = {
  ".aac": "audio/aac",
  ".css": "text/css; charset=utf-8",
  ".flac": "audio/flac",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".opus": "audio/ogg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wav": "audio/wav",
  ".webp": "image/webp",
};

const AUDIO_CONTENT_TYPES = {
  aac: "audio/aac",
  flac: "audio/flac",
  mp3: "audio/mpeg",
  opus: "audio/ogg",
  wav: "audio/wav",
  pcm: "application/octet-stream",
};

const ttsCache = new Map();

loadEnvFile(ROOT_DIR);

const OPENAI_TTS_MODEL = process.env.OPENAI_TTS_MODEL ?? "gpt-4o-mini-tts";
const OPENAI_TTS_VOICE = process.env.OPENAI_TTS_VOICE ?? "cedar";
const OPENAI_TTS_RESPONSE_FORMAT = process.env.OPENAI_TTS_RESPONSE_FORMAT ?? "mp3";
const TEST_MODE_ENABLED = process.env.DUNGEON_ROGUE_TEST_MODE === "1";
const OPENAI_TTS_INSTRUCTIONS = process.env.OPENAI_TTS_INSTRUCTIONS
  ?? "Sprich auf Deutsch, cineastisch, ruhig, bedeutungsvoll und leicht geheimnisvoll. Klinge wie eine stilvolle Trailer-Stimme, aber natürlich und nicht übertrieben.";

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);

    if (url.pathname === "/api/tts") {
      await handleTtsRequest(request, response);
      return;
    }

    if (url.pathname === "/api/tts/status") {
      writeJson(response, 200, {
        available: Boolean(process.env.OPENAI_API_KEY),
        provider: process.env.OPENAI_API_KEY ? "openai" : "browser-fallback",
        model: OPENAI_TTS_MODEL,
        voice: OPENAI_TTS_VOICE,
        responseFormat: OPENAI_TTS_RESPONSE_FORMAT,
      });
      return;
    }

    await handleStaticRequest(url.pathname, response);
  } catch (error) {
    writeJson(response, 500, {
      error: "server_error",
      message: error instanceof Error ? error.message : "Unbekannter Serverfehler.",
    });
  }
});

server.listen(readPort(), () => {
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : DEFAULT_PORT;
  console.log(`The Final Scene server listening on http://127.0.0.1:${port}`);
});

function readPort() {
  const portArgIndex = process.argv.findIndex((entry) => entry === "--port");
  if (portArgIndex >= 0) {
    const requestedPort = Number(process.argv[portArgIndex + 1]);
    if (Number.isInteger(requestedPort) && requestedPort > 0) {
      return requestedPort;
    }
  }

  const envPort = Number(process.env.PORT);
  return Number.isInteger(envPort) && envPort > 0 ? envPort : DEFAULT_PORT;
}

function loadEnvFile(rootDir) {
  const envPath = path.join(rootDir, ".env");
  let contents = "";

  try {
    contents = readFileSync(envPath, "utf8");
  } catch {
    return;
  }

  contents.split(/\r?\n/u).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

async function handleStaticRequest(pathname, response) {
  const resolvedPath = pathname === "/" ? "/index.html" : pathname;
  const safePath = path
    .normalize(decodeURIComponent(resolvedPath))
    .replace(/^(\.\.[\\/])+/, "")
    .replace(/^([\\/])+/, "");
  const filePath = path.resolve(ROOT_DIR, safePath);

  if (filePath !== ROOT_DIR && !filePath.startsWith(`${ROOT_DIR}${path.sep}`)) {
    writeJson(response, 403, { error: "forbidden" });
    return;
  }

  try {
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      writeJson(response, 404, { error: "not_found" });
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    const contents = extension === ".html" && TEST_MODE_ENABLED
      ? Buffer.from(injectTestModeBootstrap(await fs.readFile(filePath, "utf8")), "utf8")
      : await fs.readFile(filePath);
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": MIME_TYPES[extension] ?? "application/octet-stream",
    });
    response.end(contents);
  } catch {
    writeJson(response, 404, { error: "not_found" });
  }
}

async function handleTtsRequest(request, response) {
  if (request.method !== "POST") {
    writeJson(response, 405, { error: "method_not_allowed" });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    writeJson(response, 501, {
      error: "missing_api_key",
      message: "OPENAI_API_KEY ist nicht gesetzt. Die App fällt auf die Browser-Stimme zurück.",
    });
    return;
  }

  const body = await readJsonBody(request);
  const input = String(body?.input ?? "").trim();
  const instructions = String(body?.instructions ?? OPENAI_TTS_INSTRUCTIONS).trim();
  const voice = String(body?.voice ?? OPENAI_TTS_VOICE).trim() || OPENAI_TTS_VOICE;

  if (!input) {
    writeJson(response, 400, { error: "invalid_input", message: "input darf nicht leer sein." });
    return;
  }

  const cacheKey = JSON.stringify({
    input,
    instructions,
    model: OPENAI_TTS_MODEL,
    responseFormat: OPENAI_TTS_RESPONSE_FORMAT,
    voice,
  });
  const cachedAudio = ttsCache.get(cacheKey);
  if (cachedAudio) {
    response.writeHead(200, {
      "Cache-Control": "private, max-age=3600",
      "Content-Type": AUDIO_CONTENT_TYPES[OPENAI_TTS_RESPONSE_FORMAT] ?? "audio/mpeg",
      "X-TTS-Provider": "openai-cache",
    });
    response.end(cachedAudio);
    return;
  }

  const openAiResponse = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_TTS_MODEL,
      voice,
      input,
      instructions,
      response_format: OPENAI_TTS_RESPONSE_FORMAT,
    }),
  });

  if (!openAiResponse.ok) {
    const errorText = await openAiResponse.text();
    writeJson(response, openAiResponse.status, {
      error: "openai_tts_failed",
      message: errorText || "OpenAI TTS konnte die Anfrage nicht verarbeiten.",
    });
    return;
  }

  const audioBuffer = Buffer.from(await openAiResponse.arrayBuffer());
  ttsCache.set(cacheKey, audioBuffer);

  response.writeHead(200, {
    "Cache-Control": "private, max-age=3600",
    "Content-Type": AUDIO_CONTENT_TYPES[OPENAI_TTS_RESPONSE_FORMAT] ?? "audio/mpeg",
    "X-TTS-Provider": "openai",
  });
  response.end(audioBuffer);
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let raw = "";

    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 32_768) {
        reject(new Error("Request body too large."));
        request.destroy();
      }
    });
    request.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function writeJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}
