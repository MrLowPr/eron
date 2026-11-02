#!/usr/bin/env python3
"""
Eron Vault — "AVORIS" (rahasia) + "EROND" (kode terikat-mesin)
==============================================================
Skema dua lapis racikan sendiri:

  KDP        Argon2id (salt 16B acak per envelope, mem 64 MiB, t=4, p=2,
             panjang 64 B) → dibelah: K_prf(32B) + K_aes(32B)
  Lapisan 1 — "Blengi-20": stream-cipher racikan sendiri (SHA-256 berantai):
               s0 = SHA256(K_prf ‖ domain ‖ salt)
               s_i = SHA256(s_{i-1} ‖ counter_le64 ‖ K_prf)
               keystream = concat(s_i) → XOR plaintext
  Lapisan 2 — AES-256-GCM (AEAD); AAD = header utuh (magic‖kind‖salt‖nonce)
             byte mana pun diubah → dekripsi gagal total.
  Password   kind=1: fingerprint mesin (machine-id‖host‖user‖folder proyek)
             → berkas dicuri/clone ke mesin lain = MATI, tak terbuka.
             kind=2: passphrase rahasia (tidak pernah disimpan) → salinan
             pemulihan bila mesin mati permanen. Repo TIDAK menyimpan ini.

Envelope "AVORIS1":  b"AVORIS1" | kind(1B) | salt(16B) | nonce(12B) | ct
Envelope "ERONGRD1": b"ERONGRD1" | salt(16B) | nonce(12B) | ct  (kode modules)
Payload: JSON {"v":1,"files":{<path>:<teks>}}

perintah:
  init [--purge] [--with-pass] [--force]   segel .env + .mcp-token
  seal  [--keep]    (alias: lock)          segarkan vault ← berkas kini,
                                           lalu sobek teks-asli (default)
  unseal   (alias: open)                    pulihkan berkas yang hilang saja
                                           (yang ada TIDAK ditimpa → merge)
  status                                   ringkasan                        }
  guard                                    tenggelamkan tools/eron*.py →
                                           tools/guard/* (byte terenkripsi,
                                           terikat mesin ini)
Jalankan:  tools/.venv-vault/bin/python tools/eron-vault.py <command>
"""
import base64
import getpass
import hashlib
import json
import marshal
import os
import struct
import sys
import types
from pathlib import Path

HERE = Path(__file__).resolve().parent
APP_DIR = HERE.parent
VAULT_M = APP_DIR / ".eron-vault.bin"        # ikat-mesin (dipakai ke git)
VAULT_P = APP_DIR / ".eron-vault.pass.bin"   # passphraseEnvelope (opsional)
GUARD_DIR = HERE / "guard"
PROTECTED = (".env", ".mcp-token")
MAGIC = b"AVORIS1"

from argon2.low_level import hash_secret_raw, Type  # noqa: E402
from cryptography.hazmat.primitives.ciphers.aead import AESGCM  # noqa: E402

# ── fingerprint mesin ────────────────────────────────────────────────────────
def _machine_id():
    for p in ("/etc/machine-id", "/var/lib/dbus/machine-id"):
        try:
            v = Path(p).read_text().strip()
            if v:
                return v
        except OSError:
            pass
    return "tanpa-machine-id"

def _fingerprint(domain: bytes) -> bytes:
    # HATI-HATI: stub EROND di bawah HARUS persis memproduksi string ini.
    parts = [domain.decode(), "eron-proyek", _machine_id(),
             os.uname().nodename, os.environ.get("USER", ""), str(APP_DIR)]
    return "|".join(parts).encode()

# ── KDP Argon2id → (K_prf, K_aes) ────────────────────────────────────────────
def _kdf(password: bytes, salt: bytes):
    raw = hash_secret_raw(secret=password, salt=salt, time_cost=4,
                          memory_cost=65536, parallelism=2, hash_len=64,
                          type=Type.ID)
    return raw[:32], raw[32:]

# ── Lapisan 1: stream "Blengi-20" ────────────────────────────────────────────
def blengi_stream(k_prf: bytes, salt: bytes, n: int, domain: bytes) -> bytes:
    out = bytearray()
    prev = hashlib.sha256(k_prf + domain + salt).digest()
    c = 0
    while len(out) < n:
        prev = hashlib.sha256(prev + struct.pack("<Q", c) + k_prf).digest()
        out += prev
        c += 1
    return bytes(out[:n])

