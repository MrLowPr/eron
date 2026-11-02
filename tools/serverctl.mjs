#!/usr/bin/env node
/**
 * Eron Server Control — pustaka inti + CLI
 * Mengelola server produksi lokal (next start) & stack Docker Compose.
 *
 * CLI:
 *   node tools/serverctl.mjs status
 *   node tools/serverctl.mjs start  [--port 3000] [--mode local|docker]
 *   node tools/serverctl.mjs stop   [--mode local|docker]
 *   node tools/serverctl.mjs restart [...]
 *   node tools/serverctl.mjs logs   [--lines 100] [--source server|docker|build]
 *   node tools/serverctl.mjs health
 *   node tools/serverctl.mjs open
 */

import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const APP_DIR = path.resolve(process.env.ERON_DIR || HERE, "..");

export const cfg = {
  appDir: APP_DIR,
  logDir: path.join(APP_DIR, "logs"),
  pidFile: path.join(APP_DIR, ".server.pid"),
  port: Number(process.env.ERON_PORT || 3000),
  logFiles: {
    server: path.join(APP_DIR, "logs", "server.log"),
    docker: path.join(APP_DIR, "logs", "docker-compose.log"),
    build: path.join(APP_DIR, "logs", "build.log"),
  },
};

function ensureLogDir() {
  fs.mkdirSync(cfg.logDir, { recursive: true });
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ───────────────────────── Deteksi proses di port ───────────────────────── */

/** parse `ss -ltnp` → [{port, pid}] untuk yang listen di 127.0.0.1/0.0.0.0:port */
export function listenersOnPort(port) {
  let out;
  try {
    out = spawnSync("sh", ["-c", "ss -ltnp 2>/dev/null || netstat -ltnp 2>/dev/null"], { encoding: "utf8" });
  } catch {
    return [];
  }
  const pids = new Set();
  for (const line of (out.stdout || "").split("\n")) {
    if (!line.includes(`:${port} `)) continue;
    const m = line.match(/pid=(\d+)/) || line.match(/(\d+)\//);
    if (m) pids.add(Number(m[1]));
  }
  return [...pids];
}

export function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return false;
  }
}

/* ───────────────────────────── Status ───────────────────────────── */

export async function status() {
  ensureLogDir();
  const state = {
    mode: "unknown",
    running: false,
    pid: null,
    port: cfg.port,
    uptimeSec: 0,
    url: `http://localhost:${cfg.port}`,
    docker: [],
  };

  // --- lokal (pidfile) ---
  let pid = null;
  let startedAt = null;
  try {
    const j = JSON.parse(fs.readFileSync(cfg.pidFile, "utf8"));
    pid = j.pid;
    startedAt = j.startedAt;
  } catch {}
  if (pid && alive(pid)) {
    state.running = true;
    state.mode = "local";
    state.pid = pid;
    state.uptimeSec = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
  } else {
    const pids = listenersOnPort(cfg.port);
    if (pids.length) {
      state.running = true;
      state.mode = "local";
      state.pid = pids[0];
      state.uptimeSec = uptimeOfPid(pids[0]);
    }
  }

  // --- docker ---
  state.docker = dockerPs();

  if (state.mode === "unknown" && state.docker.some((c) => c.name.includes("-app-") && c.up)) {
    state.mode = "docker";
    state.running = true;
  }
  return state;
}

function uptimeOfPid(pid) {
  try {
    const stat = fs.readFileSync(`/proc/${pid}/stat`, "utf8");
    const starttimeTicks = Number(stat.split(" ")[21]); // ticks sejak boot
    const boot = Date.now() / 1000 - parseFloat(fs.readFileSync("/proc/uptime", "utf8"));
    const startedEpoch = boot + starttimeTicks / 100;
    return Math.max(0, Math.floor(Date.now() / 1000 - startedEpoch));
  } catch {
    return 0;
  }
}

export function dockerPs() {
  try {
    const out = spawnSync(
      "docker",
      ["ps", "-a", "--filter", "name=eron-", "--format", "{{.Names}}\t{{.Status}}\t{{.Ports}}"],
      { encoding: "utf8" }
    );
    return (out.stdout || "")
      .split("\n")
      .filter(Boolean)
      .map((l) => {
        const [name, st, ports] = l.split("\t");
        return { name, status: st, up: /^Up/i.test(st || ""), ports: ports || "" };
      });
  } catch {
    return [];
  }
}

/* ───────────────────────────── Start / Stop ───────────────────────────── */

/** Jalankan `next start` sebagai daemon; tulis pid + log. */
export function startLocalServer({ port = cfg.port } = {}) {
  ensureLogDir();
  const logPath = cfg.logFiles.server;
  const out = fs.openSync(logPath, "a");
  out && fs.writeSync(out, `\n> ${new Date().toISOString()} — start -p ${port}\n`);
  const next = path.join(cfg.appDir, "node_modules", "next", "dist", "bin", "next");
  const child = spawn(process.execPath, [next, "start", "-p", String(port)], {
    cwd: cfg.appDir,
    detached: true,
    stdio: ["ignore", out, out],
  });
  child.unref();
  const record = { pid: child.pid, startedAt: Date.now(), port };
  fs.writeFileSync(cfg.pidFile, JSON.stringify(record, null, 2));
  return { ok: true, pid: child.pid, log: logPath };
}

