import type { Metadata } from "next";
import { getViewer } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PostForm } from "@/components/forms/post-form";

export const metadata: Metadata = {
  title: "Buat Postingan",
  robots: { index: false },
};

export default async function NewPostPage() {
  await getViewer(); // middleware already guarded; extra safety check
  const categories = await prisma.category.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="container max-w-3xl py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Buat postingan</CardTitle>
          <CardDescription>
            Konten yang jelas & di format rapi mendapat respon jauh lebih banyak.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PostForm categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}
