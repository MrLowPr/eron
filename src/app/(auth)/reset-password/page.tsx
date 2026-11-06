import Link from "next/link";
import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResetPasswordForm } from "@/components/forms/reset-password-form";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Buat password baru untuk akun kamu.",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = (Array.isArray(params.token) ? params.token[0] : params.token) ?? "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Password baru</CardTitle>
        <CardDescription>Buat password yang kuat, minimal 8 karakter dengan angka.</CardDescription>
      </CardHeader>
      <CardContent>
        {token.length >= 10 && token.length <= 120 ? (
          <ResetPasswordForm token={token} />
        ) : (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>Tautan reset tidak valid atau sudah kedaluwarsa.</p>
            <Link href="/forgot-password" className="text-primary hover:underline">
              Minta tautan baru →
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
