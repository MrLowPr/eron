"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Flag, X } from "lucide-react";
import { toast } from "sonner";
import { resolveReportAction } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ReportResolve({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);

  const run = (resolution: "REMOVE_CONTENT" | "DISMISS") => {
    setPending(true);
    void resolveReportAction({ reportId, resolution, note: note || undefined }).then((result) => {
      setPending(false);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(resolution === "REMOVE_CONTENT" ? "Konten dihapus" : "Laporan diabaikan");
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Catatan resolusi (opsional)"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        className="h-8 w-48"
        aria-label="Catatan resolusi"
      />
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run("DISMISS")}>
        <X />
        Abaikan
      </Button>
      <Button size="sm" variant="destructive" disabled={pending} onClick={() => run("REMOVE_CONTENT")}>
        <Flag />
        Hapus konten
      </Button>
      {pending && <Check className="h-4 w-4 animate-spin text-muted-foreground" />}
    </div>
  );
}
