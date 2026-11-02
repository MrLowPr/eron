import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const AUTH_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

const publicOnly = ["/login", "/register", "/forgot-password"];
const needsAuth = ["/settings", "/notifications", "/post/new", "/admin"];

/**
 * Edge middleware:
 * 1. Redirect already-authenticated users away from auth pages.
 * 2. Protect authenticated-only routes (session cookie presence).
 * 3. Guard /admin for ADMIN & MODERATOR (decodes JWT, no DB access on edge).
 */
export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasCookie = AUTH_COOKIES.some((name) => request.cookies.has(name));

  const token = hasCookie
    ? await getToken({ req: request, secret: process.env.AUTH_SECRET })
    : null;
  const isAuthenticated = Boolean(token);

  if (isAuthenticated && publicOnly.some((path) => pathname.startsWith(path))) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (needsAuth.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const role = token?.role;
    if (role !== "ADMIN" && role !== "MODERATOR") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/register",
    "/forgot-password",
    "/settings/:path*",
    "/notifications/:path*",
    "/post/new",
    "/admin/:path*",
  ],
};
