/**
 * Seed data contoh: users (admin/mod/user), kategori, tag, postingan,
 * komentar berlapis, like, bookmark, notifikasi, serta satu laporan pending.
 *
 * Jalankan: npm run db:seed
 */

import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "password123";

async function main() {
  console.info("→ Menghapus data lama…");
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.report.deleteMany(),
    prisma.like.deleteMany(),
    prisma.bookmark.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.postTag.deleteMany(),
    prisma.post.deleteMany(),
    prisma.tag.deleteMany(),
    prisma.category.deleteMany(),
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.verificationToken.deleteMany(),
    prisma.passwordResetToken.deleteMany(),
    prisma.emailVerificationToken.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const password = await bcrypt.hash(DEMO_PASSWORD, 12);

  console.info("→ Membuat users…");
  const [admin, rina, alice, bob] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Admin Eron",
        username: "admin",
        email: "admin@eron.dev",
        password,
        role: Role.ADMIN,
        emailVerified: new Date(),
        bio: "Founder Eron. Bicara soal produk & komunitas.",
      },
    }),
    prisma.user.create({
      data: {
        name: "Moderator Rina",
        username: "rina",
        email: "rina@eron.dev",
        password,
        role: Role.MODERATOR,
        emailVerified: new Date(),
        bio: "Moderator komunitas. Laporkan konten bermasalah!",
      },
    }),
    prisma.user.create({
      data: {
        name: "Alice Dev",
        username: "alice",
        email: "alice@eron.dev",
        password,
        bio: "Front-end dev, suka Tailwind & TypeScript.",
      },
    }),
    prisma.user.create({
      data: {
        name: "Bob Backend",
        username: "bob",
        email: "bob@eron.dev",
        password,
        bio: "Backend engineer. PostgreSQL enthusiast.",
      },
    }),
  ]);

  console.info("→ Membuat kategori & tag…");
  const categories = await prisma.$transaction([
    prisma.category.create({
      data: { name: "Diskusi", slug: "diskusi", description: "Diskusi bebas seputar topik apa pun" },
    }),
    prisma.category.create({
      data: { name: "Teknologi", slug: "teknologi", description: "Teknologi, coding, dan dunia digital" },
    }),
    prisma.category.create({
      data: { name: "Announcements", slug: "announcements", description: "Pengumuman official dari tim Eron" },
    }),
    prisma.category.create({
      data: { name: "Gaming", slug: "gaming", description: "Game, esports, dan hobi seputar gaming" },
    }),
    prisma.category.create({
      data: { name: "Tanya Jawab", slug: "tanya-jawab", description: "Bingung? Tanya di sini" },
    }),
    prisma.category.create({
      data: { name: "Karya Kreatif", slug: "karya-kreatif", description: "Showcase karya & project" },
    }),
  ]);
  const [diskusi, teknologi, announcements, gaming, tanya, kreatif] = categories;

  const tagDefs = [
    { name: "nextjs", slug: "nextjs" },
    { name: "typescript", slug: "typescript" },
    { name: "database", slug: "database" },
    { name: "docker", slug: "docker" },
    { name: "ui-design", slug: "ui-design" },
    { name: "karir", slug: "karir" },
    { name: "open-source", slug: "open-source" },
  ];
  const tags: Record<string, string> = {};
  for (const t of tagDefs) {
    const tag = await prisma.tag.upsert({ where: { slug: t.slug }, update: {}, create: t });
    tags[t.slug] = tag.id;
  }

  console.info("→ Membuat postingan…");
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const posts = await prisma.$transaction([
    prisma.post.create({
      data: {
        title: "Selamat datang di Eron! 🎉",
        content:
          "Halo semua!\n\nEron adalah rumah baru buat diskusi, berbagi karya, dan nongkrong digital. Fitur yang tersedia saat ini:\n\n- Feed dengan sorting terbaru, terpopuler, trending\n- Vote & bookmark\n- Komentar berlapis\n- Dark mode\n- Dashboard moderasi\n\nLetakkan pertanyaan kalian di kolom komentar. Selamat ngobrol!",
        categoryId: announcements.id,
        tags: { create: [{ tagId: tags["open-source"] }] },
        authorId: admin.id,
        pinned: true,
        viewCount: 256,
        createdAt: new Date(now - 10 * day),
      },
    }),
    prisma.post.create({
      data: {
        title: "Tips migrasi dari CRA ke Next.js 15 tanpa drama",
        content:
          "Waktunya move on. Next.js 15 dengan App Router bawa banyak kebaikan: server components, streaming, dan partial prerendering.\n\nCara paling smooth:\n1. Buat project baru dengan create-next-app\n2. Pindahkan komponen client satu-satu, kasih 'use client' seperlunya\n3. Ganti router imports: react-router → next/navigation\n4. Pakai server actions buat mutation\n\nHasil akhir: bundle lebih kecil, SEO lebih sehat, developer experience jauh lebih enak.",
        categoryId: teknologi.id,
        tags: { create: [{ tagId: tags["nextjs"] }, { tagId: tags["typescript"] }] },
        authorId: alice.id,
        viewCount: 180,
        createdAt: new Date(now - 3 * day),
      },
    }),
    prisma.post.create({
      data: {
        title: "PostgreSQL vs MySQL 2026: mana yang kamu pilih?",
        content:
          "Sudah 3 tahun serius pindah ke PostgreSQL dan belum ada satu hari pun yang bikin saya menyesali.\n\nAlasan favorit saya:\n- Data types yang kaya (jsonb, array, tsvectors)\n- CTE dan window functions\n- Partial indexes\n\nMySQL masih bagus untuk banyak kasus, tapi ekosistem tooling Postgres rasain jauh lebih hidup. Menurut kalian?",
        categoryId: teknologi.id,
        tags: { create: [{ tagId: tags["database"] }] },
        authorId: bob.id,
        viewCount: 342,
        createdAt: new Date(now - 2 * day),
      },
    }),
    prisma.post.create({
      data: {
        title: "Showcase: dashboard monitoring mini buat server pribadi",
        content:
          "Baru kelar bikin dashboard kecil buat monitoring home server: CPU, RAM, dan status docker containers.\n\nStack: Next.js + Recharts + Docker socket API. Semuanya dalam satu container, ukuran image final hanya 120MB.\n\nNanti saya open source kalau ada yang berminat!",
        categoryId: kreatif.id,
        tags: { create: [{ tagId: tags["docker"] }, { tagId: tags["nextjs"] }] },
        authorId: alice.id,
        viewCount: 97,
        createdAt: new Date(now - day / 2),
      },
    }),
    prisma.post.create({
      data: {
        title: "Game indie 2026 yang wajib kamu coba",
        content:
          "Rekomendasi game indie yang saya mainkan tahun ini:\n\n1. Chrono Drift: puzzle platformer dengan mekanik waktu, soundtrack-nya juara\n2. Paper Kingdom: strategy ringan yang bikin begadang\n3. Hollow Echoes: roguelike dengan atmosfer pixel art terbaik tahun ini\n\nAda rekomendasi lain? Drop di komentar.",
        categoryId: gaming.id,
        tags: { create: [] },
        authorId: bob.id,
        viewCount: 210,
        createdAt: new Date(now - day),
      },
    }),
    prisma.post.create({
      data: {
        title: "Karir pivot dari designer ke front-end: worth it?",
        content:
          "Saya 4 tahun jadi UI/UX designer, mulai tertarik ngoding karena pengin lebih paham batasan teknis.\n\nPertanyaan: masih worth it pivot ke front-end di 2026, atau lebih baik jadi 'designer yang bisa code'? Pengalaman teman-teman semua yang sudah menempuh jalur ini sangat berharga.",
        categoryId: tanya.id,
        tags: { create: [{ tagId: tags["karir"] }, { tagId: tags["ui-design"] }] },
        authorId: alice.id,
        viewCount: 156,
        createdAt: new Date(now - 5 * 60 * 60 * 1000),
      },
    }),
    prisma.post.create({
      data: {
        title: "Diskusi: etika moderasi komunitas di 2026",
        content:
          "Sambil timezone koordinasi makin global, aturan bucket content kita juga harus adaptif.\n\nKebijakan favorit saya:\n- Warning 1x sebelum ban (kecuali konten gelap)\n- Transparansi moderasi (log publik)\n- Appeal window\n\nKalau kalian moderator, hal apa yang paling sulit diambil keputusannya?",
        categoryId: diskusi.id,
        tags: { create: [] },
        authorId: admin.id,
        viewCount: 64,
        createdAt: new Date(now - 2 * 60 * 60 * 1000),
      },
    }),
    prisma.post.create({
      data: {
        title: "Setup dev environment favorit kamu 2026?",
        content:
          "Saat ini saya pakai:\n- Terminal: Ghostty\n- Editor: VS Code (mulai sekali-sekali coba Neovim)\n- Font: Berkeley Mono\n- Color scheme: Catppuccin Mocha\n\nSemuanya dengan config yang rapi tentunya. Bagaimana dengan kalian? Share di komentar.",
        categoryId: diskusi.id,
        tags: { create: [{ tagId: tags["ui-design"] }] },
        authorId: bob.id,
        viewCount: 41,
        createdAt: new Date(now - 30 * 60 * 1000),
      },
    }),
  ]);

  const [welcome, nextjsMigration, pgvs, showcase, games, career, moderation, setup] = posts;

  console.info("→ Membuat komentar berlapis…");
  const c1 = await prisma.comment.create({
    data: {
      content: "Wah akhirnya online! Desain komunitasnya keren, kedengerannya matang.",
      postId: welcome.id,
      authorId: alice.id,
    },
  });
  await prisma.comment.create({
    data: {
      content: "Terima kasih! Fitur bookmark & dark mode favorit saya so far.",
      postId: welcome.id,
      authorId: admin.id,
      parentId: c1.id,
    },
  });
  await prisma.comment.create({
    data: {
      content: "Bookmark-nya beneran menyelamatkan. Tengkiyu!",
      postId: welcome.id,
      authorId: bob.id,
      parentId: c1.id,
    },
  });
  const c4 = await prisma.comment.create({
    data: {
      content: "Poin 3 soal router imports, persis. Yang sering kelupaan revalidatePath setelah mutation.",
      postId: nextjsMigration.id,
      authorId: bob.id,
    },
  });
  await prisma.comment.create({
    data: {
      content: "+1 untuk @bob, server actions tanpa cache invalidation itu rame banget hebohnya di production 😄",
      postId: nextjsMigration.id,
      authorId: alice.id,
      parentId: c4.id,
    },
  });
  await prisma.comment.create({
    data: {
      content: "PostgreSQL all the way. Namespace yang typo di title post ini tepat sasaran.",
      postId: pgvs.id,
      authorId: alice.id,
    },
  });
  await prisma.comment.create({
    data: {
      content: "Chrono Drift rekomendasi paling under-rated tahun ini. Sudah tamat 2x.",
      postId: games.id,
      authorId: admin.id,
    },
  });
  await prisma.comment.create({
    data: {
      content: "Pivot worth it selama kamu tetap main sense: design system + prototyping cepet itu niche yang hampir selalu dicari.",
      postId: career.id,
      authorId: bob.id,
    },
  });
  await prisma.comment.create({
    data: {
      content: "Warning 1x + appeal window adalah standar minimum komunitas yang sehat.",
      postId: moderation.id,
      authorId: rina.id,
    },
  });

  console.info("→ Membuat like, bookmark, notifikasi, laporan…");
  await prisma.like.createMany({
    data: [
      { userId: bob.id, postId: welcome.id },
      { userId: alice.id, postId: welcome.id },
      { userId: rina.id, postId: welcome.id },
      { userId: bob.id, postId: nextjsMigration.id },
      { userId: admin.id, postId: nextjsMigration.id },
      { userId: alice.id, postId: pgvs.id },
      { userId: rina.id, postId: pgvs.id },
      { userId: bob.id, postId: games.id },
      { userId: rina.id, commentId: c1.id },
      { userId: admin.id, commentId: c4.id },
    ],
  });

  await prisma.bookmark.createMany({
    data: [
      { userId: bob.id, postId: nextjsMigration.id },
      { userId: alice.id, postId: pgvs.id },
      { userId: rina.id, postId: welcome.id },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: admin.id,
        actorId: bob.id,
        type: "LIKE",
        postId: welcome.id,
        link: `/post/${welcome.id}`,
        message: "menyukai postinganmu",
      },
      {
        userId: alice.id,
        actorId: admin.id,
        type: "REPLY",
        postId: nextjsMigration.id,
        commentId: c4.id,
        link: `/post/${nextjsMigration.id}`,
        message: "membalas komentarmu",
      },
    ],
  });

  await prisma.report.create({
    data: {
      reporterId: rina.id,
      postId: showcase.id,
      reason: "OFF_TOPIC",
      detail: "Yakin ini lebih cocok di kategori Teknologi, bukan Karya Kreatif?",
    },
  });

  console.info("\n✔ Seed selesai! 4 akun demo dibuat (1 admin + 3 anggota).");
  console.info("   Kredensial anggota/moderator tidak dipublikasikan.");
  // Kredensial admin: tampilkan ter-enkode supaya tidak terbaca sekilas.
  console.info(`   Admin (ter-enkode base64): ${Buffer.from(`admin@eron.dev : ${DEMO_PASSWORD}`).toString("base64")}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
