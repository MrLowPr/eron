import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import type { RoleName } from "@/lib/constants";

export type Viewer = {
  id: string;
  name: string | null;
  username: string;
  email: string | null;
  image: string | null;
  role: RoleName;
};

/** Get the current session user (or null). Safe to call from any server context. */
export async function getViewer(): Promise<Viewer | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    name: session.user.name ?? null,
    username: session.user.username || "",
    email: session.user.email ?? null,
    image: session.user.image ?? null,
    role: session.user.role,
  };
}

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

/** Resolve caller IP for rate limiting from server action context. */
export async function callerKey(prefix: string): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0]!.trim() : (h.get("x-real-ip") ?? "unknown");
  return `${prefix}:ip:${ip}`;
}

export type ActionResult = { error?: string; success?: string };
