import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function NotifikasiLoading() {
  return (
    <div className="container max-w-2xl py-6">
      <div className="space-y-6">
        {/* Daftar notifikasi */}
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="flex gap-3 p-4">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3.5 w-1/2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
