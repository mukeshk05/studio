
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
import { ItineraryCard } from "./itinerary-card"; // The full card
import type { Itinerary } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { XIcon } from "lucide-react";

type ItineraryDetailSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  itinerary: Itinerary;
  onSaveTrip: (itinerary: Itinerary) => void;
  isTripSaved: boolean;
};

export function ItineraryDetailSheet({
  isOpen,
  onClose,
  itinerary,
  onSaveTrip,
  isTripSaved,
}: ItineraryDetailSheetProps) {
  if (!itinerary) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl p-0 flex flex-col">
        <SheetHeader className="p-4 sm:p-6 border-b bg-background sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <div>
              <SheetTitle>{itinerary.destination}</SheetTitle>
              <SheetDescription>
                Detailed plan for your trip from {itinerary.travelDates}. Estimated cost: ${itinerary.estimatedCost.toLocaleString()}.
              </SheetDescription>
            </div>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" className="ml-2">
                <XIcon className="h-5 w-5" />
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>
        <ScrollArea className="flex-grow">
          <div className="p-4 sm:p-6">
            <ItineraryCard
              itinerary={itinerary}
              onSaveTrip={onSaveTrip}
              isSaved={isTripSaved}
            />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
