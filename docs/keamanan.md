# 🔐 Catatan Keamanan: Pembatasan Login (throttle senyap)

> DOKUMEN INTERNAL — untuk pemilik & staf. Tidak tampil ke pengguna.

## Perilaku

Endpoint `POST /api/auth/callback/credentials` (dan semua jalur login lain yang
melewati provider credentials) dibatasi di `authorize` (`src/lib/auth.ts`):

| Kunci | Batas | Jendela |
|---|---|---|
| `auth:ip:<ip>` (IP turunan proxy via `clientIpFromHeaders`) | 30 | 10 menit |
| `auth:email:<email>` (ternormalisasi: trim + lowercase sejak `loginSchema`) | 10 | 10 menit |

Melewati batas → `authorize` mengembalikan `null` → Auth.js menolak login
**secara senyap**: respons persis seperti password salah
(`302 → /login?error=CredentialsSignin`).

## Kenapa tidak ada HTTP 429

Auth.js tidak menyediakan kanal HTTP 429 untuk credentials. Pembatasan ini
sengaja *indistinguishable* dari password salah — penebak tidak mendapatkan
sinyal bahwa dia mendekati/menabrak batas. Uji hidup 2026-11-06:

- 10× password salah → semua 302 `error=CredentialsSignin`
- percobaan ke-11 dengan **password benar** → tetap ditolak, tanpa sesi

⇒ temuan pengujian black-box "36+ percobaan tanpa 429" tidak berarti pembatas
absen; penilaian 429 adalah metrik yang keliru untuk jalur ini. Kemungkinan
besar serangan tersebut juga tidak pernah mencapai `authorize` (CSRF gagal).

## Sisi penyimpanan penghitung

`src/lib/rate-limit.ts` mencoba Upstash Redis REST dulu, jika env tidak terisi
fallback ke memori proses:

- **Saat ini `UPSTASH_REDIS_REST_URL` / `…_TOKEN` = string kosong** (file `.env`,
  nilai `""`) ⇒ penghitung hanya **in-memory per instance**.
- Konsekuensi: restart server/deploy menghapus penghitung; beberapa instance
  memiliki penghitung masing-masing. Untuk login demo ini diterima.
- Mengaktifkan terdistribusi: isi kedua env Upstash dengan kredensial Redis
  nyata — **tanpa perubahan kode**. Kunci Redis `rl:<key>:<epoch-jendela>`.

## Efek samping yang diketahui

- Pengguna asli yang salah mengetik password ≥10× dalam 10 menit ikut terkunci
  senyap selama sisa jendela (tanpa pesan khusus). Diterima demi desain senyap.
- `salah` yang dihitung adalah percobaan yang *mencapai* `authorize`;
  request tanpa CSRF valid tidak membebani penghitung.

## Sering berlaku juga

Jalur lain memakai limiter yang sama (`rateLimit`) dengan kunci berbeda —
mis. `post:user:*` (6/jam), `comment:user:*` (10/menit), kuota tamu
`post:tamu:*` (6/jam per perangkat) dan `comment:tamu:*` (10/menit per
perangkat). Satu-satunya hal yang mereka butuhkan agar berlaku lintas instance
adalah Upstash env yang terisi.
