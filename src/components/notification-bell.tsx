import Link from "next/link";
import { Bell } from "lucide-react";
import { getViewer } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { UnreadCount } from "@/components/unread-count";

export async function NotificationBell() {
  const viewer = await getViewer();
  if (!viewer) return null;

  return (
    <Button asChild variant="ghost" size="icon" aria-label="Notifikasi" className="relative">
      <Link href="/notifications">
        <Bell className="h-4 w-4" />
        <UnreadCount />
      </Link>
    </Button>
  );
}
