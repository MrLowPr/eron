#!/usr/bin/env node
/**
 * Eron Control Panel — GUI lokal untuk mengelola server Eron.
 *   node tools/panel.mjs                → http://127.0.0.1:7777
 *   ERON_PANEL_PORT=8000 node tools/panel.mjs
 * Hanya bind ke 127.0.0.1. Tanpa dependensi eksternal.
 */

import http from "node:http";
import fs from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import {
  cfg,
  status,
  health,
  startLocalServer,
  stopLocalServer,
  restart,
  freePort,
  tailLog,
  TASKS,
} from "./serverctl.mjs";

const PANEL_PORT = Number(process.env.ERON_PANEL_PORT || 7777);
const logDir = () => fs.mkdirSync(cfg.logDir, { recursive: true });

/* ────────────── Runner tugas (satu job aktif) ────────────── */
let job = { id: null, label: null, type: null, running: false, exit: null, out: "", t0: null, t1: null };

function runTask(type) {
  const t = TASKS[type];
  if (!t) return { ok: false, err: "tugas tidak dikenal" };
  if (job.running) return { ok: false, busy: true, running: job.type };
  logDir();
  const id = `job_${Date.now()}`;
  const [cmd, args] = t.cmd;
  const child = spawn(cmd, args, {
    cwd: cfg.appDir,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, FORCE_COLOR: "0", NEXT_TELEMETRY_DISABLED: "1" },
  });
  const logFile = fs.openSync(cfg.logFiles[t.log || "server"], "a");
  fs.writeSync(logFile, `\n§ ${new Date().toISOString()} ${t.label}\n`);
  job = {
    id, label: t.label, type,
    running: true, exit: null,
    out: `⟩ ${t.label}\n$ ${cmd} ${args.join(" ")}\n`,
    t0: Date.now(), t1: null,
  };
  const onChunk = (d) => {
    job.out += d.toString();
    fs.writeSync(logFile, d);
  };
  child.stdout.on("data", onChunk);
  child.stderr.on("data", onChunk);
  child.on("error", (e) => (job.out += `\n[spawn error] ${e.message}`));
  child.on("close", (code) => {
    const ms = Date.now() - job.t0;
    const tail = `\n>> ${t.label} — exit ${code ?? 0} (${(ms / 1000).toFixed(1)}s)`;
    job.out += tail;
    job.running = false;
    job.exit = code ?? 0;
    job.t1 = Date.now();
    fs.writeSync(logFile, tail);
    fs.closeSync(logFile);
  });
  return { ok: true, id };
}

/* ────────────── Aksi server ────────────── */
async function serverAction(action, port = cfg.port) {
  switch (action) {
    case "start": {
      const s = await status();
      if (s.running && s.mode === "local") return { ok: true, note: `sudah jalan (pid ${s.pid}, port ${s.port})` };
      if (s.mode === "docker") return { ok: false, note: "stack Docker sedang aktif di port ini — matikan via Docker dulu" };
      return startLocalServer({ port });
    }
    case "stop": {
      const s = await status();
      return stopLocalServer({ port });
    }
    case "restart":
      return restart({ port });
    default:
      return { ok: false, err: "aksi tak dikenal" };
  }
}

/* ────────────── HTTP ────────────── */
function json(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj, null, 2));
}
function readBody(req) {
  return new Promise((r) => {
    let b = "";
    req.on("data", (c) => (b += c));
    req.on("end", () => { try { r(JSON.parse(b || "{}")); } catch { r({}); } });
  });
}
const envKeys = () => {
  try {
    return fs.readFileSync(path.join(cfg.appDir, ".env"), "utf8")
      .split("\n").filter((l) => /^[A-Z_]+=/.test(l.trim()))
      .map((l) => (l.startsWith("#") ? "" : l.split("=")[0].trim()))
      .filter(Boolean);
  } catch { return []; }
};

