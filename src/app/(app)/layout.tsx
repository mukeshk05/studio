
import { Header } from "@/components/layout/header";
import Breadcrumbs from "@/components/layout/Breadcrumbs"; // Import the new Breadcrumbs component
import { cn } from "@/lib/utils";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <Breadcrumbs /> {/* Add Breadcrumbs here */}
      <main className={cn("flex-1 bg-background")}> {/* Ensure background is consistent */}
        {children}
      </main>
      <footer className={cn("py-6 md:px-8 md:py-0 border-t border-border/30", "glass-pane")}> {/* Added glass-pane to footer */}
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <p className="text-balance text-center text-sm leading-loose text-muted-foreground md:text-left">
            Built by AI for BudgetRoam. Your smart travel companion.
          </p>
        </div>
      </footer>
    </div>
  );
}
