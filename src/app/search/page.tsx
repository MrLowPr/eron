import Link from "next/link";
import type { Metadata } from "next";
import { Search as SearchIcon } from "lucide-react";
import { getViewer } from "@/lib/rbac";
import { getFeed, searchUsers } from "@/server/queries/posts";
import { SORT_OPTIONS, type SortType } from "@/lib/constants";
import { PostCard } from "@/components/post-card";
import { EmptyState } from "@/components/empty-state";
import { SearchInput } from "@/components/search-input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pencarian",
  robots: { index: false },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const qRaw = Array.isArray(params.q) ? params.q[0] : params.q;
  const q = (qRaw ?? "").trim().slice(0, 80);
  const sortRaw = (Array.isArray(params.sort) ? params.sort[0] : params.sort) ?? "new";
  const sort: SortType = SORT_OPTIONS.includes(sortRaw as SortType) ? (sortRaw as SortType) : "new";
  const page = Math.max(1, Number((Array.isArray(params.page) ? params.page[0] : params.page) ?? 1) || 1);

  const viewer = await getViewer();
  const [feed, users] = q
    ? await Promise.all([
        getFeed({ sort, page, viewerId: viewer?.id ?? null, q }),
        searchUsers(q),
      ])
    : [{ posts: [], total: 0, hasMore: false }, []];

  return (
    <div className="container max-w-3xl py-6">
      <h1 className="text-2xl font-bold tracking-tight">Pencarian</h1>
      <p className="text-sm text-muted-foreground">Cari postingan, daftar topik, atau anggota komunitas.</p>

      <div className="mt-4 md:hidden">
        <SearchInput className="h-10" />
      </div>

      {q === "" ? (
        <EmptyState
          className="mt-6"
          icon={SearchIcon}
          title="Mulai mencari"
          description="Ketik kata kunci di atas, misalnya “diskusi” atau nama user tertentu."
        />
      ) : (
        <div className="mt-6 space-y-8">
          {users.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground">Pengguna</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {users.map((user) => (
                  <Link key={user.id} href={`/u/${user.username}`}>
                    <Card className="transition-colors hover:border-primary/50">
                      <CardContent className="flex items-center gap-3 p-4">
                        <Avatar className="h-10 w-10">
                          {user.image ? <AvatarImage src={user.image} alt="" /> : null}
                          <AvatarFallback>{getInitials(user.name, user.username.slice(0, 2).toUpperCase())}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 truncate text-sm font-medium">
                            {user.name ?? user.username}
                            {user.role !== "USER" && (
                              <Badge variant={user.role === "ADMIN" ? "destructive" : "warning"} className="text-[10px]">
                                {user.role}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            @{user.username} · {user._count.posts} postingan
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Postingan {feed.total > 0 && `· ${feed.total} hasil`}
            </h2>
            {feed.posts.length === 0 ? (
              <EmptyState
                icon={SearchIcon}
                title={`Tidak ada hasil untuk “${q}”`}
                description="Coba kata kunci berbeda atau lebih singkat."
              />
            ) : (
              <div className="flex flex-col gap-4">
                {feed.posts.map((post) => (
                  <PostCard key={post.id} post={post} viewerId={viewer?.id ?? null} />
                ))}
              </div>
            )}
          </section>

          {feed.hasMore && (
            <div className="flex justify-center">
              <Link href={`/search?q=${encodeURIComponent(q)}&sort=${sort}&page=${page + 1}`} className="text-sm text-primary hover:underline">
                Hasil berikutnya →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
