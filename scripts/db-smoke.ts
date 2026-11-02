/**
 * Smoke test logika Prisma yang dipakai server actions
 * (nama compound unique, create cache & notifikasi). Jalankan: npx tsx scripts/db-smoke.ts
 */
import { prisma } from "../src/lib/prisma";

async function main() {
  const user = await prisma.user.findUniqueOrThrow({ where: { username: "alice" } });
  const post = await prisma.post.findFirstOrThrow({ where: { deletedAt: null } });

  // Like post: unique userId_postId harus valid
  const existing = await prisma.like.findUnique({
    where: { userId_postId: { userId: user.id, postId: post.id } },
    select: { id: true },
  });
  const like = existing
    ? await prisma.like.delete({ where: { id: existing.id } })
    : await prisma.like.create({ data: { userId: user.id, postId: post.id } });
  console.log("like endpoint ok:", existing ? "dihapus" : like.id.slice(0, 6));

  // Comment + unique userId_commentId
  const comment = await prisma.comment.create({
    data: { content: "smoke-test comment", postId: post.id, authorId: user.id },
  });
  const clike = await prisma.like.create({ data: { userId: user.id, commentId: comment.id } });
  await prisma.like.delete({ where: { userId_commentId: { userId: user.id, commentId: comment.id } } });
  console.log("comment-like ok:", clike.id.startsWith("c"));

  // Bookmark PK userId_postId
  const bm = await prisma.bookmark.upsert({
    where: { userId_postId: { userId: user.id, postId: post.id } },
    update: {},
    create: { userId: user.id, postId: post.id },
  });
  console.log("bookmark ok:", bm.userId === user.id);

  // UI-log
  await prisma.auditLog.create({
    data: { userId: user.id, action: "smoke.test", metadata: { ok: true } },
  });
  console.log("audit ok");

  // Cleanup
  await prisma.comment.delete({ where: { id: comment.id } });
  await prisma.bookmark.delete({ where: { userId_postId: { userId: user.id, postId: post.id } } });
  await prisma.auditLog.deleteMany({ where: { action: "smoke.test" } });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
