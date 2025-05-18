"use client";

import useLocalStorage from "@/hooks/use-local-storage";
import type { Itinerary } from "@/lib/types";
import { BookingCard } from "./booking-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ListChecksIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const EMPTY_SAVED_TRIPS: Itinerary[] = [];

export function BookingList() {
  const [savedTrips, setSavedTrips] = useLocalStorage<Itinerary[]>("savedTrips", EMPTY_SAVED_TRIPS);
  const { toast } = useToast();

  const handleRemoveBooking = (bookingId: string) => {
    const updatedTrips = savedTrips.filter(trip => trip.id !== bookingId);
    setSavedTrips(updatedTrips);
    toast({
      title: "Trip Removed",
      description: "The trip has been removed from your dashboard.",
    });
  };

  if (savedTrips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 text-muted-foreground">
        <ListChecksIcon className="w-16 h-16 mb-4" />
        <h3 className="text-xl font-semibold">No Saved Trips Yet</h3>
        <p>Plan a trip and save your favorite itineraries here!</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-20rem)]"> {/* Adjust height as needed */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 p-1">
        {savedTrips.map((trip) => (
          <BookingCard key={trip.id} booking={trip} onRemoveBooking={handleRemoveBooking} />
        ))}
      </div>
    </ScrollArea>
  );
}
