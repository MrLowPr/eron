import Link from "next/link";
import type { Metadata } from "next";
import { Tag } from "lucide-react";
import { getViewer } from "@/lib/rbac";
import { getFeed } from "@/server/queries/posts";
import { prisma } from "@/lib/prisma";
import type { SortType } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/post-card";
import { FeedSortTabs } from "@/components/feed-sort-tabs";
import { EmptyState } from "@/components/empty-state";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tag = await prisma.tag.findUnique({ where: { slug }, select: { name: true } });
  return { title: tag ? `#${tag.name}` : "Tag" };
}

export default async function TagPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const sortRaw = (Array.isArray(sp.sort) ? sp.sort[0] : sp.sort) ?? "new";
  const sort: SortType = (["new", "popular", "trending"].includes(sortRaw) ? sortRaw : "new") as SortType;
  const page = Math.max(1, Number((Array.isArray(sp.page) ? sp.page[0] : sp.page) ?? 1) || 1);

  const viewer = await getViewer();
  const [tag, feed] = await Promise.all([
    prisma.tag.findUnique({ where: { slug }, select: { name: true } }),
    getFeed({ sort, page, viewerId: viewer?.id ?? null, tagSlug: slug }),
  ]);

  return (
    <div className="container max-w-3xl py-6">
      <div className="mb-4 flex items-center gap-2">
        <Tag className="h-5 w-5 text-muted-foreground" />
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Tag</p>
      </div>
      <h1 className="text-2xl font-bold tracking-tight">#{tag?.name ?? slug}</h1>

      <div className="mt-4 space-y-4">
        <FeedSortTabs active={sort} />

        {feed.posts.length === 0 ? (
          <EmptyState
            title="Belum ada postingan dengan tag ini"
            description="Tulis postingan pertama dengan tag ini."
            icon={Tag}
          />
        ) : (
          <div className="flex flex-col gap-4">
            {feed.posts.map((post) => (
              <PostCard key={post.id} post={post} viewerId={viewer?.id ?? null} />
            ))}
          </div>
        )}

        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/tag/${slug}?sort=${sort}&page=${page - 1}`}>← Sebelumnya</Link>
            </Button>
          )}
          <span className="text-sm text-muted-foreground">Halaman {page}</span>
          {feed.hasMore && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/tag/${slug}?sort=${sort}&page=${page + 1}`}>Selanjutnya →</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
