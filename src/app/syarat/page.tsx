import type { Metadata } from "next";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Syarat dan Ketentuan",
  description: `Aturan penggunaan ${SITE.name}.`,
};

const UPDATED = "2 November 2026";

export default function TermsPage() {
  return (
    <div className="container max-w-2xl space-y-6 py-10 text-sm leading-relaxed">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Syarat dan Ketentuan</h1>
        <p className="text-muted-foreground">Terakhir diperbarui: {UPDATED}</p>
      </header>

      <p>
        Dengan membuat akun atau memakai {SITE.name}, kamu setuju dengan aturan berikut. Jika tidak
        setuju, mohon jangan menggunakan layanan ini.
      </p>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">1. Akun</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Berikan informasi yang benar dan jaga kerahasiaan passwordmu.</li>
          <li>Kamu bertanggung jawab atas aktivitas yang terjadi di akunmu.</li>
          <li>Satu orang sebaiknya hanya memakai satu akun.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">2. Aturan konten</h2>
        <p>Dilarang membagikan konten yang:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>melecehkan, mengancam, atau menyerang seseorang atau kelompok;</li>
          <li>mengandung kebencian berdasarkan suku, agama, ras, gender, atau golongan;</li>
          <li>melanggar hukum, hak cipta, atau privasi orang lain;</li>
          <li>berisi spam, penipuan, atau tautan berbahaya;</li>
          <li>bersifat pornografi atau eksploitasi, terutama yang melibatkan anak.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">3. Kepemilikan konten</h2>
        <p>
          Kontenmu tetap milikmu. Dengan mengunggahnya, kamu memberi {SITE.name} izin untuk menampilkan
          dan menyimpannya agar layanan dapat berjalan. Pastikan kamu berhak membagikan apa yang kamu unggah.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">4. Moderasi</h2>
        <p>
          Pengguna dapat melaporkan konten yang melanggar. Moderator dapat menghapus konten, membatasi,
          atau memblokir akun yang melanggar aturan, dengan atau tanpa pemberitahuan sebelumnya.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">5. Penggunaan yang dilarang</h2>
        <p>
          Dilarang mengganggu atau mencoba menembus keamanan layanan, mengambil data secara massal tanpa
          izin, atau memakai layanan untuk tujuan yang melanggar hukum.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">6. Batasan tanggung jawab</h2>
        <p>
          Layanan disediakan apa adanya. Konten dibuat oleh pengguna dan tidak selalu mencerminkan
          pandangan {SITE.name}. Kami tidak menjamin layanan selalu tersedia tanpa gangguan.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">7. Perubahan dan hukum yang berlaku</h2>
        <p>
          Syarat ini dapat diperbarui sewaktu-waktu. Pemakaian layanan setelah perubahan berarti kamu
          menerimanya. Syarat ini tunduk pada hukum yang berlaku di Republik Indonesia.
        </p>
      </section>
    </div>
  );
}
