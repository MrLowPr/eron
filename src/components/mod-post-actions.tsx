"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pin, PinOff, Pencil, Trash2, RotateCcw, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  deletePostAction,
  setPinnedAction,
  restorePostAction,
} from "@/server/actions/posts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function ModPostActions({
  postId,
  pinned,
  showEdit,
  showDelete,
  showHardDelete,
  showPin,
  className,
}: {
  postId: string;
  pinned: boolean;
  showEdit?: boolean;
  showDelete?: boolean;
  showHardDelete?: boolean;
  showPin?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {showEdit && (
        <Button asChild variant="ghost" size="icon" className="h-7 w-7" aria-label="Edit postingan" title="Edit">
          <a href={`/post/${postId}/edit`}>
            <Pencil className="h-4 w-4" />
          </a>
        </Button>
      )}

      {showPin && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label={pinned ? "Lepas pin" : "Pin postingan"}
          title={pinned ? "Lepas pin" : "Pin ke atas feed"}
          disabled={pending}
          onClick={() => {
            setPending(true);
            void setPinnedAction(postId, !pinned).then((result) => {
              setPending(false);
              if (result?.error) toast.error(result.error);
              else {
                toast.success(!pinned ? "Postingan dipin" : "Pin dilepas");
                router.refresh();
              }
            });
          }}
        >
          {pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
        </Button>
      )}

      {showDelete && (
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                aria-label="Hapus postingan"
                title="Hapus"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Hapus postingan?</DialogTitle>
                <DialogDescription>
                  Postingan disembunyikan dari feed. Untuk moderasi, penulis akan diberi tahu (alasan opsional).
                </DialogDescription>
              </DialogHeader>
              <Input
                placeholder="Alasan penghapusan (opsional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                aria-label="Alasan penghapusan"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                  Batal
                </Button>
                {showHardDelete && (
                  <Button
                    variant="destructive"
                    disabled={pending}
                    onClick={() => {
                      setPending(true);
                      void deletePostAction(postId, { hard: true, reason: reason || undefined }).then((result) => {
                        setPending(false);
                        if (result?.error) {
                          toast.error(result.error);
                          return;
                        }
                        toast.success("Postingan dihapus permanen");
                        setDeleteOpen(false);
                        router.push("/");
                        router.refresh();
                      });
                    }}
                  >
                    <XCircle />
                    Permanen
                  </Button>
                )}
                <Button
                  variant="destructive"
                  disabled={pending}
                  onClick={() => {
                    setPending(true);
                    void deletePostAction(postId, { reason: reason || undefined }).then((result) => {
                      setPending(false);
                      if (result?.error) {
                        toast.error(result.error);
                        return;
                      }
                      toast.success("Postingan dihapus");
                      setDeleteOpen(false);
                      router.push("/");
                      router.refresh();
                    });
                  }}
                >
                  <XCircle />
                  Hapus
                </Button>
              </div>
            </DialogContent>
          </Dialog>
      )}
    </div>
  );
}

export function RestorePostButton({ postId }: { postId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void restorePostAction(postId).then((result) => {
          setPending(false);
          if (result?.error) toast.error(result.error);
          else {
            toast.success("Postingan dipulihkan");
            router.refresh();
          }
        });
      }}
    >
      <RotateCcw />
      Restore
    </Button>
  );
}
