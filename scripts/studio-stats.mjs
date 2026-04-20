import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

import {
  buildStudioGenerationBatchReport,
  formatStudioGenerationBatchReport,
} from '../src/application/studio-generation-batch-report.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, '..');

function parseArgs(argv) {
  const options = {
    runs: 100,
    studios: 10,
    port: 4174,
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const entry = argv[index];
    if (entry === '--runs') {
      options.runs = Math.max(1, Number(argv[index + 1]) || options.runs);
      index += 1;
      continue;
    }
    if (entry === '--studios') {
      options.studios = Math.max(1, Number(argv[index + 1]) || options.studios);
      index += 1;
      continue;
    }
    if (entry === '--port') {
      options.port = Math.max(1, Number(argv[index + 1]) || options.port);
      index += 1;
      continue;
    }
    if (entry === '--json') {
      options.json = true;
    }
  }

  return options;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForServer(port, serverProcess, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (serverProcess.exitCode != null) {
      throw new Error(`Testserver ist vorzeitig beendet worden (Exit ${serverProcess.exitCode}).`);
    }

    try {
      const response = await fetch(`http://127.0.0.1:${port}/`);
      if (response.ok) {
        return;
      }
    } catch {
      await delay(250);
      continue;
    }

    await delay(250);
  }

  throw new Error(`Testserver auf Port ${port} wurde nicht rechtzeitig erreichbar.`);
}

async function startServer(port) {
  const serverProcess = spawn(process.execPath, ['server.mjs', '--port', String(port)], {
    cwd: ROOT_DIR,
    env: {
      ...process.env,
      DUNGEON_ROGUE_TEST_MODE: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stderr = '';
  serverProcess.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  await waitForServer(port, serverProcess);

  return {
    process: serverProcess,
    getStderr: () => stderr.trim(),
  };
}

async function stopServer(server) {
  if (!server?.process || server.process.exitCode != null) {
    return;
  }

  server.process.kill();
  await new Promise((resolve) => {
    server.process.once('exit', () => resolve());
    setTimeout(resolve, 3000);
  });
}

async function collectReports(options) {
  const server = await startServer(options.port);
  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const page = await browser.newPage();
    const reports = [];

    for (let runIndex = 0; runIndex < options.runs; runIndex += 1) {
      await page.goto(`http://127.0.0.1:${options.port}/?reportRun=${runIndex + 1}`, {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForFunction(() => Boolean(window.__TEST_API__?.getStudioGenerationReport), null, {
        timeout: 15000,
      });

      const report = await page.evaluate((studioCount) =>
        window.__TEST_API__.getStudioGenerationReport({ studioCount }), options.studios);
      reports.push(report);
    }

    return {
      reports,
      serverStderr: server.getStderr(),
    };
  } finally {
    await browser.close();
    await stopServer(server);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const { reports, serverStderr } = await collectReports(options);
  const batchReport = buildStudioGenerationBatchReport(reports, {
    studioCount: options.studios,
  });

  if (options.json) {
    process.stdout.write(`${JSON.stringify({
      options,
      batchReport,
      reports,
      serverStderr,
    }, null, 2)}\n`);
    return;
  }

  process.stdout.write(`${formatStudioGenerationBatchReport(batchReport)}\n`);
  if (serverStderr) {
    process.stderr.write(`${serverStderr}\n`);
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});

