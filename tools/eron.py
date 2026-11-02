#!/usr/bin/env python3
"""
Eron Tools — utilitas kontrol server Eron (Python 3, stdlib saja).

Perintah tools:
  python3 tools/eron.py start     # nyalakan tools (panel GUI di 127.0.0.1:7777, daemon)
  python3 tools/eron.py stop      # matikan tools
  python3 tools/eron.py restart   # restart tools
  python3 tools/eron.py status    # status server web + kontainer Eron (JSON)

Perintah yang dieksekusi tools (juga bisa dari GUI):
  python3 tools/eron.py server-start [--port 3000]  # node next start (detached)
  python3 tools/eron.py server-stop
  python3 tools/eron.py server-restart
  python3 tools/eron.py logs   [--source server|docker|build|panel] [--lines 100]
  python3 tools/eron.py health
  python3 tools/eron.py serve  # foreground (internal)

Port panel: env ERON_PANEL_PORT (default 7777). Port app: --port / env ERON_PORT.
"""

import json
import os
import getpass
import re
import shutil
import signal
import socket
import subprocess
import sys
import threading
import time
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
APP_DIR = os.path.abspath(os.environ.get("ERON_DIR") or os.path.join(HERE, ".."))
PANEL_PORT = int(os.environ.get("ERON_PANEL_PORT", "7777"))
APP_PORT_DEFAULT = int(os.environ.get("ERON_PORT", "3000"))

LOG_DIR = os.path.join(APP_DIR, "logs")
LOG_FILES = {
    "server": os.path.join(LOG_DIR, "server.log"),
    "docker": os.path.join(LOG_DIR, "docker-compose.log"),
    "build": os.path.join(LOG_DIR, "build.log"),
    "panel": os.path.join(LOG_DIR, "panel.log"),
}
PANEL_PID = os.path.join(APP_DIR, ".panel.pid")
SERVER_PID = os.path.join(APP_DIR, ".server.pid")
SSHD_UNITS = ["ssh.service", "sshd.service"]
HEALTH_ROUTES = ["/", "/login", "/register", "/search", "/api/auth/session"]

TASKS = {
    "typecheck":    {"label": "Typecheck",                  "cmd": ["npm", ["run", "typecheck"]]},
    "build":        {"label": "Next build (prod)",           "cmd": ["npm", ["run", "build"]], "log": "build"},
    "db:status":    {"label": "Prisma migrate status",       "cmd": ["npx", ["prisma", "migrate", "status"]]},
    "db:deploy":    {"label": "Prisma migrate deploy",       "cmd": ["npx", ["prisma", "migrate", "deploy"]]},
    "db:seed":      {"label": "Seed data demo",              "cmd": ["npm", ["run", "db:seed"]]},
    "smoke":        {"label": "Smoke test DB",               "cmd": ["npx", ["tsx", "scripts/db-smoke.ts"]]},
    "docker:up":    {"label": "Docker compose up -d --build","cmd": ["docker", ["compose", "up", "-d", "--build"]], "log": "docker"},
    "docker:build": {"label": "Docker compose build",        "cmd": ["docker", ["compose", "build", "app", "migrate"]], "log": "docker"},
    "docker:down":  {"label": "Docker compose down",         "cmd": ["docker", ["compose", "down"]], "log": "docker"},
    "docker:logs":  {"label": "Docker compose logs (tail)",  "cmd": ["sh", ["-c", "docker compose logs --tail 150 > logs/docker-compose.log 2>&1; tail -150 logs/docker-compose.log"]], "log": "docker"},
}

# ────────────────────────── util aplikasi ──────────────────────────

def mkdir_logs():
    os.makedirs(LOG_DIR, exist_ok=True)


def append_log(name, text):
    mkdir_logs()
    data = text if isinstance(text, bytes) else text.encode("utf-8", "replace")
    with open(LOG_FILES[name], "ab") as f:
        f.write(data)


def tail_log(name, lines=200):
    path = LOG_FILES.get(name, LOG_FILES["server"])
    try:
        with open(path, "rb") as f:
            f.seek(0, os.SEEK_END)
            size = f.tell()
            f.seek(max(0, size - 512 * 1024))
            data = f.read()
        return data.decode("utf-8", "replace").splitlines()[-lines:]
    except OSError:
        return ["(file log belum ada)"]


