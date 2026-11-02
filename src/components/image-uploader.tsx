"use client";

import * as React from "react";
import { ImageIcon, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { uploadToApi, validateFileBeforeUpload } from "@/lib/client-upload";

export function ImageUploader({
  value,
  onChange,
  maxFiles = 5,
  maxBytes,
  folder = "posts",
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  maxFiles?: number;
  maxBytes?: number;
  folder?: "posts" | "avatars";
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const disabled = value.length >= maxFiles;

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        multiple={maxFiles > 1}
        className="hidden"
        aria-label="Pilih gambar untuk diunggah"
        onChange={async (event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (files.length === 0) return;

          const room = maxFiles - value.length;
          if (room <= 0) {
            toast.error(`Maksimal ${maxFiles} gambar`);
            return;
          }
          const queue = files.slice(0, room);
          setUploading(true);

          let current = value;
          for (const file of queue) {
            const invalid = validateFileBeforeUpload(file, maxBytes);
            if (invalid) {
              toast.error(`${file.name}: ${invalid}`);
              continue;
            }
            const result = await uploadToApi(file, folder);
            if (!result.ok) {
              toast.error(result.error);
              continue;
            }
            current = [...current, result.url];
            onChange(current);
          }

          setUploading(false);
        }}
      />

      <div className="flex flex-wrap gap-3">
        {value.map((url, index) => (
          <div key={url} className="group relative h-20 w-20 overflow-hidden rounded-md border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Gambar ${index + 1}`} className="h-full w-full object-cover" />
            <button
              type="button"
              aria-label={`Hapus gambar ${index + 1}`}
              onClick={() => onChange(value.filter((u) => u !== url))}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {value.length < maxFiles && (
          <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={value.length >= maxFiles}
        className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-md border border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
        aria-label="Tambah gambar"
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
        <span className="text-[10px]">Tambah</span>
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {`Hanya gambar JPG/PNG/GIF/WebP · maksimal ${Math.max(1, Math.round((maxBytes ?? 6 * 1024 * 1024) / 1024 / 1024))} MB per file · maks ${maxFiles} gambar`}
      </p>
    </div>
  );
}
