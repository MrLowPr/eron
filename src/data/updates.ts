/**
 * ⭐ DAFTAR UPDATE WEB — EDIT TERSERAH ANDA DI SINI
 *
 * Masukkan catatan BARU di elemen paling atas (_urut dari terbaru).
 * Gear ⚙ di navbar menampilkan maksimal 5 catatan terata teratas.
 *
 * format: { version: "v?.?", date: "Ttiles-Bulan-Tahun", notes: ["…"] }
 */
export type WebUpdate = {
  version: string;
  date: string;
  notes: string[];
};

export const WEB_UPDATES: WebUpdate[] = [
  {
    version: "v1.0",
    date: "2026-11-02",
    notes: [
      "Rilis: feed + vote + komentar berlapis + bookmark",
      "Notifikasi in-app & moderasi (admin dashboard)",
      "Upload gambar otomatis kompresi WebP",
    ],
  },
  // Tambah catatan update berikutnya DI ATAS item ter suede (baris teratas)…
];
