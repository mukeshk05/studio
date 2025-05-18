
"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ItineraryCard } from "./itinerary-card"; 
import type { Itinerary } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ItineraryDetailSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  itinerary: Itinerary; 
  onSaveTrip: (itinerary: Omit<Itinerary, 'id'>) => void;
  isTripSaved: boolean;
  isSaving?: boolean;
};

export function ItineraryDetailSheet({
  isOpen,
  onClose,
  itinerary,
  onSaveTrip,
  isTripSaved,
  isSaving,
}: ItineraryDetailSheetProps) {
  if (!itinerary) return null;

  const handleSave = () => {
    const { id, ...dataToSave } = itinerary;
    onSaveTrip(dataToSave);
  };
  
  // Ensure itinerary passed to ItineraryCard always has an ID, even if temporary
  const itineraryForCard: Itinerary = 'id' in itinerary && itinerary.id 
    ? itinerary 
    : { ...itinerary, id: `temp-${crypto.randomUUID()}`};


  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className={cn("w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl p-0 flex flex-col glass-pane border-l-border/30")}>
        <SheetHeader className="p-4 sm:p-6 border-b border-border/30 sticky top-0 z-10 bg-background/80 backdrop-blur-sm">
          <div className="flex justify-between items-center">
            <div>
              <SheetTitle className="text-foreground">{itinerary.destination}</SheetTitle>
              <SheetDescription className="text-muted-foreground">
                Detailed plan for your trip from {itinerary.travelDates}. Estimated cost: ${itinerary.estimatedCost.toLocaleString()}.
              </SheetDescription>
            </div>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" className="ml-2 text-muted-foreground hover:bg-accent/20 hover:text-accent-foreground">
                <XIcon className="h-5 w-5" />
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>
        <ScrollArea className="flex-grow">
          <div className="p-4 sm:p-6">
            <ItineraryCard
              itinerary={itineraryForCard}
              onSaveTrip={handleSave} 
              isSaved={isTripSaved}
              isSaving={isSaving} 
              isDetailedView={true} 
            />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
