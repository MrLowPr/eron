import Link from "next/link";
import { PenSquare } from "lucide-react";
import { getViewer } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";
import { GearMenu } from "@/components/gear-menu";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNavMenu } from "@/components/mobile-nav-menu";

export async function Navbar() {
  const viewer = await getViewer();
  const viewerInfo = viewer ? { username: viewer.username, role: viewer.role } : null;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center gap-3">
        <Link href="/" className="flex items-center" aria-label="Eron, beranda">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/eron-logo-horizontal-terang.svg"
            alt="Eron"
            width={152}
            height={32}
            className="h-8 w-auto dark:hidden"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/eron-logo-horizontal-gelap.svg"
            alt=""
            aria-hidden="true"
            width={152}
            height={32}
            className="hidden h-8 w-auto dark:block"
          />
        </Link>

        {/* ══ SEARCHBAR — disembunyikan dulu (uraikan kembali bila sudah siap) ══
        <div className="hidden flex-1 md:block">
          <Suspense fallback={<div className="h-9 max-w-md" />}>
            <SearchInput />
          </Suspense>
        </div>
        */}
        <div className="flex-1" />

        <div className="ml-auto flex items-center gap-1.5">
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/post/new">
              <PenSquare />
              Posting
            </Link>
          </Button>

          <ThemeToggle />
          <GearMenu />

          {/* ══ LOGIN/DAFTAR — disembunyikan dulu; endpoint tetap aktif via URL langsung ══ */}
          {viewer && (
            <>
              <NotificationBell />
              <UserMenu viewer={viewer} />
            </>
          )}

          <MobileNavMenu viewer={viewerInfo} />
        </div>
      </div>
    </header>
  );
}
