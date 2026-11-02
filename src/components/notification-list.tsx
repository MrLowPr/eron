"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Bell, Check, CheckCheck, Heart, MessagesSquare, Reply, ShieldAlert, UserRound, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
  deleteNotificationAction,
} from "@/server/actions/notifications";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, timeAgo } from "@/lib/utils";
import type { NotificationItem } from "@/server/queries/notifications";

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  LIKE: Heart,
  COMMENT: MessagesSquare,
  REPLY: Reply,
  MENTION: UserRound,
  MODERATION: ShieldAlert,
  SYSTEM: Bell,
};

export function NotificationList({ items }: { items: NotificationItem[] }) {
  const router = useRouter();
  const [state, setState] = React.useState(items);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            const result = await markAllNotificationsReadAction();
            if (result?.error) {
              toast.error(result.error);
              return;
            }
            setState((prev) => prev.map((n) => ({ ...n, read: true })));
            toast.success("Semua ditandai dibaca");
            router.refresh();
          }}
        >
          <CheckCheck />
          Tandai semua dibaca
        </Button>
      </div>

      {state.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Tidak ada notifikasi.</p>}

      {state.map((item) => {
        const Icon = TYPE_ICON[item.type] ?? Bell;
        return (
          <div
            key={item.id}
            className={cn(
              "group flex items-center gap-3 rounded-lg border p-3 transition-colors",
              !item.read && "border-primary/40 bg-primary/5"
            )}
          >
            <Avatar className="h-8 w-8">
              {item.actor?.image ? <AvatarImage src={item.actor.image} alt="" /> : null}
              <AvatarFallback>{(item.actor?.username ?? "E").slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                {item.type}
              </div>
              <p className="truncate text-sm">
                {item.actor && (
                  <Link href={`/u/${item.actor.username}`} className="font-medium hover:text-primary">
                    @{item.actor.username}
                  </Link>
                )}{" "}
                {item.message ?? "aktivitas baru"}{" "}
                {item.post && (
                  <Link href={item.link ?? `/post/${item.post.id}`} className="text-muted-foreground hover:text-foreground">
                    · {item.post.title.slice(0, 40)}
                  </Link>
                )}
              </p>
              <span className="text-xs text-muted-foreground">{timeAgo(item.createdAt)}</span>
            </div>

            <div className="flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
              {!item.read && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-label="Tandai dibaca"
                  onClick={async () => {
                    await markNotificationReadAction(item.id);
                    setState((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
                    router.refresh();
                  }}
                >
                  <Check className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                aria-label="Hapus notifikasi"
                onClick={async () => {
                  await deleteNotificationAction(item.id);
                  setState((prev) => prev.filter((n) => n.id !== item.id));
                  router.refresh();
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
