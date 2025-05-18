
"use client";

import * as React from "react";
import type { AITripPlannerOutput } from "@/ai/flows/ai-trip-planner";
import { ItineraryCard } from "./itinerary-card";
import { Itinerary } from "@/lib/types";
import useLocalStorage from "@/hooks/use-local-storage";
import { SearchXIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

type ItineraryListProps = {
  itineraries: AITripPlannerOutput["itineraries"] | null;
  isLoading: boolean;
};

export function ItineraryList({ itineraries, isLoading }: ItineraryListProps) {
  const [savedTrips, setSavedTrips] = useLocalStorage<Itinerary[]>("savedTrips", []);
  const [cardsVisible, setCardsVisible] = React.useState(false);

  React.useEffect(() => {
    if (itineraries && itineraries.length > 0 && !isLoading) {
      // Timeout to allow CSS to apply initial (hidden) state before transitioning
      const timer = setTimeout(() => setCardsVisible(true), 50); 
      return () => clearTimeout(timer);
    } else {
      // Reset visibility if itineraries are cleared or loading starts
      setCardsVisible(false);
    }
  }, [itineraries, isLoading]);

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
              <Skeleton className="h-8 w-full mt-4" />
              <Skeleton className="h-8 w-full mt-2" />
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

  const itinerariesWithIds: Itinerary[] = itineraries.map((it, index) => ({
    ...it,
    id: `${it.destination}-${it.travelDates}-${it.estimatedCost}-${index}` 
  }));

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
      {itinerariesWithIds.map((itinerary, index) => (
        <div
          key={itinerary.id}
          className={`transition-all duration-500 ease-out transform ${cardsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
          style={{ transitionDelay: `${index * 100}ms` }}
        >
          <ItineraryCard 
            itinerary={itinerary} 
            onSaveTrip={handleSaveTrip}
            isSaved={isTripSaved(itinerary.id)}
          />
        </div>
      ))}
    </div>
  );
}