http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://127.0.0.1");
  const p = u.pathname;

  if (req.method === "GET" && p === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(PAGE);
    return;
  }
  try {
    if (p === "/api/status") return json(res, 200, await status());
    if (p === "/api/health") return json(res, 200, { results: await health() });
    if (p === "/api/job")
      return json(res, 200, {
        id: job.id, type: job.type, label: job.label, running: job.running, exit: job.exit,
        ms: job.t0 ? (job.t1 || Date.now()) - job.t0 : null,
        out: job.out.split("\n").slice(-500).join("\n"),
      });
    if (p === "/api/logs") {
      const source = u.searchParams.get("source") || "server";
      return json(res, 200, { source, text: tailLog(source, Number(u.searchParams.get("lines") || 300)) });
    }
    if (p === "/api/env") return json(res, 200, { keys: envKeys() });
    if (p === "/api/tasks")
      return json(res, 200, Object.entries(TASKS).map(([id, t]) => ({ id, label: t.label })));

    if (req.method === "POST") {
      const b = await readBody(req);
      if (p === "/api/server") return json(res, 200, await serverAction(b.action, Number(b.port || cfg.port)));
      if (p === "/api/task") {
        const t = TASKS[b.type];
        if (!t) return json(res, 400, { ok: false, err: "tugas tidak dikenal" });
        const r = runTask(b.type);
        return json(res, r.ok ? 200 : 409, r);
      }
      if (p === "/api/freeport") return json(res, 200, await freePort(Number(b.port || cfg.port)));
    }
  } catch (e) {
    return json(res, 500, { err: e.message });
  }
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("not found");
}).listen(PANEL_PORT, "127.0.0.1", () => {
  console.log(`Eron Control Panel  →  http://127.0.0.1:${PANEL_PORT}`);
});

