import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/storage";

const TOKEN_TTL_SECONDS = 60 * 60; // 1 hour

/**
 * Create a one-time hashed token (email verification / password reset).
 * Returns the raw token to embed in a link; the DB stores only the hash.
 */
export async function createHashedToken(
  kind: "email-verify" | "password-reset",
  userId: string,
): Promise<string> {
  const raw = crypto.randomUUID().replace(/-/g, "");
  const hashed = hashToken(raw);
  const expires = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000);

  if (kind === "email-verify") {
    await prisma.emailVerificationToken.deleteMany({ where: { userId } });
    await prisma.emailVerificationToken.create({
      data: { userId, token: hashed, expires },
    });
  } else {
    await prisma.passwordResetToken.deleteMany({ where: { userId } });
    await prisma.passwordResetToken.create({
      data: { userId, token: hashed, expires },
    });
  }
  return raw;
}

export async function consumeHashedToken(
  kind: "email-verify" | "password-reset",
  raw: string,
): Promise<string | null> {
  const hashed = hashToken(raw);

  if (kind === "email-verify") {
    const record = await prisma.emailVerificationToken.findUnique({ where: { token: hashed } });
    if (!record || record.expires < new Date()) return null;
    await prisma.emailVerificationToken.delete({ where: { id: record.id } });
    return record.userId;
  }

  const record = await prisma.passwordResetToken.findUnique({ where: { token: hashed } });
  if (!record || record.expires < new Date()) return null;
  await prisma.passwordResetToken.delete({ where: { id: record.id } });
  return record.userId;
}
