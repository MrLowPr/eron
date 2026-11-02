import Link from "next/link";
import type { Metadata } from "next";
import { PenSquare } from "lucide-react";
import { getViewer } from "@/lib/rbac";
import { getFeed, getSidebarData } from "@/server/queries/posts";
import { SORT_OPTIONS, SITE, type SortType } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PostCard } from "@/components/post-card";
import { FeedSortTabs } from "@/components/feed-sort-tabs";
import { EmptyState } from "@/components/empty-state";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: `${SITE.name} — ${SITE.tagline}`,
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function single(params: Record<string, string | string[] | undefined>, key: string): string {
  const value = params[key];
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams;
  const sortParam = single(params, "sort");
  const sort: SortType = (SORT_OPTIONS.includes(sortParam as SortType) ? sortParam : "new") as SortType;
  const page = Math.max(1, Number(single(params, "page")) || 1);

  const viewer = await getViewer();
  const [feed, sidebar] = await Promise.all([getFeed({ sort, page, viewerId: viewer?.id ?? null }), getSidebarData()]);

  return (
    <div className="container grid gap-6 py-6 lg:grid-cols-[1fr_280px]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Feed Komunitas</h1>
            <p className="text-sm text-muted-foreground">
              Diskusi terbaru seputar teknologi, hobi, dan karya kreatif.
            </p>
          </div>
          <Button asChild>
            <Link href="/post/new">
              <PenSquare />
              Buat Postingan
            </Link>
          </Button>
        </div>

        <FeedSortTabs active={sort} />

        <div className="flex flex-col gap-4">
          {feed.posts.length === 0 ? (
            <EmptyState
              title="Belum ada postingan di sini"
              description="Jadilah pelopor! Tulis postingan pertamamu supaya feed lebih hidup."
              actionLabel="Buat postingan"
              actionHref={viewer ? "/post/new" : "/login"}
            />
          ) : (
            feed.posts.map((post) => (
              <PostCard key={post.id} post={post} viewerId={viewer?.id ?? null} />
            ))
          )}
        </div>

        <FeedPagination page={page} hasMore={feed.hasMore} sort={sort} />
      </div>

      <aside className="space-y-4">
        {sidebar.trendingPosts.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Sedang ramai minggu ini</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {sidebar.trendingPosts.map((post, index) => (
                <Link
                  key={post.id}
                  href={`/post/${post.id}`}
                  className="flex items-start gap-2 rounded-md p-1 text-sm hover:bg-accent"
                >
                  <span className="mt-0.5 text-xs font-bold text-primary">{index + 1}</span>
                  <span className="line-clamp-2">{post.title}</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Kategori</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {sidebar.categories.map((category) => (
              <Link key={category.id} href={`/kategori/${category.slug}`}>
                <Badge variant="secondary" className="hover:bg-accent">
                  {category.name}
                  <span className="ml-1 text-[10px] opacity-60">{category._count.posts}</span>
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Statistik komunitas</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <Stat label="Post / bulan" value={formatNumber(sidebar.stats.postsMonth)} />
            <Stat label="Post / minggu" value={formatNumber(sidebar.stats.postsWeek)} />
            <Stat label="Komentar" value={formatNumber(sidebar.stats.comments)} />
            <Stat label="Anggota aktif" value={formatNumber(sidebar.stats.users)} />
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function FeedPagination({
  page,
  hasMore,
  sort,
}: {
  page: number;
  hasMore: boolean;
  sort: SortType;
}) {
  if (!hasMore && page <= 1) return null;
  const build = (target: number) => `/?sort=${sort}&page=${target}`;

  return (
    <div className="flex items-center justify-center gap-2 pt-2">
      {page > 1 && (
        <Button asChild variant="outline" size="sm">
          <Link href={build(page - 1)}>← Sebelumnya</Link>
        </Button>
      )}
      <span className="text-sm text-muted-foreground">Halaman {page}</span>
      {hasMore && (
        <Button asChild variant="outline" size="sm">
          <Link href={build(page + 1)}>Selanjutnya →</Link>
        </Button>
      )}
    </div>
  );
}
