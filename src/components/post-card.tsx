import Link from "next/link";
import { CalendarDays, Eye, Flame, MessageSquare, Pin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VoteButton } from "@/components/vote-button";
import { BookmarkButton } from "@/components/bookmark-button";
import { PostImageStrip } from "@/components/post-image-strip";
import { cn, formatNumber, getInitials, timeAgo, truncate } from "@/lib/utils";
import type { PostCard as PostCardData } from "@/server/queries/posts";

export function PostCard({
  post,
  viewerId,
  variant = "feed",
}: {
  post: PostCardData;
  viewerId: string | null;
  variant?: "feed" | "profile";
}) {
  const excerpt = truncate(post.content.replace(/\s+/g, " "), 180);

  return (
    <Card data-testid="post-card" className="transition-colors hover:border-primary/40">
      <CardContent className="p-4">
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {post.pinned && (
              <Badge variant="warning" className="gap-1">
                <Pin className="h-3 w-3" /> Pinned
              </Badge>
            )}
            {post.category && <CategoryBadge name={post.category.name} slug={post.category.slug} />}
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {timeAgo(post.createdAt)}
            </span>
          </div>

          <Link href={`/post/${post.id}`} className="group block">
            <h2
              className={cn(
                "font-semibold leading-snug group-hover:text-primary",
                variant === "feed" ? "text-lg" : "text-base"
              )}
            >
              {post.title}
            </h2>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground" aria-hidden>
              {excerpt}
            </p>
          </Link>

          {post.images.length > 0 && (
            <PostImageStrip images={post.images.slice(0, 3)} title={post.title} />
          )}

          <div className="flex flex-wrap gap-1.5">
            {post.tags.map((t) => (
              <Link
                key={t.tag.id}
                href={`/tag/${t.tag.slug}`}
                className="text-xs text-muted-foreground hover:text-primary"
              >
                #{t.tag.name}
              </Link>
            ))}
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex-wrap items-center justify-between gap-2 p-4 pt-0">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar className="h-6 w-6">
            {post.author.image ? <AvatarImage src={post.author.image} alt="" /> : null}
            <AvatarFallback>{getInitials(post.author.name)}</AvatarFallback>
          </Avatar>
          <Link
            href={`/u/${post.author.username}`}
            className="truncate text-xs font-medium hover:text-primary"
          >
            @{post.author.username}
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1" aria-label="Jumlah suka">
            <Flame className="h-3.5 w-3.5" /> {formatNumber(post._count.likes)}
          </span>
          <span className="inline-flex items-center gap-1" aria-label="Jumlah komentar">
            <MessageSquare className="h-3.5 w-3.5" /> {formatNumber(post._count.comments)}
          </span>
          {variant === "feed" && (
            <span className="hidden items-center gap-1 sm:inline-flex">
              <Eye className="h-3.5 w-3.5" /> {formatNumber(post.viewCount)}
            </span>
          )}
          {viewerId && (
            <div className="flex items-center gap-1">
              <VoteButton postId={post.id} initialLiked={post.likedByMe} count={post._count.likes} />
              <BookmarkButton postId={post.id} initiallyBookmarked={post.bookmarkedByMe} />
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

export function CategoryBadge({ name, slug }: { name: string; slug: string }) {
  return (
    <Link href={`/kategori/${slug}`}>
      <Badge variant="secondary" className="hover:bg-accent">
        {name}
      </Badge>
    </Link>
  );
}
