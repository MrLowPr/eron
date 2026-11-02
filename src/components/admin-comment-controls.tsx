"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteCommentAction } from "@/server/actions/comments";
import { Button } from "@/components/ui/button";

export function DeleteCommentButton({ commentId }: { commentId: string }) {
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
        void deleteCommentAction(commentId, "Melanggar ketentuan komunitas").then((result) => {
          setPending(false);
          if (result?.error) toast.error(result.error);
          else {
            toast.success("Komentar dihapus");
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
