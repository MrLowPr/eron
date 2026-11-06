"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { notify, notifyMentions } from "@/lib/notifications";
import { audit } from "@/lib/audit";
import { requireViewer, type ActionResult } from "@/lib/rbac";
import { commentSchema } from "@/lib/validations";

export type CommentWithMeta = {
  id: string;
  parentId: string | null;
};

export async function createCommentAction(input: unknown): Promise<ActionResult> {
  const viewer = await requireViewer();

  const limit = await rateLimit(`comment:user:${viewer.id}`, { limit: 10, window: 60 });
  if (!limit.success) return { error: "Santai, maksimal 10 komentar per menit" };

  const parsed = commentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Komentar tidak valid" };
  }
  const { content, postId, parentId } = parsed.data;

  const post = await prisma.post.findFirst({
    where: { id: postId, deletedAt: null },
    select: { authorId: true, title: true },
  });
  if (!post) return { error: "Postingan tidak ditemukan" };

  if (parentId) {
    const parent = await prisma.comment.findFirst({
      where: { id: parentId, postId, deletedAt: null },
      select: { authorId: true },
    });
    if (!parent) return { error: "Komentar induk tidak ditemukan" };
  }

  const comment = await prisma.comment.create({
    data: {
      content,
      postId,
      parentId: parentId ?? null,
      authorId: viewer.id,
    },
    select: { id: true },
  });

  const link = `/post/${postId}`;
  await notifyMentions({ content, actorId: viewer.id, postId, link });

  if (parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: parentId },
      select: { authorId: true },
    });
    if (parent) {
      await notify({
        userId: parent.authorId,
        actorId: viewer.id,
        type: "REPLY",
        postId,
        commentId: comment.id,
        link,
        message: "membalas komentarmu",
      });
    }
  } else {
    await notify({
      userId: post.authorId,
      actorId: viewer.id,
      type: "COMMENT",
      postId,
      commentId: comment.id,
      link,
      message: "mengomentari postinganmu",
    });
  }

  revalidatePath(`/post/${postId}`);
  revalidatePath("/");
  return { success: comment.id };
}

export async function deleteCommentAction(commentId: string, reason?: string): Promise<ActionResult> {
  const viewer = await requireViewer();
  const isMod = viewer.role === "ADMIN" || viewer.role === "MODERATOR";

  const comment = await prisma.comment.findFirst({
    where: { id: commentId, deletedAt: null },
    select: { authorId: true, postId: true, content: true },
  });
  if (!comment) return { error: "Komentar tidak ditemukan" };
  if (comment.authorId !== viewer.id && !isMod) return { error: "Tidak punya akses" };

  await prisma.comment.update({
    where: { id: commentId },
    data: { deletedAt: new Date() },
  });

  if (isMod && comment.authorId !== viewer.id) {
    await audit({
      userId: viewer.id,
      action: "comment.delete",
      targetType: "Comment",
      targetId: commentId,
      metadata: { reason: reason ?? null },
    });
    if (reason) {
      await notify({
        userId: comment.authorId,
        actorId: viewer.id,
        type: "MODERATION",
        message: `komentarmu dihapus: ${reason}`,
      });
    }
  }

  revalidatePath(`/post/${comment.postId}`);
  revalidatePath("/admin/comments");
  return { success: commentId };
}

export async function toggleCommentLikeAction(commentId: string): Promise<ActionResult> {
  const viewer = await requireViewer();

  const comment = await prisma.comment.findFirst({
    where: { id: commentId, deletedAt: null },
    select: { authorId: true, postId: true },
  });
  if (!comment) return { error: "Komentar tidak ditemukan" };

  const existing = await prisma.like.findUnique({
    where: {
      userId_commentId: { userId: viewer.id, commentId },
    },
    select: { id: true },
  });
  // Note: compound unique name in Prisma for @@unique([userId, commentId]) is userId_commentId.

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
  } else {
    await prisma.like.create({
      data: { userId: viewer.id, commentId },
    });
    await notify({
      userId: comment.authorId,
      actorId: viewer.id,
      type: "LIKE",
      postId: comment.postId,
      link: `/post/${comment.postId}`,
      message: "menyukai komentarmu",
    });
  }

  revalidatePath(`/post/${comment.postId}`);
  return { success: commentId };
}