def pid_alive(pid):
    try:
        os.kill(pid, 0)
        return True
    except (ProcessLookupError, PermissionError, OSError):
        return False


def listeners_on_port(port):
    """Parsing `ss -ltnp` / fallback netstat → daftar pid yang memegang port."""
    try:
        out = subprocess.run(
            ["sh", "-c", "ss -ltnp 2>/dev/null || netstat -ltnp 2>/dev/null"],
            capture_output=True, text=True, timeout=10,
        ).stdout or ""
    except Exception:
        return []
    pids = set()
    for line in out.splitlines():
        if f":{int(port)} " not in line:
            continue
        m = re.search(r"pid=(\d+)", line) or re.search(r"(\d+)/", line)
        if m:
            pids.add(int(m.group(1)))
    pids.discard(os.getpid())  # jangan bunuh diri sendiri
    return sorted(pids)


def proc_uptime(pid):
    try:
        with open(f"/proc/{pid}/stat") as f:
            ticks = float(f.read().split(" ")[21])
        with open("/proc/uptime") as f:
            boot_epoch = time.time() - float(f.read().split()[0])
        return max(0, int(time.time() - (boot_epoch + ticks / 100)))
    except Exception:
        return 0


def docker_ps():
    try:
        out = subprocess.run(
            ["docker", "ps", "-a", "--filter", "name=eron-", "--format", "{{.Names}}\t{{.Status}}\t{{.Ports}}"],
            capture_output=True, text=True, timeout=10,
        ).stdout or ""
        items = []
        for line in out.splitlines():
            parts = line.split("\t")
            if not parts or not parts[0]:
                continue
            status = parts[1] if len(parts) > 1 else ""
            items.append({
                "name": parts[0],
                "status": status,
                "up": status.lower().startswith("up"),
                "ports": parts[2] if len(parts) > 2 else "",
            })
        return items
    except Exception:
        return []


def app_status(port=None):
    port = int(port or APP_PORT_DEFAULT)
    st = {"mode": "unknown", "running": False, "pid": None, "port": port,
          "uptimeSec": 0, "url": f"http://localhost:{port}", "docker": docker_ps()}

    try:
        with open(SERVER_PID) as f:
            r = json.load(f)
        pid, started_at = r.get("pid"), r.get("startedAt")
        if pid and pid_alive(pid):
            up = int(time.time() - started_at) if started_at else proc_uptime(pid)
            st.update(mode="local", running=True, pid=pid, uptimeSec=max(0, up))
        elif pid:
            try:
                os.remove(SERVER_PID)  # pidfile basi
            except OSError:
                pass
    except Exception:
        pass

    if not st["running"]:
        ls = listeners_on_port(port)
        if ls:
            st.update(mode="local", running=True, pid=ls[0], uptimeSec=proc_uptime(ls[0]))

    if st["mode"] == "unknown" and any(c["up"] and "-app-" in c["name"] for c in st["docker"]):
        st.update(mode="docker", running=True)
    return st


def docker_app_up():
    return any(c["up"] and "-app-" in c["name"] for c in docker_ps())


def _protected_pids():
    """Pid yang tidak boleh dibunuh oleh utilitas (panel sendiri, dan pid proses ini)."""
    prot = {os.getpid()}
    try:
        prot.add(int(os.environ.get("ERON_PANEL_PID", "0")))
    except ValueError:
        pass
    return {p for p in prot if p > 0}


def stop_local_server(port=None):
    port = int(port or APP_PORT_DEFAULT)
    st = app_status(port)
    if st["running"] and st["mode"] == "docker":
        return {"ok": False,
                "note": "web sedang berjalan dari stack Docker (container-app-1). "
                        "Gunakan tombol 'Docker compose down' bila ingin mematikan, "
                        "atau hentikan Docker dulu untuk beralih ke server lokal."}
    protected = _protected_pids()
    kill, pid = set(), None
    try:
        with open(SERVER_PID) as f:
            pid = json.load(f).get("pid")
    except Exception:
        pass
    if pid and pid_alive(pid) and pid not in protected:
        kill.add(pid)
    for p in listeners_on_port(port):
        if p not in protected:
            kill.add(p)
    for p in kill:
        try:
            os.kill(p, signal.SIGTERM)
        except OSError:
            pass
    for _ in range(20):
        if not any(pid_alive(p) for p in kill):
            break
        time.sleep(0.25)
    for p in kill:
        if pid_alive(p):
            try:
                os.kill(p, signal.SIGKILL)
            except OSError:
                pass
    try:
        os.remove(SERVER_PID)
    except OSError:
        pass
    return {"ok": True, "killed": sorted(kill),
            "note": None if kill else "tidak ada proses lokal di port " + str(port)}


