"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { updateProfileAction, updateAvatarAction } from "@/server/actions/profile";
import { profileSchema, type ProfileInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AvatarUploader } from "@/components/avatar-uploader";

type Initial = {
  name: string | null;
  username: string;
  bio: string | null;
  image: string | null;
};

export function ProfileForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [avatar, setAvatar] = useState<string | null>(initial.image);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: initial.name ?? "",
      username: initial.username,
      bio: initial.bio ?? "",
    },
  });

  return (
    <div className="space-y-6">
      <AvatarUploader
        currentImage={avatar}
        fallbackName={initial.name ?? initial.username}
        onUploaded={async (url) => {
          const result = await updateAvatarAction(url);
          if (result?.error) {
            toast.error(result.error);
            return;
          }
          setAvatar(url);
          router.refresh();
        }}
        onRemoved={async () => {
          const result = await updateAvatarAction(null);
          if (result?.error) {
            toast.error(result.error);
            return;
          }
          setAvatar(null);
          router.refresh();
          toast.success("Avatar dihapus");
        }}
      />

      <Separator />

      <form
        className="space-y-4"
        onSubmit={handleSubmit(async (values) => {
          const result = await updateProfileAction(values);
          if (result?.error) {
            toast.error(result.error);
            return;
          }
          toast.success(result?.success ?? "Profil diperbarui");
          router.push(`/u/${values.username}`);
          router.refresh();
        })}
      >
        <div className="space-y-1.5">
          <Label htmlFor="pf-name">Nama tampilan</Label>
          <Input id="pf-name" autoComplete="name" aria-invalid={Boolean(errors.name)} {...register("name")} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pf-username">Username</Label>
          <div className="relative flex items-center">
            <span className="absolute left-3 text-sm text-muted-foreground">@</span>
            <Input id="pf-username" className="pl-8" autoComplete="username" aria-invalid={Boolean(errors.username)} {...register("username")} />
          </div>
          <p className="text-xs text-muted-foreground">Catatan: max 3 ganti username per hari.</p>
          {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pf-bio">Bio</Label>
          <Textarea id="pf-bio" rows={3} maxLength={280} placeholder="Ceritakan tentang dirimu…" {...register("bio")} />
          {errors.bio && <p className="text-xs text-destructive">{errors.bio.message}</p>}
        </div>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          <Save />
          Simpan perubahan
        </Button>
      </form>
    </div>
  );
}
