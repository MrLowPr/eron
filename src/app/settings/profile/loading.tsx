import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function PengaturanProfilLoading() {
  return (
    <div className="container max-w-2xl py-8">
      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ))}
          <Skeleton className="h-9 w-32 rounded-lg" />
        </CardContent>
      </Card>
    </div>
  );
}
