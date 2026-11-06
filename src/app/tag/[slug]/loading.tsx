import { Skeleton } from "@/components/ui/skeleton";

export default function TagLoading() {
  return (
    <div className="container max-w-3xl py-6">
      {/* Tautan kembali */}
      <Skeleton className="mb-4 h-5 w-28" />

      {/* Kepala tag: baris badge + judul + deskripsi */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* Daftar postingan bertag */}
      <div className="mt-6 space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="space-y-2.5 rounded-xl border border-border p-4">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-14" />
            </div>
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[70%]" />
            <Skeleton className="h-6 w-36" />
          </div>
        ))}
      </div>
    </div>
  );
}
