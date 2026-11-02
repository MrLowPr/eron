import { prisma } from "@/lib/prisma";

export async function getNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      type: true,
      message: true,
      link: true,
      read: true,
      createdAt: true,
      actor: { select: { id: true, username: true, name: true, image: true } },
      post: { select: { id: true, title: true } },
      comment: { select: { id: true } },
    },
    take: 50,
  });
}

export type NotificationItem = Awaited<ReturnType<typeof getNotifications>>[number];

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, read: false } });
}
