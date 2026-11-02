# Eron — Komunitas Modern (Reddit × Forum)

[![Next.js 15](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org) [![Prisma](https://img.shields.io/badge/Prisma-6-2D3748)](https://www.prisma.io) [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)](https://www.postgresql.org) [![Docker](https://img.shields.io/badge/Docker-Compose-2496ED)](https://docs.docker.com/compose)

Eron adalah **platform komunitas full-stack** — feed dengan vote, komentar berlapis, bookmark, moderasi, dashboard admin, notifikasi in-app, serta upload gambar lokal — dibangun dengan Next.js 15 (App Router), TypeScript, Prisma + PostgreSQL, Auth.js v5, Tailwind CSS + Shadcn/UI, dan siap jalan di Docker.

---

## 0. Peta proyek — tempat berkas penting & cara mengedit sendiri

```
Eron/
├─ src/                     ← ⭐ SEMUA KODE APLIKASI (mulai dari sini)
│  ├─ app/                  halaman = folder (App Router): isi file page.tsx sesuai rute
│  │  ├─ page.tsx           beranda/feed
│  │  ├─ (auth)/login       halaman login      ├ post/   detail & buat post
│  │  ├─ u/[username]       profil publik      ├ admin/  dashboard moderasi
│  │  └─ settings, search, kategori, tag, notifications, privasi, syarat, about
│  ├─ components/           komponen UI; ui/ = kit Shadcn (hati-hati: dipakai banyak tempat)
│  ├─ lib/                  utilitas (rbac, utils, image, rate-limit…)
│  └─ server/               actions/ = aksi tulis (form) · queries/ = aksi baca (data)
├─ prisma/schema.prisma     ⭐ tabel database + relasi
├─ tools/                   ⭐ kontrol mesin: eron.py (panel+CLI) · eron-mcp.py (Claude) · eron-vault.py (rahasia)
├─ public/                  aset yang dilayani situs (logo/, uploads/)
├─ "Aset baru"/             gudang sumber aset merek (favicon/logo/social/web/brand) — sumber ke public/
├─ logs/                    ✗ log runtime (diabaikan git)
├─ scripts/                 skrip util DB (db-smoke)
├─ docker-compose.yml  Dockerfile  .env.example  package.json
└─ tools/panel.mjs · serverctl.mjs   versi tools Node lama (opsional; pakai eron.py)
```

**Rumus edit mandiri (biasanya cukup ini):**

| Mau mengubah… | Edit di | Lalu |
|---|---|---|
| Tampilan/isi halaman | `src/app/<rute>/page.tsx` ybs. | dev `npm run dev` → langsung hidup; Docker: `docker compose build app && docker compose up -d app` |
| Kumpulan komponen | `src/components/…` | sama |
| Warna/tema (terang/gelap) | `src/app/globals.css` + `tailwind.config.ts` | sama |
| Tabel database | `prisma/schema.prisma` | dev `npm run db:migrate` · prod `npm run db:deploy` + `npm run db:seed` |
| Aksi tulis (form) | `src/server/actions/…` | — |
| Aksi baca (daftar/detail) | `src/server/queries/…` | — |
| Kredensial (.env) | tersegel AVORIS — lih. §11 | `python3 tools/eron.py start` auto-pulih |
| Halaman 404/empty state | ybs. + `src/app/not-found.tsx` | — |

**Cheat-sheet perintah sehari-hari:**

| Tugas | Perintah |
|---|---|
| Detak kesehatan mesin & web | `python3 tools/eron.py status` |
| Panel GUI (satu tempat semua tombol) | http://127.0.0.1:7777 |
| Dev lokal | `npm run dev` |
| Deploy Docker | `docker compose up -d --build` · matikan `docker compose down` |
| Migrasi & seed | `npm run db:deploy` · `npm run db:seed` |
| Backup ke GitHub | `git add -A && git commit -m "…" && git push` |
| Kesehatan rute web | `python3 tools/eron.py health` |

---

## Fitur

**Autentikasi & akun**
- Register & login email+password (bcrypt), Google OAuth (opsional, aktif jika env diisi)
- Verifikasi email & reset password (token hash + tautan, Resend HTTP API atau log console)
- Halaman profil (nama, username unik, bio, avatar) & role-based access: `USER`, `MODERATOR`, `ADMIN`

**Komunitas**
- Feed beranda + sorting: **Terbaru / Terpopuler / Trending** (skor minggu berjalan)
- CRUD postingan (judul, isi, tag, kategori, hingga 5 gambar), soft-delete & pin oleh moderasi
- Vote (like) postingan & komentar, bookmark, komentar berlapis (reply bertingkat), mention `@username`
- Search postingan & user, kategori + tag, halaman profil publik dengan tab (postingan/komentar/bookmark)
- Pagination, skeleton loading, error & empty states, metadata SEO + sitemap/robots

**Media**
- Upload multi-gambar postingan & avatar (`public/uploads`) via driver **LocalStorage** dengan abstraksi siap swap ke Uploadthing/R2
- Validasi magic-bytes (JPG/PNG/GIF/WebP), batas ukuran, kompresi otomatis via **sharp** (→ WebP ≤1600px / avatar 512px cover)

**Admin & moderasi** (`/admin`, hanya ADMIN/MODERATOR)
- Statistik (user, postingan, komentar, laporan), trend mingguan
- Manajemen user: ban/unban (alasan), ubah role (hanya ADMIN)
- Manajemen postingan: pin/unpin, soft-delete + restore, hard delete (ADMIN)
- Manajemen komentar: hapus
- Report system: user melaporkan post/komentar → moderasi memutuskan hapus konten / abaikan
- **Audit log** semua aksi moderasi

**Notifikasi & UX**
- Notifikasi in-app (like, komentar, reply, mention, moderasi) + badge unread di navbar (polling 30 detik)
- Dark/Light mode (next-themes), mobile-first responsive, ARIA dasar, toast (sonner)

---

## Tech stack

| Layer | Teknologi |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS, Shadcn-style UI (Radix), Lucide, Zustand, RHF + Zod |
| Backend | Server Actions + Route Handlers, middleware auth (Edge), Zod validation |
| Database | PostgreSQL + Prisma ORM (migrasi + seed) |
| Auth | Auth.js (NextAuth v5) — Credentials + Google, JWT session + PrismaAdapter untuk linking OAuth |
| Upload | Local storage driver di `public/uploads` (abstraksi → R2/Uploadthing) |
| Email | Resend REST (fallback log console) |
| Container | Docker multi-stage + Docker Compose (app + postgres + redis) |

---

## 1. Cara install (tanpa Docker)

**Prasyarat:** Node.js ≥ 20, PostgreSQL 14+ berjalan.

```bash
# 1) Clone:
git clone <repo-url> eron && cd eron

# 2) Install dependensi:
npm install

# 3) Setup environment:
cp .env.example .env
#   → isi DATABASE_URL (postgres lokal/remote),
#     generate AUTH_SECRET:  openssl rand -base64 32

# 4) Migrasi + seed data demo:
npm run db:migrate        # prisma migrate dev --name init
npm run db:seed           # users, kategori, tag, postingan, komentar, laporan

# 5) Jalankan:
npm run dev               # http://localhost:3000
```

Untuk produksi: `npm run build && npm start` (atau gunakan `prisma migrate deploy` saat deploy).

## 2. Jalankan dengan Docker (disarankan)

```bash
cp .env.example .env
# GANTI AUTH_SECRET (openssl rand -base64 32), POSTGRES_PASSWORD ikut diasosiasikan di compose
docker compose up -d --build
# app  : http://localhost:3000  (migrasi dijalankan otomatis saat start)
# pg   : localhost:5433 (host) → 5432 (internal)
# redis: localhost:6379 (opsional, cadangan rate-limit/cache)
```

Perintah berguna:

```bash
docker compose logs -f app      # ikuti log
docker compose exec app sh -c "npx prisma migrate deploy"
docker compose down -v          # reset volume db
```

## 3. Akun demo (hasil seed)

| Email | Role | Password |
|---|---|---|
| `admin@eron.dev` | ADMIN | `password123` |
| `rina@eron.dev` | MODERATOR | `password123` |
| `alice@eron.dev` | USER | `password123` |
| `bob@eron.dev` | USER | `password123` |

> Segera ganti password akun demo sebelum membuka akses publik.

## 4. Environment variables (`/.env`)

| Variabel | Wajib | Keterangan |
|---|---|---|
| `DATABASE_URL` | ✅ | Connection string PostgreSQL. Docker: `postgresql://eron:eronpass@postgres:5432/eron?schema=public` |
| `AUTH_SECRET` | ✅ | Secret signing JWT. `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | – | `true` untuk self-host / Docker |
| `APP_URL` | – | URL publik untuk link email & SEO |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | – | Aktifkan tombol Google (OAuth consent + credentials) |
| `RESEND_API_KEY` / `RESEND_FROM` | – | Kirim email verifikasi/reset via Resend; tanpa ini tautan di-log ke console server |
| `UPLOAD_MAX_SIZE` | – | Default 6 MB (byte) |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | – | Aktifkan rate-limit terdistribusi Upstash; tanpa ini fallback in-memory |

## 5. Struktur proyek

```
src/
  app/                     # App Router — pages, api, middleware assets
    (auth)/                # login, register, forgot/reset password
    admin/                 # dashboard, users, posts, comments, reports
    api/                   # auth [...nextauth], upload, verify-email, notifications
    uploads/[...path]/     # static file serving untuk file upload runtime
    kategori/ tag/ search/ u/ post/ settings/ notifications/
  components/              # navbar, post-card, comment, uploader, forms, ui/(shadcn)
  lib/                     # auth, prisma, rate-limit, storage, mail, tokens, audit, rbac, validations
  server/
    actions/               # server actions: auth, posts, comments, likes, profile, admin, notif
    queries/               # fetchers read-only: feed, admin, notifications
  middleware.ts            # proteksi route & guard role ADMIN/MODERATOR (edge)
prisma/                    # schema.prisma, migrations/, seed.ts
Dockerfile                 # multi-stage (standalone output + sharp)
docker-compose.yml         # app + postgres + redis + volume uploads
scripts/db-smoke.ts        # smoke test lapisan database
```

## 6. Menuju production hardening (checklist)

- Set `APP_URL` ke domain final, `AUTH_SECRET` kuat, ganti kredensial demo
- Gunakan HTTPS (reverse proxy) → cookie `__Secure-authjs.session-token` otomatis
- Aktifkan Upstash REST untuk rate-limit lintas instans
- Pindahkan storage ke R2/Uploadthing: tulis driver baru di `src/lib/storage.ts`

## 7. Script lengkap

```bash
npm run dev            # dev server
npm run build          # production build
npm start              # production server
npm run typecheck      # tsc --noEmit
npm run prisma:generate
npm run db:migrate     # migrate dev (development)
npm run db:deploy      # migrate deploy (produksi)
npm run db:seed        # seed data demo
npx tsx scripts/db-smoke.ts  # smoke test db
```

## 8. Keputusan teknis penting

- **Session JWT + data di Postgres**: middleware Edge membaca token tanpa koneksi DB (Prisma tidak jalan di Edge). PrismaAdapter tetap dipakai untuk menautkan akun Google; login credentials memverifikasi bcrypt di server.
- **Soft delete**: moderasi menandai `deletedAt` demi kerapian undo/restore; ADMIN bisa hard delete.
- **Rate limit**: fixed-window, Upstash REST bila tersedia, in-memory sebagai fallback (fail-open + guard memori).
- **XSS**: konten dirender sebagai teks React (tidak ada `dangerouslySetInnerHTML`), tautan & mention dikonversi ke `<a>` aman.
- **Upload**: dicek magic-bytes, disanitasi nama & path, dikompres sharp, disajikan lewat route handler `/uploads/[...]` (aman untuk Docker/standalone).
- **Realtime**: notifikasi in-app dengan polling ringan; Pusher/Socket.io mudah ditambahkan di badge + list (lib~10 LOC).

## 9. Tools utilitas — Python (GUI + CLI)

Utilitas kontrol server berbasis **Python 3** (stdlib saja, tanpa `pip install`). Tools ini punya siklus hidup sendiri: perintah **start** untuk menyalakan, **stop** untuk mematikan.

```bash
python3 tools/eron.py start    # nyalakan → panel GUI di http://127.0.0.1:7777 (daemon)
python3 tools/eron.py stop     # matikan tools
python3 tools/eron.py restart
python3 tools/eron.py status   # status web + kontainer Eron (JSON)
```

Alias npm: `npm run tools:start`, `npm run tools:stop`, `npm run tools:status`, atau `npm run tool -- <perintah>`.

**Panel GUI** (`http://127.0.0.1:7777`, hanya bind localhost) berisi: tombol **Mulai/Matikan/Restart** server, status + uptime, health check rute, viewer log (`server.log`, `docker-compose.log`, `build.log`), dan tombol utilitas: `prisma migrate status/deploy`, seed, smoke test DB, typecheck, `next build`, docker `up/build/down/logs`. Guard keamanan: panel tidak akan mematikan port yang sedang dipakai stack Docker, dan tak bisa membunuh dirinya sendiri lewat tombol.

Perintah yang dieksekusi tools langsung dari CLI:

```bash
python3 tools/eron.py server-start [--port 3000]   # nyalakan web lokal (node next start, detached)
python3 tools/eron.py server-stop
python3 tools/eron.py server-restart
python3 tools/eron.py logs [--source server|docker|build|panel] [--lines 100]
python3 tools/eron.py health     # probe rute utama + latensi
```

### SSH — akses penuh ke host (pkexec)

Panel punya kartu **SSH**: tombol **🔓 Buka SSH** / **🔒 Matikan SSH** (sama: `python3 tools/eron.py ssh-start`, `ssh-stop`, `ssh-status`). Otorisasi memakai **pkexec** — dialog admin Cinnamon/polkit muncul di desktop; cukup masukkan password sekali per aksi, tidak ada password yang disimpan tools. Statusnya menunjukkan port, user, mode auth (`PasswordAuthentication`, `PermitRootLogin`), dan semua alamat host (LAN, Tailscale, IPv6) beserta contoh perintah `ssh gio@<ip>` saat aktif.

File: `tools/eron.py` (semua-dalam-satu; CLI + panel). Versi Node yang lebih lama tetap ada di `tools/panel.mjs` + `tools/serverctl.mjs` sebagai alternatif (`npm run ctl …`). `logs/`, `.server.pid`, `.panel.pid` di-gitignore.

## 10. MCP server — Claude Desktop / Claude Code / klien MCP lain

`tools/eron-mcp.py` (transport **Streamable HTTP**, FastMCP) menyambungkan klien MCP berisi **tools**:

| Tool | Isi |
|---|---|
| `status` | app (lokal/Docker) + SSH/Tailscale/firewall |
| `server` | start/stop/restart web Eron |
| `task` | `typecheck` `build` `db:*` `smoke` `docker:*` `mcp:*` |
| `logs` | baca `server`/`docker`/`build`/`panel` log |
| `health` | probe rute + latensi |
| `ssh` | buka/matikan SSH (pkexec; dialog di desktop host) |
| `run` | perintah shell bebas di host (akses penuh) |

Endpoint (HTTPS, sertifikat Let's Encrypt otomatis dari Tailscale `serve`): `https://user-gio.tail8dc03e.ts.net/<token>/mcp` — token acak otomatis di `/.mcp-token` (gitignored). Endpoint internal `:8799` tetap HTTP untuk localhost; **akses luar lewat HTTPS tailnet (bukan internet publik)**.

Endpoint publik (untuk Claude Desktop custom connector — **dicek dari server cloud Anthropic**, bukan dari perangkat lokal, jadi harus terjangkau dari internet):

```bash
tailscale funnel --bg 8799     # HTTPS publik via edge Funnel (token tetap syarat)
tailscale serve --bg 8799      # HTTPS tailnet-only (klien lokal/Tailscale)
tailscale funnel --https=443 off   # matikan jalur publik kapan pun
tailscale serve --https=443 off    # matikan jalur tailnet
```

Keduanya memakai sertifikat Let's Encrypt `user-gio.tail8dc03e.ts.net` otomatis. Jalur publik Funnel dilindungi **token acak 24-char** di path (`/<token>/mcp`) — tanpa token, request lain hanya 404.

**Claude Desktop** (Settings → Connectors → *Add custom connector* → paste URL di atas) atau `claude_desktop_config.json`. Catatan: hostname HTTP pola `http://…` akan ditolak Claude — selalu gunakan URL HTTPS.

```json
{"mcpServers": {"eron": {"command": "npx", "args": ["-y", "mcp-remote", "https://user-gio.tail8dc03e.ts.net/<TOKEN>/mcp"]}}}
```

**Claude Code**: `claude mcp add eron --transport http "https://user-gio.tail8dc03e.ts.net/<TOKEN>/mcp"`.

## 11. Vault "AVORIS" — rahasia tersegel (Argon2id + Blengi-20 + AES-256-GCM)

`tools/eron-vault.py` (venv: `tools/.venv-vault/`) meracik enkripsi own-layers:

- **KDF**: Argon2id (64 MiB, t=4, salt acak per envelope) → `K_prf` + `K_aes`
- **Lapisan 1 "Blengi-20"**: stream-cipher racikan sendiri (SHA-256 berantai `s_i = SHA256(s_{i-1}‖ctr‖K_prf)`) — XOR
- **Lapisan 2**: AES-256-GCM, AAD = header envelope → pemalsuan byte apa pun = gagal
- **Ikat-mesin**: password KDF = fingerprint (machine-id‖host‖user‖folder proyek) —
  `.eron-vault.bin` dipindah ke mesin lain → **TIDAK terbuka** (clone/copy = mati).
- `--with-pass` menambah `.eron-vault.pass.bin` (passphrase harus diketik, tak pernah disimpan)
  → salinan pemulihan lintas-mesin. **Passphrase hilang = salinan itu tak berguna** (envelope mesin tetap bisa).

Otomatis: `tools start` → *unseal* (pulihkan `.env`, `.mcp-token` 0600), `tools stop` → *seal* (segarkan vault + sobek teks-asli), `docker:up/build` juga auto-unseal. Matikan perilaku: `export ERON_VAULT_DISABLE=1`.

```bash
tools/.venv-vault/bin/python tools/eron-vault.py status   # tanpa mengintip isi
tools/.venv-vault/bin/python tools/eron-vault.py seal --keep   # segel tanpa sobek
tools/.venv-vault/bin/python tools/eron-vault.py guard    # tenggelamkan kode tools/erd/eron*.py
```

**"EROND" (guard)**: hasil `guard` di `tools/guard/` — `eron_g.bin` = marshal(erone+eron-mcp) yang di-xor Blengi-20 lalu AES-GCM ikat-mesin; `eron-cli.py` / `eron-mcpg.py` = loader ±100 baris **tanpa kodi sumber**. Jalankan: `tools/.venv-mcp/bin/python tools/guard/eron-cli.py start`, MCP: `ERON_MCP_PORT=8799 tools/.venv-mcp/bin/python tools/guard/eron-mcpg.py`. Menyalin hasil guard ke mesin lain → kunci argon2 salah → **GCM gagal, kode mati**.

> Jujur tentang batas: **rahasia** yang tenggelam di vault aman matematika — tanpa kunci tidak bisa direkayasa balik; **kode** yang tenggelam EROND menaikkan biaya pemecahan dari "baca berkas" → "turun-mesin + dump saat-proses pada mesin ini sendiri" (root lokal selalu bisa dump memori proses — tak ada skema kode yang mana mungkin lebih). Kombinasi = informasi penting tidak muncul sebagai teks-asli di disk/repo/backup, dan tidak berguna bila berkasnya dicuri dari folder/PC lain.
