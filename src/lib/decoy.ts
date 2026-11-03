/**
 * ⭐ DECOY / ANTI-CRAWLER — EDIT TERSERAH ANDA DI SINI
 *
 * Semua isi berkas ini BERSIFAT PALSU dan harus mengecoh bot/hacker:
 *   • kredensial di dalamnya 100% dummy — tidak dipakai aplikasi, tidak nyata
 *   • halaman admin "palsu" — tidak ada sesi/akses nyata di belakangnya
 *   • setiap tembakan dijalankan dicatat ke log:
 *       docker compose logs app | grep BOT
 *
 * Aturan yang yang dijalankan middleware (lih. src/middleware.ts):
 *   bot crawler  (Googlebot, Bingbot, GPTBot, scraping UA…)  → 403 "nginx"
 *   scanner mencoba  /.env .git admin palsu                  → isi palsu, IP dicatat
 *   robots.txt (untuk scanner non-bot)                       → daftar umpan
 *   sitemap.xml                                              → 404
 *   semua respons nyata                                      → header decoy (X-Powered-By: PHP …)
 */

// ── 1. Pattern UA crawler → diblokir total ──────────────────────────────────
export const CRAWLER_BOTS =
  /(googlebot|bingbot|slurp|baiduspider|sogou|yandex|duckduckbot|facebookexternalhit|twitterbot|linkedinbot|telegrambot|whatsapp|semrushbot|ahrefsbot|mj12bot|dotbot|petalbot|bytespider|gptbot|oai-searchbot|chatgpt-user|claudebot|claude-web|anthropic-ai|perplexitybot|google-extended|ccbot|commoncrawl|ia_archiver|python-requests|python-httpx|okhttp|libwww|java\/|go-http-client|httpclient)/i;

// ── 2. jalur "admin palsu" → dirender HTML mengecoh ─────────────────────────
export const DECOY_HTML_PATHS = [
  "/wp-admin",
  "/wp-admin/index.php",
  "/wp-login.php",
  "/administrator",
  "/admin-panel",
  "/backend/manage",
  "/control-center",
  "/manager/login",
];

// ── 3. jalur "file bocor palsu" → dirender teks ─────────────────────────────
export const DECOY_TEXT_FILES: Record<string, string> = {
  "/.env": `# ── PROD ENV — inner only do not share ──
DATABASE_URL=postgresql://root:aX$9Gq2Km7Zv@10.10.0.44:5432/coredb?sslmode=require
AUTH_SECRET=7bd4e9c2a1f84e6b93c07d58d1f2e9a4
SMTP_HOST=mail-relay.internal.net
SMTP_USER=svc-core
SMTP_PASS=qW3rT!z8N2b
REDIS_URL=redis://10.10.0.45:6379/2
AWS_KEY=AKIAJNXT7QKM4ZQ2PQBA
AWS_SECRET=bF7pR+jH3kT9wQ2yV6xCzN8dE0mS4aG1tU5i`,
  "/.env.local": `DATABASE_URL=postgresql://root:aX$9Gq2Km7Zv@10.10.0.44:5432/coredb
AUTH_SECRET=7bd4e9c2a1f84e6b93c07d58d1f2e9a4`,
  "/.git/config": `[core]
\trepositoryformatversion = 0
\tfilemode = true
[url "ssh://deploy@10.10.0.44:22/srv/git/backend-core.git"]
\tfetch = +refs/heads/*:refs/remotes/origin/*`,
};

// ── 4. file "backup" palsu → dirender 404 ala nginx ────────────────────────
export const DECOY_404_PATHS = [
  "/backup.zip",
  "/backup.tar.gz",
  "/db-backup.sql",
  "/database.sql",
  "/dump.sql",
  "/admin.zip",
];

// ── robots.txt umpan (hanya scanner non-bot yang berhasil mengintip) ────────
export function decoyRobotsTxt(host: string): string {
  return [
    "User-agent: *",
    "Disallow: /admin/",
    "Disallow: /admin-panel/",
    "Disallow: /manager/",
    "Disallow: /backup.zip",
    "Disallow: /db-backup.sql",
    `Sitemap: https://${host}/sitemap.xml`,
    "",
  ].join("\n");
}

