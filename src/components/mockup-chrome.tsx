"use client";

/**
 * 🧭 Chrome halaman tamu — navbar & footer dari mockup `Halaman Tamu-html.zip`.
 * - `ChromeGate`: saat tamu membuka `/`, navbar/footer global disembunyikan
 *   (kembali null) karena GuestLanding merender versi mockup lengkap dengan
 *   animasi reveal (rv) di dalam root animasinya.
 * - `MockupNavbar` / `MockupFooter`: markup persis mockup; hanya tujuan tautan
 *   Masuk/Daftar yang diarahkan ke rute nyata (/login, /register).
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

export function ChromeGate({
  guest,
  variant,
  children,
}: {
  guest: boolean;
  variant: "top" | "bottom";
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (guest && pathname === "/" && (variant === "top" || variant === "bottom")) return null;
  return <>{children}</>;
}

export function MockupNavbar({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <header
      className={`sticky top-0 z-10 flex justify-center border-b border-border bg-background/85 backdrop-blur ${className ?? ""}`}
      style={style}
    >
      <div className="flex h-14 w-full max-w-[1400px] items-center gap-4 px-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-[18px] font-bold tracking-[-0.01em] text-foreground"
        >
          <span
            aria-hidden
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-[15px] font-bold text-primary-foreground"
          >
            E
          </span>
          Eron
        </Link>
        <nav className="ml-2 flex flex-wrap items-center gap-1">
          <a href="#feed" className="rounded-[10px] px-3 py-2 text-sm font-medium text-muted-foreground">
            Jelajahi
          </a>
          <a href="#fitur" className="rounded-[10px] px-3 py-2 text-sm font-medium text-muted-foreground">
            Fitur
          </a>
        </nav>
        <div className="flex-1" />
        <Link
          href="/login"
          className="inline-flex h-9 items-center rounded-[10px] border border-border bg-background px-4 text-sm font-medium"
        >
          Masuk
        </Link>
        <Link
          href="/register"
          className="inline-flex h-9 items-center rounded-[10px] bg-primary px-4 text-sm font-medium text-primary-foreground shadow-[0_1px_2px_rgba(0,0,0,0.12)]"
        >
          Daftar
        </Link>
      </div>
    </header>
  );
}

export function MockupFooter({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <footer
      id="kaki"
      className={`flex justify-center border-t border-border ${className ?? ""}`}
      style={style}
    >
      <div className="flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-2 px-4 py-5 text-[13px] text-muted-foreground">
        <span>Eron — Tempat komunitas modern diskusi &amp; berbagi.</span>
        <span>© 2026 Eron</span>
      </div>
    </footer>
  );
}
