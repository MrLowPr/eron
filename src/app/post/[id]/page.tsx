import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { ArrowLeft, CalendarClock, Eye, MessageSquare, MousePointerClick } from "lucide-react";
import { getViewer } from "@/lib/rbac";
import { getPostDetail, getCommentTree, getRelatedPosts } from "@/server/queries/posts";
import { incrementViewAction } from "@/server/actions/likes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PostContent } from "@/components/post-content";
import { PostGallery } from "@/components/post-image-strip";
import { VoteButton } from "@/components/vote-button";
import { BookmarkButton } from "@/components/bookmark-button";
import { ReportFooterButtons } from "@/components/report-dialog";
import { ModPostActions } from "@/components/mod-post-actions";
import { CommentThread } from "@/components/comment-item";
import { CommentComposer } from "@/components/comment-composer";
import { PostCard } from "@/components/post-card";
import { formatNumber, getInitials, timeAgo } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const viewer = await getViewer();
  const staffViewer = viewer?.role === "ADMIN" || viewer?.role === "MODERATOR";
  // Sama seperti getPostDetail: konten staff tidak terbaca oleh penonton non-staff.
  const post = await prisma.post.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(staffViewer ? {} : { author: { role: { notIn: ["ADMIN", "MODERATOR"] } } }),
    },
    select: { title: true, content: true, images: true },
  });
  if (!post) return { title: "Postingan tidak ditemukan" };
  const truncated = post.content.replace(/\s+/g, " ").slice(0, 160);
  return {
    title: post.title,
    description: truncated.length < post.content.length ? `${truncated}…` : truncated,
    openGraph: { title: post.title, description: truncated, images: post.images.slice(0, 1) },
  };
}

export default async function PostDetailPage({ params }: Props) {
  const { id } = await params;
  if (id.length < 12 || id.length > 40 || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    notFound();
  }
  const viewerPromise = getViewer();

  // Count the view only after successful fetch.
  const post = await getPostDetail(id, (await viewerPromise)?.id ?? null);
  if (!post) notFound();

  void headers(); // ensure dynamic rendering (session-dependent)
  // Not awaited penalizes cold path, so do it best-effort:
  try {
    await incrementViewAction(id);
  } catch {
    /* ignore */
  }

  const viewer = await viewerPromise;
  const isOwner = viewer?.id === post.author.id;
  const isMod = viewer?.role === "ADMIN" || viewer?.role === "MODERATOR";

  const [comments, related] = await Promise.all([
    getCommentTree(id, viewer?.id ?? null),
    getRelatedPosts(id, post.category?.id ?? null, viewer?.id ?? null),
  ]);

  return (
    <div className="container max-w-3xl py-6">
      <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Kembali ke feed
      </Link>

      <article className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {post.pinned && (
            <Badge variant="warning" className="gap-1">
              <MousePointerClick className="h-3 w-3" /> Pinned
            </Badge>
          )}
          {post.category && (
            <Link href={`/kategori/${post.category.slug}`}>
              <Badge variant="secondary" className="hover:bg-accent">
                {post.category.name}
              </Badge>
            </Link>
          )}
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="h-3 w-3" /> dibuat {timeAgo(post.createdAt)}
          </span>
          {post.updatedAt.getTime() - post.createdAt.getTime() > 60_000 && (
            <span className="inline-flex items-center gap-1">
              · diubah {timeAgo(post.updatedAt)}
            </span>
          )}
        </div>

        <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{post.title}</h1>

        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/u/${post.author.username}`} className="flex items-center gap-2 hover:text-primary">
            <Avatar className="h-9 w-9">
              {post.author.image ? <AvatarImage src={post.author.image} alt="" /> : null}
              <AvatarFallback>{getInitials(post.author.name, post.author.username.slice(0, 2).toUpperCase())}</AvatarFallback>
            </Avatar>
            <div className="text-sm">
              <div className="font-medium">{post.author.name ?? post.author.username}</div>
              <div className="text-xs text-muted-foreground">@{post.author.username}</div>
            </div>
          </Link>
          {post.author.role !== "USER" && (
            <Badge variant={post.author.role === "ADMIN" ? "destructive" : "warning"}>
              {post.author.role}
            </Badge>
          )}

          <div className="ml-auto flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" /> {formatNumber(post.viewCount)}
            </span>
            <Separator orientation="vertical" className="h-3.5" />
            <VoteButton postId={post.id} initialLiked={post.likedByMe} count={post._count.likes} />
            <BookmarkButton postId={post.id} initiallyBookmarked={post.bookmarkedByMe} />
            <ReportFooterButtons postId={post.id} viewerId={viewer?.id ?? null} />
            <ModPostActions
              postId={post.id}
              pinned={post.pinned}
              showEdit={Boolean(isOwner || isMod)}
              showDelete={Boolean(isOwner || isMod)}
              showHardDelete={viewer?.role === "ADMIN"}
              showPin={Boolean(isMod)}
            />
          </div>
        </div>

        {post.images.length > 0 && <PostGallery images={post.images} title={post.title} />}

        <div className="rounded-xl border bg-background/50 p-4 sm:p-6">
          <PostContent content={post.content} className="text-base" />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {post.tags.map((t) => (
            <Link key={t.tag.id} href={`/tag/${t.tag.slug}`} className="text-sm text-muted-foreground hover:text-primary">
              #{t.tag.name}
            </Link>
          ))}
        </div>
      </article>

      <section id="komentar" className="mt-10 space-y-6">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">
            Diskusi <span className="text-muted-foreground">({comments.length} utama)</span>
          </h2>
        </div>

        {viewer ? (
          <Card>
            <CardContent className="p-4">
              <CommentComposer postId={post.id} placeholder="Tulis komentar… (bis@username orang untuk mention)" />
            </CardContent>
          </Card>
        ) : (
          <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
            <Link href="/login" className="text-primary hover:underline">
              Login
            </Link>{" "}
            untuk ikut berdiskusi.
          </p>
        )}

        <CommentThread comments={comments} postId={post.id} viewer={viewer ? { id: viewer.id, role: viewer.role } : null} />
      </section>

      {related.length > 0 && (
        <section className="mt-10 space-y-3">
          <h2 className="text-lg font-semibold">Postingan lain di kategori ini</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {related.map((relatedPost) => (
              <PostCard key={relatedPost.id} post={relatedPost} viewerId={viewer?.id ?? null} variant="profile" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
