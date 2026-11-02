"use server";

/**
 * ⭐ REDEEM KODE — LOGIKANYA ANDA ISI SENDIRI DI SINI
 *
 * Dipanggil oleh tombol ⚙ (GearMenu) di navbar saat user menekan "Tukar".
 * Pengembalian harus: { ok: boolean, message: string }
 *
 * Kerangka yang bisa Anda vergadering (cukup buka komentar page yang sesuai):
 *
 *   import { prisma } from "@/lib/prisma";
 *   import { getViewer } from "@/lib/rbac";
 *
 *   const viewer = await getViewer();
 *   if (!viewer) return { ok: false, message: "Login dulu untuk redeem." };
 *
 *   const found = await prisma.redeemCode.findUnique({ where: { code } });
 *   if (!found || found.claimedBy) return { ok: false, message: "Kode salah / sudah dipakai." };
 *
 *   // bobot benefit: badge, koin, dsb. lalu tandai kode dipakai
 *   await prisma.redeemCode.update({
 *     where: { code }, data: { claimedBy: viewer.id, claimedAt: new Date() },
 *   });
 *   return { ok: true, message: "Sukses — benefit sudah ditambahkan." };
 *
 * (model di schema.prisma tinggal ditambahkan sendiri, contoh RedeemCode.)
 */
export async function redeemCode(raw: string): Promise<{ ok: boolean; message: string }> {
  const code = raw.trim();

  if (!code) return { ok: false, message: "Isi kode dulu." };
  if (code.length < 4) return { ok: false, message: "Kode terampide (min. 4 karakter)." };

  // ── TODO(Anda): logika redeem disni ──────────────────────────────────
  return { ok: false, message: "Pengguna berfungsi segera — isi logika di src/server/actions/redeem.ts" };
}
