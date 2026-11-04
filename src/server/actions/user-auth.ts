"use server";

/**
 * ⭐ PEMISAH PORTAL LOGIN — edit terserah Anda di sini
 *
 *  • /login        → portal PENGGUNA (userLoginAction): khusus akun USER biasa.
 *    Akun ADMIN/MODERATOR ditolak dengan arahan ke /admin/login.
 *  • /admin/login  → portal STAF (staffLoginAction): khusus ADMIN & MODERATOR.
 *    Akun USER biasa ditolak dengan arahan ke /login.
 *
 *  Pengecekan password dilakukan manual (bcrypt.compare) HANYA untuk membedakan
 *  role SETELAH kredensial terbukti benar — jadi pesan kesalahan selalu seragam
 *  ("Email atau password salah") dan tidak bocor informasi keberadaan akun.
 *
 *  Pendafataran (/register) memang sudah selalu membuat role USER (default
 *  skema Prisma) — tidak ada jalur yang bisa menciptakan akun staf.
 */

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { callerKey, type ActionResult } from "@/lib/rbac";
import { safeCallbackPath } from "@/lib/safe-redirect";

type PortalLoginInput = { email?: string; password?: string; callbackUrl?: string };

async function checkCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { role: true, password: true },
  });
  if (!user?.password) return null;
  if (!(await bcrypt.compare(password, user.password))) return null;
  return user.role;
}

/** Awal yang seragam utk kedua portal: validasi + rate-limit */
async function portalPrecheck(email: string, password: string, key: "login" | "login-staff") {
  if (!email || !/(.+)@(.+)\..+/.test(email) || !password) {
    return { error: "Email dan password wajib diisi" };
  }
  const limit = await rateLimit(await callerKey(key), { limit: 10, window: 600 });
  if (!limit.success) return { error: "Terlalu banyak percobaan login. Coba lagi dalam 10 menit." };
  return null;
}

/** login("credentials") standar → pesan error seragam */
async function standardSignIn(email: string, password: string): Promise<ActionResult | undefined> {
  try {
    await signIn("credentials", { email, password, redirect: false });
    return undefined;
  } catch (error) {
    if (error instanceof AuthError) return { error: "Email atau password salah" };
    throw error;
  }
}

/** ⭐ Login portal PENGGUNA — dipakai oleh /login (LoginForm) */
export async function userLoginAction(input: PortalLoginInput): Promise<ActionResult> {
  const email = input.email?.trim().toLowerCase() ?? "";
  const password = input.password ?? "";

  const pre = await portalPrecheck(email, password, "login");
  if (pre) return pre;

  const role = await checkCredentials(email, password);
  if (role === "ADMIN" || role === "MODERATOR") {
    // kredensial benar, tapi akun staf → tolak di sini, tanpa membuat sesi
    return { error: "Akun staf tidak bisa lewat portal pengguna — masuk lewat /admin/login" };
  }
  if (role !== null) {
    // akun USER dgn kredensial benar → buat sesi lalu lanjut
    await standardSignIn(email, password);
    redirect(safeCallbackPath(input.callbackUrl) ?? "/");
  }

  // email tidak ada / password salah → jalur standar (pesan seragam)
  return (await standardSignIn(email, password)) ?? { error: "Email atau password salah" };
}

/** ⭐ Login portal STAF — dipakai oleh /admin/login (StaffLoginForm) */
export async function staffLoginAction(input: PortalLoginInput): Promise<ActionResult> {
  const email = input.email?.trim().toLowerCase() ?? "";
  const password = input.password ?? "";

  const pre = await portalPrecheck(email, password, "login-staff");
  if (pre) return pre;

  const role = await checkCredentials(email, password);
  if (role !== null && role !== "ADMIN" && role !== "MODERATOR") {
    // kredensial benar tapi akun pengguna biasa → tolak, tanpa membuat sesi
    return { error: "Portal ini khusus ADMIN & MODERATOR — akun pengguna masuk lewat /login" };
  }
  if (role !== null) {
    await standardSignIn(email, password);
    redirect(safeCallbackPath(input.callbackUrl) ?? "/admin");
  }

  return (await standardSignIn(email, password)) ?? { error: "Email atau password salah" };
}
