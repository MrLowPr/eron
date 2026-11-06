"use client";

/**
 * 🧳 Halaman Tamu — dari mockup `Halaman Tamu-html.zip`, koreografi utuh.
 * Ditaruh di `/` hanya untuk pengunjung tanpa sesi (belum login / setelah logout).
 * Data = nyata (member-only, sesuai kebijakan visibilitas staff).
 *
 * Koreografi yang dibawa dari mockup tanpa dikurangi (logika 1:1 dari Main.dc.html):
 * - Root `eron-wait` → `eron-in` saat siap; semua `.rv` build-in bertahap
 *   (--d ×110ms, blur+geser; --t ×90ms untuk transisi kembali via `.rv-off`).
 * - Arah scroll (hid.inv): scroll turun menghapus `.rv-off`; scroll naik >
 *   6px menandai section yang jatuh di bawah layar → reveal ulang saat masuk lagi.
 * - Feed otomatis 24s (`feedtrack`): bergeser ke kartu terpanas (k = posisi−1,
 *   kilatan blur saat geser), kartu terpanas menyala (vhot1..3 gated glow), kartu lain
 *   redaman (dimcard, hilang saat hover/fokus), popup "Komentar teratas"
 *   bergantian (eronpop1..3) + baris terkunci blur.
 * - Pause otomatis saat hover/fokus pada feed; hormat prefers-reduced-motion.
 * - Karosel viral: daftar digandakan, `--idx` maju 3,5s, lompat mulus ke 0,
 *   pause saat hover/fokus.
 *
 * Deviasi sadar: root dibuka otomatis beberapa frame setelah mount (mockup
 * menunggu interaksi pertama — membiarkan halaman kosong membingungkan), dan
 * footer tetap memakai navbar/footer global (bukan `.rv` #kaki mockup).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Bookmark,
  Calendar,
  Check,
  Flame,
  Lock,
  MessageSquare,
  PenSquare,
  Pin,
  Quote,
} from "lucide-react";
import type { GuestLandingData, TopCommentItem } from "@/server/queries/posts";
import type { PostCard } from "@/server/queries/posts";
import { formatNumber, timeAgo, getInitials } from "@/lib/utils";
import { MockupFooter, MockupNavbar } from "@/components/mockup-chrome";

/* ── Pra-saji util ─────────────────────────────────────────────────────────── */

const REASONS = [
  "Baca semua diskusi tanpa harus login",
  "Beri suara dan simpan postingan favorit",
  "Komentar berlapis yang rapi dan mudah diikuti",
  "Bagikan karya dan pertanyaanmu sendiri",
];

type FeedTab = "terbaru" | "populer";

/** Section yang mengikuti logika reveal arah-scroll (hid.inv) mockup. */
const DIR_IDS = ["topik", "viral", "feed", "fitur", "gabung", "kaki"] as const;

const getAuthorText = (name: string | null, username: string) => name || username;

const dVar = (d: number): React.CSSProperties => ({ ["--d"]: d } as React.CSSProperties);
const dtVar = (d: number, t: number): React.CSSProperties =>
  ({ ["--d"]: d, ["--t"]: t } as React.CSSProperties);

/* ── Root reveal: eron-wait → eron-in ──────────────────────────────────────── */

function useReveal() {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    // Mockup membuka layar pada interaksi pertama; di web sungguhan kita buka
    // otomatis begitu hidrasi selesai (dua frame agar style awal terpasang).
    let raf2 = 0;
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => setRevealed(true));
    });
    return () => {
      window.cancelAnimationFrame(raf1);
      if (raf2) window.cancelAnimationFrame(raf2);
    };
  }, []);
  return revealed;
}

/* ── Reveal arah-scroll (hid.inv mockup) ───────────────────────────────────── */

