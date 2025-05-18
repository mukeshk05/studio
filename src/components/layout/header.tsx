
"use client";

import Link from "next/link";
import { AppLogo } from "./app-logo";
import { MainNav } from "./main-nav";
import { cn } from "@/lib/utils";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/30 glass-pane">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-4 md:gap-6">
          <AppLogo />
          <MainNav />
        </div>
        {/* Auth links and user profile dropdown have been moved to the landing page header */}
      </div>
    </header>
  );
}
