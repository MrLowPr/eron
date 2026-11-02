# Eron — Komunitas Modern (Reddit × Forum)

[![Next.js 15](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org) [![Prisma](https://img.shields.io/badge/Prisma-6-2D3748)](https://www.prisma.io) [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)](https://www.postgresql.org) [![Docker](https://img.shields.io/badge/Docker-Compose-2496ED)](https://docs.docker.com/compose)

Eron adalah **platform komunitas full-stack** — feed dengan vote, komentar berlapis, bookmark, moderasi, dashboard admin, notifikasi in-app, serta upload gambar lokal — dibangun dengan Next.js 15 (App Router), TypeScript, Prisma + PostgreSQL, Auth.js v5, Tailwind CSS + Shadcn/UI, dan siap jalan di Docker.

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

File: `tools/eron.py` (semua-dalam-satu; CLI + panel). Versi Node yang lebih lama tetap ada di `tools/panel.mjs` + `tools/serverctl.mjs` sebagai alternatif (`npm run ctl …`). `logs/`, `.server.pid`, `.panel.pid` di-gitignore.
