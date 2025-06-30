
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Plane, Brain, Compass, Briefcase, Sparkles, BrainCircuit } from "lucide-react"; 
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


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
    <TooltipProvider>
      <nav
        className={cn("flex items-center space-x-1 md:space-x-2 lg:space-x-3", className)}
        {...props}
      >
        {navItems.map((item) => (
          <Tooltip key={item.href} delayDuration={0}>
            <TooltipTrigger asChild>
              <Link
                href={item.href}
                className={cn(
                  "text-sm font-medium transition-all duration-200 flex items-center gap-1.5 p-2 rounded-lg transform hover:scale-105",
                  pathname === item.href || (item.href === "/planner" && pathname === "/")
                    ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-md shadow-primary/30"
                    : "text-muted-foreground hover:bg-accent/10 hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4 md:h-5 md:w-5" />
                <span className="hidden lg:inline">{item.label}</span>
                <span className="sr-only">{item.label}</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              className="bg-background/80 dark:bg-card/70 backdrop-blur-lg border-border/50 text-foreground"
            >
              <p>{item.label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </nav>
    </TooltipProvider>
  );
}
