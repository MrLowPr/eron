import { NextResponse, type NextRequest } from "next/server";
import { verifyEmailByToken } from "@/server/actions/auth";

function redirect(request: NextRequest, path: string, flag?: string) {
  const url = new URL(path, request.url);
  if (flag) url.searchParams.set(flag, "1");
  return NextResponse.redirect(url);
}

/** GET /api/verify-email?token=…: consumes the token, marks email as verified. */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token || token.length < 10) {
    return redirect(request, "/login", "verify-invalid");
  }
  if (token.length > 200) {
    return redirect(request, "/login", "verify-invalid");
  }

  const ok = await verifyEmailByToken(token);
  return redirect(request, "/login", ok ? "verified" : "verify-invalid");
}
