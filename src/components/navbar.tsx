import Link from "next/link";
import { Suspense } from "react";
import { PenSquare, Sparkles } from "lucide-react";
import { getViewer } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { SearchInput } from "@/components/search-input";
import { MobileNavMenu } from "@/components/mobile-nav-menu";

export async function Navbar() {
  const viewer = await getViewer();
  const viewerInfo = viewer ? { username: viewer.username, role: viewer.role } : null;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center gap-3">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight" aria-label="Eron — beranda">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-fuchsia-500 text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="text-lg">Eron</span>
        </Link>

        <div className="hidden flex-1 md:block">
          <Suspense fallback={<div className="h-9 max-w-md" />}>
            <SearchInput />
          </Suspense>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/post/new">
              <PenSquare />
              Posting
            </Link>
          </Button>

          <ThemeToggle />

          {viewer ? (
            <>
              <NotificationBell />
              <UserMenu viewer={viewer} />
            </>
          ) : (
            <div className="hidden items-center gap-1.5 sm:flex">
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Daftar</Link>
              </Button>
            </div>
          )}

          <MobileNavMenu viewer={viewerInfo} />
        </div>
      </div>
    </header>
  );
}
