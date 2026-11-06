"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { prisma } from "@/lib/prisma";
import { signIn, signOut } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { callerKey, type ActionResult } from "@/lib/rbac";
import { registerSchema, forgotPasswordSchema, resetPasswordSchema } from "@/lib/validations";
import { createHashedToken, consumeHashedToken } from "@/lib/tokens";
import { sendEmailVerification, sendPasswordReset } from "@/lib/mail";
import { slugify } from "@/lib/utils";
import { safeCallbackPath } from "@/lib/safe-redirect";

type LoginInput = { email: string; password: string; callbackUrl?: string };

export async function loginAction(input: LoginInput): Promise<ActionResult> {
  const email = input.email?.trim().toLowerCase() ?? "";
  const password = input.password ?? "";

  if (!email || !/(.+)@(.+)\..+/.test(email) || !password) {
    return { error: "Email dan password wajib diisi" };
  }

  const limit = await rateLimit(await callerKey("login"), { limit: 10, window: 600 });
  if (!limit.success) return { error: "Terlalu banyak percobaan login. Coba lagi dalam 10 menit." };

  let target: string | undefined;
  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Email atau password salah" };
    }
    throw error;
  }

  target = safeCallbackPath(input.callbackUrl);
  redirect(target ?? "/");
}

export async function registerAction(input: {
  name?: string;
  username?: string;
  email?: string;
  password?: string;
}): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }
  const { name, username, email, password } = parsed.data;

  const limit = await rateLimit(await callerKey("register"), { limit: 5, window: 3600 });
  if (!limit.success) return { error: "Terlalu banyak pendaftaran. Coba lagi nanti." };

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
    select: { email: true, username: true },
  });
  if (existing) {
    return {
      error:
        existing.email === email
          ? "Email sudah terdaftar"
          : "Username sudah digunakan",
    };
  }

  const user = await prisma.user.create({
    data: {
      name,
      username,
      email,
      password: await bcrypt.hash(password, 12),
    },
  });

  const token = await createHashedToken("email-verify", user.id);
  await sendEmailVerification(user.email, token);

  redirect("/login?registered=1");
}

export async function forgotPasswordAction(input: { email?: string }): Promise<ActionResult> {
  const ipLimit = await rateLimit(await callerKey("forgot"), { limit: 5, window: 3600 });
  if (!ipLimit.success) return { error: "Terlalu banyak permintaan. Coba lagi nanti." };

  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return { error: "Email tidak valid" };

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, password: true },
  });

  // Always respond the same way to avoid account enumeration.
  if (user && user.password) {
    // Batas per email mencegah email bombing; tetap merespons sama agar tidak membuka enumerasi akun.
    const emailLimit = await rateLimit(`forgot:email:${parsed.data.email}`, { limit: 3, window: 3600 });
    if (emailLimit.success) {
      const token = await createHashedToken("password-reset", user.id);
      await sendPasswordReset(parsed.data.email, token);
    }
  }

  redirect("/forgot-password?sent=1");
}

export async function resetPasswordAction(input: {
  token?: string;
  password?: string;
  confirmPassword?: string;
}): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  const resetLimit = await rateLimit(await callerKey("reset"), { limit: 10, window: 3600 });
  if (!resetLimit.success) return { error: "Terlalu banyak percobaan. Coba lagi nanti." };

  const userId = await consumeHashedToken("password-reset", parsed.data.token);
  if (!userId) return { error: "Token reset tidak valid atau sudah kedaluwarsa" };

  await prisma.user.update({
    where: { id: userId },
    data: { password: await bcrypt.hash(parsed.data.password, 12) },
  });

  redirect("/login?reset=1");
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

/** Called by email link, see /api/verify-email */
export async function verifyEmailByToken(token: string): Promise<boolean> {
  const userId = await consumeHashedToken("email-verify", token);
  if (!userId) return false;
  await prisma.user.update({
    where: { id: userId },
    data: { emailVerified: new Date() },
  });
  return true;
}

/** Suggest an available username (used by the register form). */
export async function suggestUsername(base?: string): Promise<string> {
  const clean = slugify(base ?? "") || "user";
  const taken = await prisma.user.findUnique({ where: { username: clean }, select: { id: true } });
  return taken ? `${clean}-${Math.random().toString(36).slice(2, 7)}` : clean;
}
