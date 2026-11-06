import { Skeleton } from "@/components/ui/skeleton";

export default function SearchLoading() {
  return (
    <div className="container max-w-3xl py-6">
      {/* Kepala halaman */}
      <Skeleton className="h-8 w-36" />
      <Skeleton className="mt-2 h-4 w-72" />

      {/* Kolom pencarian (hanya tampil mobile, seperti halaman asli) */}
      <Skeleton className="mt-4 h-10 w-full md:hidden" />

      {/* Hasil */}
      <div className="mt-6 space-y-8">
        <section className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <div className="space-y-2">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </section>

        <section className="space-y-3">
          <Skeleton className="h-4 w-28" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="space-y-2.5 rounded-xl border border-border p-4">
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-14" />
                </div>
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-[64%]" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