// ── halaman admin palsu (HTML statis, tanpa backend) ────────────────────────
export function fakeAdminPage(title = "Admin Console"): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title} · Sign in</title>
<style>body{background:#0f1117;color:#e6e6e6;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.card{background:#171a23;padding:28px;border-radius:12px;width:320px;border:1px solid #2a2f3d}
input{width:100%;margin:6px 0 12px;padding:10px;border-radius:8px;border:1px solid #2a2f3d;background:#0f1117;color:#fff;box-sizing:border-box}
button{width:100%;padding:10px;border-radius:8px;border:0;background:#4f6ef7;color:#fff;font-weight:600}
h1{font-size:16px;margin:0 0 14px}.m{font-size:11px;color:#8a90a3}</style></head>
<body><div class="card"><h1>${title}</h1><form action="/wp-admin/index.php" method="post">
<input name="username" placeholder="User"><input name="password" type="password" placeholder="Password">
<button>Sign in</button></form><p class="m">v4.2.7 — build 2026b</p></div></body></html>`;
}

export function fakeNginx404(host = ""): string {
  return `<html>\n<head><title>404 Not Found</title></head>\n<body bgcolor="white">\n<center><h1>404 Not Found</h1></center>\n<hr><center>nginx${host ? " " + host : ""}</center>\n</body>\n</html>`;
}

export function fakeForbidden(): string {
  return `<html>\n<head><title>403 Forbidden</title></head>\n<body bgcolor="white">\n<center><h1>403 Forbidden</h1></center>\n<hr><center>nginx/1.24.0</center>\n</body>\n</html>`;
}

// ── catat tembakan jebakan ke log ────────────────────────────────────────────
export function logTrap(
  kind: string,
  req: { headers: { get(k: string): string | null }; nextUrl: { pathname: string } },
) {
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "lokal";
  const ua = (req.headers.get("user-agent") ?? "").slice(0, 100);
  console.warn(`[BOT] ${kind} ip=${ip} path=${req.nextUrl.pathname} ua=${ua}`);
}

/** header pengecoh untuk semua respons jebakan */
export function trapHeaders(kind: string): Record<string, string> {
  return {
    "Content-Type": kind === "html" ? "text/html; charset=utf-8" : "text/plain; charset=utf-8",
    "Cache-Control": "no-store, must-revalidate",
    "X-Powered-By": "PHP/8.2.28", // fiktif — server asli Node.js
    "X-Robots-Tag": "noindex, nofollow, noimageindex",
    "Referrer-Policy": "no-referrer",
  };
}

/** host = panggilan milik sistem sendiri (health-check) → jangan diblokir */
export function isLocalHost(host: string): boolean {
  return /^(localhost|127\.0\.0\.1|\[::1\]|::1)(:\d+)?$/i.test(host);
}

// ── ROUTER JEBARAN — dipanggil middleware; null = jalur normal ──────────────
import { NextResponse } from "next/server"; // eslint-disable-line
import type { NextRequest } from "next/server"; // eslint-disable-line

export function botTrap(req: NextRequest): NextResponse | null {
  const host = req.headers.get("host") ?? "";
  const ua = req.headers.get("user-agent") ?? "";
  const p = req.nextUrl.pathname.toLowerCase();

  // 1 ▸ UA crawler → 403 ala nginx (batal diakses)
  if (CRAWLER_BOTS.test(ua)) {
    logTrap("CRAWLER", req);
    return new NextResponse(fakeForbidden(), { status: 403, headers: trapHeaders("html") });
  }

  // 2 ▸ admin palsu → HTML realistis (mengecoh, IP dicatat)
  if (DECOY_HTML_PATHS.some((d) => p === d || p.startsWith(d + "/"))) {
    logTrap("DECOY-ADMIN", req);
    return new NextResponse(fakeAdminPage("Admin Console"), { status: 200, headers: trapHeaders("html") });
  }

  // 3 ▸ file "bocor" palsu → teks dummy
  const textFile = DECOY_TEXT_FILES[p];
  if (textFile) {
    logTrap("DECOY-LEAK", req);
    return new NextResponse(textFile, { status: 200, headers: trapHeaders("plain") });
  }

  // 4 ▸ file "backup" palsu → 404 ala nginx
  if (DECOY_404_PATHS.includes(p)) {
    logTrap("DECOY-404", req);
    return new NextResponse(fakeNginx404(host), { status: 404, headers: trapHeaders("html") });
  }

  // 5 ▸ robots.txt (dilihat non-bot) = umpan · sitemap = 404
  if (p === "/robots.txt") {
    return new NextResponse(decoyRobotsTxt(host), { status: 200, headers: trapHeaders("plain") });
  }
  if (p === "/sitemap.xml" || p.startsWith("/sitemap")) {
    logTrap("SITEMAP", req);
    return new NextResponse(fakeNginx404(host), { status: 404, headers: trapHeaders("html") });
  }

  return null;
}
