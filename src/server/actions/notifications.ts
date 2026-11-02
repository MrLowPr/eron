"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireViewer, type ActionResult } from "@/lib/rbac";

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  const viewer = await requireViewer();
  await prisma.notification.updateMany({
    where: { userId: viewer.id, read: false },
    data: { read: true, readAt: new Date() },
  });
  revalidatePath("/notifications");
  return { success: "OK" };
}

export async function markNotificationReadAction(id: string): Promise<ActionResult> {
  const viewer = await requireViewer();
  await prisma.notification.updateMany({
    where: { id, userId: viewer.id, read: false },
    data: { read: true, readAt: new Date() },
  });
  revalidatePath("/notifications");
  return { success: "OK" };
}

export async function deleteNotificationAction(id: string): Promise<ActionResult> {
  const viewer = await requireViewer();
  await prisma.notification.deleteMany({ where: { id, userId: viewer.id } });
  revalidatePath("/notifications");
  return { success: "OK" };
}
