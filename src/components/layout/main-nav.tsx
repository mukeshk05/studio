
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Plane, Brain, Compass } from "lucide-react"; 

const navItems = [
  { href: "/planner", label: "Plan Trip", icon: Plane },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/quiz", label: "Adventure Quiz", icon: Brain },
];

export function MainNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname();

  return (
    <nav
      className={cn("flex items-center space-x-2 md:space-x-4 lg:space-x-6", className)}
      {...props}
    >
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "text-sm font-medium transition-colors hover:text-primary flex items-center gap-1.5 md:gap-2 p-1.5 md:p-2 rounded-md",
            pathname === item.href || (item.href === "/planner" && pathname === "/")
              ? "text-primary bg-accent/10"
              : "text-muted-foreground"
          )}
        >
          <item.icon className="h-4 w-4 md:h-5 md:w-5" />
          <span className="hidden md:inline">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
