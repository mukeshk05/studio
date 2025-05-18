
"use client";

import { useState } from "react";
import { TripInputForm } from "@/components/trip-planner/trip-input-form";
import { ItineraryList } from "@/components/trip-planner/itinerary-list";
import type { AITripPlannerOutput } from "@/ai/flows/ai-trip-planner";
import { Separator } from "@/components/ui/separator";
import { SparklesIcon, MessageSquareIcon, Loader2Icon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function TripPlannerPage() {
  const [itineraries, setItineraries] = useState<AITripPlannerOutput["itineraries"] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="container mx-auto py-8 px-4 flex flex-col items-center">
      <TripInputForm onItinerariesFetched={setItineraries} setIsLoading={setIsLoading} />
      
      {isLoading && (
        <Card className="mt-12 w-full max-w-2xl mx-auto shadow-xl animate-fade-in-up">
          <CardContent className="p-6 sm:p-8 text-center">
            <div className="flex justify-center items-center mb-6">
              <SparklesIcon className="w-12 h-12 text-primary animate-bounce" />
            </div>
            <p className="text-xl font-semibold text-foreground mb-2">BudgetRoam AI is crafting your journey...</p>
            <p className="text-muted-foreground mb-6">This might take a few moments. Please wait.</p>
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div 
                className="bg-primary h-3 rounded-full animate-pulse-loader-planner" 
                style={{ width: '100%' }} // The animation will handle the movement
              />
            </div>
          </CardContent>
        </Card>
      )}
      
      {!isLoading && itineraries && itineraries.length > 0 && (
        <div className="mt-12 w-full animate-fade-in-up delay-200">
          <Separator className="my-8" />
          <h2 className="text-3xl font-bold tracking-tight text-center mb-8 flex items-center justify-center">
            <MessageSquareIcon className="w-8 h-8 mr-3 text-primary" />
            Your AI-Generated Trip Options
          </h2>
          <ItineraryList itineraries={itineraries} isLoading={isLoading} />
        </div>
      )}
      
      {!isLoading && itineraries === null && (
         <div className="mt-12 text-center text-muted-foreground p-8 bg-card rounded-xl shadow-lg animate-fade-in-up">
            <SparklesIcon className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-lg">Enter your travel preferences above to see AI-generated trip plans.</p>
            <p className="text-sm">Let BudgetRoam AI inspire your next adventure!</p>
         </div>
      )}

      {!isLoading && itineraries?.length === 0 && (
         <div className="mt-12 text-center text-muted-foreground p-8 bg-card rounded-xl shadow-lg animate-fade-in-up">
            <SparklesIcon className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-lg">No itineraries were found for your request.</p>
            <p className="text-sm">Please try different criteria or broaden your search.</p>
         </div>
      )}
    </div>
  );
}

    