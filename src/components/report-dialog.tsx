"use client";

import * as React from "react";
import { Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createReportAction } from "@/server/actions/profile";
import { REPORT_REASONS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const REASON_LABELS: Record<string, string> = {
  SPAM: "Spam",
  HARASSMENT: "Pengganggu / bullying",
  INAPPROPRIATE: "Konten tidak pantas",
  MISINFORMATION: "Misinformasi",
  OFF_TOPIC: "Tidak relevan",
  OTHER: "Lainnya",
};

export function ReportFooterButtons({
  postId,
  commentId,
  viewerId,
  className,
}: {
  postId?: string;
  commentId?: string;
  viewerId: string | null;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState<string>("SPAM");
  const [detail, setDetail] = React.useState("");
  const [pending, setPending] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={className}
          disabled={!viewerId}
          aria-label="Laporkan konten"
          title={viewerId ? "Laporkan konten" : "Login dulu untuk melaporkan"}
        >
          <Flag className="h-4 w-4" />
          Laporkan
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Laporkan konten</DialogTitle>
          <DialogDescription>
            Laporan akan terkirim ke tim moderasi. Berikan alasan yang jelas agar tindak lanjut lebih cepat.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Alasan</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {REASON_LABELS[r] ?? r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Detail (opsional)</Label>
            <Textarea
              rows={3}
              maxLength={500}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="Tambahkan konteks singkat…"
            />
          </div>

          <Button
            className="w-full"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              const result = await createReportAction({
                postId,
                commentId,
                reason: reason as (typeof REPORT_REASONS)[number],
                detail: detail || undefined,
              });
              setPending(false);
              if (result.error) {
                toast.error(result.error);
                return;
              }
              toast.success(result.success ?? "Laporan terkirim");
              setOpen(false);
              setDetail("");
            }}
          >
            {pending && <Loader2 className="animate-spin" />}
            Kirim laporan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