# ── Lapisan 2: AES-256-GCM; AAD = header ────────────────────────────────────
def _xor(a: bytes, b: bytes) -> bytes:
    return bytes(p ^ q for p, q in zip(a, b))

def _seal(kind: int, payload: bytes, password: bytes, magic=MAGIC) -> bytes:
    salt, nonce = os.urandom(16), os.urandom(12)
    k_prf, k_aes = _kdf(password, salt)
    x = _xor(payload, blengi_stream(k_prf, salt, len(payload), magic))
    header = magic + bytes([kind]) + salt + nonce
    return header + AESGCM(k_aes).encrypt(nonce, x, header[:36] if magic == MAGIC else header)

def _open(env: bytes, password: bytes, magic=MAGIC):
    if magic == MAGIC:
        if env[:7] != MAGIC:
            raise ValueError("bukan envelope AVORIS")
        kind, salt, nonce, ct = env[7], env[8:24], env[24:36], env[36:]
        aad = env[:36]
    else:
        if env[:8] != magic:
            raise ValueError("bukan bundle " + magic.decode())
        kind, salt, nonce, ct = 0, env[8:24], env[24:36], env[36:]
        aad = env[:36]
    k_prf, k_aes = _kdf(password, salt)
    x = AESGCM(k_aes).decrypt(nonce, ct, aad)
    return kind, _xor(x, blengi_stream(k_prf, salt, len(x), magic)).decode()

# ── payload & envelopes ─────────────────────────────────────────────────────
def _passphrase(prompt="passphrase vault: "):
    pp = os.environ.get("ERON_VAULT_PASS")
    if pp:
        return pp
    if not sys.stdin.isatty():
        return ""     # mode otomatis: TIDAK nanya
    return getpass.getpass(prompt)

def _write_envelopes(files: dict):
    payload = json.dumps({"v": 1, "files": files}, ensure_ascii=False).encode()
    notes = []
    VAULT_M.write_bytes(_seal(1, payload, _fingerprint(MAGIC)))
    VAULT_M.chmod(0o600)
    # envelope-passphrase: hanya diperbarui bila passphrase tersedia di sesi
    if VAULT_P.exists():
        pp = _passphrase("passphrase (segarkan salinan pemulihan, ENTER=lewatkan): ")
        if pp:
            VAULT_P.write_bytes(_seal(2, payload, pp.encode()))
            VAULT_P.chmod(0o600)
        else:
            notes.append("salinan-passphrase TIDAK disegarkan (old payload dipertahankan)")
    return notes

def _collect_files():
    return {rel: (APP_DIR / rel).read_text() for rel in PROTECTED if (APP_DIR / rel).exists()}

# ── perintah ────────────────────────────────────────────────────────────────
def cmd_init(rest):
    if VAULT_M.exists() and "--force" not in rest:
        sys.exit("vault sudah ada — pakai 'seal' utk segarkan, '--force' demi-baru")
    if "--with-pass" in rest:
        pp = getpass.getpass("passphrase (MULAI BARU, jangan sampai hilang!): ")
        if getpass.getpass("ulang passphrase: ") != pp:
            sys.exit("passphrase tidak cocok — batal")
        os.environ["ERON_VAULT_PASS"] = pp
        VAULT_P.write_bytes(_seal(2, json.dumps({"v": 1, "files": {}}).encode(), pp.encode()))
    files = _collect_files()
    if not files:
        sys.exit("tidak ada berkas rahasia: " + ", ".join(PROTECTED))
    _write_envelopes(files)
    note = ", ".join(files.keys())
    if "--purge" in rest:
        for rel in files:
            (APP_DIR / rel).unlink()
        note += " → teks-asli disobek (pulih: unseal)"
    print(f"AV init: {len(files)} berkas tersegel [{note}]")