export async function stopLocalServer({ port = cfg.port } = {}) {
  let pid = null;
  try {
    pid = JSON.parse(fs.readFileSync(cfg.pidFile, "utf8")).pid;
  } catch {}
  const candidates = new Set();
  if (pid && alive(pid)) candidates.add(pid);
  for (const p of listenersOnPort(port)) candidates.add(p);

  for (const p of candidates) {
    try {
      process.kill(p, "SIGTERM");
    } catch {}
  }
  for (let i = 0; i < 20; i++) {
    await sleep(250);
    if (![...candidates].some(alive)) break;
  }
  for (const p of candidates) {
    if (alive(p)) {
      try {
        process.kill(p, "SIGKILL");
      } catch {}
    }
  }
  try {
    fs.unlinkSync(cfg.pidFile);
  } catch {}
  return { ok: true, killed: [...candidates] };
}

export async function restart({ port = cfg.port } = {}) {
  await stopLocalServer({ port });
  await sleep(500);
  return startLocalServer({ port });
}

/** Kosongkan port (mis. 3000) dari proses nyasar. */
export async function freePort(port = cfg.port) {
  return stopLocalServer({ port });
}

/* ───────────────────────────── Logs ───────────────────────────── */

export function tailLog(source = "server", lines = 120) {
  const file = cfg.logFiles[source] || cfg.logFiles.server;
  try {
    const size = fs.statSync(file).size;
    const buf = fs.readFileSync(file);
    const text = buf.slice(Math.max(0, size - 512 * 1024)).toString("utf8");
    return text.split("\n").slice(-lines).join("\n");
  } catch {
    return "(file log belum ada)";
  }
}

/* ───────────────────────────── Health check ───────────────────────────── */

export const HEALTH_ROUTES = ["/", "/login", "/register", "/search", "/notifications", "/api/auth/session"];

export async function health(base = `http://localhost:${cfg.port}`) {
  const results = [];
  for (const route of HEALTH_ROUTES) {
    const t0 = Date.now();
    let code = 0;
    try {
      const res = await fetch(base + route, { signal: AbortSignal.timeout(5000) });
      code = res.status;
    } catch {
      code = 0;
    }
    results.push({ route, code, ms: Date.now() - t0 });
  }
  return results;
}

/* ───────────────────────────── Definisi tugas utilitas ───────────────────────────── */

export const TASKS = {
  typecheck: { label: "Typecheck", cmd: ["npm", ["run", "typecheck"]] },
  build: { label: "Next build (prod)", cmd: ["npm", ["run", "build"]], log: "build" },
  "db:status": { label: "Prisma migrate status", cmd: ["npx", ["prisma", "migrate", "status"]] },
  "db:deploy": { label: "Prisma migrate deploy", cmd: ["npx", ["prisma", "migrate", "deploy"]] },
  "db:seed": { label: "Seed data demo", cmd: ["npm", ["run", "db:seed"]] },
  smoke: { label: "Smoke test DB", cmd: ["npx", ["tsx", "scripts/db-smoke.ts"]] },
  "docker:up": { label: "Docker compose up -d --build", cmd: ["docker", ["compose", "up", "-d", "--build"]], log: "docker" },
  "docker:build": { label: "Docker compose build", cmd: ["docker", ["compose", "build", "app", "migrate"]], log: "docker" },
  "docker:down": { label: "Docker compose down", cmd: ["docker", ["compose", "down"]], log: "docker" },
  "docker:logs": { label: "Docker compose logs (tail)", cmd: ["sh", ["-c", "docker compose logs --tail 120 > logs/docker-compose.log 2>&1; tail -120 logs/docker-compose.log"]], log: "docker" },
};

/* ───────────────────────────── CLI ───────────────────────────── */

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

async function main() {
  const [cmd] = process.argv.slice(2);
  const port = Number(arg("--port", cfg.port));
  const out = (o) => console.log(JSON.stringify(o, null, 2));

  switch (cmd) {
    case "status":
      out(await status());
      break;
    case "start": {
      const s = await status();
      if (s.running && s.mode === "local") {
        out({ ok: true, note: `server sudah jalan (pid ${s.pid})` });
      } else out(startLocalServer({ port }));
      break;
    }
    case "stop": {
      const s = await status();
      if (s.mode === "docker") {
        const r = spawnSync("docker", ["compose", "down"], { cwd: cfg.appDir, encoding: "utf8" });
        console.log(r.stdout || r.stderr);
      } else out(await stopLocalServer({ port }));
      break;
    }
    case "restart":
      out(await restart({ port }));
      break;
    case "logs": {
      const source = arg("--source", "server");
      console.log(tailLog(source, Number(arg("--lines", 120))));
      break;
    }
    case "health":
      out(await health());
      break;
    case "open": {
      spawn("sh", ["-c", `xdg-open ${cfg.appDir ? `http://localhost:${cfg.port}` : ""}`], {
        detached: true,
        stdio: "ignore",
      }).unref();
      console.log(`http://localhost:${cfg.port}`);
      break;
    }
    default:
      console.log(
        [
          "ERON Server Control",
          "  status | start | stop | restart | logs [--source server|docker|build] | health | open",
          `  (default port ${cfg.port}; --port untuk ubah)`,
        ].join("\n")
      );
  }
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1].replace(/.*\//, ""))) && process.argv[1].includes("serverctl")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
