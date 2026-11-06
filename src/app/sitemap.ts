import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { staffFilter } from "@/server/queries/posts";

// Wajib dinamis: saat build tidak ada database, hasilnya akan beku hanya berisi rute statis.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = process.env.APP_URL || "http://localhost:3000";

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: appUrl, changeFrequency: "hourly", priority: 1 },
    { url: `${appUrl}/search`, changeFrequency: "weekly", priority: 0.4 },
    { url: `${appUrl}/privasi`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${appUrl}/syarat`, changeFrequency: "yearly", priority: 0.2 },
  ];

  try {
    const [posts, categories, tags] = await Promise.all([
      prisma.post.findMany({
        // Konten staff (admin/moderator) bukan bagian dari feed publik — tak diindeks mesin pencari.
        where: { deletedAt: null, author: { banned: false, ...staffFilter() } },
        orderBy: { createdAt: "desc" },
        select: { id: true, updatedAt: true },
        take: 500,
      }),
      prisma.category.findMany({ select: { slug: true } }),
      prisma.tag.findMany({ select: { slug: true } }),
    ]);

    return [
      ...staticRoutes,
      ...posts.map((post) => ({
        url: `${appUrl}/post/${post.id}`,
        lastModified: post.updatedAt,
        changeFrequency: "daily" as const,
        priority: 0.7,
      })),
      ...categories.map((category) => ({
        url: `${appUrl}/kategori/${category.slug}`,
        changeFrequency: "daily" as const,
        priority: 0.6,
      })),
      ...tags.map((tag) => ({
        url: `${appUrl}/tag/${tag.slug}`,
        changeFrequency: "weekly" as const,
        priority: 0.5,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
