import { prisma } from "@/lib/prisma";
import { prisma as db } from "@/lib/prisma";

const userSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  image: true,
  role: true,
  banned: true,
  banReason: true,
  emailVerified: true,
  createdAt: true,
  _count: { select: { posts: true, comments: true } },
} as const;

export async function listUsers(params: { q?: string; role?: string; banned?: boolean | null }) {
  const where: Record<string, unknown> = {};
  if (params.q) {
    where.OR = [
      { username: { contains: params.q, mode: "insensitive" } },
      { email: { contains: params.q, mode: "insensitive" } },
      { name: { contains: params.q, mode: "insensitive" } },
    ];
  }
  if (params.role === "ADMIN" || params.role === "MODERATOR" || params.role === "USER") {
    where.role = params.role;
  }
  if (params.banned === true) where.banned = true;

  const users = await prisma.user.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    select: userSelect,
    take: 100,
  });
  return users;
}
export type AdminUser = Awaited<ReturnType<typeof listUsers>>[number];

export async function adminStats() {
  const [users, posts, comments, pendingReports, bannedUsers, thisWeekUsers] = await Promise.all([
    prisma.user.count(),
    prisma.post.count({ where: { deletedAt: null } }),
    prisma.comment.count({ where: { deletedAt: null } }),
    prisma.report.count({ where: { status: "PENDING" } }),
    prisma.user.count({ where: { banned: true } }),
    prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
  ]);
  return { users, posts, comments, pendingReports, bannedUsers, thisWeekUsers };
}
export type AdminStats = Awaited<ReturnType<typeof adminStats>>;

export async function listPostsForAdmin() {
  return prisma.post.findMany({
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      pinned: true,
      deletedAt: true,
      createdAt: true,
      author: { select: { id: true, name: true, username: true } },
      category: { select: { name: true } },
      _count: { select: { likes: true, comments: true, reports: true } },
    },
    take: 100,
  });
}
export type AdminPost = Awaited<ReturnType<typeof listPostsForAdmin>>[number];

export async function listCommentsForAdmin() {
  return prisma.comment.findMany({
    where: { deletedAt: null },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      content: true,
      createdAt: true,
      postId: true,
      author: { select: { username: true } },
      post: { select: { title: true } },
      _count: { select: { reports: true, likes: true } },
    },
    take: 100,
  });
}
export type AdminComment = Awaited<ReturnType<typeof listCommentsForAdmin>>[number];

export async function listReports() {
  return prisma.report.findMany({
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      reason: true,
      detail: true,
      status: true,
      resolutionNote: true,
      createdAt: true,
      reporter: { select: { username: true } },
      post: { select: { id: true, title: true, deletedAt: true } },
      comment: { select: { id: true, content: true, deletedAt: true, postId: true } },
      resolvedBy: { select: { username: true } },
    },
    take: 100,
  });
}
export type AdminReport = Awaited<ReturnType<typeof listReports>>[number];

export async function listAuditLogs() {
  return db.auditLog.findMany({
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      action: true,
      targetType: true,
      targetId: true,
      createdAt: true,
      user: { select: { username: true } },
    },
    take: 50,
  });
}
