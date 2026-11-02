"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, RotateCcw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { setBanAction, setRoleAction } from "@/server/actions/admin";
import { Input } from "@/components/ui/input";
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
import { ROLES } from "@/lib/constants";

export function BanToggle({
  userId,
  banned,
  canTarget,
}: {
  userId: string;
  banned: boolean;
  canTarget: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  if (!canTarget) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={banned ? "outline" : "ghost"} size="sm" className={banned ? "" : "text-destructive hover:text-destructive"}>
          {banned ? <RotateCcw /> : <Ban />}
          {banned ? "Unban" : "Ban"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{banned ? "Pulihkan akun" : "Ban akun"}</DialogTitle>
          <DialogDescription>
            {banned
              ? "User dapat kembali login dan berkomentar."
              : "User ditandai banned: Login diblokir dan konten disembunyikan dari feed publik."}
          </DialogDescription>
        </DialogHeader>
        {!banned && (
          <Input
            placeholder="Alasan ban (opsional)"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            aria-label="Alasan ban"
          />
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Batal
          </Button>
          <Button
            variant={banned ? "default" : "destructive"}
            disabled={pending}
            onClick={() => {
              setPending(true);
              void setBanAction({ userId, banned: !banned, reason: reason || undefined }).then((result) => {
                setPending(false);
                if (result?.error) {
                  toast.error(result.error);
                  return;
                }
                toast.success(banned ? "Akun dipulihkan" : "Akun dibanned");
                setOpen(false);
                router.refresh();
              });
            }}
          >
            {banned ? <RotateCcw /> : <Ban />}
            {banned ? "Pulihkan" : "Ban"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function RoleSelect({
  userId,
  role,
  disabled,
}: {
  userId: string;
  role: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(role);
  const [pending, setPending] = useState(false);

  if (disabled) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        value={value}
        disabled={pending}
        onValueChange={async (next) => {
          setValue(next);
          setPending(true);
          const result = await setRoleAction({ userId, role: next as (typeof ROLES)[number] });
          setPending(false);
          if (result?.error) {
            setValue(role);
            toast.error(result.error);
            return;
          }
          toast.success("Role diperbarui");
          router.refresh();
        }}
      >
        <SelectTrigger className="h-8 w-[130px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ROLES.map((r) => (
            <SelectItem key={r} value={r}>
              {r}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {pending && <ShieldCheck className="h-3.5 w-3.5 animate-pulse text-muted-foreground" />}
    </div>
  );
}
