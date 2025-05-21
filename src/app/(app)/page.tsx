
"use client";

import { useState } from "react";
import { TripInputForm } from "@/components/trip-planner/trip-input-form";
import { ItineraryList } from "@/components/trip-planner/itinerary-list";
import type { AITripPlannerOutput } from "@/ai/flows/ai-trip-planner";
import { Separator } from "@/components/ui/separator";
import { Sparkles } from "lucide-react"; // Corrected

export default function TripPlannerPage() {
  const [itineraries, setItineraries] = useState<AITripPlannerOutput["itineraries"] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
          <ItineraryList itineraries={itineraries} isLoading={isLoading} />
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

