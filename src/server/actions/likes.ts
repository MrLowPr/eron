"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { notify } from "@/lib/notifications";
import { requireViewer, type ActionResult } from "@/lib/rbac";

export async function togglePostLikeAction(postId: string): Promise<ActionResult> {
  const viewer = await requireViewer();

  const limit = await rateLimit(`like:user:${viewer.id}`, { limit: 60, window: 60 });
  if (!limit.success) return { error: "Terlalu cepat, coba beberapa detik lagi" };

  const post = await prisma.post.findFirst({
    where: { id: postId, deletedAt: null },
    select: { authorId: true },
  });
  if (!post) return { error: "Postingan tidak ditemukan" };

  const existing = await prisma.like.findUnique({
    where: { userId_postId: { userId: viewer.id, postId } },
    select: { id: true },
  });

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
  } else {
    await prisma.like.create({ data: { userId: viewer.id, postId } });
    await notify({
      userId: post.authorId,
      actorId: viewer.id,
      type: "LIKE",
      postId,
      link: `/post/${postId}`,
      message: "menyukai postinganmu",
    });
  }

  revalidatePath(`/post/${postId}`);
  return { success: postId };
}

export async function toggleBookmarkAction(postId: string): Promise<ActionResult> {
  const viewer = await requireViewer();

  const post = await prisma.post.findFirst({
    where: { id: postId, deletedAt: null },
    select: { id: true },
  });
  if (!post) return { error: "Postingan tidak ditemukan" };

  const where = { userId: viewer.id, postId };
  const existing = await prisma.bookmark.findUnique({
    where: { userId_postId: { userId: viewer.id, postId } },
    select: { userId: true },
  });

  if (existing) {
    await prisma.bookmark.delete({ where: { userId_postId: { userId: where.userId, postId: where.postId } } });
  } else {
    await prisma.bookmark.create({ data: where });
  }

  revalidatePath(`/post/${postId}`);
  return { success: postId };
}

export async function incrementViewAction(postId: string): Promise<void> {
  const post = await prisma.post.findFirst({ where: { id: postId, deletedAt: null }, select: { id: true } });
  if (!post) return;
  try {
    await prisma.$transaction([
      prisma.$executeRaw`UPDATE "Post" SET "viewCount" = "viewCount" + 1 WHERE id = ${postId}`,
    ]);
  } catch {
    // view counting must not break rendering
  }
}
