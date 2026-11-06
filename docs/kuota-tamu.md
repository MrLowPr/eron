# 👻 Kuota Tamu Senyap (20 kontribusi)

> DOKUMEN INTERNAL — untuk pemilik & staf. Tidak ada bagian dari dokumen ini yang
> tampil ke pengguna.

## Semantik

| Hal | Nilai |
|---|---|
| Identitas tamu | fingerprint = SHA-256(IP turunan proxy + User-Agent), 32 hex |
| Batas kontribusi | **20 kumulatif** (postingan + komentar digabung) |
| Penyimpanan | tabel `GuestQuota` (tahan restart — bukan cookie) |
| Penulis konten | akun bayangan `tamu-<8hex>` (role `USER`, nama tampil **"Tamu"**) |
| Setelah kuota habis | permukaan berperilaku seperti "butuh login" biasa |
| Pesan kepada tamu | generik — *tidak menyebut angka kuota* |

## Kenapa "senyap"

Permintaan produk: tamu tidak diberi tahu eksplisit bahwa ada batas. Yang mereka
alami hanya berpindah dari editor ke portal login secara wajar saat batas
tercapai. Kalimat pasca-batas memakai tagihan login standar:

- postingan: `Masuk untuk melanjutkan menulis`
- komentar: `Masuk untuk melanjutkan berkomentar`

## Titik penerapan

1. `src/middleware.ts` — `/post/new` dikecualikan dari `needsAuth` (gate kuota pindah ke server-page).
2. `src/app/post/new/page.tsx` — tamu sisa>0 → editor; sisa=0 → `redirect('/login?callbackUrl=/post/new')`.
3. `src/server/actions/posts.ts` — `createPostAction` menerima tamu (slot atomic + rate limit 6/men jam per perangkat).
4. `src/server/actions/comments.ts` — `createCommentAction` sama (10/menit per perangkat).
5. `src/lib/guest-quota.ts` — pembangkit fingerprint, penulis bayangan, konsumsi slot atomic (`updateMany ... used < 20`).

## Kelemahan yang diterima

- Mengganti User-Agent/IP (proksi) melihat pembilahang kuota baru — fitur ini "soft limit", bukan pagar mutlak.
- Kontribusi bayangan muncul publik sebagai penulis "Tamu"; moderator masih mengeceknya dari panel admin biasa (soft delete berlaku).
- Upload gambar tamu ditolak API upload (butuh sesi) — editor tamu nyatanya tanpa gambar.

## Gotcha perawatan

- Penulis bayangan tidak punya password/email asli: login/reset-password untuk
  email `tamu-…@tamu.eron.invalid` selalu gagal aman.
- Hapus akun `tamu-*` di panel admin = kontennya ikut terhapus (onDelete cascade).