def start_local_server(port=None):
    port = int(port or APP_PORT_DEFAULT)
    st = app_status(port)
    if st["running"]:
        if st["mode"] == "docker":
            return {"ok": False, "note": "stack Docker sedang aktif di port ini — matikan via Docker dulu"}
        return {"ok": True, "note": f"sudah jalan (pid {st['pid']}, port {port})"}
    mkdir_logs()
    next_bin = os.path.join(APP_DIR, "node_modules", "next", "dist", "bin", "next")
    if not os.path.exists(next_bin):
        return {"ok": False, "note": "node_modules belum terpasang"}
    node = shutil.which("node") or "/usr/bin/node"
    append_log("server", f"\n> {time.strftime('%Y-%m-%dT%H:%M:%S%z')} — start -p {port}\n".encode())
    logf = open(LOG_FILES["server"], "ab")
    p = subprocess.Popen([node, next_bin, "start", "-p", str(port)], cwd=APP_DIR,
                         stdout=logf, stderr=logf, start_new_session=True)
    logf.close()
    with open(SERVER_PID, "w") as f:
        json.dump({"pid": p.pid, "startedAt": time.time(), "port": port}, f)
    deadline = time.time() + 12
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(f"http://localhost:{port}/", timeout=2) as r:
                if r.status == 200:
                    return {"ok": True, "pid": p.pid, "url": f"http://localhost:{port}"}
        except Exception:
            time.sleep(0.4)
    return {"ok": True, "pid": p.pid, "note": "proses jalan; web belum jawab 200 (cek log server)"}


def server_action(action, port=None):
    port = int(port or APP_PORT_DEFAULT)
    if action == "start":
        return start_local_server(port)
    if action in ("stop", "restart"):
        r = stop_local_server(port)
        if action == "stop" or not r.get("ok"):
            return r
        time.sleep(0.6)
        s = start_local_server(port)
        s["killed"] = r.get("killed")
        return s
    return {"ok": False, "err": "aksi tak dikenal"}


def health(base):
    results = []
    for route in HEALTH_ROUTES:
        t0 = time.time()
        code = 0
        try:
            with urllib.request.urlopen(base + route, timeout=5) as resp:
                code = resp.status
        except Exception:
            code = 0
        results.append({"route": route, "code": code, "ms": int((time.time() - t0) * 1000)})
    return results


def env_keys():
    try:
        with open(os.path.join(APP_DIR, ".env")) as f:
            return [l.split("=")[0].strip() for l in f if re.match(r"^[A-Z_0-9]+=", l.strip())]
    except OSError:
        return []

# ────────────────────────── SSH (pkexec) ──────────────────────────

def sysrun(cmd, timeout=20, extra_env=None):
    env = dict(os.environ)
    if extra_env:
        env.update(extra_env)
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, env=env)
        return p.returncode, ((p.stdout or "") + (p.stderr or "")).strip()
    except subprocess.TimeoutExpired as e:
        out = ((e.stdout or b"").decode("utf-8", "replace")) if not isinstance(e.stdout, str) else (e.stdout or "")
        return 124, "TIME-OUT menunggu otorisasi polkit"
    except FileNotFoundError:
        return 127, f"perintah tidak ditemukan: {cmd[0]}"


def _desktop_env():
    uid = os.getuid()
    return {
        "DISPLAY": os.environ.get("DISPLAY") or ":0",
        "XDG_RUNTIME_DIR": os.environ.get("XDG_RUNTIME_DIR") or f"/run/user/{uid}",
        "DBUS_SESSION_BUS_ADDRESS": os.environ.get("DBUS_SESSION_BUS_ADDRESS") or f"unix:path=/run/user/{uid}/bus",
    }


