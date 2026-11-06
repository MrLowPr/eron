/**
 * Alamat klien untuk rate limit.
 * Mengandalkan reverse proxy yang MENIMPA x-real-ip. Nilai paling kiri di x-forwarded-for
 * dikirim klien (bisa dipalsukan), jadi yang dipakai adalah entri paling kanan (ditambahkan proxy terdekat).
 */
export function clientIpFromHeaders(h: { get(name: string): string | null }): string {
  const real = h.get("x-real-ip")?.trim();
  if (real) return real;
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((part) => part.trim()).filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) return last;
  }
  return "unknown";
}
