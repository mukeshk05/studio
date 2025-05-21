
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Plane, Brain } from "lucide-react"; // Changed icon names

const navItems = [
  { href: "/planner", label: "Plan Trip", icon: Plane }, // Changed from PlaneIcon
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }, // Changed from LayoutDashboardIcon
  { href: "/quiz", label: "Adventure Quiz", icon: Brain }, // Changed from BrainIcon
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
            pathname === item.href || (item.href === "/planner" && pathname === "/") 
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
