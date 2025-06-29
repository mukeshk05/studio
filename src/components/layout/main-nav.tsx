
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Plane, Brain, Compass, Briefcase, Sparkles, BrainCircuit } from "lucide-react"; 

const navItems = [
  { href: "/planner", label: "Planner", icon: Plane },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tools", label: "Tools", icon: Briefcase },
  { href: "/ai-features", label: "AI Features", icon: Sparkles },
  { href: "/labs", label: "Labs", icon: BrainCircuit },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/quiz", label: "Quiz", icon: Brain },
];

export function MainNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname();

  return (
    <nav
      className={cn("flex items-center space-x-1 md:space-x-2 lg:space-x-3", className)}
      {...props}
    >
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "text-sm font-medium transition-colors hover:text-primary flex items-center gap-1 p-1.5 md:p-2 rounded-md",
            pathname === item.href || (item.href === "/planner" && pathname === "/")
              ? "text-primary bg-accent/10"
              : "text-muted-foreground"
          )}
        >
          <item.icon className="h-4 w-4 md:h-5 md:w-5" />
          <span className="hidden lg:inline">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
