"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { requireViewer, type ActionResult } from "@/lib/rbac";
import { profileSchema, reportSchema } from "@/lib/validations";
import { storage } from "@/lib/storage";

export async function updateProfileAction(input: unknown): Promise<ActionResult> {
  const viewer = await requireViewer();

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }
  const { name, username, bio } = parsed.data;

  if (username !== viewer.username) {
    const limit = await rateLimit(`username:user:${viewer.id}`, { limit: 3, window: 86400 });
    if (!limit.success) {
      return { error: "Ganti username maksimal 3x per hari" };
    }
    const taken = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (taken && taken.id !== viewer.id) return { error: "Username sudah digunakan" };
  }

  await prisma.user.update({
    where: { id: viewer.id },
    data: { name, username, bio: bio || null },
  });

  revalidatePath("/settings/profile");
  revalidatePath(`/u/${username}`);
  return { success: "Profil diperbarui" };
}

export async function updateAvatarAction(
  image: string | null,
): Promise<ActionResult & { image?: string | null }> {
  const viewer = await requireViewer();

  if (viewer.image) {
    await storage.delete(viewer.image);
  }
  if (image && !image.startsWith("/uploads/")) {
    return { error: "URL gambar tidak valid" };
  }

  await prisma.user.update({
    where: { id: viewer.id },
    data: { image },
  });

  revalidatePath("/settings/profile");
  return { success: "Avatar diperbarui", image };
}

export async function createReportAction(input: unknown): Promise<ActionResult> {
  const viewer = await requireViewer();

  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Laporan tidak valid" };
  }
  const { postId, commentId, reason, detail } = parsed.data;

  if (!postId && !commentId) return { error: "Target laporan tidak valid" };

  const limit = await rateLimit(`report:user:${viewer.id}`, { limit: 10, window: 3600 });
  if (!limit.success) return { error: "Terlalu banyak laporan, coba lagi nanti" };

  const duplicate = await prisma.report.findFirst({
    where: {
      reporterId: viewer.id,
      status: "PENDING",
      postId: postId ?? undefined,
      commentId: commentId ?? undefined,
    },
    select: { id: true },
  });
  if (duplicate) return { error: "Kamu sudah melaporkan konten ini" };

  await prisma.report.create({
    data: {
      reporter: { connect: { id: viewer.id } },
      post: postId ? { connect: { id: postId } } : undefined,
      comment: commentId ? { connect: { id: commentId } } : undefined,
      reason,
      detail: detail || null,
    },
  });

  return { success: "Laporan terkirim. Terima kasih membantu menjaga komunitas!" };
}
