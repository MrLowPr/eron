import Link from "next/link";
import { SITE } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="border-t py-8">
      <div className="container flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
        <div className="font-semibold text-foreground">
          {SITE.name} <span className="font-normal text-muted-foreground">· {SITE.tagline}</span>
        </div>
        <nav className="flex flex-wrap justify-center gap-4">
          <Link href="/" className="hover:text-foreground">
            Feed
          </Link>
          <Link href="/kategori/diskusi" className="hover:text-foreground">
            Kategori
          </Link>
          {/* ══ link "Cari" disembunyikan dulu (searchbar juga di-hide di navbar) ══ */}
          <Link href="/privasi" className="hover:text-foreground">
            Privasi
          </Link>
          <Link href="/syarat" className="hover:text-foreground">
            Syarat
          </Link>
        </nav>
        <p className="text-xs">© {new Date().getFullYear()} {SITE.name}.</p>
      </div>
    </footer>
  );
}
