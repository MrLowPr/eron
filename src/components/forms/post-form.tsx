"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Save, X } from "lucide-react";
import { createPostAction, updatePostAction } from "@/server/actions/posts";
import { postSchema } from "@/lib/validations";
import { MAX_IMAGES_PER_POST } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUploader } from "@/components/image-uploader";

export type CategoryOption = { id: string; name: string };

export type PostFormValues = {
  id?: string;
  title: string;
  content: string;
  categoryId: string | null;
  tags: string[];
  images: string[];
};

const slugifyLocal = (input: string) =>
  input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

export function PostForm({
  categories,
  initial,
}: {
  categories: CategoryOption[];
  initial?: PostFormValues;
}) {
  const router = useRouter();
  const [tagInput, setTagInput] = useState("");
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PostFormValues>({
    defaultValues: {
      title: initial?.title ?? "",
      content: initial?.content ?? "",
      categoryId: initial?.categoryId ?? null,
      tags: initial?.tags ?? [],
      images: initial?.images ?? [],
    },
  });

  const tags = watch("tags");
  const images = watch("images");

  return (
    <form
      className="space-y-5"
      onSubmit={handleSubmit(async (values) => {
        const payload = {
          title: values.title,
          content: values.content,
          categoryId: values.categoryId ?? undefined,
          tags: values.tags,
          images: values.images,
        };
        const result = initial?.id
          ? await updatePostAction(initial.id, payload)
          : await createPostAction(payload);
        if (result?.error) {
          toast.error(result.error);
          return;
        }
        toast.success(initial?.id ? "Postingan diperbarui" : "Postingan dipublikasi!");
        router.push(`/post/${result?.success ?? initial?.id}`);
        router.refresh();
      })}
      role="form"
      title="Form postingan"
    >
      <div className="space-y-1.5">
        <Label htmlFor="post-title">Judul</Label>
        <Input
          id="post-title"
          placeholder="Judul yang menarik & deskriptif"
          maxLength={150}
          aria-invalid={Boolean(errors.title)}
          {...register("title")}
        />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="post-content">Isi postingan</Label>
        <Textarea
          id="post-content"
          rows={10}
          placeholder="Bagikan cerita, kode, atau pertanyaanmu. Pisahkan paragraf dengan baris kosong. Gunakan @username untuk menyebut orang."
          aria-invalid={Boolean(errors.content)}
          {...register("content")}
        />
        {errors.content && <p className="text-xs text-destructive">{errors.content.message}</p>}
        <p className="text-xs text-muted-foreground">Mendukung baris baru, tautan otomatis, dan mention.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_240px]">
        <div className="space-y-1.5">
          <Label>Tag (maksimal 5)</Label>
          <div
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== ",") return;
              event.preventDefault();
              const raw = tagInput.trim();
              if (!raw) return;
              const slug = slugifyLocal(raw);
              if (!slug || tags.includes(slug)) {
                setTagInput("");
                return;
              }
              if (tags.length >= 5) {
                toast.error("Maksimal 5 tag");
                return;
              }
              setValue("tags", [...tags, slug], { shouldValidate: true });
              setTagInput("");
            }}
            className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input px-2 py-1.5"
            role="listbox"
            aria-label="Tag postingan"
          >
            {tags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-xs">
                #{tag}
                <button
                  type="button"
                  aria-label={`Hapus tag ${tag}`}
                  onClick={() => setValue("tags", tags.filter((t) => t !== tag))}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
              placeholder={tags.length === 0 ? "ketik tag lalu Enter…" : ""}
              className="h-6 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              aria-label="Ketik tag"
            />
          </div>
          {errors.tags && <p className="text-xs text-destructive">{errors.tags.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Kategori</Label>
          <Select
            value={watch("categoryId") ?? "none"}
            onValueChange={(value) => setValue("categoryId", value === "none" ? null : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih kategori (opsional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Tanpa kategori</SelectItem>
              {categories.map((category) => {
                const value = category.id;
                return (
                  <SelectItem key={value} value={value}>
                    {category.name}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Gambar</Label>
        <ImageUploader
          value={images}
          maxFiles={MAX_IMAGES_PER_POST}
          folder="posts"
          onChange={(urls) => setValue("images", urls, { shouldValidate: true })}
        />
        {errors.images && <p className="text-xs text-destructive">{errors.images.message}</p>}
        <p className="text-xs text-muted-foreground">
          Preview tersedia sebelum dan sesudah unggah; gambar dikompres otomatis server.
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Batal
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          <Save />
          {initial?.id ? "Simpan perubahan" : "Publikasi"}
        </Button>
      </div>
    </form>
  );
}
