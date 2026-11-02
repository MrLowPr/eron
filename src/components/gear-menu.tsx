"use client";

import { useState, useTransition } from "react";
import { Settings } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { redeemCode } from "@/server/actions/redeem";
import { WEB_UPDATES } from "@/data/updates";

/**
 * Gear ⚙ di navbar — untuk SEMUA pengunjung (login/guest).
 * Isi: daftar "Update web" (src/data/updates.ts) + form "Redeem kode"
 * (logika: src/server/actions/redeem.ts).
 */
export function GearMenu() {
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Pengaturan & update web">
          <Settings />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-center justify-between">
          Update web
          <Badge variant="secondary">{WEB_UPDATES[0]?.version ?? "—"}</Badge>
        </DropdownMenuLabel>
        <div className="max-h-64 space-y-3 overflow-y-auto px-2 pb-2">
          {WEB_UPDATES.slice(0, 5).map((u) => (
            <div key={u.version} className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">{u.version}</span>
                <span className="text-xs text-muted-foreground">{u.date}</span>
              </div>
              <ul className="list-disc pl-4 text-xs text-foreground/80">
                {u.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Redeem kode</DropdownMenuLabel>
        <form
          className="flex gap-2 px-2 pb-2"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await redeemCode(code);
              setMsg(r.message);
              if (r.ok) {
                toast.success(r.message);
                setCode("");
              }
            });
          }}
        >
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Masukkan kode"
            maxLength={32}
            disabled={pending}
            className="h-8"
          />
          <Button type="submit" size="sm" className="h-8 shrink-0" disabled={pending || code.trim().length === 0}>
            Tukar
          </Button>
        </form>
        {msg && <p className="px-2 pb-2 text-xs text-muted-foreground">{msg}</p>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
