import type { Metadata } from "next";
import { SITE } from "@/lib/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StaffLoginForm } from "@/components/forms/staff-login-form";

export const metadata: Metadata = {
  title: "Portal Staf",
  description: "Masuk khusus ADMIN & MODERATOR.",
  robots: { index: false },
};

/**
 * ⭐ PORTAL STAF — /admin/login
 * Pemisahan portal: /login hanya untuk pengguna (USER); ADMIN/MODERATOR masuk di sini.
 */
export default function StaffLoginPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Portal Staf</CardTitle>
        <CardDescription>
          Masuk khusus ADMIN &amp; MODERATOR {SITE.name}. Akun pengguna biasa lewat{" "}
          <a href="/login" className="text-primary underline">
            /login
          </a>
          .
        </CardDescription>
      </CardHeader>
      <CardContent>
        <StaffLoginForm />
      </CardContent>
    </Card>
  );
}
