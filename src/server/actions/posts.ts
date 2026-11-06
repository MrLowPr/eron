"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { notify, notifyMentions } from "@/lib/notifications";
import { audit } from "@/lib/audit";
import { getViewer, requireViewer, type ActionResult } from "@/lib/rbac";
import { consumeGuestSlot } from "@/lib/guest-quota";
import { postSchema } from "@/lib/validations";
import { slugify } from "@/lib/utils";

export async function createPostAction(input: unknown): Promise<ActionResult> {
  // Tamu tanpa sesi boleh menulis selama kuota perangkatnya masih tersisa
  // (lihat lib/guest-quota). Kontribusi ditandatangani penulis bayangan;
  // kehabisan kuota memicu alur login seperti biasa, tanpa detail kuota.
  const viewer = await getViewer();
  let authorId: string | null = null;

  if (viewer) {
    const limit = await rateLimit(`post:user:${viewer.id}`, { limit: 6, window: 3600 });
    if (!limit.success) return { error: "Batas 6 postingan per jam tercapai" };
    authorId = viewer.id;
  } else {
    const slot = await consumeGuestSlot();
    if (!slot.ok) return { error: "Masuk untuk melanjutkan menulis" };
    const limit = await rateLimit(`post:tamu:${slot.fingerprint}`, { limit: 6, window: 3600 });
    if (!limit.success) return { error: "Ulangi beberapa saat lagi ya" };
    authorId = slot.authorId;
  }

  const parsed = postSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data postingan tidak valid" };
  }
  const { title, content, categoryId, tags, images } = parsed.data;

  // Resolve tag slugs (create the tag if new).
  const tagSlugs = [...new Set(tags.map((t) => slugify(t))).values()].filter(Boolean);
  const tagIds: string[] = [];
  for (const slug of tagSlugs) {
    const tag = await prisma.tag.upsert({
      where: { slug },
      update: {},
      create: { slug, name: slug },
    });
    tagIds.push(tag.id);
  }

  // Validate category + images exist.
  let categoryConnect: { connect: { id: string } } | undefined;
  if (categoryId) {
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (category) categoryConnect = { connect: { id: category.id } };
  }

  const okImages = images.filter((src) => src.startsWith("/uploads/"));
  const post = await prisma.post.create({
    data: {
      title,
      content,
      images: okImages,
      author: { connect: { id: authorId } },
      category: categoryConnect,
      tags: { create: tagIds.map((tagId) => ({ tagId })) },
    },
    select: { id: true },
  });

  await notifyMentions({
    content,
    actorId: authorId,
    postId: post.id,
    link: `/post/${post.id}`,
  });

  revalidatePath("/");
  return { success: post.id };
}

export async function updatePostAction(
  postId: string,
  input: unknown,
): Promise<ActionResult> {
  const viewer = await requireViewer();

  const post = await prisma.post.findFirst({
    where: { id: postId, deletedAt: null },
    select: { authorId: true },
  });
  if (!post) return { error: "Postingan tidak ditemukan" };

  const isMod = viewer.role === "ADMIN" || viewer.role === "MODERATOR";
  if (post.authorId !== viewer.id && !isMod) return { error: "Tidak punya akses" };

  const parsed = postSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data postingan tidak valid" };
  }
  const { title, content, categoryId, tags, images } = parsed.data;

  const tagSlugs = [...new Set(tags.map((t) => slugify(t))).values()].filter(Boolean);
  const tagIds: string[] = [];
  for (const slug of tagSlugs) {
    const tag = await prisma.tag.upsert({ where: { slug }, update: {}, create: { slug, name: slug } });
    tagIds.push(tag.id);
  }

  await prisma.$transaction([
    prisma.postTag.deleteMany({ where: { postId } }),
    prisma.post.update({
      where: { id: postId },
      data: {
        title,
        content,
        images: images.filter((src) => src.startsWith("/uploads/")),
        categoryId: categoryId ?? null,
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
      },
    }),
  ]);

  if (isMod && post.authorId !== viewer.id) {
    await audit({
      userId: viewer.id,
      action: "post.edit",
      targetType: "Post",
      targetId: postId,
    });
  }

  revalidatePath(`/post/${postId}`);
  revalidatePath("/");
  return { success: postId };
}

export async function deletePostAction(
  postId: string,
  opts: { hard?: boolean; reason?: string } = {},
): Promise<ActionResult> {
  const viewer = await requireViewer();
  const isMod = viewer.role === "ADMIN" || viewer.role === "MODERATOR";

  const post = await prisma.post.findFirst({
    where: { id: postId, deletedAt: null },
    select: { authorId: true, title: true },
  });
  if (!post) return { error: "Postingan tidak ditemukan" };
  if (post.authorId !== viewer.id && !isMod) return { error: "Tidak punya akses" };

  if (opts.hard && viewer.role === "ADMIN") {
    await prisma.post.delete({ where: { id: postId } });
    await audit({
      userId: viewer.id,
      action: "post.hard-delete",
      targetType: "Post",
      targetId: postId,
      metadata: { title: post.title },
    });
  } else {
    await prisma.post.update({
      where: { id: postId },
      data: { deletedAt: new Date() },
    });
    if (isMod && post.authorId !== viewer.id) {
      await audit({
        userId: viewer.id,
        action: "post.delete",
        targetType: "Post",
        targetId: postId,
        metadata: { title: post.title, reason: opts.reason ?? null },
      });
      if (opts.reason) {
        await notify({
          userId: post.authorId,
          actorId: viewer.id,
          type: "MODERATION",
          message: `postinganmu dihapus: ${opts.reason}`,
          link: "/",
        });
      }
    }
  }

  revalidatePath("/");
  revalidatePath("/admin/posts");
  return { success: postId };
}

export async function restorePostAction(postId: string): Promise<ActionResult> {
  const viewer = await requireViewer();
  if (viewer.role !== "ADMIN" && viewer.role !== "MODERATOR") return { error: "Hanya moderator" };

  await prisma.post.update({
    where: { id: postId },
    data: { deletedAt: null },
  });
  await audit({ userId: viewer.id, action: "post.restore", targetType: "Post", targetId: postId });
  revalidatePath("/admin/posts");
  revalidatePath("/");
  return { success: postId };
}

export async function setPinnedAction(postId: string, pinned: boolean): Promise<ActionResult> {
  const viewer = await requireViewer();
  if (viewer.role !== "ADMIN" && viewer.role !== "MODERATOR") {
    return { error: "Hanya moderator" };
  }
  await prisma.post.findFirst({ where: { id: postId, deletedAt: null }, select: { id: true } });
  await prisma.post.update({ where: { id: postId }, data: { pinned } });
  await audit({ userId: viewer.id, action: pinned ? "post.pin" : "post.unpin", targetType: "Post", targetId: postId });
  revalidatePath(`/post/${postId}`);
  revalidatePath("/admin/posts");
  revalidatePath("/");
  return { success: postId };
}
