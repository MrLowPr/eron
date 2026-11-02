import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/components/forms/profile-form";

export const metadata: Metadata = {
  title: "Pengaturan Profil",
  robots: { index: false },
};

export default async function SettingsProfilePage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?callbackUrl=/settings/profile");

  const user = await prisma.user.findUnique({
    where: { id: viewer.id },
    select: { name: true, username: true, bio: true, image: true },
  });
  if (!user) redirect("/");

  return (
    <div className="container max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Pengaturan profil</CardTitle>
          <CardDescription>Data di sini yang tampil di profil publik dan komentar.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            initial={{
              name: user.name,
              username: user.username,
              bio: user.bio,
              image: user.image,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
