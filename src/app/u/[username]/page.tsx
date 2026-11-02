import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CalendarDays, Flame, MessageSquare } from "lucide-react";
import { getViewer } from "@/lib/rbac";
import {
  getUserByUsername,
  getUserPosts,
  getUserComments,
  getBookmarkedPosts,
} from "@/server/queries/posts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PostCard } from "@/components/post-card";
import { EmptyState } from "@/components/empty-state";
import { formatNumber, timeAgo, truncate } from "@/lib/utils";

type Props = {
  params: Promise<{ username: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const user = await getUserByUsername(username);
  return {
    title: user ? `${user.name ?? user.username} (@${user.username})` : "User",
    description: user?.bio ?? undefined,
  };
}

export default async function ProfilePage({ params, searchParams }: Props) {
  const { username } = await params;
  const sp = await searchParams;

  if (!/^[a-zA-Z0-9_-]{3,24}$/.test(username)) notFound();

  const viewer = await getViewer();
  const user = await getUserByUsername(username);
  if (!user) notFound();

  const isOwner = viewer?.id === user.id;
  const tabRaw = (Array.isArray(sp.tab) ? sp.tab[0] : sp.tab) ?? "posts";
  const validTabs = isOwner ? ["posts", "comments", "bookmarks"] : ["posts", "comments"];
  const tab = validTabs.includes(tabRaw) ? tabRaw : "posts";

  const [posts, comments, bookmarks] = await Promise.all([
    getUserPosts(user.id, viewer?.id ?? null),
    getUserComments(user.id),
    isOwner ? getBookmarkedPosts(user.id) : Promise.resolve([]),
  ]);

  return (
    <div className="container max-w-4xl py-6">
      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start">
          <Avatar className="h-20 w-20 border sm:h-24 sm:w-24">
            {user.image ? <AvatarImage src={user.image} alt={user.name ?? ""} /> : null}
            <AvatarFallback className="text-xl">
              {(user.name ?? user.username).slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold">{user.name ?? user.username}</h1>
              {user.role !== "USER" && (
                <Badge variant={user.role === "ADMIN" ? "destructive" : "warning"}>{user.role}</Badge>
              )}
              {user.banned && <Badge variant="destructiveSoft">Dibanned</Badge>}
              {isOwner && (
                <Link href="/settings/profile" className="text-xs text-muted-foreground hover:text-foreground">
                  Edit profil →
                </Link>
              )}
            </div>
            <p className="text-sm text-muted-foreground">@{user.username}</p>
            {user.bio && <p className="text-sm">{user.bio}</p>}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" /> bergabung {timeAgo(user.createdAt)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Flame className="h-3.5 w-3.5" /> {formatNumber(posts.length)} postingan
              </span>
              <span className="inline-flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" /> {formatNumber(user._count.comments)} komentar
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <nav className="mt-6 flex gap-2" aria-label="Tab profil">
        {(["posts", "comments", ...(isOwner ? ["bookmarks"] : [])] as const).map((key) => (
          <Link
            key={key}
            href={`/u/${user.username}?tab=${key}`}
            aria-current={tab === key ? "page" : undefined}
            className={
              tab === key
                ? "inline-flex h-9 items-center rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground shadow"
                : "inline-flex h-9 items-center rounded-lg border px-3.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            }
          >
            {key === "posts" ? "Postingan" : key === "comments" ? "Komentar" : "Bookmark"}
          </Link>
        ))}
      </nav>

      <div className="mt-4 space-y-4">
        {tab === "posts" &&
          (posts.length === 0 ? (
            <EmptyState title="Belum ada postingan" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} viewerId={viewer?.id ?? null} variant="profile" />
              ))}
            </div>
          ))}

        {tab === "comments" &&
          (comments.length === 0 ? (
            <EmptyState title="Belum ada komentar" />
          ) : (
            <div className="space-y-2">
              {comments.map((comment) => (
                <div key={comment.id} className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">
                    pada{" "}
                    <Link href={`/post/${comment.post.id}`} className="font-medium text-foreground hover:text-primary">
                      {truncate(comment.post.title, 60)}
                    </Link>{" "}
                    · {timeAgo(comment.createdAt)}
                  </div>
                  <p className="mt-1 text-sm">{truncate(comment.content.replace(/\s+/g, " "), 220)}</p>
                </div>
              ))}
            </div>
          ))}

        {tab === "bookmarks" &&
          (bookmarks.length === 0 ? (
            <EmptyState title="Bookmark kosong" description="Simpan postingan menarik supaya mudah ditemukan lagi." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {bookmarks.map((post) => (
                <PostCard key={post.id} post={post} viewerId={viewer?.id ?? null} variant="profile" />
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}
