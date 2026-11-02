"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Badge notifikasi: polling ke /api/notifications/count setiap 30 detik. */
export function UnreadCount() {
  const [count, setCount] = React.useState(0);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/count", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { count: number };
      setCount(data.count ?? 0);
    } catch {
      // offline / network error → keep previous value
    }
  }, []);

  React.useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 30_000);
    return () => clearInterval(interval);
  }, [load]);

  if (count <= 0) return null;

  return (
    <span
      className={cn(
        "absolute -right-0 -top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground",
        count > 9 && "text-[9px]"
      )}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
