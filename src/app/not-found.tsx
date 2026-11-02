import { Ghost, Home } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <div className="rounded-full bg-muted p-4">
        <Ghost className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-bold">404 — konten tidak ditemukan</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Halaman mungkin dihapus, diprivasi, atau URL-nya salah ketik.
      </p>
      <Button asChild>
        <Link href="/">
          <Home />
          Kembali ke beranda
        </Link>
      </Button>
    </div>
  );
}
