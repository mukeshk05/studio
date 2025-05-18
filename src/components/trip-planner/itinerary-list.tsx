
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
      const timer = setTimeout(() => setCardsVisible(true), 50); 
      return () => clearTimeout(timer);
    } else {
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
          <Card key={i} className="shadow-lg overflow-hidden">
            <Skeleton className="h-48 w-full" /> 
            <CardHeader className="pt-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2 mt-1" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-12 w-full mb-2" /> {/* Skeleton for description/daily plan */}
              <Skeleton className="h-8 w-full mt-4" /> {/* Skeleton for flight accordion trigger */}
              <Skeleton className="h-8 w-full mt-2" /> {/* Skeleton for hotel accordion trigger */}
            </CardContent>
            <CardFooter className="gap-3 pt-4">
              <Skeleton className="h-10 w-1/2" />
              <Skeleton className="h-10 w-1/2" />
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
    destinationImageUri: it.destinationImageUri || `https://placehold.co/600x400.png`,
    hotelOptions: it.hotelOptions.map(hotel => ({
      ...hotel,
      hotelImageUri: hotel.hotelImageUri || `https://placehold.co/300x200.png?text=${encodeURIComponent(hotel.name.substring(0,10))}`
    })),
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