def ssh_installed():
    return os.path.exists("/usr/sbin/sshd") or bool(shutil.which("sshd"))


def ssh_active():
    code, out = sysrun(
        ["sh", "-c", "systemctl is-active ssh.service 2>/dev/null || systemctl is-active sshd.service 2>/dev/null"],
        timeout=10)
    return out == "active"


def _sshd_cfg(key, default=None):
    # sshd: first-match wins; Ubuntu include sshd_config.d di atas → berkas .conf didahulukan
    files = []
    try:
        files += [os.path.join("/etc/ssh/sshd_config.d", f)
                  for f in sorted(os.listdir("/etc/ssh/sshd_config.d")) if f.endswith(".conf")]
    except OSError:
        pass
    files.append("/etc/ssh/sshd_config")
    for path in files:
        try:
            for line in open(path, encoding="utf-8", errors="replace"):
                s = line.strip()
                if s.startswith(key) and (len(s) == len(key) or s[len(key)].isspace()):
                    return s.split(None, 1)[-1].lower()
        except OSError:
            pass
    return default


def _classify_addr(ip):
    if ip.startswith("100."):
        return "tailscale"
    if ip.startswith("fd7a:"):
        return "tailscale"
    if ip.startswith("192.168.") or ip.startswith("10."):
        return "lan"
    if ip.startswith("172."):
        return "docker"
    if ip.startswith("127."):
        return "lo"
    if ip.startswith("fe80:"):
        return "link-local"
    if ":" in ip:
        return "ipv6"
    return "publik"


def port_listening(port):
    code, out = sysrun(["sh", "-c", f"ss -ltn 2>/dev/null | grep -E '(:{int(port)})\\b' || true"], timeout=5)
    return code == 0 and bool(out.strip())


def ssh_status():
    port = int(_sshd_cfg("Port", None) or 22)
    try:
        host_ips = subprocess.run(["hostname", "-I"], capture_output=True, text=True, timeout=5).stdout or ""
    except Exception:
        host_ips = ""
    try:
        user = os.environ.get("SUDO_USER") or getpass.getuser()
    except Exception:
        user = "gio"
    return {
        "installed": ssh_installed(),
        "active": ssh_active(),
        "port": port,
        "listening": port_listening(port),
        "user": user,
        "host": socket.gethostname(),
        "password_auth": _sshd_cfg("PasswordAuthentication") or "yes (default)",
        "root_login": _sshd_cfg("PermitRootLogin") or "prohibit-password (default)",
        "addrs": [{"addr": a, "kind": _classify_addr(a)} for a in host_ips.split()],
        "tailscale": _tailscale_state(),
        "fw": _fw_state(port),
        "backend": "pkexec",
    }


def _tailscale_state():
    st = {"service": None, "ip": None}
    code, out = sysrun(["sh", "-c", "systemctl is-active tailscaled 2>/dev/null"], timeout=8)
    st["service"] = out.strip() or ("tidak-terpasang" if code == 4 else None)
    code, out = sysrun(["sh", "-c", "tailscale ip -4 2>/dev/null"], timeout=10)
    ip4 = (out or "").strip().splitlines()
    first = (ip4[0].strip() if ip4 and ip4[0].strip() else None)
    if first and " " not in first and "." in first:
        st["ip"] = first
    return st


def _fw_state(port=22):
    if not shutil.which("ufw"):
        return {"installed": False, "active": False, "rule22": None}
    code, out = sysrun(["sh", "-c", "ufw status | grep -i '^Status' || echo 'Status: inactive'"], timeout=10)
    active = "active" in (out or "").lower() and "inactive" not in (out or "").lower()
    rule22 = None
    if active:
        code, out2 = sysrun(["sh", "-c", "ufw status | grep -E '\\b" + str(port) + "\\b' || true"], timeout=10)
        rule22 = bool((out2 or "").strip())
    return {"installed": True, "active": active, "rule22": rule22}


