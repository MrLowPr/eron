"use client";

import * as React from "react";
import { Flame } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { togglePostLikeAction } from "@/server/actions/likes";
import { Button } from "@/components/ui/button";
import { cn, formatNumber } from "@/lib/utils";

export function VoteButton({
  postId,
  initialLiked,
  count,
}: {
  postId: string;
  initialLiked: boolean;
  count: number;
}) {
  const router = useRouter();
  const [liked, setLiked] = React.useState(initialLiked);
  const [countState, setCountState] = React.useState(count);
  const [pending, startTransition] = React.useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      aria-pressed={liked}
      aria-label={liked ? "Batalkan suka" : "Sukai postingan"}
      disabled={pending}
      className={cn("h-7 gap-1 px-2 text-xs hover:text-primary", liked && "text-primary")}
      onClick={() => {
        // Optimistic update
        setLiked((prev) => !prev);
        setCountState((c) => c + (liked ? -1 : 1));
        startTransition(async () => {
          const result = await togglePostLikeAction(postId);
          if (result?.error) {
            setLiked(initialLiked);
            setCountState(count);
            router.refresh();
            toast.error(result.error);
          }
        });
      }}
    >
      <Flame className={cn("h-3.5 w-3.5", liked && "fill-current")} />
      {formatNumber(countState)}
    </Button>
  );
}
