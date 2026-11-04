import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { botTrap } from "@/lib/decoy";

const AUTH_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

const publicOnly = ["/login", "/register", "/forgot-password", "/admin/login"];
const needsAuth = ["/settings", "/notifications", "/post/new", "/admin"];

/**
 * Edge middleware:
 * 1. Redirect already-authenticated users away from auth pages.
 * 2. Protect authenticated-only routes (session cookie presence).
 * 3. Guard /admin for ADMIN & MODERATOR (decodes JWT, no DB access on edge).
 */
export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // ══ ANTI-BOT & UMPAN — semua yang mendarat di sini tidak benar-benar mengakses applikasi ══
  const trap = botTrap(request);
  if (trap) return trap;

  const hasCookie = AUTH_COOKIES.some((name) => request.cookies.has(name));

  const token = hasCookie
    ? await getToken({ req: request, secret: process.env.AUTH_SECRET })
    : null;
  const isAuthenticated = Boolean(token);

  if (isAuthenticated && publicOnly.some((path) => pathname.startsWith(path))) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Portal staf /admin/login harus bisa diakses TANPA sesi (staf memang belum login),
  // jadi jangan dianggap bagian dari perlindungan /admin/*.
  const isStaffPortal = pathname === "/admin/login";
  if (
    !isStaffPortal &&
    needsAuth.some((path) => pathname === path || pathname.startsWith(`${path}/`))
  ) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (!isStaffPortal && (pathname === "/admin" || pathname.startsWith("/admin/"))) {
    const role = token?.role;
    if (role !== "ADMIN" && role !== "MODERATOR") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  const response = NextResponse.next();
  // header pengecoh di semua respons normal: "reinindex" tak bermakna + fingerprint fiktif
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noimageindex");
  response.headers.set("X-Powered-By", "PHP/8.2.28");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
