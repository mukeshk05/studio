
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

type ItineraryDetailSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  itinerary: Itinerary; // Can be Itinerary with temp ID or Omit<Itinerary, 'id'> if unsaved
  onSaveTrip: (itinerary: Omit<Itinerary, 'id'>) => void; // Expects data without Firestore ID for saving
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

  // Prepare data for saving: remove temporary ID if present
  const handleSave = () => {
    const { id, ...dataToSave } = itinerary;
    onSaveTrip(dataToSave);
  };
  
  const itineraryForCard: Itinerary = itinerary.id 
    ? itinerary 
    : { ...itinerary, id: `temp-${crypto.randomUUID()}`};


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
              itinerary={itineraryForCard} // Pass Itinerary with ID (temp or real)
              onSaveTrip={handleSave} // onSaveTrip in ItineraryCard now calls this sheet's handleSave
              isSaved={isTripSaved}
              isSaving={isSaving} // Pass saving state
              isDetailedView={true} // Indicate this is the detailed view context
            />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