function useDirReveal(revealed: boolean) {
  const [off, setOff] = useState<Record<string, boolean>>({});
  const offRef = useRef(off);
  offRef.current = off;
  const revealedRef = useRef(revealed);
  revealedRef.current = revealed;

  useEffect(() => {
    let raf = 0;
    let lastPos: number | undefined;
    const handler = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const hero = document.getElementById("atas");
        if (!hero) return;
        const pos = -hero.getBoundingClientRect().top;
        if (lastPos === undefined) {
          lastPos = pos;
          return;
        }
        const delta = pos - lastPos;
        if (Math.abs(delta) < 6) return;
        lastPos = pos;
        if (!revealedRef.current) return;
        const cur = offRef.current;
        if (delta > 0) {
          // Scroll turun: hapus semua tanda → section reveal ulang saat masuk layar.
          if (DIR_IDS.some((id) => cur[id])) setOff({});
          return;
        }
        // Scroll naik: tandai section yang jatuh di bawah layar (vy > vh - 24).
        const vh = window.innerHeight || document.documentElement.clientHeight;
        const next: Record<string, boolean> = {};
        let changed = false;
        for (const id of DIR_IDS) {
          const el = document.getElementById(id);
          const below = !!el && el.getBoundingClientRect().top > vh - 24;
          next[id] = !!cur[id] || below;
          if (next[id] !== !!cur[id]) changed = true;
        }
        if (changed) setOff(next);
      });
    };
    window.addEventListener("scroll", handler, { capture: true, passive: true });
    return () => {
      window.removeEventListener("scroll", handler, { capture: true });
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  return off;
}

/* ── Karosel viral (daftar digandakan, maju 3,5s, wrap mulus ke 0) ─────────── */