def cmd_seal(rest):
    cur = _read_payload(VAULT_M).get("files", {}) if VAULT_M.exists() else {}
    files = dict(cur)
    files.update(_collect_files())
    if not files:
        sys.exit("tidak ada yang disegel")
    extra = _write_envelopes(files)
    note = f"AV seal: {len(files)} berkas digendok"
    if "--keep" not in rest:
        for rel in files:
            (APP_DIR / rel).unlink(missing_ok=True)
        note += ", teks-asli disobek"
    if extra:
        note += "; " + "; ".join(extra)
    print(note)

def _read_payload(env_path: Path) -> dict:
    return json.loads(_open(env_path.read_bytes(), _fingerprint(MAGIC))[1] if env_path == VAULT_M
                      else _open(env_path.read_bytes(), _passphrase().encode())[1])

def cmd_unseal(rest):
    if VAULT_M.exists():
        pay = _read_payload(VAULT_M)
        src = "envelope-mesin"
    elif VAULT_P.exists():
        pp = _passphrase()
        if not pp:
            sys.exit("butuh passphrase (ERON_VAULT_PASS atau tanya-stealth)")
        pay = _read_payload(VAULT_P)
        src = "envelope-passphrase"
    else:
        sys.exit("tidak ada vault (.eron-vault.bin) — jalankan init dulu")
    files = pay.get("files", {})
    n = 0
    for rel, val in files.items():
        p = APP_DIR / rel
        if not p.exists():
            p.write_text(val)
            p.chmod(0o600)
            n += 1
    print(f"AV unseal: {n}/{len(files)} berkas dipulihkan [{src}]")

def cmd_status(rest):
    out = {"envelope_mesin": VAULT_M.exists(),
           "envelope_passphrase": VAULT_P.exists(),
           "lapisan": "Argon2id + Blengi-20 + AES-256-GCM"}
    if VAULT_M.exists():
        try:
            pay = _read_payload(VAULT_M)
            out["files"] = {}
            for rel, val in pay.get("files", {}).items():
                p = APP_DIR / rel
                disk = p.read_text() if p.exists() else None
                if disk is None:
                    out["files"][rel] = "tersegel (teks-asli absent)"
                elif disk == val:
                    out["files"][rel] = "teks-asli ada (sama)"
                else:
                    out["files"][rel] = "teks-asli ada (BEDA — jalankan seal)"
        except Exception:
            out["mesin_cocok"] = False
            out["catatan"] = "envelope tak terbuka oleh mesin/folder ini (salinan luar?)"
    print(json.dumps(out, ensure_ascii=False, indent=2))

# ── EROND: tenggelamkan kode tools/eron*.py ─────────────────────────────────
_GUARD_MAGIC = b"ERONGRD1"
_STUB = '''#!/usr/bin/env python3
"""Loader EROND — KODE ASLI TIDAK IKUT (byte terenkripsi, terikat mesin)."""
import base64, hashlib, json, marshal, os, struct, sys, types
from pathlib import Path
from argon2.low_level import hash_secret_raw, Type
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

HERE = Path(__file__).resolve().parent
APPDIR = HERE.parent.parent  # guard/ → proyek (sama dengan APP_DIR di eron.py)
DOMAIN = @@DOMAIN@@        # bytes
BUNDLE = @@BUNDLE@@

def _machine_id():
    for p in ("/etc/machine-id", "/var/lib/dbus/machine-id"):
        try:
            v = Path(p).read_text().strip()
            if v: return v
        except OSError:
            pass
    return "tanpa-machine-id"

def _kdf(pw, salt):
    raw = hash_secret_raw(secret=pw, salt=salt, time_cost=4, memory_cost=65536,
                          parallelism=2, hash_len=64, type=Type.ID)
    return raw[:32], raw[32:]

def _stream(k_prf, salt, n):
    out = bytearray()
    prev = hashlib.sha256(k_prf + DOMAIN + salt).digest()
    c = 0
    while len(out) < n:
        prev = hashlib.sha256(prev + struct.pack("<Q", c) + k_prf).digest()
        out += prev; c += 1
    return bytes(out[:n])

def _xor(a, b):
    return bytes(p ^ q for p, q in zip(a, b))

def boot():
    raw = (HERE / BUNDLE).read_bytes()
    if raw[:8] != @@MAGICB@@:
        sys.exit("korup bundle guardian")
    salt, nonce = raw[8:24], raw[24:36]
    fp = ("|".join([DOMAIN.decode(), "eron-proyek", _machine_id(),
                    os.uname().nodename, os.environ.get("USER", ""),
                    str(APPDIR)]).encode())
    k_prf, k_aes = _kdf(fp, salt)
    x = AESGCM(k_aes).decrypt(nonce, raw[36:], raw[:36])
    return json.loads(_xor(x, _stream(k_prf, salt, len(x))).decode())["mods"]

def _make(name, info, autoplay):
    real = APPDIR / info["f"]
    mod = types.ModuleType("__main__" if autoplay else name)
    mod.__dict__["__name__"] = "__main__" if autoplay else name
    mod.__dict__["__file__"] = str(real)
    mod.__dict__["__package__"] = None
    code = marshal.loads(base64.b64decode(info["c"]))
    exec(code, mod.__dict__)
    if not autoplay:
        sys.modules[name] = mod
    return mod

def run(idx, argv):
    eron, mcp = boot()
    if idx == 0:                       # CLI eron (perintah __main__ jalan sendiri)
        _make("eron", eron, True)
    else:                              # MCP server
        _make("eron", eron, False)     # daftarkan modul dulu (definisi saja)
        sys.argv = [str(APPDIR / mcp["f"])] + argv
        _make("__main__", mcp, True)

if __name__ == "__main__":
    run(int(sys.argv[1]), sys.argv[2:])
'''

