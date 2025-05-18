
"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Itinerary } from "@/lib/types";
import { CalendarDaysIcon, DollarSignIcon, EyeIcon, LandmarkIcon, ImageOffIcon } from "lucide-react";

type CompactItineraryCardProps = {
  itinerary: Itinerary;
  onViewDetails: () => void;
};

export function CompactItineraryCard({ itinerary, onViewDetails }: CompactItineraryCardProps) {
  const hintWords = itinerary.destination.toLowerCase().split(/[\s,]+/);
  const aiHint = hintWords.slice(0, 2).join(" ");

  return (
    <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-200 bg-card/80 backdrop-blur-sm border-border/50">
      <div className="flex">
        {itinerary.destinationImageUri && (
          <div className="relative w-24 h-36 sm:w-32 sm:h-auto shrink-0 group">
            <Image
              src={itinerary.destinationImageUri}
              alt={`Image of ${itinerary.destination}`}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 20vw, 10vw"
              data-ai-hint={itinerary.destinationImageUri.startsWith('https://placehold.co') ? aiHint : undefined}
            />
          </div>
        )}
        {!itinerary.destinationImageUri && (
            <div className="w-24 h-36 sm:w-32 bg-muted flex items-center justify-center shrink-0">
                <ImageOffIcon className="w-8 h-8 text-muted-foreground" />
            </div>
        )}
        <div className="flex flex-col flex-grow p-3">
          <CardHeader className="p-0 pb-1">
            <CardTitle className="text-base flex items-center">
              <LandmarkIcon className="w-4 h-4 mr-1.5 text-primary shrink-0" />
              {itinerary.destination}
            </CardTitle>
            <CardDescription className="text-xs flex items-center">
              <CalendarDaysIcon className="w-3 h-3 mr-1 text-muted-foreground shrink-0" />
              {itinerary.travelDates}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 pb-2 text-xs text-muted-foreground flex-grow">
            <p className="line-clamp-2">{itinerary.tripSummary || "View details for more information."}</p>
          </CardContent>
          <CardFooter className="p-0 flex justify-between items-center">
            <Badge variant="secondary" className="py-0.5 px-2 text-xs">
              <DollarSignIcon className="w-3 h-3 mr-1" />
              {itinerary.estimatedCost.toLocaleString()}
            </Badge>
            <Button onClick={onViewDetails} size="sm" variant="outline" className="text-xs h-7 px-2.5">
              <EyeIcon className="w-3.5 h-3.5 mr-1" />
              Details
            </Button>
          </CardFooter>
        </div>
      </div>
    </Card>
  );
}
