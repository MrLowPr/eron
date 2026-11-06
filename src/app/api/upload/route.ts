import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { getViewer } from "@/lib/rbac";
import { rateLimit } from "@/lib/rate-limit";
import { storage, detectImageType, uploadMaxSize } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Upload endpoint: auth required, validated, rate-limited, Magic-byte sniffed,
 * compressed via sharp. Files land in public/uploads (localStorage driver).
 */
export async function POST(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Login dulu" }, { status: 401 });
  }
  const userId = viewer.id;

  const limit = await rateLimit(`upload:user:${userId}`, { limit: 30, window: 60 });
  if (!limit.success) {
    return NextResponse.json({ error: "Terlalu banyak upload" }, { status: 429 });
  }

  // Tolak lebih awal body yang jelas terlalu besar, sebelum dibaca ke memori.
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > uploadMaxSize() + 256 * 1024) {
    return NextResponse.json(
      { error: `Ukuran maksimal ${Math.round(uploadMaxSize() / 1024 / 1024)} MB` },
      { status: 413 }
    );
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

  // Magic bytes: jangan percaya content-type dari klien.
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
    try {
      outputBuffer = await sharp(buffer)
        .rotate()
        .resize({
          width: folder === "avatars" ? 512 : 1600,
          height: folder === "avatars" ? 512 : undefined,
          fit: folder === "avatars" ? "cover" : "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toBuffer();
    } catch {
      // Jangan pernah menyimpan file asli yang gagal diproses (bisa memuat metadata/EXIF atau konten aneh).
      return NextResponse.json({ error: "Gambar tidak dapat diproses" }, { status: 422 });
    }
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
