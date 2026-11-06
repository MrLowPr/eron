import Link from "next/link";
import type { Metadata } from "next";
import { SITE } from "@/lib/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/forms/login-form";
import { GoogleButton } from "@/components/forms/google-button";
import { Separator } from "@/components/ui/separator";
import { safeCallbackPath } from "@/lib/safe-redirect";

export const metadata: Metadata = {
  title: "Login",
  description: `Masuk ke ${SITE.name} untuk mulai berdiskusi.`,
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function single(params: Record<string, string | string[] | undefined>, key: string): string {
  const v = params[key];
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;

  const rawCallback = single(params, "callbackUrl");
  const callbackUrl = safeCallbackPath(rawCallback) ?? "/";
  const registered = single(params, "registered") === "1";
  const verified = single(params, "verified") === "1";
  const verifyInvalid = single(params, "verify-invalid") === "1";
  const reset = single(params, "reset") === "1";

  const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Selamat datang kembali</CardTitle>
        <CardDescription>Masuk untuk ikut berdiskusi dan membangun komunitas.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {registered && (
          <p className="rounded-md bg-emerald-500/15 p-3 text-center text-xs text-emerald-700 dark:text-emerald-400">
            Akun dibuat! Silakan login. Cek email kamu untuk verifikasi (atau tautan di log server).
          </p>
        )}
        {verified && (
          <p className="rounded-md bg-emerald-500/15 p-3 text-center text-xs text-emerald-700 dark:text-emerald-400">
            Email terverifikasi. Mantap!
          </p>
        )}
        {verifyInvalid && (
          <p className="rounded-md bg-amber-500/15 p-3 text-center text-xs text-amber-700 dark:text-amber-400">
            Tautan verifikasi tidak valid atau kedaluwarsa. Belum dapat email? Coba kirim ulang nanti.
          </p>
        )}
        {reset && (
          <p className="rounded-md bg-emerald-500/15 p-3 text-center text-xs text-emerald-700 dark:text-emerald-400">
            Password baru berhasil disimpan.
          </p>
        )}

        <LoginForm googleEnabled={googleEnabled} />

        {googleEnabled && (
          <>
            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">atau</span>
              <Separator className="flex-1" />
            </div>
            <GoogleButton callbackUrl={callbackUrl} />
          </>
        )}

        <p className="text-center text-sm text-muted-foreground">
          Belum punya akun?{" "}
          <Link href="/register" className="text-primary hover:underline">
            Daftar gratis
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
