"use client";

import { useEffect } from "react";
import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // dsb: log untuk observability server/client
    console.error("[error-boundary]", error);
  }, [error]);

  return (
    <div className="container flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <h2 className="text-xl font-bold">Ada yang error</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Kami terekam masalahnya. Coba lagi, atau kembali ke beranda bila masih bermasalah.
      </p>
      <div className="flex gap-2">
        <Button onClick={reset} variant="outline">
          <RefreshCcw />
          Coba lagi
        </Button>
        <Button onClick={() => (window.location.href = "/")} variant="ghost">
          Ke beranda
        </Button>
      </div>
    </div>
  );
}
