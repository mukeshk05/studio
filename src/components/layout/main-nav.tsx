
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { HomeIcon, LayoutDashboardIcon, PlaneIcon } from "lucide-react"; // Changed HomeIcon to PlaneIcon for planner

const navItems = [
  { href: "/planner", label: "Plan Trip", icon: PlaneIcon }, // Updated href and icon
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
];

export function MainNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname();

  return (
    <nav
      className={cn("flex items-center space-x-4 lg:space-x-6", className)}
      {...props}
    >
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "text-sm font-medium transition-colors hover:text-primary flex items-center gap-2 p-2 rounded-md",
            pathname === item.href || (item.href === "/planner" && pathname === "/") // Highlight if on root or /planner for "Plan Trip"
              ? "text-primary bg-accent/10"
              : "text-muted-foreground"
          )}
        >
          <item.icon className="h-5 w-5" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
