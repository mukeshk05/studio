
"use client";

import { BookingCard } from "./booking-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ListChecks, Loader2 } from "lucide-react"; // Corrected
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSavedTrips, useRemoveSavedTrip } from "@/lib/firestoreHooks";
import type { Itinerary } from "@/lib/types";

export function BookingList() {
  const { currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const { data: savedTrips, isLoading, error } = useSavedTrips();
  const removeSavedTripMutation = useRemoveSavedTrip();

  const handleRemoveBooking = async (bookingId: string) => {
    if (!currentUser) {
      toast({ title: "Error", description: "You must be logged in to remove trips.", variant: "destructive" });
      return;
    }
    try {
      await removeSavedTripMutation.mutateAsync(bookingId);
      toast({
        title: "Trip Removed",
        description: "The trip has been removed from your dashboard.",
      });
    } catch (err) {
      console.error("Error removing trip:", err);
      toast({ title: "Error", description: "Could not remove the trip.", variant: "destructive" });
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 text-muted-foreground">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <h3 className="text-xl font-semibold">Loading Your Saved Trips...</h3>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 text-destructive">
        <ListChecks className="w-16 h-16 mb-4" />
        <h3 className="text-xl font-semibold">Error Loading Trips</h3>
        <p>{error.message}</p>
      </div>
    );
  }

  if (!currentUser) {
     return (
      <div className="flex flex-col items-center justify-center text-center py-10 text-muted-foreground">
        <ListChecks className="w-16 h-16 mb-4" />
        <h3 className="text-xl font-semibold">Please Log In</h3>
        <p>Log in to see your saved trips.</p>
      </div>
    );
  }
  
  if (!savedTrips || savedTrips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 text-muted-foreground">
        <ListChecks className="w-16 h-16 mb-4" />
        <h3 className="text-xl font-semibold">No Saved Trips Yet</h3>
        <p>Plan a trip and save your favorite itineraries here!</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-20rem)]">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 p-1">
        {savedTrips.map((trip: Itinerary) => (
          <BookingCard 
            key={trip.id} 
            booking={trip} 
            onRemoveBooking={handleRemoveBooking}
            isRemoving={removeSavedTripMutation.isPending && removeSavedTripMutation.variables === trip.id}
            isAuthLoading={authLoading}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
