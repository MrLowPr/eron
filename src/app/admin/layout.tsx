import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BarChart3, ClipboardList, FileText, Flag, MessageSquareText, UsersRound } from "lucide-react";
import { getViewer } from "@/lib/rbac";

export const metadata: Metadata = {
  title: "Dashboard Admin",
  robots: { index: false },
};

const NAV = [
  { href: "/admin", label: "Dashboard", icon: BarChart3 },
  { href: "/admin/users", label: "Users", icon: UsersRound },
  { href: "/admin/posts", label: "Postingan", icon: FileText },
  { href: "/admin/comments", label: "Komentar", icon: MessageSquareText },
  { href: "/admin/reports", label: "Laporan", icon: Flag },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?callbackUrl=/admin");

  if (viewer.role !== "ADMIN" && viewer.role !== "MODERATOR") {
    return (
      <div className="container py-16 text-center">
        <h1 className="text-xl font-bold">Akses ditolak</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Halaman ini hanya untuk ADMIN dan MODERATOR.
        </p>
        <Link href="/" className="mt-4 inline-block text-sm text-primary hover:underline">
          ← Kembali ke beranda
        </Link>
      </div>
    );
  }

  return (
    <div className="container grid gap-6 py-6 lg:grid-cols-[210px_1fr]">
      <aside>
        <div className="rounded-xl border p-3">
          <p className="px-2 pb-2 text-xs font-semibold uppercase text-muted-foreground">
            Panel {viewer.role === "ADMIN" ? "Admin" : "Moderator"}
          </p>
          <nav className="grid gap-0.5" aria-label="Navigasi admin">
            {NAV.map((item) => (
              <NavItem key={item.href} href={item.href} icon={<item.icon className="h-4 w-4" />} label={item.label} />
            ))}
          </nav>
        </div>
        <div className="mt-4 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
          <ClipboardList className="mb-1 h-4 w-4" />
          Semua aksi moderasi dicatat pada audit log.
        </div>
      </aside>
      <section className="min-w-0">{children}</section>
    </div>
  );
}

function NavItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {icon}
      {label}
    </Link>
  );
}