def ssh_ctl(action):
    if action not in ("start", "stop"):
        return {"ok": False, "err": "aksi tak dikenal (start/stop)"}
    if not ssh_installed():
        return {"ok": False, "note": "openssh-server belum terpasang — jalankan: sudo apt-get install -y openssh-server"}
    before = ssh_active()
    if action == "start":
        ts0 = _tailscale_state()
        if before and bool(ts0.get("ip")):
            return {"ok": True, "active": True, "note": "SSH & Tailscale sudah aktif"}
    if action == "stop" and not before:
        return {"ok": True, "active": False, "note": "SSH sudah tidak aktif"}

    if action == "start":
        # Rantai lengkap: tailscaled → tailscale up → ufw 22 → sshd (semua idempotent)
        shcmd = (
            "systemctl start tailscaled.service 2>/dev/null || true\n"
            "sleep 1\n"
            "tailscale up 2>/dev/null || true\n"
            "if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -qi 'active'; then ufw allow 22/tcp >/dev/null 2>&1 || true; fi\n"
            "systemctl start ssh.service 2>/dev/null || systemctl start sshd.service 2>/dev/null"
        )
    else:
        # Matikan **hanya** sshd — Tailscale tetap hidup (hanya komunikasi SSH yang ditutup)
        shcmd = "systemctl stop ssh.service ssh.socket sshd.service 2>/dev/null; exit 0"

    if os.geteuid() == 0:
        cmd, extra = ["sh", "-c", shcmd], None
    else:
        pk = shutil.which("pkexec")
        if not pk:
            return {"ok": False, "note": "pkexec tidak tersedia di sistem ini"}
        cmd, extra = ["pkexec", "sh", "-c", shcmd], _desktop_env()

    code, out = sysrun(cmd, timeout=180, extra_env=extra)
    time.sleep(1.2)
    now = ssh_active()
    ts = _tailscale_state()
    ok_main = now if action == "start" else (not now)
    ok = ok_main and (action != "start" or bool(ts["ip"]))
    note = None
    if not ok:
        bits = []
        if action == "start" and not now: bits.append("sshd tidak nyala")
        if action == "start" and not ts.get("ip"): bits.append("tailscale belum dapat IP")
        note = ("dialog polkit muncul di desktop — jawab dengan password admin klarifikasi; "
                "jika gagal/tolak/timeout, sistem tidak berubah. Rincian: " + ", ".join(bits) +
                (f" [pkexec exit {code}] {out[-200:]}" if code not in (0, None) else ""))
    return {"ok": bool(ok), "active": now, "action": action, "code": code, "tailscale": ts,
            "out": (out or "")[-500:], "note": note}

# ────────────────────────── runner tugas ──────────────────────────

_job = {"id": None, "type": None, "label": None, "running": False, "exit": None,
        "lines": [], "t0": None, "t1": None}
_job_lock = threading.Lock()


def _run_process_thread(type_, label, cmd, args, log_name):
    mkdir_logs()
    logpath = LOG_FILES.get(log_name or "server", LOG_FILES["server"])
    with open(logpath, "ab") as logf:
        logf.write(f"\n§ {time.strftime('%Y-%m-%dT%H:%M:%S%z')} {label}\n".encode())
        env = dict(os.environ, FORCE_COLOR="0", NEXT_TELEMETRY_DISABLED="1")
        try:
            p = subprocess.Popen([cmd] + list(args), cwd=APP_DIR, env=env,
                                 stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                 text=True, bufsize=1)
        except Exception as e:
            _job["running"] = False
            _job["exit"] = -1
            _job["lines"].append(f"[spawn error] {e}")
            return
        first = f"⟩ {label}\n$ {' '.join([cmd] + list(args))}\n"
        logf.write(first.encode()); logf.flush()
        with _job_lock:
            _job["lines"].append(first)
        for raw in p.stdout:
            line = raw.rstrip("\n") + "\n"
            logf.write(line.encode()); logf.flush()
            with _job_lock:
                _job["lines"].append(line)
                if len(_job["lines"]) > 1500:
                    _job["lines"][:] = _job["lines"][-1500:]
        code = p.wait()
        tail = f"\n>> {label} — exit {code} ({time.time()-_job['t0']:.1f}s)\n"
        logf.write(tail.encode())
        _job["running"], _job["exit"] = False, code
        with _job_lock:
            _job["lines"].append(tail)


