
"use client";

import { useState } from "react";
import { TripInputForm } from "@/components/trip-planner/trip-input-form";
import { ItineraryList } from "@/components/trip-planner/itinerary-list";
import type { AITripPlannerOutput } from "@/ai/types/trip-planner-types";
import { Separator } from "@/components/ui/separator";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAddSavedTrip, useSavedTrips } from "@/lib/firestoreHooks";
import { useToast } from "@/hooks/use-toast";
import type { Itinerary } from "@/lib/types";

export default function TripPlannerPage() {
  const [itineraries, setItineraries] = useState<AITripPlannerOutput["itineraries"] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { currentUser, loading: authLoading } = useAuth();
  const { data: savedTrips, isLoading: isLoadingSavedTrips } = useSavedTrips();
  const addSavedTripMutation = useAddSavedTrip();
  const { toast } = useToast();

  const handleSaveTrip = async (itineraryToSave: Omit<Itinerary, 'id'>) => {
    if (!currentUser) {
      toast({ title: "Authentication Required", variant: "destructive" });
      return;
    }
    try {
      await addSavedTripMutation.mutateAsync(itineraryToSave);
      toast({ title: "Trip Saved!", description: `${itineraryToSave.destination} added to your dashboard.` });
    } catch (error: any) {
      toast({ title: "Error Saving Trip", description: error.message, variant: "destructive" });
    }
  };

  const isTripSaved = (itinerary: Itinerary) => {
    if (isLoadingSavedTrips || !savedTrips) return false;
    // A simplified check. A more robust check might compare more fields.
    return savedTrips.some(trip => 
        trip.destination === itinerary.destination && 
        trip.travelDates === itinerary.travelDates &&
        trip.estimatedCost === itinerary.estimatedCost
    );
  };


  return (
    <div className="container mx-auto py-8 px-4">
      <TripInputForm onItinerariesFetched={setItineraries} setIsLoading={setIsLoading} />
      
      {(isLoading || (itineraries && itineraries.length > 0)) && (
        <div className="mt-12">
          <Separator className="my-8" />
          <h2 className="text-3xl font-bold tracking-tight text-center mb-8 flex items-center justify-center">
            <Sparkles className="w-8 h-8 mr-3 text-primary" />
            Your AI-Curated Trip Options
          </h2>
          <ItineraryList 
            itineraries={itineraries} 
            isLoading={isLoading} 
            onSaveTrip={handleSaveTrip}
            isTripSaved={isTripSaved}
            isSaving={addSavedTripMutation.isPending}
            isAuthLoading={authLoading}
          />
        </div>
      )}
      
      {!isLoading && itineraries === null && (
         <div className="mt-12 text-center text-muted-foreground">
            <p>Enter your travel preferences above to see AI-generated trip plans.</p>
         </div>
      )}

      {!isLoading && itineraries?.length === 0 && (
         <div className="mt-12 text-center text-muted-foreground">
            <p>No itineraries were found for your request. Please try different criteria.</p>
         </div>
      )}
    </div>
  );
}
