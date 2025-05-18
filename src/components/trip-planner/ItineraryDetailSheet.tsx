
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
import { XIcon, MapPinIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import React from 'react'; // Ensure React is imported

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

  const itineraryForCard: Itinerary = 'id' in itinerary && itinerary.id
    ? itinerary
    : { ...itinerary, id: `temp-${crypto.randomUUID()}`};

  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapEmbedUrl = mapsApiKey
    ? `https://www.google.com/maps/embed/v1/search?key=${mapsApiKey}&q=hotels+in+${encodeURIComponent(itinerary.destination)}`
    : "";

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
          <div className="p-4 sm:p-6 space-y-6">
            <ItineraryCard
              itinerary={itineraryForCard}
              onSaveTrip={handleSave}
              isSaved={isTripSaved}
              isSaving={isSaving}
              isDetailedView={true}
            />

            <div className={cn("mt-6 glass-card p-4")}>
              <h3 className="text-lg font-semibold mb-3 flex items-center text-card-foreground">
                <MapPinIcon className="w-5 h-5 mr-2 text-primary" />
                Location & Hotels Map
              </h3>
              {mapsApiKey ? (
                <div className="aspect-video w-full rounded-md overflow-hidden border border-border/50">
                  <iframe
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    src={mapEmbedUrl}
                    title={`Map of hotels in ${itinerary.destination}`}
                  ></iframe>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground bg-muted/30 p-4 rounded-md">
                  <p>Google Maps API Key is missing.</p>
                  <p className="text-xs">Please configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your environment variables to enable map features.</p>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
