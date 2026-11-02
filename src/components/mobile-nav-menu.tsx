"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MobileMenu } from "@/components/mobile-menu";

type ViewerInfo = { username: string; role: string } | null;

export function MobileNavMenu({ viewer }: { viewer: ViewerInfo }) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu navigasi">
          <Menu className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 md:hidden">
        <MobileMenu viewer={viewer} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
