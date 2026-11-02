import type { Metadata } from "next";
import { SITE } from "@/lib/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RegisterForm } from "@/components/forms/register-form";
import { GoogleButton } from "@/components/forms/google-button";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "Daftar",
  description: `Buat akun ${SITE.name} dan bergabung dengan komunitas.`,
};

export default function RegisterPage() {
  const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Buat akun baru</CardTitle>
        <CardDescription>Gratis, cuma butuh email valid.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RegisterForm />
        {googleEnabled && (
          <>
            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">atau</span>
              <Separator className="flex-1" />
            </div>
            <GoogleButton />
          </>
        )}
      </CardContent>
    </Card>
  );
}
