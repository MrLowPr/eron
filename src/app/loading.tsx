import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function FeedLoading() {
  return (
    <div className="container grid gap-6 py-6 lg:grid-cols-[1fr_280px]">
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-9 w-72" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="space-y-3 p-4">
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <div className="flex justify-between pt-2">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-6 w-40" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <div className="hidden space-y-4 lg:block">
        <Skeleton className="h-40" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}
