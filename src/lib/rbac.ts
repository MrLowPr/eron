import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientIpFromHeaders } from "@/lib/client-ip";
import type { RoleName } from "@/lib/constants";

export type Viewer = {
  id: string;
  name: string | null;
  username: string;
  email: string | null;
  image: string | null;
  role: RoleName;
};

/**
 * Pengguna saat ini (atau null). Peran dan status ban SELALU dibaca dari database,
 * bukan dari token JWT, supaya ban dan perubahan peran langsung berlaku.
 * Dibungkus cache() agar hanya 1 query per request.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, username: true, email: true, image: true, role: true, banned: true },
  });
  if (!user || user.banned) return null;

  return {
    id: user.id,
    name: user.name ?? null,
    username: user.username ?? "",
    email: user.email ?? null,
    image: user.image ?? null,
    role: user.role as RoleName,
  };
});

export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) throw new Error("UNAUTHENTICATED");
  return viewer;
}

export async function requireMod(viewer?: Viewer): Promise<Viewer> {
  const v = viewer ?? (await requireViewer());
  if (v.role !== "ADMIN" && v.role !== "MODERATOR") throw new Error("FORBIDDEN");
  return v;
}

export async function requireAdmin(viewer?: Viewer): Promise<Viewer> {
  const v = viewer ?? (await requireViewer());
  if (v.role !== "ADMIN") throw new Error("FORBIDDEN");
  return v;
}

/** Kunci rate limit berbasis IP klien (lihat client-ip.ts untuk asumsi proxy). */
export async function callerKey(prefix: string): Promise<string> {
  const h = await headers();
  return `${prefix}:ip:${clientIpFromHeaders(h)}`;
}

export type ActionResult = { error?: string; success?: string };
