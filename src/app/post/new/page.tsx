import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { guestRemaining } from "@/lib/guest-quota";
import { getViewer } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PostForm } from "@/components/forms/post-form";

export const metadata: Metadata = {
  title: "Buat Postingan",
  robots: { index: false },
};

export default async function NewPostPage() {
  const viewer = await getViewer();
  // Tamu tanpa sesi tetap bisa membuka editor asalkan kuota perangkatnya masih
  // ada; kehabisan → alur login standar (tanpa alok kuota mana pun).
  if (!viewer) {
    const remaining = await guestRemaining();
    if (remaining <= 0) redirect("/login?callbackUrl=/post/new");
  }

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
