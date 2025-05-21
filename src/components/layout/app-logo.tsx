
"use client";

import { Luggage } from "lucide-react"; // Changed from LuggageIcon
import Link from "next/link";

export function AppLogo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-xl font-bold text-primary hover:text-primary/90 transition-colors">
      <Luggage className="h-7 w-7 text-accent" /> {/* Changed from LuggageIcon */}
      <span>BudgetRoam</span>
    </Link>
  );
}
