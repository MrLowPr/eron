"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import { resetPasswordAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPasswordSchema } from "@/lib/validations";

type ResetInput = {
  password: string;
  confirmPassword: string;
};

export function ResetPasswordForm({ token }: { token: string }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetInput>({
    resolver: zodResolver(
      resetPasswordSchema.innerType().omit({ token: true })
    ) as never,
    defaultValues: { password: "", confirmPassword: "" },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit(async (values) => {
        const result = await resetPasswordAction({
          token,
          password: values.password,
          confirmPassword: values.confirmPassword,
        });
        if (result?.error) toast.error(result.error);
      })}
    >
      <div className="space-y-1.5">
        <Label htmlFor="rp-password">Password baru</Label>
        <Input id="rp-password" type="password" autoComplete="new-password" {...register("password")} />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="rp-confirm">Ulangi password</Label>
        <Input id="rp-confirm" type="password" autoComplete="new-password" {...register("confirmPassword")} />
        {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
      </div>

      <Button className="w-full" type="submit" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="animate-spin" />}
        <ShieldCheck />
        Simpan password baru
      </Button>
    </form>
  );
}