function ViralCarousel({ posts, revealed }: { posts: PostCard[]; revealed: boolean }) {
  const [idx, setIdx] = useState(0);
  const [anim, setAnim] = useState(true);
  const [paused, setPaused] = useState(false);
  const n = posts.length;
  const shown = useMemo(() => [...posts, ...posts], [posts]);

  // Mirip mockup advance(): interval 3,5s, skip saat pause/belum terbuka.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      if (paused || !revealed || n < 2) return;
      setAnim(true);
      setIdx((cur) => cur + 1);
    }, 3500);
    return () => window.clearInterval(timer);
  }, [paused, revealed, n]);

  // Melewati ujung: setelah slide ke kartu ganda selesai (700ms), lompat balik
  // ke 0 tanpa animasi (visual identik), lalu advance berikutnya menyalakan lagi.
  useEffect(() => {
    if (n >= 2 && idx >= n) {
      const t = window.setTimeout(() => {
        setAnim(false);
        setIdx(0);
      }, 700);
      return () => window.clearTimeout(t);
    }
  }, [idx, n]);

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="-m-0.5 overflow-hidden p-0.5">
        <div
          className="guest-track"
          style={{ ...({ ["--idx"]: idx } as React.CSSProperties), transition: anim ? undefined : "none" }}
        >
          {shown.map((post, i) => (
            <article
              key={`${post.id}-${i}`}
              className="guest-card hover:border-primary/40 flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-5"
            >
              <div className="flex items-center gap-2.5">
                <span className="chip-indigo flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[13px] font-bold">
                  {(i % n) + 1}
                </span>
                {post.category && (
                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-zinc-600">
                    {post.category.name}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">{timeAgo(post.createdAt)}</span>
              </div>
              <Link
                href={`/post/${post.id}`}
                className="text-lg font-semibold leading-[1.3] hover:text-primary"
              >
                {post.title}
              </Link>
              <p className="line-clamp-2 text-sm leading-[1.55] text-muted-foreground">{post.content}</p>
              <div className="mt-auto flex items-center gap-4 pt-1 text-[13px] text-zinc-600">
                <span className="inline-flex items-center gap-1.5 font-semibold text-primary">
                  <ArrowUp className="h-4 w-4" />
                  {formatNumber(post._count.likes)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4" />
                  {formatNumber(post._count.comments)} komentar
                </span>
                <span className="ml-auto truncate text-muted-foreground">
                  {getAuthorText(post.author.name, post.author.username)}
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="mt-5 flex items-center justify-center gap-1">
        {posts.map((post, i) => {
          const active = idx % n === i;
          return (
            <button
              key={post.id}
              type="button"
              aria-label={`Tampilkan diskusi viral ${i + 1}`}
              aria-current={active}
              onClick={() => {
                setAnim(true);
                setIdx(i);
              }}
              className="cursor-pointer px-1 py-2.5"
            >
              <span
                className={`block h-2 rounded-full transition-all duration-300 ${active ? "w-6 bg-primary" : "w-2 bg-zinc-300"}`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Kartu feed tamu (tinggi 216px, mengikuti koreografi) ──────────────────── */

function GuestPostCard({
  post,
  chipLabel,
  cls,
  dup,
  onNudge,
}: {
  post: PostCard;
  /** Label chip "Terviral #n" (ada hanya pada kartu terpanas). */
  chipLabel?: string;
  /** Kelas koreografi: `vhot1..3` (menyala) atau `dimcard` (redaman). */
  cls?: string;
  /** Kartu ganda untuk perjalanan loop. */
  dup?: boolean;
  onNudge: () => void;
}) {
  const tabIdx = dup ? -1 : 0;
  return (
    <article
      className={`${cls ?? ""} flex h-[216px] flex-none flex-col gap-2.5 overflow-hidden rounded-xl border border-border bg-card p-4`}
      data-testid="guest-post-card"
    >
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {chipLabel && (
          <span className="chip-indigo inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-semibold">
            <Flame className="h-3 w-3" />
            {chipLabel}
          </span>
        )}
        {post.pinned && (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 font-semibold text-amber-700">
            <Pin className="h-3 w-3" />
            Pinned
          </span>
        )}
        {post.category && (
          <span className="rounded-md bg-muted px-2 py-0.5 font-semibold text-zinc-600">
            {post.category.name}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {timeAgo(post.createdAt)}
        </span>
      </div>
      <Link
        href={`/post/${post.id}`}
        tabIndex={tabIdx}
        className="line-clamp-2 text-lg font-semibold leading-[1.3] hover:text-primary"
      >
        {post.title}
      </Link>
      <p className="line-clamp-2 text-sm leading-[1.55] text-muted-foreground">{post.content}</p>
      <div className="mt-auto flex flex-nowrap items-center gap-3">
        <span className="flex min-w-0 flex-1 basis-[160px] items-center gap-2">
          <span className="chip-indigo flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
            {getInitials(post.author.name || post.author.username)}
          </span>
          <span className="truncate text-[13px] font-medium">
            {getAuthorText(post.author.name, post.author.username)}
          </span>
        </span>
        <span className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Beri suara (perlu akun)"
            tabIndex={tabIdx}
            onClick={onNudge}
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-[13px] text-zinc-600 hover:bg-accent hover:text-accent-foreground"
          >
            <ArrowUp className="h-4 w-4" />
            {formatNumber(post._count.likes)}
          </button>
          <button
            type="button"
            aria-label="Komentar (perlu akun)"
            tabIndex={tabIdx}
            onClick={onNudge}
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-[13px] text-zinc-600 hover:bg-accent hover:text-accent-foreground"
          >
            <MessageSquare className="h-4 w-4" />
            {formatNumber(post._count.comments)}
          </button>
          <button
            type="button"
            aria-label="Simpan (perlu akun)"
            tabIndex={tabIdx}
            onClick={onNudge}
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-zinc-600 hover:bg-accent hover:text-accent-foreground"
          >
            <Bookmark className="h-4 w-4" />
          </button>
        </span>
      </div>
    </article>
  );
}

/* ── Popup komentar teratas bergantian (eronpop1..3) ───────────────────────── */

function HotCommentsPopup({ hot }: { hot: GuestLandingData["hot"][number] }) {
  const top = hot.top;
  const restCount = Math.max(hot.totalComments - top.length, 0);
  return (
    <div className="absolute inset-0 z-[5] box-border flex items-center justify-center bg-background/55 p-2">
      <div
        role="dialog"
        aria-label={`Komentar teratas: ${hot.title}`}
        className="max-h-full w-full max-w-[540px] box-border flex-col gap-2.5 overflow-hidden rounded-xl border border-border bg-card p-4 shadow-[0_12px_32px_rgba(9,9,11,0.14)]"
      >
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center justify-between gap-2">
            <span className="chip-indigo-text flex items-center gap-1.5 text-xs font-semibold">
              <Quote className="h-3.5 w-3.5" />
              Komentar teratas
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {Math.min(3, hot.totalComments)} dari {formatNumber(hot.totalComments)} komentar
            </span>
          </div>
          <p className="truncate text-[15px] font-semibold leading-[1.3]">{hot.title}</p>
        </div>

        {top.map((c: TopCommentItem, i: number) => (
          <div
            key={c.id}
            className={`flex gap-2.5 rounded-lg border p-2.5 ${
              i === 0 ? "border-primary/40 bg-primary/5" : "border-border bg-background"
            }`}
          >
            <span className="chip-indigo flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
              {getInitials(c.author.name || c.author.username)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 text-[13px] font-semibold">
                {c.author.name || c.author.username}
                <span className="font-normal text-muted-foreground">· {timeAgo(new Date(c.createdAt))}</span>
                {i === 0 && (
                  <span className="chip-indigo rounded-md px-2 py-px text-[11px] font-semibold">
                    Paling banyak disukai
                  </span>
                )}
              </div>
              <p className="mt-[3px] line-clamp-2 text-[13px] leading-normal text-zinc-600">{c.content}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="chip-indigo inline-flex items-center gap-1 rounded-md px-2 text-xs font-semibold">
                  <ArrowUp className="h-3 w-3" />
                  {formatNumber(c.likeCount)}
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* Baris terkunci: komentar berikutnya tampil blur + gerbang akun */}
        <div className="relative h-[150px] overflow-hidden rounded-[10px]">
          <div aria-hidden className="pointer-events-none flex select-none flex-col gap-2 blur-[5px]">
            {hot.blurred.map((c) => (
              <div
                key={c.id}
                className="flex w-full items-start gap-2.5 rounded-[10px] border border-border bg-background p-2.5"
              >
                <span className="chip-indigo flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
                  {getInitials(c.author.name || c.author.username)}
                </span>
                <div className="min-w-0">
                  <span className="text-[13px] font-semibold">{c.author.name || c.author.username}</span>
                  <p className="mt-[3px] text-[13px] leading-normal text-zinc-600">{c.content}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-background/30 to-background/90 px-2 text-center">
            <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold">
              <Lock className="h-3.5 w-3.5 text-primary" />
              Daftar atau masuk untuk melihat {formatNumber(restCount)} komentar lainnya
            </span>
            <div className="flex gap-2">
              <Link
                href="/register"
                className="inline-flex h-8 items-center rounded-[10px] bg-primary px-3.5 text-[13px] font-medium text-primary-foreground"
              >
                Daftar
              </Link>
              <Link
                href="/login"
                className="inline-flex h-8 items-center rounded-[10px] border border-border bg-background px-3.5 text-[13px] font-medium"
              >
                Masuk
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Halaman utama ─────────────────────────────────────────────────────────── */

export function GuestLanding({ data }: { data: GuestLandingData }) {
  const [tab, setTab] = useState<FeedTab>("terbaru");
  const [nudge, setNudge] = useState(false);
  const revealed = useReveal();
  const off = useDirReveal(revealed);

  // Feed aktif: 6 post teratas sesuai tab (mockup: mapped/sorted per tab).
  const posts = useMemo(
    () => (tab === "terbaru" ? data.newest.slice(0, 6) : data.popular.slice(0, 6)),
    [tab, data],
  );
  const dup = useMemo(() => posts.map((p) => ({ ...p })), [posts]);

  // Posisi kartu terpanas di tab aktif, diurutkan sesuai urutan kemunculan.
  // Nomor vhot/k/popup dipakai dari urutan kemunculan (mockup: `seen`), sedangkan
  // label chip memakai peringkat suara (`rank` dari server).
  const hotInfo = useMemo(() => {
    const hotList = tab === "terbaru" ? data.hot : data.hotPopular;
    return hotList
      .map((hotspot) => ({ hotspot, pos: posts.findIndex((p) => p.id === hotspot.postId) }))
      .filter((f) => f.pos >= 0)
      .sort((a, b) => a.pos - b.pos)
      .map((f, i) => ({ ...f, vhot: i + 1, k: Math.max(0, f.pos - 1) }));
  }, [tab, posts, data.hot, data.hotPopular]);

  // Variabel koreografi feed — persis mockup: --pitch:232px, k=p-1, n=jumlah kartu.
  const feedVars = useMemo(() => {
    if (hotInfo.length === 0) return null;
    const last = hotInfo[hotInfo.length - 1].k;
    const ks = [0, 1, 2].map((i) => hotInfo[i]?.k ?? last);
    return {
      ["--pitch"]: "232px",
      ["--k1"]: ks[0],
      ["--k2"]: ks[1],
      ["--k3"]: ks[2],
      ["--n"]: posts.length,
    } as React.CSSProperties;
  }, [hotInfo, posts.length]);

  const clsOf = (postId: string): string | undefined => {
    if (!feedVars) return undefined;
    const h = hotInfo.find((x) => x.hotspot.postId === postId);
    return h ? `vhot${h.vhot}` : "dimcard";
  };
  const chipOf = (postId: string): string | undefined => {
    if (!feedVars) return undefined;
    const h = hotInfo.find((x) => x.hotspot.postId === postId);
    return h ? `Terviral #${h.hotspot.rank}` : undefined;
  };

  const rootClass = revealed ? "eron-in" : "eron-wait";

  return (
    <div
      id="halaman-tamu"
      className={`theme-guest-light ${rootClass} flex min-h-screen w-full flex-col`}
    >
      {/* Tanpa JS: pastikan konten tetap terbaca & koreografi berhenti. */}
      <noscript>
        <style>{`.eron-wait .rv{opacity:1;pointer-events:auto}.eron-wait .feedtrack,.eron-wait [class*="vhot"],.eron-wait [class*="eronpop"]{animation:none}.dupcard{display:none}.guest-track{transition:none!important}#feed .feedwrap{overflow-y:auto!important}.dimcard{filter:none!important;opacity:1!important}`}</style>
      </noscript>

      {/* ── Navbar mockup (rv --d:0, persis `Main.dc.html`) ── */}
      <MockupNavbar className="rv" style={dVar(0)} />

      {/* ── Hero ── */}
      <section id="atas" className="flex justify-center border-b border-border bg-background">
        <div className="flex w-full max-w-[1400px] flex-col items-start gap-5 px-4 pb-16 pt-[72px]">
          <span
            className="rv chip-indigo inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold"
            style={dVar(1)}
          >
            <Flame className="h-3 w-3" />
            Lagi ramai minggu ini
          </span>
          <h1
            className="rv max-w-[820px] text-[40px] font-extrabold leading-[1.08] tracking-[-0.025em] sm:text-[52px]"
            style={dVar(2)}
          >
            Obrolan paling seru lagi terjadi di sini. <span className="text-primary">Sudah intip belum?</span>
          </h1>
          <p className="rv max-w-[620px] text-[18px] leading-[1.55] text-muted-foreground" style={dVar(3)}>
            Eron adalah tempat komunitas modern diskusi &amp; berbagi seputar teknologi, hobi, dan karya kreatif.
            Baca dulu yang lagi viral, daftar kalau kamu sudah ingin ikut nimbrung.
          </p>
          <div className="rv mt-2 flex flex-wrap gap-3" style={dVar(4)}>
            <Link
              href="#feed"
              className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-6 text-[15px] font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              <ArrowDown className="h-4 w-4" />
              Lihat diskusi dulu
            </Link>
            <Link
              href="/register"
              className="inline-flex h-11 items-center rounded-[10px] border border-border bg-background px-6 text-[15px] font-medium hover:bg-accent hover:text-accent-foreground"
            >
              Buat akun gratis
            </Link>
          </div>
          <p className="rv text-[13px] text-muted-foreground" style={dVar(5)}>
            Tidak perlu daftar untuk membaca. Akun hanya dibutuhkan untuk memberi suara, berkomentar, dan membuat
            postingan.
          </p>
        </div>
      </section>

      {/* ── Topik ramai ── */}
      {data.categories.length > 0 && (
        <section
          id="topik"
          aria-label="Topik yang sedang ramai"
          className={`rv flex justify-center border-b border-border bg-background ${off.topik ? "rv-off" : ""}`}
          style={dtVar(6, 0)}
        >
          <div className="flex w-full max-w-[1400px] flex-wrap items-center px-4 pb-0.5 pt-3.5">
            <span className="mb-3 mr-3 text-xs font-semibold text-muted-foreground">Topik ramai:</span>
            {data.categories.map((c) => (
              <Link
                key={c.slug}
                href={`/kategori/${c.slug}`}
                className="mb-3 mr-3 inline-flex items-center whitespace-nowrap rounded-lg border border-border bg-muted px-3.5 py-1.5 text-[13px] font-semibold text-zinc-600 transition-colors hover:border-primary/40 hover:text-foreground"
              >
                <span aria-hidden className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Terviral (section polos; rv di dalam, persis mockup) ── */}
      {data.viral.length > 0 && (
        <section id="viral" className="flex justify-center border-b border-border bg-muted">
          <div
            className={`rv flex w-full max-w-[1400px] flex-col gap-5 px-4 py-10 ${off.viral ? "rv-off" : ""}`}
            style={dtVar(7, 1)}
          >
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary">
                  <Flame className="h-[18px] w-[18px] text-primary-foreground" />
                </span>
                <div>
                  <h2 className="text-2xl font-bold tracking-[-0.01em]">Terviral minggu ini</h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Diskusi yang paling banyak dibicarakan anggota Eron.
                  </p>
                </div>
              </div>
              <Link href="/register" className="text-sm font-medium hover:text-primary">
                Daftar untuk ikut bergabung
              </Link>
            </div>
            <ViralCarousel posts={data.viral} revealed={revealed} />
          </div>
        </section>
      )}

      {/* ── Feed contoh + koreografi 24s (rv di dalam, persis mockup) ── */}
      <section id="feed" className="flex justify-center">
        <div
          className={`rv flex w-full max-w-[1400px] flex-wrap items-start gap-6 px-4 pb-14 pt-10 ${off.feed ? "rv-off" : ""}`}
          style={dtVar(8, 2)}
        >
          <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold tracking-[-0.01em]">Feed Komunitas</h2>
                <p className="mt-1 text-sm text-muted-foreground">Contoh diskusi yang bisa kamu temukan di Eron.</p>
              </div>
              <div className="flex gap-1 rounded-[10px] bg-muted p-1">
                {(
                  [
                    ["terbaru", "Terbaru"],
                    ["populer", "Populer"],
                  ] as Array<[FeedTab, string]>
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className={
                      "h-[30px] cursor-pointer rounded-lg px-3.5 text-[13px] font-medium transition-colors " +
                      (tab === id
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground")
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {nudge && (
              <div
                role="status"
                className="chip-indigo-strong flex flex-wrap items-center gap-3 rounded-[10px] border border-primary/40 p-3.5"
              >
                <Lock className="chip-indigo-text h-[18px] w-[18px] shrink-0" />
                <span className="min-w-[240px] flex-1 text-sm font-medium">
                  Memberi suara, menyimpan, dan berkomentar butuh akun. Gratis dan cuma sebentar.
                </span>
                <Link
                  href="/register"
                  className="inline-flex h-9 items-center rounded-[10px] bg-primary px-4 text-sm font-medium text-primary-foreground"
                >
                  Daftar
                </Link>
                <button
                  type="button"
                  onClick={() => setNudge(false)}
                  className="chip-indigo-text h-9 cursor-pointer rounded-[10px] px-3 text-sm font-medium hover:underline"
                >
                  Nanti saja
                </button>
              </div>
            )}

            {posts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Belum ada diskusi terbuka. Nanti kamu bisa jadi yang pertama.
              </div>
            ) : (
              <div className="feedwrap relative box-border -m-0.5 h-[684px] overflow-hidden p-0.5">
                <div className={`flex flex-col gap-4${feedVars ? " feedtrack" : ""}`} style={feedVars ?? undefined}>
                  {posts.map((post) => (
                    <GuestPostCard
                      key={post.id}
                      post={post}
                      chipLabel={chipOf(post.id)}
                      cls={clsOf(post.id)}
                      onNudge={() => setNudge(true)}
                    />
                  ))}
                  {dup.map((post, i) => (
                    <div key={`dup-${post.id}-${i}`} aria-hidden className="dupcard">
                      <GuestPostCard
                        post={post}
                        chipLabel={chipOf(post.id)}
                        cls={clsOf(post.id)}
                        dup
                        onNudge={() => setNudge(true)}
                      />
                    </div>
                  ))}
                </div>

                {feedVars &&
                  hotInfo.slice(0, 3).map((h, i) => (
                    <div
                      key={h.hotspot.postId}
                      className={`opacity-0 invisible eronpop${i + 1}`}
                      style={{
                        opacity: 0,
                        visibility: "hidden",
                        position: "absolute",
                        inset: 0,
                        zIndex: 5,
                        boxSizing: "border-box",
                        padding: 8,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 12,
                      }}
                    >
                      <HotCommentsPopup hot={h.hotspot} />
                    </div>
                  ))}
              </div>
            )}

            {/* Kotak CTA terkunci */}
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-8 text-center">
              <PenSquare className="h-8 w-8 text-primary" strokeWidth={1.75} />
              <h3 className="text-lg font-semibold">Mau lihat diskusi selengkapnya?</h3>
              <p className="max-w-[420px] text-sm leading-[1.55] text-muted-foreground">
                Buat akun untuk membuka semua postingan, ikut berkomentar, dan mulai topik barumu sendiri.
              </p>
              <Link
                href="/register"
                className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                Daftar sekarang
              </Link>
            </div>
          </div>

          <aside className="flex min-w-0 max-w-full flex-[1_1_280px] flex-col gap-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold">Kategori</h3>
              <div className="flex flex-wrap gap-2">
                {data.categories.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/kategori/${c.slug}`}
                    className="rounded-lg bg-muted px-2.5 py-1 text-xs font-semibold text-zinc-600 transition-colors hover:text-primary"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold">Kenapa gabung Eron?</h3>
              <ul className="flex flex-col gap-2.5">
                {REASONS.map((r) => (
                  <li key={r} className="flex gap-2 text-[13px] leading-normal text-zinc-600">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="flex h-9 items-center justify-center rounded-[10px] bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Buat akun gratis
              </Link>
              <Link
                href="/login"
                className="flex h-9 items-center justify-center rounded-[10px] border border-border text-sm font-medium hover:bg-accent"
              >
                Sudah punya akun? Masuk
              </Link>
            </div>
          </aside>
        </div>
      </section>

      {/* ── Fitur ── */}
      <section
        id="fitur"
        className={`rv flex justify-center border-t border-border bg-muted ${off.fitur ? "rv-off" : ""}`}
        style={dtVar(9, 3)}
      >
        <div className="flex w-full max-w-[1400px] flex-col gap-8 px-4 py-16">
          <div className="flex max-w-[640px] flex-col gap-2">
            <h2 className="text-3xl font-bold tracking-[-0.015em]">Yang bisa kamu lakukan setelah bergabung</h2>
            <p className="text-[15px] leading-[1.55] text-muted-foreground">
              Membaca selalu gratis dan terbuka. Akun membuka cara-cara untuk ikut terlibat.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-8 rounded-xl border border-primary/40 bg-card p-7">
            <div className="flex min-w-0 flex-1 flex-col gap-3" style={{ flexBasis: 320 }}>
              <span className="chip-indigo self-start rounded-md px-2 py-0.5 text-xs font-semibold">
                Fitur andalan
              </span>
              <h3 className="text-[26px] font-bold leading-[1.2] tracking-[-0.015em]">
                Komentar berlapis, obrolan tetap rapi.
              </h3>
              <p className="text-[15px] leading-[1.6] text-muted-foreground">
                Balas langsung ke komentar yang kamu maksud. Percakapan panjang tidak lagi berantakan, dan kamu
                bisa mengikuti alur diskusi dari awal sampai akhir.
              </p>
              <Link
                href="/register"
                className="inline-flex h-10 items-center self-start rounded-[10px] bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                Coba sendiri, daftar gratis
              </Link>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-3 rounded-xl bg-muted p-4" style={{ flexBasis: 360 }}>
              {(
                [
                  ["DA", "Dimas Aditya", "2 jam lalu", "Menurut kalian lebih enak kerja pagi atau malam?", 0],
                  ["NP", "Nadia Putri", "1 jam lalu", "Pagi, kepala masih jernih dan notifikasi belum ramai.", 1],
                  ["RP", "Raka Pratama", "40 menit lalu", "Setuju, tapi untuk kerja kreatif aku tetap menang di malam hari.", 2],
                ] as Array<[string, string, string, string, number]>
              ).map(([inits, author, time, text, indent]) => (
                <div key={inits} style={indent ? { paddingLeft: indent * 24 } : undefined}>
                  <div className="flex gap-2.5 rounded-[10px] border border-border bg-background p-3">
                    <span className="chip-indigo flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
                      {inits}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold">
                        {author} <span className="font-normal text-muted-foreground">· {time}</span>
                      </div>
                      <p className="mt-[3px] text-[13px] leading-normal text-zinc-600">{text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA akhir ── */}
      <section
        id="gabung"
        className={`rv flex justify-center border-t border-border ${off.gabung ? "rv-off" : ""}`}
        style={dtVar(10, 4)}
      >
        <div className="flex w-full max-w-[1400px] flex-col items-center gap-4 px-4 py-[72px] text-center">
          <h2 className="max-w-[640px] text-[34px] font-extrabold leading-[1.15] tracking-[-0.02em]">
            Sudah ada yang menarik? Yuk, ikut ngobrol.
          </h2>
          <p className="max-w-[520px] text-base leading-[1.55] text-muted-foreground">
            Buat akun dalam hitungan menit, atau masuk kalau kamu sudah pernah bergabung.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex h-11 items-center rounded-[10px] bg-primary px-7 text-[15px] font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              Daftar gratis
            </Link>
            <Link
              href="/login"
              className="inline-flex h-11 items-center rounded-[10px] border border-border bg-background px-7 text-[15px] font-medium hover:bg-accent hover:text-accent-foreground"
            >
              Masuk
            </Link>
          </div>
          <a href="#feed" className="mt-1 text-sm font-medium hover:text-primary">
            Belum yakin? Lihat diskusi lagi
          </a>
        </div>
      </section>

      {/* ── Footer mockup (rv --d:11, id kaki untuk replay hid.inv) ── */}
      <MockupFooter
        className={`rv ${off.kaki ? "rv-off" : ""}`}
        style={dtVar(11, 5)}
      />
    </div>
  );
}
