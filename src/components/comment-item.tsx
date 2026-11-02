"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Flame, Loader2, MoreVertical, Reply, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { toggleCommentLikeAction, deleteCommentAction } from "@/server/actions/comments";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CommentComposer } from "@/components/comment-composer";
import { PostContent } from "@/components/post-content";
import { cn, getInitials, timeAgo } from "@/lib/utils";
import type { CommentItemData } from "@/server/queries/posts";

type ViewerInfo = { id: string; role: "USER" | "MODERATOR" | "ADMIN" } | null;

export function CommentThread({
  comments,
  postId,
  viewer,
}: {
  comments: CommentItemData[];
  postId: string;
  viewer: ViewerInfo;
}) {
  if (comments.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Belum ada komentar. Jadi yang pertama!
      </p>
    );
  }
  return (
    <div className="space-y-5">
      {comments.map((comment) => (
        <CommentItemRender key={comment.id} comment={comment} postId={postId} viewer={viewer} depth={0} />
      ))}
    </div>
  );
}

function CommentItemRender({
  comment,
  postId,
  viewer,
  depth,
}: {
  comment: CommentItemData;
  postId: string;
  viewer: ViewerInfo;
  depth: number;
}) {
  const [replying, setReplying] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);
  const [deleted, setDeleted] = React.useState(false);
  const [liked, setLiked] = React.useState(comment.likedByMe);
  const [likeCount, setLikeCount] = React.useState(comment.likeCount);
  const [likePending, startLikeTransition] = React.useTransition();
  const [, startDeleteTransition] = React.useTransition();
  const router = useRouter();

  if (deleted) return null;

  const canManage = viewer && (viewer.id === comment.author.id || viewer.role !== "USER");

  return (
    <div
      className={cn("flex gap-3", depth > 0 && "mt-4")}
      data-testid="comment"
      data-comment-id={comment.id}
    >
      <div className="flex flex-col items-center">
        <Avatar className="h-7 w-7">
          {comment.author.image ? <AvatarImage src={comment.author.image} alt="" /> : null}
          <AvatarFallback>{getInitials(comment.author.name, comment.author.username.slice(0, 2).toUpperCase())}</AvatarFallback>
        </Avatar>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-xs">
          <Link href={`/u/${comment.author.username}`} className="font-medium hover:text-primary">
            {comment.author.name ?? comment.author.username}
          </Link>
          {comment.author.role !== "USER" && (
            <Badge variant={comment.author.role === "ADMIN" ? "destructive" : "warning"} className="text-[10px]">
              {comment.author.role}
            </Badge>
          )}
          <span className="text-muted-foreground">{timeAgo(comment.createdAt)}</span>
        </div>

        <div className="mt-1">
          <PostContent content={comment.content} />
        </div>

        <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-6 gap-1 px-1.5 hover:text-primary", liked && "text-primary")}
            aria-pressed={liked}
            aria-label={liked ? "Batalkan suka komentar" : "Sukai komentar"}
            disabled={likePending || !viewer}
            onClick={() => {
              setLiked((prev) => !prev);
              setLikeCount((c) => c + (liked ? -1 : 1));
              startLikeTransition(async () => {
                const result = await toggleCommentLikeAction(comment.id);
                if (result?.error) {
                  setLiked(comment.likedByMe);
                  setLikeCount(comment.likeCount);
                  toast.error(result.error);
                }
              });
            }}
          >
            <Flame className={cn("h-3.5 w-3.5", liked && "fill-current")} />
            {likeCount}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-1.5 hover:text-primary"
            aria-label="Balas komentar"
            disabled={!viewer}
            onClick={() => setReplying((prev) => !prev)}
          >
            <Reply className="h-3.5 w-3.5" />
            Balas
          </Button>

          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Menu komentar">
                  {likePending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MoreVertical className="h-3.5 w-3.5" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => {
                    startDeleteTransition(async () => {
                      const result = await deleteCommentAction(comment.id);
                      if (result?.error) toast.error(result.error);
                      else {
                        setDeleted(true);
                        toast.success("Komentar dihapus");
                        router.refresh();
                      }
                    });
                  }}
                >
                  <Trash2 />
                  Hapus komentar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {replying && viewer && (
          <div className="mt-2">
            <CommentComposer
              postId={postId}
              parentId={comment.id}
              placeholder={`Membalas @${comment.author.username}…`}
              autoFocus
              onDone={() => setReplying(false)}
            />
          </div>
        )}

        {comment.children.length > 0 && (
          <div className={cn(depth === 0 && "border-l pl-3")}>
            {comment.children.map((child) => (
              <CommentItemRender
                key={child.id}
                comment={child}
                postId={postId}
                viewer={viewer}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
