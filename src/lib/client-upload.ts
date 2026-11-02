export type UploadResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export const MAX_BYTES_BY_DEFAULT = 6 * 1024 * 1024;

const ACCEPTED = ["image/jpeg", "image/png", "image/gif", "image/webp"];

/** Validasi ringan di sisi klien. Server tetap memvalidasi ulang. */
export function validateFileBeforeUpload(file: File, maxBytes = MAX_BYTES_BY_DEFAULT): string | null {
  if (!ACCEPTED.includes(file.type)) {
    return "Hanya file JPG, PNG, GIF, atau WebP yang diizinkan";
  }
  if (file.size > maxBytes) {
    return `Ukuran file maksimal ${Math.max(1, Math.round(maxBytes / 1024 / 1024))} MB`;
  }
  return null;
}

export async function uploadToApi(file: File, folder: "posts" | "avatars"): Promise<UploadResult> {
  try {
    const form = new FormData();
    form.append("file", file);
    form.append("folder", folder);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const data = (await res.json()) as { url?: string; error?: string };
    if (!res.ok || !data.url) {
      return { ok: false, error: data.error ?? "Gagal mengunggah gambar" };
    }
    return { ok: true, url: data.url };
  } catch {
    return { ok: false, error: "Jaringan bermasalah — coba lagi" };
  }
}