def run_task(type_):
    t = TASKS.get(type_)
    if not t:
        return {"ok": False, "err": "tugas tidak dikenal"}
    with _job_lock:
        if _job["running"]:
            return {"ok": False, "busy": True, "running": _job["type"]}
        _job.update({"id": f"job_{int(time.time()*1000)}", "type": type_, "label": t["label"],
                     "running": True, "exit": None, "lines": [], "t0": time.time(), "t1": None})
    cmd, args = t["cmd"]
    threading.Thread(target=_run_process_thread, args=(type_, t["label"], cmd, args, t.get("log")),
                     daemon=True).start()
    return {"ok": True, "id": _job["id"]}

# ────────────────────────── tools: start/stop dirinya ──────────────────────────

def start_tools(port=None):
    port = int(port or PANEL_PORT)
    # stop sisa instance lama (pidfile / port)
    old = None
    try:
        with open(PANEL_PID) as f:
            old = int(json.load(f).get("pid"))
    except Exception:
        pass
    killed = []
    if old and pid_alive(old):
        try:
            os.kill(old, signal.SIGTERM)
            for _ in range(10):
                if not pid_alive(old):
                    break
                time.sleep(0.2)
            if pid_alive(old):
                os.kill(old, signal.SIGKILL)
            killed.append(old)
        except OSError:
            pass
    for p in listeners_on_port(port):
        try:
            os.kill(p, signal.SIGKILL)
            killed.append(p)
        except OSError:
            pass
    if killed:
        time.sleep(0.5)

    if _panel_http_healthy(port):
        return {"ok": True, "url": f"http://127.0.0.1:{port}", "reused": True,
                "note": f"instance sebelumnya masih hidup; URL {port}"}

    mkdir_logs()
    logf = open(LOG_FILES["panel"], "ab")
    logf.write(f"\n=== start tools {time.strftime('%Y-%m-%dT%H:%M:%S%z')} port {port} ===\n".encode())
    logf.close()
    p = subprocess.Popen([sys.executable, os.path.abspath(__file__), "serve", "-p", str(port)],
                         cwd=APP_DIR, stdout=open(LOG_FILES["panel"], "ab"), stderr=subprocess.STDOUT,
                         start_new_session=True)
    with open(PANEL_PID, "w") as f:
        json.dump({"pid": p.pid, "port": port, "startedAt": time.time()}, f)
    deadline = time.time() + 10
    while time.time() < deadline:
        if _panel_http_healthy(port):
            return {"ok": True, "pid": p.pid, "url": f"http://127.0.0.1:{port}", "killed": killed}
        if not pid_alive(p.pid):
            return {"ok": False, "err": "proses tools mati saat mulai; cek logs/panel.log"}
        time.sleep(0.3)
    return {"ok": False, "err": "tools belum menjawab; cek logs/panel.log"}


def _panel_http_healthy(port):
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/", timeout=1.5) as r:
            return r.status == 200
    except Exception:
        return False


def stop_tools():
    killed, ports = [], {PANEL_PORT}
    try:
        with open(PANEL_PID) as f:
            r = json.load(f)
        pid = int(r.get("pid"))
        ports.add(int(r.get("port") or PANEL_PORT))
        if pid_alive(pid):
            try:
                os.kill(pid, signal.SIGTERM)
                for _ in range(15):
                    if not pid_alive(pid):
                        break
                    time.sleep(0.2)
                if pid_alive(pid):
                    os.kill(pid, signal.SIGKILL)
                killed.append(pid)
            except OSError:
                pass
    except Exception:
        pass

    for port in sorted(ports):
        for p in listeners_on_port(int(port)):
            if p != os.getpid():
                try:
                    os.kill(p, signal.SIGTERM)
                    killed.append(p)
                except OSError:
                    pass
    for _ in range(8):
        time.sleep(0.2)
        if not any(pid_alive(p) for p in killed):
            break
    for p in killed:
        if pid_alive(p):
            try:
                os.kill(p, signal.SIGKILL)
            except OSError:
                pass
    try:
        os.remove(PANEL_PID)
    except OSError:
        pass
    alive_left = sorted({p for p in killed if pid_alive(p)})
    return {"ok": not alive_left, "stopped": sorted(set(killed)), "still_alive": alive_left}

