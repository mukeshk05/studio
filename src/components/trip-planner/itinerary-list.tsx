"use client";

import type { AITripPlannerOutput } from "@/ai/flows/ai-trip-planner";
import { ItineraryCard } from "./itinerary-card";
import { Itinerary } from "@/lib/types";
import useLocalStorage from "@/hooks/use-local-storage";
import { Loader2Icon, SearchXIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

type ItineraryListProps = {
  itineraries: AITripPlannerOutput["itineraries"] | null;
  isLoading: boolean;
};

export function ItineraryList({ itineraries, isLoading }: ItineraryListProps) {
  const [savedTrips, setSavedTrips] = useLocalStorage<Itinerary[]>("savedTrips", []);

  const handleSaveTrip = (itineraryToSave: Itinerary) => {
    if (!savedTrips.find(trip => trip.id === itineraryToSave.id)) {
      setSavedTrips([...savedTrips, itineraryToSave]);
    }
  };

  const isTripSaved = (itineraryId: string) => {
    return savedTrips.some(trip => trip.id === itineraryId);
  };
  
  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="shadow-lg">
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2 mt-1" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-5/6" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-10 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (!itineraries || itineraries.length === 0) {
    return (
      <div className="mt-12 flex flex-col items-center justify-center text-center">
        <SearchXIcon className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold text-muted-foreground">No Itineraries Found</h3>
        <p className="text-muted-foreground">Try adjusting your search criteria or try again later.</p>
      </div>
    );
  }

  // Ensure each itinerary has a unique ID for saving purposes
  const itinerariesWithIds: Itinerary[] = itineraries.map((it, index) => ({
    ...it,
    // A simple way to generate an ID. In a real app, AI might provide IDs or a more robust method would be used.
    id: `${it.destination}-${it.travelDates}-${it.estimatedCost}-${index}` 
  }));


  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
      {itinerariesWithIds.map((itinerary) => (
        <ItineraryCard 
          key={itinerary.id} 
          itinerary={itinerary} 
          onSaveTrip={handleSaveTrip}
          isSaved={isTripSaved(itinerary.id)}
        />
      ))}
    </div>
  );
}
