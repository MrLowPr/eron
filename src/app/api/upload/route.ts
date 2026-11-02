import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { storage, detectImageType, uploadMaxSize } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Upload endpoint — auth required, validated, rate-limited, Magic-byte sniffed,
 * compressed via sharp. Files land in public/uploads (localStorage driver).
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Login dulu" }, { status: 401 });
  }
  const userId = session.user.id;

  const limit = await rateLimit(`upload:user:${userId}`, { limit: 30, window: 60 });
  if (!limit.success) {
    return NextResponse.json({ error: "Terlalu banyak upload" }, { status: 429 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const folderEntry = formData.get("folder");
  const folder = folderEntry === "avatars" ? "avatars" : folderEntry === "posts" ? "posts" : null;
  if (!folder) {
    return NextResponse.json({ error: "Folder tidak valid" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const maxSize = uploadMaxSize();
  if (buffer.length > maxSize || buffer.length === 0) {
    return NextResponse.json(
      { error: `Ukuran maksimal ${Math.round(maxSize / 1024 / 1024)} MB` },
      { status: 413 }
    );
  }

  // Magic bytes — jangan percaya content-type dari klien.
  const type = detectImageType(buffer);
  if (!type) {
    return NextResponse.json(
      { error: "Hanya gambar JPEG/PNG/GIF/WebP yang didukung" },
      { status: 415 }
    );
  }

  // Sanitize + compress: keep GIF animation, convert others to webp.
  let outputBuffer: Buffer = buffer;
  if (type !== "gif") {
    outputBuffer = (await sharp(buffer)
      .rotate()
      .resize({
        width: folder === "avatars" ? 512 : 1600,
        height: folder === "avatars" ? 512 : undefined,
        fit: folder === "avatars" ? "cover" : "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer()
      .catch(() => buffer)) as Buffer;
  }

  const stored = await storage.put(
    { folder, buffer: outputBuffer },
    { isAvatar: folder === "avatars" }
  );

  return NextResponse.json({ url: stored.url });
}

export function GET() {
  return NextResponse.json({ error: "Method tidak diizinkan" }, { status: 405 });
}