# ────────────────────────── HTTP server (panel GUI) ──────────────────────────

class Panel(BaseHTTPRequestHandler):
    server_version = "EronPanel/1"

    def log_message(self, fmt, *args):  # redam log komponen HTTP
        append_log("panel", (fmt % args).encode() + b"\n")

    def _json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False, indent=2).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    # ── GET ──
    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        q = urllib.parse.parse_qs(u.query)
        get1 = lambda k, d=None: (q.get(k) or [d])[0]

        if u.path == "/":
            body = PAGE.encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if u.path == "/api/status":
            port = get1("port", APP_PORT_DEFAULT)
            return self._json(200, app_status(port))
        if u.path == "/api/health":
            base = get1("base", f"http://localhost:{APP_PORT_DEFAULT}")
            return self._json(200, {"results": health(base)})
        if u.path == "/api/job":
            with _job_lock:
                lines = list(_job["lines"])
            with _job_lock:
                t0, t1, running = _job["t0"], _job["t1"], _job["running"]
            ms = int(((t1 or time.time()) - t0) * 1000) if t0 else None
            return self._json(200, {"id": _job["id"], "type": _job["type"], "label": _job["label"],
                                    "running": running, "exit": _job["exit"], "ms": ms,
                                    "out": "".join(lines[-500:])})
        if u.path == "/api/logs":
            src = get1("source", "server")
            return self._json(200, {"source": src, "text": "\n".join(tail_log(src, int(get1("lines", 300))))})
        if u.path == "/api/env":
            return self._json(200, {"keys": env_keys()})
        if u.path == "/api/ssh":
            return self._json(200, ssh_status())
        if u.path == "/api/tasks":
            return self._json(200, [{"id": k, "label": v["label"]} for k, v in TASKS.items()])
        self._json(404, {"err": "not found"})

    # ── POST ──
    def do_POST(self):
        n = int(self.headers.get("Content-Length", "0") or 0)
        try:
            body = json.loads(self.rfile.read(n) or b"{}")
        except Exception:
            body = {}

        if self.path == "/api/server":
            return self._json(200, server_action(body.get("action"),
                                                 body.get("port") or APP_PORT_DEFAULT))
        if self.path == "/api/task":
            r = run_task(body.get("type"))
            return self._json(200 if r.get("ok") else 409, r)
        if self.path == "/api/freeport":
            return self._json(200, stop_local_server(body.get("port") or APP_PORT_DEFAULT))
        if self.path == "/api/ssh":
            return self._json(200, ssh_ctl(body.get("action") or ""))
        self._json(404, {"err": "not found"})


