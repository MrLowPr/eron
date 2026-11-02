import { listCommentsForAdmin } from "@/server/queries/admin";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteCommentButton } from "@/components/admin-comment-controls";
import { timeAgo, truncate } from "@/lib/utils";

export default async function AdminCommentsPage() {
  const comments = await listCommentsForAdmin();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Manajemen komentar</h1>
        <p className="text-sm text-muted-foreground">{comments.length} komentar terbaru</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {comments.map((comment) => (
              <div key={comment.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-[220px] flex-1">
                  <p className="text-sm">{truncate(comment.content.replace(/\s+/g, " "), 120)}</p>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    @{comment.author.username} pada{" "}
                    <a href={`/post/${comment.postId}`} className="font-medium hover:text-primary">
                      {truncate(comment.post.title, 40)}
                    </a>{" "}
                    · {timeAgo(comment.createdAt)} · {comment._count.likes} like
                  </div>
                </div>
                {comment._count.reports > 0 && (
                  <Badge variant="destructiveSoft">{comment._count.reports} laporan</Badge>
                )}
                <DeleteCommentButton commentId={comment.id} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
