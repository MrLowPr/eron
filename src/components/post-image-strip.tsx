/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";
import { Dialog, DialogTitle, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function PostImageStrip({ images, title }: { images: string[]; title?: string }) {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  if (images.length === 0) return null;

  const showing = images.slice(0, 3);
  const extra = images.length - showing.length;

  return (
    <>
      <div
        className={cn(
          "grid gap-2",
          images.length === 1 ? "grid-cols-1" : "grid-cols-3"
        )}
      >
        {showing.map((src, index) => (
          <button
            key={src}
            type="button"
            onClick={() => setOpenIndex(index)}
            className="group relative h-32 overflow-hidden rounded-lg border bg-muted sm:h-36"
            aria-label={`Buka gambar ${index + 1}`}
          >
            <img
              src={src}
              alt={title ? `${title} (${index + 1})` : ""}
              loading="lazy"
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
            {!extra && images.length === 1 ? null : null}
            {extra > 0 && index === 2 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-semibold text-white">
                +{extra} lagi
              </div>
            )}
          </button>
        ))}
      </div>

      <Dialog open={openIndex !== null} onOpenChange={(open) => !open && setOpenIndex(null)}>
        <DialogContent className="max-w-3xl p-2 sm:p-3">
          <DialogTitle className="sr-only">
            {title ? `Gambar: ${title}` : "Gambar"}
          </DialogTitle>
          {openIndex !== null && (
            <img
              src={images[openIndex]}
              alt={title ?? ""}
              className="max-h-[75vh] w-full rounded-md object-contain bg-black/20"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function PostGallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = React.useState<number | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((src, index) => (
          <button
            key={src}
            type="button"
            onClick={() => setActive(index)}
            className="h-40 overflow-hidden rounded-lg border bg-muted"
            aria-label={`Lihat gambar ${index + 1} dari ${images.length}`}
          >
            <img
              src={src}
              alt={`${title} (${index + 1})`}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>

      <Dialog open={active !== null} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="max-w-3xl p-2 sm:p-3">
          <DialogTitle className="sr-only">{title}</DialogTitle>
          {active !== null && (
            <img
              src={images[active]}
              alt={title}
              className="max-h-[75vh] w-full rounded-md bg-black/20 object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
