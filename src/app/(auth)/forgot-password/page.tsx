import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ForgotPasswordForm } from "@/components/forms/forgot-password-form";

export const metadata: Metadata = {
  title: "Lupa password",
  description: "Kirim tautan reset password ke email kamu.",
};

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const sent = params.sent === "1";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Lupa password?</CardTitle>
        <CardDescription>
          Masukkan email kamu dan kami akan mengirim tautan untuk membuat password baru.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sent ? (
          <p className="rounded-md bg-emerald-500/15 p-3 text-center text-xs text-emerald-700 dark:text-emerald-400">
            Jika email terdaftar, tautan reset telah dikirim (tautan juga muncul di log server saat mode development).
          </p>
        ) : (
          <ForgotPasswordForm />
        )}
      </CardContent>
    </Card>
  );
}
