"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import { staffLoginAction } from "@/server/actions/user-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, type LoginInput } from "@/lib/validations";

/**
 * ⭐ FORM PORTAL STAF (/admin/login) — khusus ADMIN & MODERATOR.
 * Akun pengguna biasa ditolak (pesan mengarah ke /login).
 */
export function StaffLoginForm() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit(async (values) => {
        const result = await staffLoginAction(values);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        router.push("/admin");
        router.refresh();
      })}
    >
      <div className="space-y-1.5">
        <Label htmlFor="staff-email">Email</Label>
        <Input
          id="staff-email"
          type="email"
          autoComplete="email"
          placeholder="staf@domain.com"
          aria-invalid={Boolean(errors.email)}
          {...register("email")}
        />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="staff-password">Password</Label>
        <Input
          id="staff-password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>

      <Button className="w-full" type="submit" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
        Masuk portal staf
      </Button>
    </form>
  );
}
