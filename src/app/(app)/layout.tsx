
import { Header } from "@/components/layout/header";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      {/* Updated main background for the new dark theme */}
      <main className="flex-1 bg-background">
        {children}
      </main>
      <footer className="py-6 md:px-8 md:py-0 bg-background/80 backdrop-blur-sm border-t border-border/30">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <p className="text-balance text-center text-sm leading-loose text-muted-foreground md:text-left">
            Built by AI for BudgetRoam. Your smart travel companion.
          </p>
        </div>
      </footer>
    </div>
  );
}
