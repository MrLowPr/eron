# 🎨 Gaya Visual Web Eron — Deskripsi Akurat

> **Disarikan langsung dari kode:** `src/app/globals.css`, `tailwind.config.ts`, komponen UI (`src/components/ui/*`), navbar/footer, post-card, dan layout halaman. Setiap nilai di bawah diverifikasi dari sumber, bukan dugaan.
> **Identitas:** *Eron* — "Tempat komunitas modern diskusi & berbagi" — platform komunitas ala Reddit: kartu feed, vote, bookmark, komentar berlapis.

---

## 1) Rasa besar: "Indigo Clean Forum"

| Kompas | Nilai |
|---|---|
| Tipografi | **Sans-serif sistem** — `ui-sans-serif, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial` — tanpa font eksternal, antialiased |
| Karakter | Bersih dan padat: teks bodi 12–14px, judul feed besar & bold (`text-2xl`), teks sekunder warna redup |
| Bentuk | Soft-rounded — radius dasar `0.65rem` (kartu, tombol, input membulat tapi tidak seperti pil) |
| Kontras | Teks gelap di atas putih; mode gelap latar `≈#09090B` dengan teks `≈#FAFAFA`; garis pemisah sangat halus |
| Warna | Netral (putih–zinc) + **satu warna merek: indigo**. Kategori/tag muncul lewat chip lembut, tidak ada warna liar lain |

---

## 2) Palet warna (CSS variables di `globals.css`)

### ☀️ Mode terang
| Token | HSL | ≈ Hex | Digunakan untuk |
|---|---|---|---|
| `--background` | `0 0% 100%` | `#FFFFFF` | Latar semua halaman |
| `--foreground` | `240 10% 3.9%` | `#09090A` | Teks utama (hampir hitam) |
| `--primary` | `243 75% 59%` | `#4F46E5` | Tombol merek, link, focus ring — **indigo utama** |
| `--primary/foreground` | `0 0% 100%` | `#FFFFFF` | Teks di atas tombol |
| `--accent` | `243 75% 95%` | `#E2E3FB` | Latar hover (ghost button, item menu) |
| `--secondary` / `--muted` | `240 4.8% 95.9%` | `#F4F4F5` | Badge sekunder, placeholder, chip |
| `--muted-foreground` | `240 3.8% 46.1%` | `#71717A` | Teks sekunder: tanggal, bio, footer |
| `--destructive` | `0 84.2% 60.2%` | `#EF4444` | Aksi merah: hapus, ban, tolak laporan |
| `--border` / `--input` | `240 5.9% 90%` | `#E4E4E7` | Garis kartu, navbar, form |
| `--ring` | `243 75% 59%` | `#4F46E5` | Focus ring — konsisten indigo |

### 🌙 Mode gelap (class `.dark`, switch via `next-themes`)
| Token | HSL | ≈ Hex | Catatan |
|---|---|---|---|
| `--background` | `240 10% 3.9%` | `#09090B` | Sangat gelap, tanpa tint berwarna |
| `--card` | `240 10% 5.9%` | `#0E0E11` | Kartu *sedikit* lebih terang dari latar — pemisah halus |
| `--primary` | `243 75% 66%` | `#6366F1` | Indigo dipaikkan lebih terang agar terbaca |
| `--accent` | `243 30% 20%` | `#22234D` | Hover gelap lembut, tidak menyilaukan |
| `--border` | `240 3.7% 15.9%` | `#26262A` | Garis samar |

Notifikasi popup: Sonner (toast), tema mengikuti app. Toggle tema ada di gear-menu navbar.

---

## 3) Tata letak halaman

| Area | Pola |
|---|---|
| Navbar | `sticky top-0`, tinggi 56px, garis bawah, `bg-background/80` + `backdrop-blur` — semi-transparan kabut |
| Konten | `container` terpusat (max `1400px`, padding 1rem); grid dua kolom `1fr 280px` di desktop: feed kiri, sidebar kanan |
| Kartu post | Border tipis; hover → border menyala `primary/40`; baris meta (chip kategori + tanggal), judul `text-lg semibold` (profil `text-base`), cuplikan konten `line-clamp-2`, footer: avatar 24px + nama + ikon aksi (suara/bookmark/komentar) |
| Badge "Pinned" | Varian warning `amber-500/15` dengan ikon Pin |
| Sidebar | Kartu kecil: kategori (dengan jumlah), "Sedang ramai" (post minggu ini), statistik komunitas |
| Footer | Tunggal, ramping, teks `muted-foreground`, tanpa dekorasi berat |
| State kosong | `EmptyState`: ikon besar + judul singkat + CTA |

---

## 4) Komponen bawaan (shadcn/ui + Radix)

| Komponen | Gaya khas |
|---|---|
| `Button` | 6 varian: `default` (indigo solid + shadow), `outline`, `ghost`, `secondary`, `link` (underline), `destructive`; size `default/sm/lg/icon` |
| `Badge` | Kecil `rounded-md text-xs font-semibold`; varian `success` (`emerald-500/15`) & `warning` (`amber-500/15`) memakai latar transparan-soft; `destructiveSoft` merah 10% |
| `Card` | Border 1px + radius besar; aksen indigo muncul saat hover |
| `Dialog/Select/Tabs/Dropdown` | Primitives Radix + plugin `tailwindcss-animate` |
| `Avatar` | Lingkaran; fallback huruf awal (`getInitials`); 24px di list, 32px+ di profil |
| `Skeleton` | Placeholder muram saat memuat |
| Ikon | **lucide-react** seragam (Pin, CalendarDays, PenSquare, MousePointerClick, dll.), ukuran 12–16px |

---

## 5) Bahasa & tone konten UI

- Indonesia santai tapi sopan contohnya: "Feed Komunitas", "Diskusi terbaru seputar teknologi, hobi, dan karya kreatif", "Kembali ke feed", "Buat Postingan", "Laporkan".
- Headline pendek; tombol aksi memakai ikon `PenSquare` (+).
- Angka diformat singkat (`formatNumber`: 1.2k), waktu relatif (`timeAgo`: "5 menit lalu").

---

## 6) Aksesibilitas & detail teknis

- Semua kontrol interaktif: `focus-visible:ring-2` warna indigo + offset background.
- Seleksi teks memakai `::selection bg-primary/25` — terasa satu tema.
- Transisi lembut `transition-colors` di kartu & tombol; tanpa animasi berlebihan (hanya accordion Radix yang beranimasi).
- Ikon app lengkap: `site.webmanifest`, favicon multi-ukuran, `apple-touch-icon`, maskable icon, mstile.
- Radius dan warna dikendalikan lewat CSS variables — naikkan radius atau swap palet cukup di `globals.css`, seluruh komponen ikut.

---

## 📌 Ringkasan satu kalimat
**Eron = forum ala Reddit bersih berbasis shadcn/ui: latar putih (atau zinc sangat gelap), sans-serif tegas, kartu border tipis radius lembut, satu warna merek indigo untuk semua aksi, ikon lucide, bahasa Indonesia ringan.**

*Dokumen gaya ini disusun dari kode per 2026-11-04. Sumber kebenaran palet: `src/app/globals.css`.*
