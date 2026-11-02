import Link from "next/link";
import { Ban, FileText, Flag, MessageSquareText, UserRoundPlus, UsersRound } from "lucide-react";
import { adminStats, listAuditLogs } from "@/server/queries/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { timeAgo, formatNumber } from "@/lib/utils";

export default async function AdminDashboardPage() {
  const [stats, logs] = await Promise.all([adminStats(), listAuditLogs()]);

  const cards = [
    { label: "Total user", value: stats.users, hint: `+${stats.thisWeekUsers} minggu ini`, icon: UsersRound, href: "/admin/users" },
    { label: "Postingan aktif", value: stats.posts, hint: "belum dihapus", icon: FileText, href: "/admin/posts" },
    { label: "Komentar", value: stats.comments, hint: "aktif", icon: MessageSquareText, href: "/admin/comments" },
    { label: "Laporan pending", value: stats.pendingReports, hint: "butuh keputusan", icon: Flag, href: "/admin/reports" },
    { label: "User banned", value: stats.bannedUsers, hint: "sedang ditindak", icon: Ban, href: "/admin/users" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Ringkasan kesehatan komunitas.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <Link key={card.label} href={card.href}>
            <Card className="transition-colors hover:border-primary/40">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-muted p-2">
                  <card.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-xl font-bold">{formatNumber(card.value)}</div>
                  <div className="text-xs text-muted-foreground">{card.label}</div>
                  <div className="text-[10px] text-muted-foreground">{card.hint}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Audit log terakhir</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {logs.length === 0 && <p className="text-sm text-muted-foreground">Belum ada aksi tercatat.</p>}
          {logs.map((log) => (
            <div key={log.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="font-medium">@{log.user.username}</span>
              <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs">{log.action}</span>
              {log.targetType && (
                <span className="text-xs text-muted-foreground">
                  {log.targetType}: {log.targetId?.slice(0, 8)}…
                </span>
              )}
              <span className="ml-auto text-xs text-muted-foreground">{timeAgo(log.createdAt)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
