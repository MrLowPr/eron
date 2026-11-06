/**
 * Hanya terima path internal. Menolak "//host", "/\host", backslash, dan karakter kontrol
 * supaya callbackUrl tidak bisa dipakai untuk open redirect.
 */
export function safeCallbackPath(input?: string | null): string | undefined {
  if (!input) return undefined;
  if (!input.startsWith("/")) return undefined;
  if (input.startsWith("//")) return undefined;
  if (/[\u0000-\u001f\\]/.test(input)) return undefined;
  return input;
}
