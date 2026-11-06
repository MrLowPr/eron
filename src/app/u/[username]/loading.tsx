import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfilLoading() {
  return (
    <div className="container max-w-4xl py-6">
      {/* Kepala profil */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start">
          <Skeleton className="h-20 w-20 shrink-0 rounded-full sm:h-24 sm:w-24" />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-full max-w-md" />
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3.5 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab profil */}
      <Skeleton className="mt-6 h-9 w-64" />

      {/* Daftar kiriman */}
      <div className="mt-6 space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="space-y-3 p-4">
              <div className="flex gap-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-14" />
              </div>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <div className="flex justify-between pt-1">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-40" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