# ────────────────────────── halaman GUI ──────────────────────────
PAGE = r'''<!doctype html>
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
    <h2>SSH — akses penuh ke host (pkexec)</h2>
    <div class="row">
      <button class="btn go" id="b-ssh-open">🔓 Buka SSH</button>
      <button class="btn no" id="b-ssh-close">🔒 Matikan SSH</button>
      <span class="muted">Buka = tailscaled + tailscale up + ufw 22 + sshd (dialog polkit di desktop)</span>
    </div>
    <table id="sshinfo" style="margin-top:8px"></table>
    <pre id="sshhint" style="max-height:150px"></pre>
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
  sshPoll();
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
async function sshPoll(){
  try{
    const s=await j('/api/ssh');
    let t='<tr><td>Status</td><td>'+(s.installed?(s.active?'<span class="dot ok"></span>AKTIF':'<span class="dot bad"></span>tidak aktif'):'<span class="dot bad"></span>sshd tidak terpasang')+'</td></tr>';
    t+='<tr><td>Port</td><td>'+s.port+(s.listening?' (listen)':' (tidak listen)')+'</td></tr>';
    t+='<tr><td>User</td><td>ssh '+s.user+'@'+s.host+' &nbsp;(sudo → akses penuh)</td></tr>';
    t+='<tr><td>Auth</td><td>password: '+s.password_auth+' &nbsp;•&nbsp; root: '+s.root_login+'</td></tr>';
    const ts=s.tailscale||{};
    t+='<tr><td>Tailscale</td><td>'+(ts.servis||'?')+(ts.ip?' (IP '+ts.ip+')':' (tanpa IP)')+'</td></tr>';
    const fw=s.fw||{};
    t+='<tr><td>Firewall ufw</td><td>'+(!fw.installed?'tidak terpasang':(fw.active?(fw.rule22?'aktif • port 22 terbuka':'aktif • port 22 tertutup'):'tidak aktif'))+'</td></tr>';
    t+='<tr><td>Alamat</td><td>'+s.addrs.map(a=>'<span class="chip">'+a.kind+' '+a.addr+'</span>').join(' ')+'</td></tr>';
    $('#sshinfo').innerHTML=t;
    if(s.active){
      const hint=s.addrs.filter(a=>a.kind==='lan'||a.kind==='tailscale').map(a=>'ssh '+s.user+'@'+a.addr+'   # '+a.kind).join('\n');
      $('#sshhint').style.display='';$('#sshhint').textContent=hint||'# alamat host belum terdeteksi';
    }else{$('#sshhint').style.display='none';}
  }catch(e){}
}
async function sshAct(action){
  note({note:'[SSH] menunggu dialog polkit di desktop…'});
  const w=await j('/api/ssh',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action})});
  note(w.ok&&w.note?{note:'[SSH] '+w.note}:{note:'[SSH] '+(w.ok?'berubah: '+(w.active?'aktif':'tidak aktif'):'gagal — cek dialog polkit')});
  setTimeout(sshPoll,2500);
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
function note(r){if(!r)return;$('#log').textContent+=(r.err?'\n[!] '+r.err:r.note?'\n[i] '+r.note:r.ok!==undefined?'\n[OK]':'' );$('#log').scrollTop=1e9}
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
$('#b-ssh-open').onclick=()=>sshAct('start');
$('#b-ssh-close').onclick=()=>sshAct('stop');
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
</body></html>'''


# ────────────────────────── CLI ──────────────────────────

def cli(argv):
    if not argv or argv[0] in ("-h", "--help", "help"):
        print(__doc__)
        return
    cmd, rest = argv[0], argv[1:]

    def intflag(name, default):
        if name in rest:
            i = rest.index(name)
            if i + 1 < len(rest):
                try:
                    return int(rest[i + 1])
                except ValueError:
                    pass
        return default

    def strflag(name, default):
        return rest[rest.index(name) + 1] if name in rest and rest.index(name) + 1 < len(rest) else default

    port = intflag("--port", APP_PORT_DEFAULT)

    if cmd == "start":
        print(json.dumps(start_tools(intflag("--port", PANEL_PORT)), indent=2))
    elif cmd == "stop":
        print(json.dumps(stop_tools(), indent=2))
    elif cmd == "restart":
        print(json.dumps(stop_tools(), indent=2))
        print(json.dumps(start_tools(intflag("--port", PANEL_PORT)), indent=2))
    elif cmd == "status":
        print(json.dumps(app_status(port), indent=2))
    elif cmd == "serve":  # internal: panel foreground
        os.environ["ERON_PANEL_PID"] = str(os.getpid())  # lindungi diri dari utilitas
        srvport = intflag("--port", PANEL_PORT)
        print(f"Eron Control Panel  →  http://127.0.0.1:{srvport}", flush=True)
        ThreadingHTTPServer(("127.0.0.1", srvport), Panel).serve_forever()
    elif cmd == "server-start":
        print(json.dumps(start_local_server(port), indent=2))
    elif cmd == "server-stop":
        print(json.dumps(stop_local_server(port), indent=2))
    elif cmd == "server-restart":
        print(json.dumps(server_action("restart", port), indent=2))
    elif cmd == "logs":
        print("\n".join(tail_log(strflag("--source", "server"), intflag("--lines", 120))))
    elif cmd == "health":
        print(json.dumps(health(f"http://localhost:{port}"), indent=2))
    elif cmd == "ssh-status":
        print(json.dumps(ssh_status(), indent=2))
    elif cmd == "ssh-start":
        print(json.dumps(ssh_ctl("start"), indent=2))
    elif cmd == "ssh-stop":
        print(json.dumps(ssh_ctl("stop"), indent=2))
    else:
        print(__doc__)


if __name__ == "__main__":
    cli(sys.argv[1:])
