import { createHash, randomBytes } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";
import type { UploadFolder } from "@/lib/constants";
import { AVATAR_MAX_SIZE } from "@/lib/constants";

/**
 * Storage abstraction.
 *
 * The app only depends on this interface. Switching to Uploadthing or
 * Cloudflare R2 later is a matter of implementing another driver here.
 */

export interface StoragePutInfo {
  folder: UploadFolder;
  /** Raw file bytes. */
  buffer: Uint8Array;
}

export type StoredFile = {
  /** Public URL path served by Next.js (e.g. /uploads/posts/2025/01/xyz.webp). */
  url: string;
  /** Absolute location on disk (for future drivers this may be a remote key). */
  filePath: string;
};

export interface StorageDriver {
  put(info: StoragePutInfo, opts?: { isAvatar?: boolean }): Promise<StoredFile>;
  delete(url: string): Promise<void>;
}

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

const MAX_DIMENSION = 1600;

class LocalStorageDriver implements StorageDriver {
  async put(info: StoragePutInfo, opts?: { isAvatar?: boolean }): Promise<StoredFile> {
    const now = new Date();
    const [year, month] = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0")];
    const dir = path.join(UPLOAD_ROOT, info.folder, `${year}${month}`);
    await fs.mkdir(dir, { recursive: true });

    const filename = `${randomBytes(16).toString("hex")}.webp`;
    const filePath = path.join(dir, filename);

    let pipeline = sharp(info.buffer).rotate();
    if (opts?.isAvatar) {
      pipeline = pipeline.resize(AVATAR_MAX_SIZE, AVATAR_MAX_SIZE, {
        fit: "cover",
        position: sharp.strategy.attention,
      });
    } else {
      pipeline = pipeline.resize({ width: MAX_DIMENSION, withoutEnlargement: true });
    }

    const output = await pipeline.webp({ quality: 80 }).toBuffer();
    await fs.writeFile(filePath, output);

    const url = path
      .relative(UPLOAD_ROOT, filePath)
      .split(path.sep)
      .join("/");
    return { url: `/uploads/${url}`, filePath };
  }

  async delete(url: string): Promise<void> {
    if (!url.startsWith("/uploads/")) return;
    // Prevent path traversal.
    const safe = path.normalize(url).replace(/^(\.\.(\/|\\|$))+/, "");
    const filePath = path.join(UPLOAD_ROOT, safe);
    if (!filePath.startsWith(UPLOAD_ROOT)) return;
    await fs.unlink(filePath).catch(() => undefined);
  }
}

export const storage: StorageDriver = new LocalStorageDriver();

// ── Upload validation (never trust client metadata) ─────────────────────────

const magics: Array<{ ext: string; test: (b: Buffer) => boolean }> = [
  { ext: "jpeg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    ext: "png",
    test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  { ext: "gif", test: (b) => b.subarray(0, 3).toString("ascii") === "GIF" },
  {
    ext: "webp",
    test: (b) =>
      b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP",
  },
];

/** Sniff the real image type from magic bytes. Returns null when not a supported image. */
export function detectImageType(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;
  const match = magics.find((m) => m.test(buffer));
  return match?.ext ?? null;
}

export function uploadMaxSize(): number {
  const raw = Number(process.env.UPLOAD_MAX_SIZE ?? 0);
  return raw > 0 ? raw : 6 * 1024 * 1024;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
