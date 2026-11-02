"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, LogIn } from "lucide-react";
import { loginAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, type LoginInput } from "@/lib/validations";

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
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
        const result = await loginAction(values);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        router.push("/");
        router.refresh();
      })}
    >
      <div className="space-y-1.5">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          placeholder="kamu@contoh.dev"
          aria-invalid={Boolean(errors.email)}
          {...register("email")}
        />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="login-password">Password</Label>
          <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
            Lupa password?
          </Link>
        </div>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>

      <Button className="w-full" type="submit" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="animate-spin" /> : <LogIn />}
        Masuk
      </Button>
    </form>
  );
}