/* ────────────── Halaman GUI ────────────── */
const PAGE = `<!doctype html>
<html lang="id" data-theme="dark">
<head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Eron Control Panel</title>
<style>
:root{--bg:#0d1117;--bg2:#161b22;--bd:#30363d;--fg:#e6edf3;--dim:#8b949e;--ok:#3fb950;--bad:#f85149;--acc:#58a6ff}
[data-theme="light"]{--bg:#f6f8fa;--bg2:#ffffff;--bd:#d0d7de;--fg:#1f2328;--dim:#57606a;--acc:#0969da}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.5 ui-sans-serif,system-ui}
header{display:flex;align-items:center;gap:12px;padding:10px 16px;background:var(--bg2);border-bottom:1px solid var(--bd);position:sticky;top:0;z-index:5}
.logo{width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,var(--acc),var(--ok));display:grid;place-items:center;font-weight:800;color:#0d1117}
h1{font-size:15px;margin:0;flex:1}.muted{color:var(--dim);font-size:12px}
.btn{padding:6px 12px;border:1px solid var(--bd);background:var(--bg);color:var(--fg);border-radius:8px;cursor:pointer;font-size:13px}
.btn:hover{border-color:var(--acc)}.btn:disabled{opacity:.45;cursor:not-allowed}
.btn.go{border-color:var(--ok)} .btn.no{border-color:var(--bad)} .btn.acc{background:var(--acc);color:#0d1117;font-weight:600}
.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
main{display:grid;grid-template-columns:minmax(320px,460px) 1fr;gap:14px;padding:14px 16px;max-width:1440px;margin:0 auto}
@media(max-width:940px){main{grid-template-columns:1fr}}
.card{background:var(--bg2);border:1px solid var(--bd);border-radius:12px;padding:14px;margin-bottom:14px}
.card h2{margin:0 0 10px;font-size:12px;text-transform:uppercase;letter-spacing:.09em;color:var(--dim)}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}
.kpi{border:1px solid var(--bd);border-radius:10px;padding:8px 10px}
.kpi .v{font-size:15px;font-weight:700;white-space:nowrap}.kpi .t{font-size:11px;color:var(--dim)}
.dot{width:9px;height:9px;border-radius:50%;display:inline-block;margin-right:6px}
.dot.ok{background:var(--ok);box-shadow:0 0 6px var(--ok)}.dot.bad{background:var(--bad)}
table{width:100%;border-collapse:collapse;font-size:12px}td,th{padding:4px 6px;border-bottom:1px solid var(--bd);text-align:left}
pre{margin:0;background:#010409;border:1px solid var(--bd);border-radius:10px;padding:10px;height:calc(100vh - 170px);overflow:auto;font:12px/1.45 ui-monospace,Consolas;white-space:pre-wrap}
pre::-webkit-scrollbar{width:8px}pre::-webkit-scrollbar-thumb{background:var(--bd);border-radius:4px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px}
select,input{background:var(--bg);color:var(--fg);border:1px solid var(--bd);border-radius:8px;padding:6px 8px;font:inherit}
.chip{border:1px solid var(--bd);border-radius:99px;padding:2px 10px;font-size:11px;color:var(--dim);display:inline-block;margin:2px}
a{color:var(--acc);text-decoration:none}
#st{font-weight:700}
</style>
</head>
<body>
<header>
  <div class="logo">E</div><h1>Eron Control Panel</h1>
  <span class="muted" id="clock"></span>
  <select id="theme"><option value="dark">Gelap</option><option value="light">Terang</option></select>
</header>
<main>
<div>
  <div class="card">
    <h2>Server Eron</h2>
    <div class="kpis">
      <div class="kpi"><div class="v" id="k-st">—</div><div class="t">Status</div></div>
      <div class="kpi"><div class="v" id="k-pid">—</div><div class="t">PID / Mode</div></div>
      <div class="kpi"><div class="v" id="k-up">—</div><div class="t">Uptime</div></div>
      <div class="kpi"><div class="v" id="k-hc">—</div><div class="t">Health 200/total</div></div>
    </div>
    <div class="row">
      <button class="btn go" id="b-start">▶ Mulai</button>
      <button class="btn no" id="b-stop">■ Matikan</button>
      <button class="btn acc" id="b-restart">↻ Restart</button>
      <label class="muted">Port <input id="port" value="3000" style="width:76px"/></label>
      <a class="btn" id="link" href="http://localhost:3000" target="_blank">Buka Web ↗</a>
    </div>
    <div class="row" style="margin-top:10px">
      <button class="btn" id="b-health">🩺 Health check semua rute</button>
      <button class="btn" id="b-free">🧹 Kosongkan port</button>
    </div>
    <table id="xcross" style="margin-top:10px"></table>
  </div>

  <div class="card">
    <h2>Docker Compose (stack produksi)</h2>
    <div class="row">
      <button class="btn" id="b-up">🐳 Up –d --build</button>
      <button class="btn" id="b-build">🔨 Build saja</button>
      <button class="btn no" id="b-dn">⏹ Down</button>
      <button class="btn" id="b-dlogs">📜 Logs</button>
    </div>
    <table id="containers" style="margin-top:10px"></table>
  </div>

  <div class="card">
    <h2>Utilitas</h2>
    <div class="grid" id="tasks"></div>
    <p class="muted">Basis data, smoke test, typecheck, build. Satu tugas berat berjalan di satu waktu.</p>
  </div>

  <div class="card">
    <h2>Konfigurasi (.env — hanya nama variabel)</h2>
    <div id="env"></div>
  </div>
</div>

<div class="card" style="margin:0">
  <h2>Log &amp; luaran tugas</h2>
  <div class="row" style="margin-bottom:8px">
    <select id="logsrc"><option value="server">server.log</option><option value="docker">docker-compose.log</option><option value="build">build.log</option></select>
    <button class="btn" id="b-log">Muat</button>
    <label class="muted"><input type="checkbox" id="follow" checked> ikuti otomatis</label>
    <span class="muted" id="jobchip"></span>
  </div>
  <pre id="log">memuat…</pre>
</div>
</main>
<script>
const $=s=>document.querySelector(s);
const fmt=s=>{if(s==null)return"—";const h=Math.floor(s/3600),m=Math.floor(s%3600/60);return h?h+"j "+m+"m":(m?m+"m ":"")+(s%60)+"s"};
const j=(url,opt)=>fetch(url,opt).then(r=>r.json());
const PORT=()=>Number($('#port').value)||3000;

async function poll(){
  try{
    const s=await j('/api/status');
    $('#k-st').innerHTML=s.running?'<span class="dot ok"></span>Jalan':'<span class="dot bad"></span>Mati';
    $('#k-pid').textContent=s.mode==='docker'?'docker':(s.pid||'—');
    $('#k-up').textContent=s.mode==='local'&&s.running?fmt(s.uptimeSec):'—';
    $('#link').href='http://localhost:'+PORT();
    let h='';
    for(const c of s.docker||[])h+='<tr><td>'+(c.up?'<span class="dot ok"></span>':'<span class="dot bad"></span>')+c.name+'</td><td class="muted">'+c.status+'</td></tr>';
    $('#containers').innerHTML=h?'<tr><th>Kontainer</th><th>Status</th></tr>'+h:'<tr><td class="muted">belum ada kontainer Eron</td></tr>';
  }catch{}
  try{
    const jb=await j('/api/job');
    if(jb.label){
      const dur=jb.ms!=null?fmt(Math.floor(jb.ms/1000)):'0s';
      $('#jobchip').textContent=jb.label+(jb.running?' ('+dur+')':' — exit '+jb.exit);
    }
    document.querySelectorAll('.grid .btn').forEach(b=>b.disabled=!!(jb.running&&jb.running!==b.id));
    if($('#logsrc').value!=='server')return; // job pertama → tampil otomatis dari buffer bila sumber server
  }catch{}
  if($('#follow').checked)await loadLogs(false);
}
async function loadLogs(scroll){
  try{const a=await j('/api/logs?source='+$('#logsrc').value+'&lines=400');$('#log').textContent=a.text||'';if(scroll!==false)$('#log').scrollTop=1e9;}catch{}
}
async function srv(action){
  const r=await j('/api/server',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,port:PORT()})});
  note(r);setTimeout(poll,600);
}
async function task(type){
  $('#logsrc').value=type.startsWith('docker')?'docker':(type==='build'?'build':'server');
  $('#follow').checked=true;
  const r=await j('/api/task',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type})});
  note(r);if(!r.ok&&r.busy)note({note:'masih ada tugas berjalan: '+(r.running||'')});
}
function note(r){if(!r)return;$('#log').textContent+=(r.err?'\\n[!] '+r.err:r.note?'\\n[i] '+r.note:r.ok!==undefined?'\\n[OK]':'' );$('#log').scrollTop=1e9}
async function healthNow(){
  const rs=(await j('/api/health')).results;const ok=rs.filter(x=>x.code&&x.code<400).length;
  $('#k-hc').innerHTML=ok+'/'+rs.length;
  let t='<tr><th>Rute</th><th>Kode</th><th>Latensi</th></tr>';
  for(const x of rs)t+='<tr><td>'+x.route+'</td><td>'+(x.code&&x.code<400?'<span class="dot ok"></span>':'<span class="dot bad"></span>')+x.code+'</td><td>'+x.ms+' ms</td></tr>';
  $('#xcross').innerHTML=t;
}
$('#b-start').onclick=()=>srv('start');$('#b-stop').onclick=()=>srv('stop');$('#b-restart').onclick=()=>srv('restart');
$('#b-health').onclick=healthNow;
$('#b-free').onclick=async()=>{const r=await j('/api/freeport',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({port:PORT()})});note(r)};
$('#b-up').onclick=()=>task('docker:up');$('#b-build').onclick=()=>task('docker:build');$('#b-dn').onclick=()=>task('docker:down');$('#b-dlogs').onclick=()=>task('docker:logs');
$('#b-log').onclick=()=>loadLogs();
$('#logsrc').onchange=()=>loadLogs();
$('#theme').onchange=e=>document.documentElement.dataset.theme=e.target.value;

(async()=>{
  const ts=await j('/api/tasks');
  $('#tasks').innerHTML=ts.map(t=>'<button class="btn" id="'+t.id+'">'+t.label+'</button>').join('');
  ts.forEach(t=>{const b=document.getElementById(t.id);b.onclick=()=>task(t.id)});
  $('#env').innerHTML=(await j('/api/env')).keys.map(k=>'<span class="chip">'+k+'</span>').join(' ');
})();
setInterval(()=>$('#clock').textContent=new Date().toLocaleTimeString('id-ID'),1000);
setInterval(poll,3000);poll();loadLogs();
</script>
</body></html>`;
