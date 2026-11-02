"use client";

import * as React from "react";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { toggleBookmarkAction } from "@/server/actions/likes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function BookmarkButton({
  postId,
  initiallyBookmarked,
}: {
  postId: string;
  initiallyBookmarked: boolean;
}) {
  const router = useRouter();
  const [bookmarked, setBookmarked] = React.useState(initiallyBookmarked);
  const [pending, startTransition] = React.useTransition();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      aria-pressed={bookmarked}
      aria-label={bookmarked ? "Hapus dari bookmark" : "Bookmark postingan"}
      disabled={pending}
      onClick={() => {
        const next = !bookmarked;
        setBookmarked(next);
        startTransition(async () => {
          const result = await toggleBookmarkAction(postId);
          if (result?.error) {
            setBookmarked(initiallyBookmarked);
            router.refresh();
            toast.error(result.error);
            return;
          }
          toast[next ? "success" : "info"](
            next ? "Ditambahkan ke bookmark" : "Dihapus dari bookmark"
          );
        });
      }}
    >
      <Bookmark className={cn("h-4 w-4", bookmarked && "fill-current text-primary")} />
    </Button>
  );
}
