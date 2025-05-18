
"use client";

import * as React from "react";
import type { AITripPlannerOutput } from "@/ai/types/trip-planner-types";
import { ItineraryCard } from "./itinerary-card";
import { Itinerary } from "@/lib/types";
import useLocalStorage from "@/hooks/use-local-storage";
import { SearchXIcon, SparklesIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

type ItineraryListProps = {
  itineraries: AITripPlannerOutput["itineraries"] | null;
  isLoading: boolean; // isLoading is passed but not used for the new loading state which is in planner/page.tsx
};

const EMPTY_SAVED_TRIPS: Itinerary[] = [];

export function ItineraryList({ itineraries /* isLoading is managed by parent now */ }: ItineraryListProps) {
  const [savedTrips, setSavedTrips] = useLocalStorage<Itinerary[]>("savedTrips", EMPTY_SAVED_TRIPS);
  const [cardsVisible, setCardsVisible] = React.useState(false);

  React.useEffect(() => {
    // Cards become visible once itineraries are loaded (isLoading is false in parent)
    if (itineraries && itineraries.length > 0) {
      const timer = setTimeout(() => setCardsVisible(true), 50);
      return () => clearTimeout(timer);
    } else {
      setCardsVisible(false);
    }
  }, [itineraries]);

  const handleSaveTrip = (itineraryToSave: Itinerary) => {
    if (!savedTrips.find(trip => trip.id === itineraryToSave.id)) {
      setSavedTrips([...savedTrips, itineraryToSave]);
    }
  };

  const isTripSaved = (itineraryId: string) => {
    return savedTrips.some(trip => trip.id === itineraryId);
  };

  // The main loading state is now handled in src/app/(app)/planner/page.tsx
  // This component will only render skeletons if explicitly told to by a future prop,
  // or we can remove the skeleton from here if the parent fully handles loading UI.
  // For now, if itineraries is null (initial state before loading or after error),
  // it won't render anything, which is fine as parent handles those states.

  if (!itineraries || itineraries.length === 0) {
    // This case is also handled by the parent page with a more prominent message.
    // Returning null here to avoid duplicate "No itineraries" messages.
    // The parent page (planner/page.tsx) shows a specific message for this.
    return null;
  }

  const itinerariesWithIds: Itinerary[] = itineraries.map((it, index) => ({
    ...it,
    destinationImageUri: it.destinationImageUri || `https://placehold.co/600x400.png`,
    hotelOptions: (it.hotelOptions || []).map(hotel => ({
      ...hotel,
      hotelImageUri: hotel.hotelImageUri || `https://placehold.co/300x200.png?text=${encodeURIComponent(hotel.name.substring(0,10))}`
    })),
    dailyPlan: it.dailyPlan || [],
    id: `${it.destination}-${it.travelDates}-${it.estimatedCost}-${index}`
  }));

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8">
      {itinerariesWithIds.map((itinerary, index) => (
        <div
          key={itinerary.id}
          className={`transition-all duration-700 ease-out transform ${cardsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
          style={{ transitionDelay: `${index * 150}ms` }} // Slightly increased delay
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
