import { createHash } from "crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

/**
 * 👻 Kuota tamu senyap — kontribusi anonim terbatas per perangkat.
 *
 * Tamu (tanpa sesi) boleh membuat kontribusi (postingan/komentar) sampai GUEST_MAX
 * kumulatif. Di balik layar setiap perangkat mendapat:
 *   • fingerprint  : hash SHA-256 dari (IP turunan proxy + User-Agent)
 *   • baris GuestQuota : penghitung kumulatif `used`
 *   • penulis bayangan : akun `tamu-<hash>` (role USER) yang menandatangani kontribusi
 *
 * Nada UI tetap netral: ketika kuota habis, permukaan berperilaku seperti halaman
 * yang butuh login begitu saja — tidak ada angka/jumlah kuota yang ditampilkan.
 */

export const GUEST_MAX = 20;

export type GuestSlot =
  | { ok: true; fingerprint: string; authorId: string; remaining: number }
  | { ok: false; fingerprint: string };

export function fingerprintFromHeaders(h: { get(name: string): string | null }): string {
  const real = h.get("x-real-ip")?.trim();
  let ip = real;
  if (!ip) {
    const f = h.get("x-forwarded-for");
    if (f) {
      const parts = f.split(",").map((p) => p.trim()).filter(Boolean);
      ip = parts[parts.length - 1];
    }
  }
  const ua = h.get("user-agent") ?? "";
  return createHash("sha256").update(`${ip ?? "unknown"}\n${ua}`).digest("hex").slice(0, 32);
}

/** Penulis bayangan: satu per fingerprint, diciptakan pada kontribusi pertama. */
async function shadowUserFor(fingerprint: string, hostSuffix: string) {
  const short = fingerprint.slice(0, 8);
  const username = `tamu-${short}`;
  const email = `tamu-${short}@${hostSuffix}`;
  const found = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
    select: { id: true },
  });
  if (found) return found;
  return prisma.user.create({
    data: { username, email, name: "Tamu" },
    select: { id: true },
  });
}

/**
 * Klaim satu slot kontribusi tamu secara atomic: sisa > 0 → dipakai & dilisensi author id.
 * Kembalikan ok=false ketika sisa 0 (panggilan harus menanggapi sebagai-butuh-login).
 */
export async function consumeGuestSlot(): Promise<GuestSlot> {
  const h = await headers();
  const fingerprint = fingerprintFromHeaders(h);

  // Baris kuota masih belum ada: buat + penulis bayangan (dilakukan balik-bungkus).
  await prisma.$transaction(async (tx) => {
    const existing = await tx.guestQuota.findUnique({ where: { fingerprint }, select: { id: true } });
    if (existing) return;
    const user = await shadowUserFor(fingerprint, "tamu.eron.invalid");
    await tx.guestQuota.create({
      data: { fingerprint, used: 0, userId: user.id },
    });
  }, { timeout: 15_000 });

  // Increment atomic dengan guard sisa.
  const bumped = await prisma.guestQuota.updateMany({
    where: { fingerprint, used: { lt: GUEST_MAX } },
    data: { used: { increment: 1 } },
  });

  if (bumped.count) {
    const row = await prisma.guestQuota.findUnique({
      where: { fingerprint },
      select: { userId: true, used: true },
    });
    if (row) {
      return {
        ok: true,
        fingerprint,
        authorId: row.userId,
        remaining: Math.max(0, GUEST_MAX - row.used),
      };
    }
  }

  // Kena batas:  buat UserId kadaluarsa? return false tanpa detail kuota.
  return { ok: false, fingerprint };
}

/** Sisa slot untuk permukaan UI/halaman (tanpa memakai slot). */
export async function guestRemaining(): Promise<number> {
  const h = await headers();
  const fingerprint = fingerprintFromHeaders(h);
  const row = await prisma.guestQuota.findUnique({
    where: { fingerprint },
    select: { used: true },
  });
  return Math.max(0, GUEST_MAX - (row?.used ?? 0));
}
