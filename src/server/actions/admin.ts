"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notify, notifyModeration } from "@/lib/notifications";
import { requireAdmin, requireMod, type ActionResult } from "@/lib/rbac";

export async function setBanAction(input: {
  userId: string;
  banned: boolean;
  reason?: string;
}): Promise<ActionResult> {
  const mod = await requireMod();

  if (input.userId === mod.id) return { error: "Tidak bisa moderasi akun sendiri" };

  const target = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, role: true, banned: true },
  });
  if (!target) return { error: "User tidak ditemukan" };

  // Moderator tidak boleh mengubah akun ADMIN.
  if (mod.role !== "ADMIN" && target.role === "ADMIN") {
    return { error: "Moderator tidak bisa menindak admin" };
  }

  await prisma.user.update({
    where: { id: input.userId },
    data: {
      banned: input.banned,
      banReason: input.banned ? input.reason || "Melanggar ketentuan komunitas" : null,
    },
  });

  await audit({
    userId: mod.id,
    action: input.banned ? "user.ban" : "user.unban",
    targetType: "User",
    targetId: input.userId,
    metadata: { reason: input.reason ?? null },
  });

  await notifyModeration({
    userId: input.userId,
    message: input.banned ? `Akunmu dibanned: ${input.reason || "melanggar ketentuan"}` : "Ban akunmu dicabut. Selamat kembali!",
  });

  revalidatePath("/admin/users");
  return { success: "OK" };
}

export async function setRoleAction(input: { userId: string; role: "USER" | "MODERATOR" | "ADMIN" }): Promise<ActionResult> {
  const admin = await requireAdmin();

  if (input.userId === admin.id) return { error: "Tidak bisa mengubah role sendiri" };

  const target = await prisma.user.findUnique({ where: { id: input.userId }, select: { id: true } });
  if (!target) return { error: "User tidak ditemukan" };

  await prisma.user.update({ where: { id: input.userId }, data: { role: input.role } });
  await audit({
    userId: admin.id,
    action: "user.set-role",
    targetType: "User",
    targetId: input.userId,
    metadata: { role: input.role },
  });
  await notifyModeration({ userId: input.userId, message: `Role akunmu diubah menjadi ${input.role}` });

  revalidatePath("/admin/users");
  return { success: "OK" };
}

export async function hardDeletePostAction(postId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  await prisma.post.delete({ where: { id: postId } });
  await audit({ userId: admin.id, action: "post.hard-delete", targetType: "Post", targetId: postId });
  revalidatePath("/admin/posts");
  revalidatePath("/");
  return { success: "OK" };
}

export type ReportResolution = "REMOVE_CONTENT" | "DISMISS";

export async function resolveReportAction(input: {
  reportId: string;
  resolution: ReportResolution;
  note?: string;
}): Promise<ActionResult> {
  const mod = await requireMod();

  const report = await prisma.report.findUnique({
    where: { id: input.reportId },
    select: {
      id: true,
      status: true,
      postId: true,
      commentId: true,
      post: { select: { authorId: true } },
      comment: { select: { authorId: true, postId: true } },
    },
  });
  if (!report) return { error: "Laporan tidak ditemukan" };
  if (report.status !== "PENDING") return { error: "Laporan sudah ditindak" };

  if (input.resolution === "REMOVE_CONTENT") {
    if (report.postId) {
      await prisma.post.update({ where: { id: report.postId }, data: { deletedAt: new Date() } });
      await notify({
        userId: report.post!.authorId,
        actorId: mod.id,
        type: "MODERATION",
        message: "Postinganmu dihapus setelah laporan dibuat",
        postId: report.postId,
      });
    } else if (report.commentId) {
      await prisma.comment.update({ where: { id: report.commentId }, data: { deletedAt: new Date() } });
      await notifyModeration({ userId: report.comment!.authorId, message: "Komentarmu dihapus setelah laporan dibuat" });
    }
  }

  await prisma.report.update({
    where: { id: input.reportId },
    data: {
      status: input.resolution === "REMOVE_CONTENT" ? "RESOLVED" : "DISMISSED",
      resolvedById: mod.id,
      resolutionNote: input.note || null,
      resolvedAt: new Date(),
    },
  });

  await audit({
    userId: mod.id,
    action: `report.${input.resolution.toLowerCase().replace("_", "-")}`,
    targetType: "Report",
    targetId: input.reportId,
    metadata: { note: input.note ?? null },
  });

  revalidatePath("/admin/reports");
  revalidatePath("/");
  if (report.postId) revalidatePath(`/post/${report.postId}`);
  return { success: "OK" };
}
