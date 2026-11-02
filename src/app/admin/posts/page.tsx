import { listPostsForAdmin } from "@/server/queries/admin";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PinPostButton, DeletePostButton } from "@/components/admin-post-controls";
import { RestorePostButton } from "@/components/mod-post-actions";
import { timeAgo } from "@/lib/utils";

export default async function AdminPostsPage() {
  const posts = await listPostsForAdmin();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Manajemen postingan</h1>
        <p className="text-sm text-muted-foreground">{posts.length} postingan terbaru ditampilkan</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {posts.map((post) => (
              <div key={post.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-[200px] flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <a href={`/post/${post.id}`} className="text-sm font-medium hover:text-primary">
                      {post.title}
                    </a>
                    {post.pinned && <Badge variant="warning">Pinned</Badge>}
                    {post.deletedAt && <Badge variant="destructiveSoft">Deleted</Badge>}
                    {post._count.reports > 0 && (
                      <Badge variant="destructiveSoft">
                        {post._count.reports} laporan
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    @{post.author.username} · {post.category?.name ?? "tanpa kategori"} ·{" "}
                    {timeAgo(post.createdAt)} · {post._count.likes} like · {post._count.comments} komentar
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <PinPostButton postId={post.id} pinned={post.pinned} disabled={Boolean(post.deletedAt)} />
                  {post.deletedAt ? (
                    <RestorePostButton postId={post.id} />
                  ) : (
                    <DeletePostButton postId={post.id} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
