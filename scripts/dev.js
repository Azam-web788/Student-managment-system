/**
 * Dev Runner — concurrently starts backend + frontend with a live status dashboard
 *
 * Usage:   node scripts/dev.js
 *          npm run dev:clean  (via package.json)
 *
 * Features:
 *   - Kills ports 5000 (backend) and 5173 (frontend) before starting
 *   - Spawns both servers via concurrently with colored prefixes
 *   - Polls health endpoints and shows a live status badge board
 *   - Prints clickable URLs once both servers are confirmed running
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import http from 'node:http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const BACKEND_PORT = 5000;
const FRONTEND_PORT = 5173;
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;
const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`;
const BACKEND_HEALTH = `${BACKEND_URL}/api/health`;

const CHECK_INTERVAL = 800;   // how often to poll (ms)
const MAX_RETRIES = 30;       // give up after ~24 s
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

// ── Colour / formatting helpers ─────────────────────────

const colours = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  bgGreen: '\x1b[42m',
  bgRed: '\x1b[41m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  white: '\x1b[37m',
};

function badge(label, ok) {
  const bg = ok ? colours.bgGreen : colours.bgRed;
  const icon = ok ? ' ✓ ' : ' ✗ ';
  const txt = ok ? 'RUNNING' : 'DOWN';
  return `${bg}${colours.white}${colours.bold} ${label} ${txt} ${colours.reset}`;
}

function colorize(text, color) {
  return `${color}${text}${colours.reset}`;
}

// ── HTTP health check helper ────────────────────────────

function fetchHealth(url) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 3000 }, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ ok: res.statusCode === 200, data: JSON.parse(body) });
        } catch {
          resolve({ ok: false, data: null });
        }
      });
    });
    req.on('error', () => resolve({ ok: false, data: null }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, data: null }); });
  });
}

// ── Render the live status board ────────────────────────

let spinnerIdx = 0;
let lastRender = '';

function renderBoard(backendOk, frontendOk, backendInfo, retriesLeft) {
  const spinner = SPINNER_FRAMES[spinnerIdx % SPINNER_FRAMES.length];
  spinnerIdx++;

  const lines = [];
  lines.push('');
  lines.push(colorize('  ╔══════════════════════════════════════════════════╗', colours.cyan));
  lines.push(colorize('  ║       🎓  Student Management — Dev Dashboard     ║', colours.cyan));
  lines.push(colorize('  ╚══════════════════════════════════════════════════╝', colours.cyan));
  lines.push('');

  // Backend status
  const beStatus = backendOk
    ? `${badge('API', true)}  ${colorize(BACKEND_URL, colours.bold)}`
    : `${badge('API', false)}  ${colorize(`waiting for ${BACKEND_URL}...`, colours.dim)}`;

  // Frontend status (just check if it responds)
  const feStatus = frontendOk
    ? `${badge('VITE', true)}  ${colorize(FRONTEND_URL, colours.bold)}`
    : `${badge('VITE', false)}  ${colorize(`waiting for ${FRONTEND_URL}...`, colours.dim)}`;

  lines.push(`    ${beStatus}`);
  if (backendOk && backendInfo) {
    lines.push(`    ${colorize('      ├ Environment:', colours.dim)} ${colorize(backendInfo.environment || '?', colours.yellow)}`);
    lines.push(`    ${colorize('      └ Uptime:', colours.dim)}       ${colorize(backendInfo.timestamp || '?', colours.yellow)}`);
  }
  lines.push('');
  lines.push(`    ${feStatus}`);
  lines.push('');

  // Overall status
  if (backendOk && frontendOk) {
    lines.push(colorize(`    ${spinner}  ${colours.bgGreen}${colours.white}${colours.bold}  ALL SYSTEMS OPERATIONAL  ${colours.reset}`, colours.green));
    lines.push('');
    lines.push(`    ${colorize('   Open:', colours.bold)}  ${colorize(FRONTEND_URL, colours.cyan)}  ${colorize(`(API: ${BACKEND_URL})`, colours.dim)}`);
  } else {
    lines.push(colorize(`    ${spinner}  Waiting for servers to start... (${retriesLeft} retries left)`, colours.yellow));
  }
  lines.push('');
  lines.push(colorize(`    ${colours.dim}Press Ctrl+C to stop both servers${colours.reset}`, colours.dim));
  lines.push('');

  const output = lines.join('\n');

  // Clear previous render
  if (lastRender) {
    const prevLines = lastRender.split('\n').length;
    process.stdout.write(`\x1b[${prevLines}A`);
  }
  process.stdout.write(output);
  lastRender = output;
}

// ── Status polling loop ─────────────────────────────────

async function pollLoop(concurrentProcess) {
  let beOk = false;
  let feOk = false;
  let backendInfo = null;
  let retries = MAX_RETRIES;

  // Clear any existing terminal output
  process.stdout.write('\x1b[2J\x1b[H');

  return new Promise((resolve) => {
    const interval = setInterval(async () => {
      retries--;

      if (!beOk) {
        const result = await fetchHealth(BACKEND_HEALTH);
        beOk = result.ok;
        if (result.ok) backendInfo = result.data;
      }

      if (!feOk) {
        const result = await fetchHealth(FRONTEND_URL);
        feOk = result.ok;
      }

      renderBoard(beOk, feOk, backendInfo, Math.max(0, retries));

      if (retries <= 0 && !(beOk && feOk)) {
        clearInterval(interval);
        renderBoard(beOk, feOk, backendInfo, 0);
        console.log(colorize(`\n  ✗ Timed out waiting for servers to start.\n`, colours.red));
        concurrentProcess.kill('SIGTERM');
        process.exit(1);
      }

      if (beOk && feOk) {
        clearInterval(interval);
        renderBoard(beOk, feOk, backendInfo, 0);
        resolve();
      }
    }, CHECK_INTERVAL);
  });
}

// ── Main ─────────────────────────────────────────────────

async function main() {
  // 1. Kill existing ports first
  console.log(colorize(`\n  ${colours.bold}🧹  Cleaning ports ${BACKEND_PORT} & ${FRONTEND_PORT}...${colours.reset}\n`, colours.yellow));
  await new Promise((resolve) => {
    const kill = spawn('npx', ['kill-port', String(BACKEND_PORT), String(FRONTEND_PORT)], {
      stdio: 'inherit',
      shell: true,
      cwd: root,
    });
    kill.on('close', () => resolve());
  });

  // 2. Spawn both servers via concurrently
  const concurrentPath = path.resolve(root, 'node_modules', '.bin',
    process.platform === 'win32' ? 'concurrently.cmd' : 'concurrently');

  const proc = spawn(concurrentPath, [
    '-n', 'backend,frontend',
    '-c', 'blue,green',
    `cd backend && npm run dev`,
    `cd frontend && npm run dev`,
  ], {
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true,
    cwd: root,
  });

  // Forward stdout/stderr from concurrently (but suppress during dashboard mode)
  // We buffer output until the dashboard is ready, then show it
  let logBuffer = '';
  proc.stdout.on('data', (data) => { logBuffer += data.toString(); });
  proc.stderr.on('data', (data) => { logBuffer += data.toString(); });

  // 3. Poll for health and show dashboard
  await pollLoop(proc);

  // 4. Show any buffered server logs that came in during startup
  if (logBuffer.trim()) {
    console.log(colorize(`\n  ── Startup Logs ──${colours.reset}`, colours.dim));
    const lines = logBuffer.trim().split('\n');
    const recent = lines.slice(-8); // show last 8 lines
    for (const line of recent) {
      console.log(`  ${colorize('│', colours.dim)} ${line}`);
    }
    console.log('');
  }

  // 5. Now pipe all subsequent output directly to terminal
  proc.stdout.removeAllListeners('data');
  proc.stderr.removeAllListeners('data');
  proc.stdout.pipe(process.stdout);
  proc.stderr.pipe(process.stderr);

  // Handle process exit
  proc.on('close', (code) => {
    console.log(colorize(`\n  Servers stopped (exit code: ${code})${colours.reset}\n`, colours.dim));
    process.exit(code ?? 0);
  });

  process.on('SIGINT', () => {
    console.log(colorize('\n  Shutting down...\n', colours.yellow));
    proc.kill('SIGTERM');
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(colorize(`\n  ✗ Fatal error: ${err.message}\n`, colours.red));
  process.exit(1);
});
