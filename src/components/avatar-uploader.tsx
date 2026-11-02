"use client";

import * as React from "react";
import { Loader2, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { uploadToApi, validateFileBeforeUpload } from "@/lib/client-upload";

export function AvatarUploader({
  currentImage,
  fallbackName,
  onUploaded,
  onRemoved,
}: {
  currentImage: string | null;
  fallbackName: string | null;
  onUploaded: (url: string) => void;
  onRemoved: () => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  return (
    <div className="flex items-center gap-4">
      <Avatar className="h-20 w-20 border">
        {currentImage ? <AvatarImage src={currentImage} alt={fallbackName ?? ""} /> : null}
        <AvatarFallback className="text-xl">
          {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : getInitials(fallbackName)}
        </AvatarFallback>
      </Avatar>

      <div className="space-y-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          aria-label="Pilih foto profil"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            const invalid = validateFileBeforeUpload(file);
            if (invalid) {
              toast.error(invalid);
              return;
            }
            setUploading(true);
            const result = await uploadToApi(file, "avatars");
            setUploading(false);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            onUploaded(result.url);
            toast.success("Avatar diperbarui");
          }}
        />

        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            <UserRound />
            Ganti foto
          </Button>
          {currentImage && (
            <Button type="button" size="sm" variant="ghost" onClick={onRemoved} disabled={uploading}>
              <Trash2 />
              Hapus
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">JPG/PNG/WebP · otomatis di-resize ke 256px</p>
      </div>
    </div>
  );
}
