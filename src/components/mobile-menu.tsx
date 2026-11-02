import Link from "next/link";
import {
  FilePlus2,
  Home,
  Inbox,
  LogIn,
  Settings,
  ShieldCheck,
  UserPlus,
  UserRound,
  Search,
} from "lucide-react";

type ViewerInfo = {
  username: string;
  role: string;
} | null;

export function MobileMenu({ viewer }: { viewer: ViewerInfo }) {
  return (
    <div className="grid gap-1">
      <Link href="/" className="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-accent">
        <Home className="h-4 w-4 text-muted-foreground" />
        Beranda
      </Link>
      <Link href="/search" className="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-accent">
        <Search className="h-4 w-4 text-muted-foreground" />
        Cari
      </Link>
      <div className="my-1 h-px bg-border" />
      {viewer ? (
        <>
          <Link href="/post/new" className="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-accent">
            <FilePlus2 className="h-4 w-4 text-muted-foreground" />
            Buat Postingan
          </Link>
          <Link href="/notifications" className="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-accent">
            <Inbox className="h-4 w-4 text-muted-foreground" />
            Notifikasi
          </Link>
          <Link href={`/u/${viewer.username}`} className="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-accent">
            <UserRound className="h-4 w-4 text-muted-foreground" />
            Profil Saya
          </Link>
          <Link href="/settings/profile" className="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-accent">
            <Settings className="h-4 w-4 text-muted-foreground" />
            Pengaturan
          </Link>
          {(viewer.role === "ADMIN" || viewer.role === "MODERATOR") && (
            <Link href="/admin" className="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-accent">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              Dashboard {viewer.role === "ADMIN" ? "Admin" : "Moderasi"}
            </Link>
          )}
        </>
      ) : (
        <>
          <Link href="/login" className="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-accent">
            <LogIn className="h-4 w-4 text-muted-foreground" />
            Login
          </Link>
          <Link href="/register" className="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-accent">
            <UserPlus className="h-4 w-4 text-muted-foreground" />
            Daftar
          </Link>
        </>
      )}
    </div>
  );
}
