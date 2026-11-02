"use client";

import Link from "next/link";
import { Flame, Sparkles, TrendingUp } from "lucide-react";
import { SORT_OPTIONS, type SortType } from "@/lib/constants";
import { cn } from "@/lib/utils";

const ICONS: Record<SortType, React.ElementType> = {
  new: Sparkles,
  popular: Flame,
  trending: TrendingUp,
};

const LABELS: Record<SortType, string> = {
  new: "Terbaru",
  popular: "Terpopuler",
  trending: "Trending",
};

export function FeedSortTabs({ active }: { active: SortType }) {
  return (
    <nav className="flex gap-2" aria-label="Urutkan feed">
      {SORT_OPTIONS.map((option) => {
        const Icon = ICONS[option];
        const isActive = option === active;
        return (
          <Link
            key={option}
            href={`/?sort=${option}`}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground shadow"
                : "border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="h-4 w-4" />
            {LABELS[option]}
          </Link>
        );
      })}
    </nav>
  );
}
