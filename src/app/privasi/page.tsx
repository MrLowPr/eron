import type { Metadata } from "next";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description: `Cara ${SITE.name} mengumpulkan, memakai, dan melindungi data pribadimu.`,
};

const UPDATED = "2 November 2026";

export default function PrivacyPage() {
  return (
    <div className="container max-w-2xl space-y-6 py-10 text-sm leading-relaxed">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Kebijakan Privasi</h1>
        <p className="text-muted-foreground">Terakhir diperbarui: {UPDATED}</p>
      </header>

      <p>
        Halaman ini menjelaskan data apa yang dikumpulkan {SITE.name}, untuk apa data itu dipakai, dan
        pilihan yang kamu punya. Dengan memakai {SITE.name}, kamu menyetujui praktik yang dijelaskan di sini.
      </p>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">1. Data yang kami kumpulkan</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Data akun: nama, username, alamat email, dan password. Password disimpan dalam bentuk hash, tidak pernah sebagai teks asli.</li>
          <li>Data profil opsional: foto profil dan bio.</li>
          <li>Konten yang kamu buat: postingan, komentar, gambar yang diunggah, vote, dan bookmark.</li>
          <li>Jika kamu masuk dengan Google: nama, email, dan foto profil dari akun Google tersebut.</li>
          <li>Data teknis: alamat IP dan informasi permintaan dipakai untuk pembatasan laju dan keamanan, dan dapat tercatat di log server.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">2. Cara kami memakai data</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Menjalankan akun dan fitur komunitas.</li>
          <li>Mengirim email penting seperti verifikasi email dan reset password.</li>
          <li>Mencegah spam, penyalahgunaan, dan melakukan moderasi.</li>
        </ul>
        <p>Kami tidak menjual data pribadimu.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">3. Yang tampil untuk publik</h2>
        <p>
          Nama, username, foto profil, bio, serta postingan dan komentarmu dapat dilihat siapa saja.
          Alamat emailmu tidak ditampilkan di profil publik.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">4. Cookie dan penyimpanan lokal</h2>
        <p>
          Kami memakai cookie sesi agar kamu tetap masuk, dan penyimpanan peramban untuk preferensi
          tampilan seperti tema gelap atau terang. Kami tidak memakai cookie pelacak iklan.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">5. Pihak ketiga</h2>
        <p>
          Data dapat diproses oleh penyedia infrastruktur dan penyedia layanan pengiriman email yang
          kami gunakan, serta Google bila kamu memilih masuk dengan Google. Mereka hanya menerima data
          yang diperlukan untuk menjalankan layanannya.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">6. Keamanan dan penyimpanan</h2>
        <p>
          Kami menerapkan langkah teknis yang wajar untuk melindungi datamu. Tidak ada sistem yang
          sepenuhnya aman, jadi gunakan password yang kuat dan unik. Data disimpan selama akunmu aktif
          atau selama diperlukan untuk keamanan dan kewajiban hukum.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">7. Hakmu</h2>
        <p>
          Kamu dapat mengubah profilmu, serta menghapus postingan dan komentarmu sendiri. Untuk meminta
          salinan data, koreksi, atau penghapusan akun, hubungi pengelola {SITE.name}.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">8. Perubahan kebijakan</h2>
        <p>
          Kebijakan ini dapat diperbarui. Tanggal pembaruan terakhir selalu tercantum di bagian atas halaman ini.
        </p>
      </section>
    </div>
  );
}
