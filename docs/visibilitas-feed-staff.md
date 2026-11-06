# 🔒 Visibilitas Feed Staff — Admin & Moderator

> **Status:** aktif · **Diterapkan:** 2026-11-04 · **Skop:** seluruh permukaan feed & profil
> Postingan milik akun `ADMIN` dan `MODERATOR` dianggap *konten internal*: tidak dipublikasikan terhadap penonton berperan `USER` maupun tamu (pengunjung tanpa sesi). Staff sendiri tetap memperlihatkan semuanya.

---

## 📋 Matriks siapa melihat apa

| Permukaan | 👑 ADMIN / MODERATOR | 👤 USER | 👻 Tamu (tanpa login) |
|---|:---:|:---:|:---:|
| Feed utama (`/`) | ✅ semua | ⛔ hanya member | ⛔ hanya member |
| Feed kategori (`/kategori/*`) | ✅ semua | ⛔ hanya member | ⛔ hanya member |
| Feed tag (`/tag/*`) | ✅ semua | ⛔ hanya member | ⛔ hanya member |
| Pencarian (`/search`) | ✅ semua | ⛔ hanya member | ⛔ hanya member |
| Detail postingan staff via link langsung | ✅ terbuka | 🔴 `404` | 🔴 `404` |
| `generateMetadata` (judul/OG tab browser) | ✅ tampil | 🛡 diblank | 🛡 diblank |
| Daftar postingan di profil staff (`/u/*`) | ✅ tampil | 🟡 kosong | 🟡 kosong |
| Sidebar "Sedang ramai" + statistik minggu/bulan | ✅ lengkap | 🟡 hitungan member saja | 🟡 hitungan member saja |
| Post terkait (rekomendasi di halaman post) | ✅ semua | 🛡 staff disaring | 🛡 staff disaring |
| Sitemap (indeks mesin pencari) | 🚫 tak diindeks | 🚫 tak diindeks | 🚫 tak diindeks |

**⭕ Tidak berubah:** komentar staff di postingan member tetap tampil (sungguh aman buat diskusi), notifikasi ikut perilaku lama, dan profil header staff (nama, bio, avatar) tetap publik.

---

## 🧠 Cara kerja (tiga fondasi)

1. **Sumber kebenaran dari DB:** peran penonton dibaca dari database saat request berjalan — bukan dari klaim token JWT (`isStaffViewer` meniru pola RBAC di `src/lib/rbac.ts`), sehingga perubahan peran/ban berlaku seketika.
2. **Filter dalam query, bukan pelapis UI:** postingan staff tidak tersedia di **level Prisma `where`** (`author.role NOT IN (ADMIN, MODERATOR)`), bukan sekadar disembunyikan di tampilan. Tidak bisa dilewati via pengelabuan halaman.
3. **Ujung tetap konsisten:** daftar, halaman detail, profil, sidebar, dan sitemap memakai aturan yang sama — tidak ada jalur kebocoran datanya.

---

## ✅ Hasil uji asli (akun `admin` vs `alice`, data live)

```text
feed      — staff/utama: 8 (total 8), USER: 6 (total 6), tamu: 6 (total 6)
Detail post — USER: 404 ✔ | tamu: 404 ✔ | ADMIN: terlihat ✔
Profil admin — dilihat USER: 0 (harus 0), ADMIN: 2
Sidebar — postsMinggu: staff 7 / USER 6
Related post untuk USER: 0 item — postingan staff tercampur: 0 (harus 0)
```

Judul feed perspektif `USER` (semua penulis `USER`):
```text
• Setup dev environment favorit kamu 2026?
• Karir pivot dari designer ke front-end: worth it?
• Showcase: dashboard monitoring mini buat server pribadi
• Game indie 2026 yang wajib kamu coba
• PostgreSQL vs MySQL 2026: mana yang kamu pilih?
• Tips migrasi dari CRA ke Next.js 15 tanpa drama
```
→ "Selamat datang di Eron! 🎉" (pin) dan thread moderasi **tidak muncul** bagi `USER`.

---

## 🗂️ Berkas yang tersentuh

| Berkas | Perubahan |
|---|---|
| `src/server/queries/posts.ts` | Konstanta `STAFF_ROLES`, helper `staffFilter()`, `isStaffViewer(viewerId)`; filter dipasang di `getFeed`, `getPostDetail`, `getRelatedPosts`, `getUserPosts`, `getSidebarData(viewerId)` |
| `src/app/page.tsx` | teruskan id penonton ke `getSidebarData` |
| `src/app/kategori/[slug]/page.tsx` | Sama seperti halaman utama |
| `src/app/post/[id]/page.tsx` | `generateMetadata` memakai cek role inline (judul tak bocor) |
| `src/app/sitemap.ts` | Import & pakai `staffFilter` — post staff tak diindeks |

---

## 🧪 Cara menguji ulang

```bash
npm run typecheck     # harus lulus tanpa galat
```

Uji manual paling cepat (read-only):
1. Buka `/` sebagai tamu → feed tanpa postingan staff; login sebagai `alice` → hasil sama (6 postingan).
2. Buka `/u/admin` sebagai `alice` → daftar postingan kosong; sebagai admin → 2 postingan.
3. Salin link salah satu postingan admin (dari sesi admin), buka di incognito → `404`.
4. Bandingkan sidebar "Sedang ramai": sesi admin vs sesi `alice`.

> ❗ Jangan jalankan `npm run db:seed` — itu akan menata ulang data live di Supabase Cloud.

---

## ❓ Pertanyaan yang mungkin muncul

| Pertanyaan | Jawaban |
|---|---|
| USER punya bookmark lama ke postingan staff, tetap bisa dibuka? | Ya — item bookmark di halaman miliknya sendiri tetap tampil (simpanan pribadi, bukan feed). |
| Notifikasi lama mengarah ke postingan staff? | Tautan menuju `404` — wajar karena konten tak lagi dapat dilihat. |
| Jumlah postingan staff ikut terhitung di kategori sidebar? | Ya — judul tak terlihat; yang terbaca hanya angka. |
| Bagaimana mematikan fitur? | Buang baris `where.author = staffFilter()` / pasangan `...staffFilter()` pada 5 fungsi + cek inline di `generateMetadata` + `sitemap.ts`. |

---

*Dokumentasi ini dihasilkan dari implementasi nyata di `src/server/queries/posts.ts`. Lihat juga README §3 untuk kebijakan publikasi kredensial demo.*
