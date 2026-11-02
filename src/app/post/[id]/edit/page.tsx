import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getViewer } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PostForm } from "@/components/forms/post-form";

export const metadata: Metadata = {
  title: "Edit Postingan",
  robots: { index: false },
};

type Props = { params: Promise<{ id: string }> };

export default async function EditPostPage({ params }: Props) {
  const { id } = await params;
  const viewer = await getViewer();
  const post = await prisma.post.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      title: true,
      content: true,
      images: true,
      categoryId: true,
      authorId: true,
      tags: { select: { tag: { select: { name: true } } } },
    },
  });
  if (!post) notFound();

  const isMod = viewer?.role === "ADMIN" || viewer?.role === "MODERATOR";
  if (!viewer || (viewer.id !== post.authorId && !isMod)) notFound();

  const categories = await prisma.category.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="container max-w-3xl py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Edit postingan</CardTitle>
          <CardDescription>Perubahan langsung tampil di postingan terkait.</CardDescription>
        </CardHeader>
        <CardContent>
          <PostForm
            categories={categories}
            initial={{
              id: post.id,
              title: post.title,
              content: post.content,
              categoryId: post.categoryId,
              tags: post.tags.map((t) => t.tag.name),
              images: post.images,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
