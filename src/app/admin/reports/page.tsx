import { listReports } from "@/server/queries/admin";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ReportResolve } from "@/components/report-resolve";
import { EmptyState } from "@/components/empty-state";
import { timeAgo, truncate } from "@/lib/utils";

const REASON_LABELS: Record<string, string> = {
  SPAM: "Spam",
  HARASSMENT: "Pengganggu",
  INAPPROPRIATE: "Tidak pantas",
  MISINFORMATION: "Misinformasi",
  OFF_TOPIC: "Tidak relevan",
  OTHER: "Lainnya",
};

export default async function AdminReportsPage() {
  const reports = await listReports();
  const pendingCount = reports.filter((r) => r.status === "PENDING").length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Laporan komunitas</h1>
        <p className="text-sm text-muted-foreground">
          {pendingCount} menunggu keputusan · {reports.length} total
        </p>
      </div>

      {reports.length === 0 ? (
        <EmptyState title="Tidak ada laporan" description="Komunitas sedang damai." />
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const isPost = Boolean(report.post);
            const target = report.post
              ? {
                  id: report.post.id,
                  title: report.post.title,
                  deleted: report.post.deletedAt !== null,
                }
              : report.comment
                ? {
                    id: report.comment.id,
                    title: report.comment.content.replace(/\s+/g, " "),
                    deleted: report.comment.deletedAt !== null,
                    postId: report.comment.postId,
                  }
                : null;

            return (
              <Card key={report.id} className={report.status === "PENDING" ? "border-primary/40" : ""}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant={report.status === "PENDING" ? "warning" : report.status === "RESOLVED" ? "success" : "secondary"}>
                      {report.status}
                    </Badge>
                    <Badge variant="secondary">{REASON_LABELS[report.reason]}</Badge>
                    <span>@{report.reporter.username}</span>
                    <span className="ml-auto">{timeAgo(report.createdAt)}</span>
                  </div>

                  {target && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">{isPost ? "Post: " : "Komentar pada: "}</span>
                      <a
                        href={isPost ? `/post/${report.post!.id}` : `/post/${report.comment!.postId}`}
                        className="font-medium hover:text-primary"
                      >
                        {truncate(target.title, 80)}
                      </a>
                      {target.deleted && <Badge variant="secondary" className="ml-2 text-[10px]">Sudah dihapus</Badge>}
                    </div>
                  )}

                  {report.detail && (
                    <p className="text-sm text-muted-foreground">“{report.detail}”</p>
                  )}

                  {report.status === "PENDING" ? (
                    <ReportResolve reportId={report.id} />
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Ditindak oleh @{report.resolvedBy?.username ?? "sistem"}
                      {report.resolutionNote ? ` · “${report.resolutionNote}”` : ""}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