def cmd_guard(rest):
    mods = []
    for rel in ("tools/eron.py", "tools/eron-mcp.py"):
        src = (APP_DIR / rel).read_text()
        code = compile(src, str(APP_DIR / rel), "exec")
        mods.append({"f": rel, "c": base64.b64encode(marshal.dumps(code)).decode()})
    payload = json.dumps({"v": 1, "mods": mods}).encode()
    salt, nonce = os.urandom(16), os.urandom(12)
    k_prf, k_aes = _kdf(_fingerprint(_GUARD_MAGIC), salt)
    x = _xor(payload, blengi_stream(k_prf, salt, len(payload), _GUARD_MAGIC))
    header = _GUARD_MAGIC + salt + nonce
    GUARD_DIR.mkdir(exist_ok=True)
    (GUARD_DIR / "eron_g.bin").write_bytes(header + AESGCM(k_aes).encrypt(nonce, x, header))
    os.chmod(GUARD_DIR, 0o700)

    stub = (_STUB.replace("@@DOMAIN@@", 'b"ERONGRD1"')
                 .replace("@@BUNDLE@@", '"eron_g.bin"')
                 .replace("@@MAGICB@@", 'b"ERONGRD1"'))
    (GUARD_DIR / "eron_g.py").write_text(stub)
    (GUARD_DIR / "eron-cli.py").write_text(
        'import sys\n'
        'from pathlib import Path\n'
        'HERE = Path(__file__).resolve().parent\n'
        'sys.path.insert(0, str(HERE))\n'
        'import eron_g\n'
        'sys.exit(eron_g.run(0, sys.argv[1:]))\n')
    (GUARD_DIR / "eron-mcpg.py").write_text(
        'import sys\n'
        'from pathlib import Path\n'
        'HERE = Path(__file__).resolve().parent\n'
        'sys.path.insert(0, str(HERE))\n'
        'import eron_g\n'
        'sys.exit(eron_g.run(1, sys.argv[1:]))\n')
    print("EROND: tools/guard/{eron_g.bin, eron_g.py, eron-cli.py, eron-mcpg.py} — "
          "kode terenkripsi Blengi-20+AES-GCM, terikat mesin ini")

MAIN = {"init": cmd_init, "seal": cmd_seal, "lock": cmd_seal,
        "unseal": cmd_unseal, "open": cmd_unseal, "status": cmd_status,
        "guard": cmd_guard}

if __name__ == "__main__":
    argv = sys.argv[1:]
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__)
        sys.exit(0)
    cmd, rest = argv[0], argv[1:]
    fn = MAIN.get(cmd)
    if not fn:
        print("perintah tidak dikenal:", cmd)
        sys.exit(2)
    fn(rest)
