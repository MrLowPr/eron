import Link from "next/link";
import type { Metadata } from "next";
import { PenSquare } from "lucide-react";
import { getViewer } from "@/lib/rbac";
import { getFeed, getSidebarData } from "@/server/queries/posts";
import type { SortType } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PostCard } from "@/components/post-card";
import { FeedSortTabs } from "@/components/feed-sort-tabs";
import { EmptyState } from "@/components/empty-state";
import { prisma } from "@/lib/prisma";
type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await prisma.category.findUnique({ where: { slug }, select: { name: true, description: true } });
  if (!category) return { title: "Kategori" };
  return { title: category.name, description: category.description ?? undefined };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const sortRaw = (Array.isArray(sp.sort) ? sp.sort[0] : sp.sort) ?? "new";
  const sort: SortType = (["new", "popular", "trending"].includes(sortRaw) ? sortRaw : "new") as SortType;
  const page = Math.max(1, Number((Array.isArray(sp.page) ? sp.page[0] : sp.page) ?? 1) || 1);

  const viewer = await getViewer();
  const [category, feed, sidebar] = await Promise.all([
    prisma.category.findUnique({ where: { slug }, select: { id: true, name: true, description: true } }),
    getFeed({ sort, page, viewerId: viewer?.id ?? null, categorySlug: slug }),
    getSidebarData(viewer?.id ?? null),
  ]);

  if (!category) {
    return (
      <div className="container py-10">
        <EmptyState
          title="Kategori tidak ditemukan"
          description="Kategori mungkin dihapus atau URL salah."
          actionLabel="Kembali ke beranda"
          actionHref="/"
        />
      </div>
    );
  }

  return (
    <div className="container grid gap-6 py-6 lg:grid-cols-[1fr_280px]">
      <div className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Kategori</p>
          <h1 className="text-2xl font-bold tracking-tight">{category.name}</h1>
          {category.description && <p className="text-sm text-muted-foreground">{category.description}</p>}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <FeedSortTabs active={sort} />
          <Button asChild variant="outline" size="sm">
            <Link href={`/post/new?kategori=${slug}`}>
              <PenSquare />
              Posting di sini
            </Link>
          </Button>
        </div>

        {feed.posts.length === 0 ? (
          <EmptyState title="Belum ada postingan" description="Diskusi pertama menantimu!" />
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
              <Link href={`/kategori/${slug}?sort=${sort}&page=${page - 1}`}>← Sebelumnya</Link>
            </Button>
          )}
          <span className="text-sm text-muted-foreground">Halaman {page}</span>
          {feed.hasMore && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/kategori/${slug}?sort=${sort}&page=${page + 1}`}>Selanjutnya →</Link>
            </Button>
          )}
        </div>
      </div>

      <aside className="space-y-4">
        <CardSideCategories categories={sidebar.categories} activeSlug={slug} />
      </aside>
    </div>
  );
}

function CardSideCategories({
  categories,
  activeSlug,
}: {
  categories: Array<{ id: string; name: string; slug: string; _count: { posts: number } }>;
  activeSlug?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Jelajahi kategori</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-1.5">
        {categories.map((category) => (
          <Link key={category.id} href={`/kategori/${category.slug}`}>
            <Badge variant={category.slug === activeSlug ? "default" : "secondary"} className="hover:bg-accent">
              {category.name}
              <span className="ml-1 text-[10px] opacity-60">{category._count.posts}</span>
            </Badge>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
