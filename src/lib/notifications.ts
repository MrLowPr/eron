import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@prisma/client";

const MENTION_PATTERN = /@([a-zA-Z0-9_-]{3,24})/g;

type NotifyOptions = {
  userId: string;
  actorId: string | null;
  type: NotificationType;
  message?: string;
  link?: string;
  postId?: string;
  commentId?: string;
};

export async function notify(options: NotifyOptions): Promise<void> {
  if (options.actorId && options.actorId === options.userId) return;
  try {
    await prisma.notification.create({ data: options });
  } catch {
    // Notifications must never break the main flow.
  }
}

/** Create MENTION notifications for @username occurrences in content. */
export async function notifyMentions(params: {
  content: string;
  actorId: string;
  postId: string;
  link: string;
}): Promise<void> {
  const usernames = new Set<string>();
  for (const match of params.content.matchAll(MENTION_PATTERN)) {
    usernames.add(match[1]!.toLowerCase());
    if (usernames.size >= 10) break; // cap abuse
  }
  if (usernames.size === 0) return;

  const users = await prisma.user.findMany({
    where: {
      username: { in: [...usernames] },
      banned: false,
      id: { not: params.actorId },
    },
    select: { id: true },
  });

  for (const user of users) {
    await notify({
      userId: user.id,
      actorId: params.actorId,
      type: "MENTION",
      postId: params.postId,
      link: params.link,
      message: "menyebut kamu dalam sebuah konten",
    });
  }
}

export async function notifyModeration(params: {
  userId: string;
  message: string;
  link?: string;
}): Promise<void> {
  await notify({
    userId: params.userId,
    actorId: null,
    type: "MODERATION",
    message: params.message,
    link: params.link,
  });
}
