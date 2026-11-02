"use client";

import { useRouter } from "next/navigation";
import { LogOut, Settings, UserRound } from "lucide-react";
import { signOutAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Viewer } from "@/lib/rbac";
import { getInitials } from "@/lib/utils";

export function UserMenu({ viewer }: { viewer: Viewer }) {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Menu akun">
          <Avatar className="h-8 w-8">
            {viewer.image ? <AvatarImage src={viewer.image} alt={viewer.name ?? ""} /> : null}
            <AvatarFallback>
              {getInitials(viewer.name, viewer.username.slice(0, 2).toUpperCase())}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="truncate">{viewer.name ?? viewer.username}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">@{viewer.username}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push(`/u/${viewer.username}`)}>
          <UserRound />
          Profil Saya
          {viewer.role !== "USER" && (
            <Badge variant={viewer.role === "ADMIN" ? "destructive" : "warning"} className="ml-auto">
              {viewer.role}
            </Badge>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/settings/profile")}>
          <Settings />
          Pengaturan
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => void signOutAction()}
        >
          <LogOut />
          Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
