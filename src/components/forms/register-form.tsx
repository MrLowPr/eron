"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";
import { registerAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerSchema, type RegisterInput } from "@/lib/validations";

export function RegisterForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", username: "", email: "", password: "" },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit(async (values) => {
        const result = await registerAction(values);
        if (result?.error) {
          toast.error(result.error);
        }
        // Redirect terjadi di server (NEXT_REDIRECT).
      })}
    >
      <div className="space-y-1.5">
        <Label htmlFor="reg-name">Nama tampilan</Label>
        <Input
          id="reg-name"
          placeholder="Ananda Permata"
          autoComplete="name"
          aria-invalid={Boolean(errors.name)}
          {...register("name")}
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reg-username">Username</Label>
        <div className="relative flex items-center">
          <span className="absolute left-3 text-sm text-muted-foreground">@</span>
          <Input id="reg-username" placeholder="ananda" className="pl-8" autoComplete="username" {...register("username")} />
        </div>
        {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reg-email">Email</Label>
        <Input id="reg-email" type="email" autoComplete="email" placeholder="kamu@contoh.dev" {...register("email")} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reg-password">Password</Label>
        <Input
          id="reg-password"
          type="password"
          autoComplete="new-password"
          placeholder="Min. 8 karakter + angka"
          {...register("password")}
        />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>

      <Button className="w-full" type="submit" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="animate-spin" /> : <UserPlus />}
        Daftar
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Dengan mendaftar kamu setuju untuk menjaga komunitas ini ramah. Sudah punya akun?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Masuk di sini
        </Link>
      </p>
    </form>
  );
}
