"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, KeyRound } from "lucide-react";
import { forgotPasswordAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations";

export function ForgotPasswordForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit(async (values) => {
        await forgotPasswordAction(values);
        // Redirect ke pesan "sent" terjadi di server.
      })}
    >
      <div className="space-y-1.5">
        <Label htmlFor="fp-email">Email terdaftar</Label>
        <Input id="fp-email" type="email" autoComplete="email" placeholder="kamu@contoh.dev" {...register("email")} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <Button className="w-full" type="submit" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="animate-spin" />}
        <KeyRound />
        Kirim tautan reset
      </Button>
      <p className="text-xs text-muted-foreground">
        Respons selalu sama demi keamanan. Jika email terdaftar, tautan reset akan dikirim.
      </p>
    </form>
  );
}
