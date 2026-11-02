import type { Metadata } from "next";
import { getViewer } from "@/lib/rbac";
import { getNotifications } from "@/server/queries/notifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotificationList } from "@/components/notification-list";
import { EmptyState } from "@/components/empty-state";
import { Inbox } from "lucide-react";

export const metadata: Metadata = {
  title: "Notifikasi",
  robots: { index: false },
};

export default async function NotificationsPage() {
  const viewer = await getViewer();
  if (!viewer) return null;

  const notifications = await getNotifications(viewer.id);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="container max-w-2xl py-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-lg">
            Notifikasi {unread > 0 && <span className="text-sm text-muted-foreground">· {unread} belum dibaca</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <EmptyState icon={Inbox} title="Tidak ada notifikasi" description="Aktivitas tim, like, dan balasan akan tampil di sini." />
          ) : (
            <NotificationList items={notifications} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
