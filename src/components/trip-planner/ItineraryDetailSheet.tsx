
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
import { XIcon, MapPinIcon, SendIcon, BookmarkIcon, Loader2Icon, ScanEyeIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import React, { useState } from 'react';
import Image from 'next/image';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ItineraryDetailSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  itinerary: Itinerary;
  onSaveTrip: (itineraryData: Omit<Itinerary, 'id'>) => void;
  isTripSaved: boolean;
  isSaving?: boolean;
  onInitiateBooking: (itinerary: Itinerary) => void;
};

const glassPaneClasses = "glass-pane"; // For sheet content
const glassCardClasses = "glass-card"; // For dialog content

export function ItineraryDetailSheet({
  isOpen,
  onClose,
  itinerary,
  onSaveTrip,
  isTripSaved,
  isSaving,
  onInitiateBooking,
}: ItineraryDetailSheetProps) {
  const [isArVrDialogOpen, setIsArVrDialogOpen] = useState(false);

  if (!itinerary) return null;

  const handleSave = () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...dataToSave } = itinerary;
    onSaveTrip(dataToSave);
  };

  const handleBook = () => {
    onInitiateBooking(itinerary);
  };

  const itineraryForCard: Itinerary = 'id' in itinerary && itinerary.id
    ? itinerary
    : { ...itinerary, id: `temp-${crypto.randomUUID()}`};

  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapEmbedUrl = mapsApiKey
    ? `https://www.google.com/maps/embed/v1/search?key=${mapsApiKey}&q=hotels+in+${encodeURIComponent(itinerary.destination)}`
    : "";

  const hintWords = itinerary.destination.toLowerCase().split(/[\s,]+/);
  const aiHint = hintWords.slice(0, 2).join(" ");
  const panoramicAiHint = `panoramic view ${aiHint}`;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <SheetContent className={cn("w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl p-0 flex flex-col", glassPaneClasses)}>
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

              <div className={cn("mt-6 p-4", glassCardClasses)}>
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
           <div className={cn("p-4 sm:p-6 border-t border-border/30 grid grid-cols-1 sm:grid-cols-3 gap-3", glassPaneClasses)}>
              <Button
                onClick={handleSave}
                disabled={isTripSaved || isSaving}
                size="lg"
                className={cn(
                  "w-full text-lg py-3",
                  isTripSaved ? "glass-interactive" : "shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 glass-interactive"
                )}
                variant={isTripSaved ? "secondary" : "outline"}
              >
                {isSaving ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : <BookmarkIcon className="mr-2 h-4 w-4" />}
                {isSaving ? "Saving..." : isTripSaved ? "Saved" : "Save Trip"}
              </Button>
              <Button
                onClick={handleBook}
                size="lg"
                className="w-full text-lg py-3 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40"
                variant="default"
              >
                <SendIcon className="mr-2 h-4 w-4" />
                Start Booking
              </Button>
              <Button
                onClick={() => setIsArVrDialogOpen(true)}
                variant="outline"
                size="lg"
                className="w-full text-lg py-3 glass-interactive"
              >
                <ScanEyeIcon className="mr-2 h-4 w-4" />
                AR/VR Preview
              </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={isArVrDialogOpen} onOpenChange={setIsArVrDialogOpen}>
          <AlertDialogContent className={cn(glassCardClasses, "sm:max-w-lg")}>
              <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center text-card-foreground">
                      <ScanEyeIcon className="w-5 h-5 mr-2 text-purple-400"/>Immersive AR/VR Preview
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground">
                      Get a glimpse of {itinerary.destination}!
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="my-4 space-y-4">
                  <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-border/30 shadow-lg">
                      <Image
                          src={`https://placehold.co/800x450.png`}
                          alt={`Conceptual AR/VR Preview for ${itinerary.destination}`}
                          fill
                          className="object-cover"
                          data-ai-hint={panoramicAiHint}
                          priority
                      />
                  </div>
                  <p className="text-sm text-card-foreground/90 text-center">
                      Imagine stepping into the vibrant streets and landscapes of <strong>{itinerary.destination}</strong>.
                      A full AR/VR experience could bring your travel dreams to life before you even pack your bags!
                  </p>
                  <p className="text-xs text-muted-foreground text-center">
                      (Full AR/VR feature coming soon. This is a conceptual placeholder.)
                  </p>
              </div>
              <AlertDialogFooter>
                  <AlertDialogAction
                    onClick={() => setIsArVrDialogOpen(false)}
                    size="lg"
                    className="w-full text-lg py-3 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40"
                  >Awesome!</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
