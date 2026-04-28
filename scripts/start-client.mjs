import http from "node:http";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 4173;
const SERVER_READY_TIMEOUT_MS = 30000;
const SERVER_POLL_INTERVAL_MS = 250;
const APP_MARKER = "<title>The Final Scene</title>";

const options = readOptions(process.argv.slice(2));
const appUrl = `http://${DEFAULT_HOST}:${DEFAULT_PORT}`;

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

async function main() {
  const status = await inspectServer(appUrl);
  if (status === "running") {
    console.log(`The Final Scene laeuft bereits auf ${appUrl}.`);
    maybeOpenClient(appUrl, options.openBrowser);
    return;
  }

  if (status === "occupied") {
    throw new Error(
      `Port ${DEFAULT_PORT} ist bereits belegt, aber dort antwortet nicht The Final Scene. Bitte bestehenden Listener pruefen oder anderen Port waehlen.`,
    );
  }

  console.log(`Starte The Final Scene auf ${appUrl} ...`);
  const child = spawn(getStartCommand().file, getStartCommand().args, {
    cwd: process.cwd(),
    stdio: "inherit",
  });

  const exitCode = await waitForServerThenFollowChild(child, appUrl, options.openBrowser);
  process.exit(exitCode);
}

async function waitForServerThenFollowChild(child, url, openBrowser) {
  let opened = false;

  const readyPromise = waitForServer(url, SERVER_READY_TIMEOUT_MS)
    .then(() => {
      if (!opened) {
        maybeOpenClient(url, openBrowser);
        opened = true;
      }
    });

  const exitPromise = new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) {
        resolve(1);
        return;
      }
      resolve(code ?? 0);
    });
  });

  try {
    await readyPromise;
  } catch (error) {
    child.kill();
    throw error;
  }

  return exitPromise;
}

function readOptions(args) {
  const options = {
    openBrowser: false,
  };

  for (const entry of args) {
    if (entry === "--open") {
      options.openBrowser = true;
    }
    if (entry === "--no-open") {
      options.openBrowser = false;
    }
  }

  return options;
}

async function inspectServer(url) {
  try {
    const response = await fetchText(url);
    return response.includes(APP_MARKER) ? "running" : "occupied";
  } catch (error) {
    const code = error && typeof error === "object" ? error.code : null;
    if (code === "ECONNREFUSED" || code === "ECONNRESET" || code === "ETIMEDOUT") {
      return "offline";
    }
    return "offline";
  }
}

async function waitForServer(url, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if ((await inspectServer(url)) === "running") {
      return;
    }
    await delay(SERVER_POLL_INTERVAL_MS);
  }

  throw new Error(`The Final Scene wurde auf ${url} nicht rechtzeitig erreichbar.`);
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, { timeout: 2000 }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => {
        resolve(body);
      });
    });

    request.on("timeout", () => {
      request.destroy(Object.assign(new Error("timeout"), { code: "ETIMEDOUT" }));
    });
    request.on("error", reject);
  });
}

function maybeOpenClient(url, openBrowser) {
  if (!openBrowser) {
    console.log(`Client verfuegbar unter ${url}`);
    return;
  }

  const command = getBrowserCommand(url);
  const child = spawn(command.file, command.args, {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  console.log(`Client geoeffnet: ${url}`);
}

function getBrowserCommand(url) {
  if (process.platform === "win32") {
    return {
      args: ["/c", "start", "", url],
      file: "cmd",
    };
  }

  if (process.platform === "darwin") {
    return {
      args: [url],
      file: "open",
    };
  }

  return {
    args: [url],
    file: "xdg-open",
  };
}

function getStartCommand() {
  if (process.platform === "win32") {
    return {
      file: "cmd",
      args: ["/c", "npm", "run", "start:app"],
    };
  }

  return {
    file: "npm",
    args: ["run", "start:app"],
  };
}
