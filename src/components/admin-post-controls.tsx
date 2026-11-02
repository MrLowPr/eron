"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pin, PinOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { setPinnedAction, deletePostAction } from "@/server/actions/posts";
import { Button } from "@/components/ui/button";

export function PinPostButton({ postId, pinned, disabled }: { postId: string; pinned: boolean; disabled?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending || disabled}
      onClick={() => {
        setPending(true);
        void setPinnedAction(postId, !pinned).then((result) => {
          setPending(false);
          if (result?.error) toast.error(result.error);
          else {
            toast.success(!pinned ? "Post dipin" : "Pin dilepas");
            router.refresh();
          }
        });
      }}
    >
      {pinned ? <PinOff /> : <Pin />}
      {pinned ? "Unpin" : "Pin"}
    </Button>
  );
}

export function DeletePostButton({ postId }: { postId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-destructive hover:text-destructive"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void deletePostAction(postId).then((result) => {
          setPending(false);
          if (result?.error) toast.error(result.error);
          else {
            toast.success("Postingan dihapus");
            router.refresh();
          }
        });
      }}
    >
      <Trash2 />
      Hapus
    </Button>
  );
}
