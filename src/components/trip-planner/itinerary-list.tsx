
"use client";

import * as React from "react";
import type { AITripPlannerOutput } from "@/ai/types/trip-planner-types";
import { ItineraryCard } from "./itinerary-card";
import { Itinerary } from "@/lib/types";

type ItineraryListProps = {
  itineraries: AITripPlannerOutput["itineraries"] | null;
  isLoading: boolean;
  onSaveTrip: (itinerary: Omit<Itinerary, 'id'>) => void;
  isTripSaved: (itinerary: Itinerary) => boolean;
  isSaving: boolean;
  isAuthLoading: boolean;
};

export function ItineraryList({ itineraries, isLoading, onSaveTrip, isTripSaved, isSaving, isAuthLoading }: ItineraryListProps) {
  const [cardsVisible, setCardsVisible] = React.useState(false);

  React.useEffect(() => {
    if (itineraries && itineraries.length > 0) {
      const timer = setTimeout(() => setCardsVisible(true), 50);
      return () => clearTimeout(timer);
    } else {
      setCardsVisible(false);
    }
  }, [itineraries]);


  if (!itineraries || itineraries.length === 0) {
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
          style={{ transitionDelay: `${index * 150}ms` }}
        >
          <ItineraryCard
            itinerary={itinerary}
            onSaveTrip={onSaveTrip}
            isSaved={isTripSaved(itinerary)}
            isSaving={isSaving}
            isAuthLoading={isAuthLoading} // pass down
          />
        </div>
      ))}
    </div>
  );
}
