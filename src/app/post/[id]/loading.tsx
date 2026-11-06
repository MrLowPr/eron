import { Skeleton } from "@/components/ui/skeleton";

export default function PostLoading() {
  return (
    <div className="container max-w-3xl py-6">
      <Skeleton className="mb-4 h-5 w-36" />
      <article className="space-y-4">
        {/* Baris badge: kategori + waktu */}
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-4 w-28" />
        </div>

        {/* Judul */}
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-8 w-1/2" />

        {/* Penulis */}
        <div className="flex items-center gap-3 pt-2">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>

        {/* Isi utama */}
        <div className="space-y-2.5 pt-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[94%]" />
          <Skeleton className="h-4 w-[88%]" />
          <Skeleton className="h-4 w-[62%]" />
        </div>

        {/* Aksi suara/simpan */}
        <div className="flex gap-3 pt-2">
          <Skeleton className="h-11 w-40 rounded-xl" />
          <Skeleton className="h-11 w-32 rounded-xl" />
        </div>
      </article>

      {/* Antrean komentar */}
      <div className="mt-8 space-y-4">
        <Skeleton className="h-5 w-32" />
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex gap-2.5">
            <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3.5 w-4/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
