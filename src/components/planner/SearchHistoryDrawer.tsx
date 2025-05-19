
"use client";

import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSearchHistory } from "@/lib/firestoreHooks";
import type { SearchHistoryEntry, AITripPlannerInput } from "@/lib/types";
import { HistoryIcon, Loader2Icon, PlusCircleIcon, XIcon } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { cn } from "@/lib/utils";

type SearchHistoryDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectHistoryEntry: (entry: Partial<AITripPlannerInput>) => void;
  onStartNewBlankPlan: () => void;
};

export function SearchHistoryDrawer({
  isOpen,
  onClose,
  onSelectHistoryEntry,
  onStartNewBlankPlan,
}: SearchHistoryDrawerProps) {
  const { data: history, isLoading } = useSearchHistory(20); // Fetch last 20 entries

  const handleEntryClick = (entry: SearchHistoryEntry) => {
    onSelectHistoryEntry({
      destination: entry.destination,
      travelDates: entry.travelDates,
      budget: entry.budget,
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className={cn("w-full sm:max-w-md md:max-w-lg flex flex-col p-0 glass-pane border-l-border/30")}>
        <SheetHeader className="p-6 pb-4 border-b border-border/30 sticky top-0 z-10 bg-background/80 backdrop-blur-sm">
          <div className="flex justify-between items-center">
            <div>
              <SheetTitle className="text-foreground flex items-center">
                <HistoryIcon className="w-5 h-5 mr-2 text-primary" />
                Your Plan History
              </SheetTitle>
              <SheetDescription className="text-muted-foreground">
                Revisit your previous trip plans or start a new one.
              </SheetDescription>
            </div>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" className="ml-2 text-muted-foreground hover:bg-accent/20 hover:text-accent-foreground">
                <XIcon className="h-5 w-5" />
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>

        <div className="p-6 border-b border-border/30">
            <Button
                onClick={onStartNewBlankPlan}
                className="w-full text-lg py-3 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40"
                size="lg"
                variant="default"
            >
                <PlusCircleIcon className="w-5 h-5 mr-2" />
                Start New Trip Plan
            </Button>
        </div>

        <ScrollArea className="flex-grow p-6 pt-2">
          {isLoading && (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2Icon className="w-8 h-8 animate-spin mr-3" />
              Loading history...
            </div>
          )}
          {!isLoading && (!history || history.length === 0) && (
            <div className="text-center py-10 text-muted-foreground">
              <HistoryIcon className="w-12 h-12 mx-auto mb-3" />
              <p className="font-semibold">No plan history found.</p>
              <p className="text-sm">Start planning a new trip to see your history here.</p>
            </div>
          )}
          {!isLoading && history && history.length > 0 && (
            <div className="space-y-3">
              {history.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => handleEntryClick(entry)}
                  className={cn(
                    "w-full text-left p-3 rounded-md transition-colors",
                    "glass-card hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/70"
                  )}
                >
                  <p className="font-medium text-sm text-card-foreground truncate">
                    {entry.destination}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Dates: {entry.travelDates}, Budget: ${entry.budget.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">
                    {formatDistanceToNow(new Date(entry.searchedAt?.toDate?.() || entry.searchedAt || Date.now()), { addSuffix: true })}
                  </p>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
