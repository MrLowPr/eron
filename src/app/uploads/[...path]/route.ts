import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

/**
 * Serves files written to public/uploads at runtime.
 * (Static assets in /public are snapshotted at build time by Next.js, so
 * runtime uploads need this handler, which is also required for standalone/Docker.)
 */

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

const MIME: Record<string, string> = {
  webp: "image/webp",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
};

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ path: string[] }> }
) {
  const { path: rawSegments } = await ctx.params;
  const segments = rawSegments ?? [];

  if (segments.length === 0 || segments.some((segment) => segment === "." || segment === "..")) {
    return new NextResponse(null, { status: 400 });
  }

  const filePath = path.join(UPLOAD_ROOT, ...segments);
  if (!filePath.startsWith(UPLOAD_ROOT + path.sep)) {
    return new NextResponse(null, { status: 400 });
  }

  try {
    const info = await fs.stat(filePath);
    if (!info.isFile()) return new NextResponse(null, { status: 404 });

    const ext = path.extname(filePath).slice(1).toLowerCase();
    const data = await fs.readFile(filePath);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Content-Length": String(info.size),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
