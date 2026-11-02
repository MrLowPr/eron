#!/usr/bin/env python3
"""
Eron MCP Server — penyambung Claude Desktop / Claude Code / client MCP lain
ke mesin ini (Full akses lewat tool MCP), diakses via tailnet & token.

Jalankan:
  tools/.venv-mcp/bin/python tools/eron-mcp.py          # port 8799
  ERON_MCP_PORT=9000 tools/.venv-mcp/bin/python tools/eron-mcp.py

Token: tersimpan di /.mcp-token (0600, dibuat otomatis). URL endpoint:
  http://<ip-tailscale-host>:<port>/<token>/mcp
"""

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import eron  # noqa: E402  (fungsi serverctl: status/task/ssh/log)

APP_DIR = Path(eron.APP_DIR)
TOKEN_FILE = APP_DIR / ".mcp-token"

import secrets  # noqa: E402


def get_token():
    try:
        tok = TOKEN_FILE.read_text().strip()
        if tok:
            return tok
    except OSError:
        pass
    tok = secrets.token_urlsafe(24)
    TOKEN_FILE.write_text(tok + "\n")
    TOKEN_FILE.chmod(0o600)
    return tok


TOKEN = get_token()
PORT = int(__import__("os").environ.get("ERON_MCP_PORT", "8799"))

from mcp.server.fastmcp import FastMCP  # noqa: E402

mcp = FastMCP("eron")
mcp.settings.host = "0.0.0.0"
mcp.settings.port = PORT
mcp.settings.stateless_http = True
mcp.settings.streamable_http_path = f"/{TOKEN}/mcp"


def _job_run(type_):
    """Jalankan satu tugas TASKS secara sinkron & tampilkan output (untuk MCP)."""
    import subprocess, threading, time
    t = eron.TASKS.get(type_)
    if not t:
        return f"tugas tidak dikenal: {type_}"
    cmd, args = t["cmd"]
    env = dict(**__import__("os").environ, FORCE_COLOR="0", NEXT_TELEMETRY_DISABLED="1")
    try:
        p = subprocess.run([cmd] + list(args), cwd=APP_DIR, env=env,
                           capture_output=True, text=True, timeout=1800)
    except subprocess.TimeoutExpired:
        return f"{t['label']}: TIME-OUT (1800s)"
    out = (p.stdout or "") + (p.stderr or "")
    return f"exit {p.returncode}\n{out[-8000:]}"


@mcp.tool()
def status() -> str:
    """Status server web Eron (lokal/Docker), kontainer, dan SSH/Tailscale."""
    import json
    return json.dumps({
        "app": eron.app_status(),
        "ssh": eron.ssh_status(),
    }, ensure_ascii=False, indent=2)


@mcp.tool()
def server(action: str, port: int = 3000) -> str:
    """Kontrol server web Eron lokal: 'start' | 'stop' | 'restart'."""
    import json
    r = eron.server_action(action.lower(), port)
    if action == "stop":
        r = {**r, "penting": "stop menolak bila web masih jalan dari Docker"}
    return json.dumps(r, indent=2)


@mcp.tool()
def task(type_: str) -> str:
    """Utilitas satu-tombol: typecheck | build | db:status | db:deploy | db:seed | smoke | docker:up | docker:build | docker:down | docker:logs."""
    return _job_run(type_)


@mcp.tool()
def logs(source: str = "server", lines: int = 200) -> str:
    """Pengolahan log (server | docker | build | panel)."""
    return "\n".join(eron.tail_log(source, int(lines)))


@mcp.tool()
def health() -> str:
    """Proba kesehatan rute utama web Eron + latensi."""
    import json
    return json.dumps(eron.health(), indent=2)


@mcp.tool()
def ssh(action: str) -> str:
    """Buka/'start' atau matikan/'stop' SSH (pkexec — dialog password muncul di desktop host; tailskill ikut nyala saat start)."""
    import json
    return json.dumps(eron.ssh_ctl(action.lower()), ensure_ascii=False, indent=2)


@mcp.tool()
def run(command: str, timeout: int = 120) -> str:
    """Jalankan perintah shell di host (akses penuh). Gunakan hati-hati."""
    import subprocess
    try:
        p = subprocess.run(["sh", "-c", command], cwd=APP_DIR,
                           capture_output=True, text=True, timeout=max(5, int(timeout)))
        out = (p.stdout or "") + (p.stderr or "")
        return f"exit {p.returncode}\n{out[-10000:]}"
    except subprocess.TimeoutExpired:
        return f"TIME-OUT setelah {timeout}s"


if __name__ == "__main__":
    print(f"Eron MCP →  port {PORT}  endpoint:  /{TOKEN}/mcp", flush=True)
    mcp.run(transport="streamable-http")
