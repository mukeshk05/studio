
"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Itinerary } from "@/lib/types";
import { CalendarDays, DollarSign, Eye, Landmark, ImageOff, Plane } from "lucide-react"; 
import { cn } from "@/lib/utils";

type CompactItineraryCardProps = {
  itinerary: Itinerary; 
  onViewDetails: () => void;
};

export function CompactItineraryCard({ itinerary, onViewDetails }: CompactItineraryCardProps) {
  const hintWords = itinerary.destination.toLowerCase().split(/[\s,]+/);
  const aiHint = hintWords.slice(0, 2).join(" ");
  const primaryFlight = itinerary.flightOptions?.[0];

  return (
    <Card className={cn(
        "overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-200", 
        "glass-card hover:border-primary/50" 
        )}>
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
            <div className="w-24 h-36 sm:w-32 bg-muted/50 flex items-center justify-center shrink-0">
                <ImageOff className="w-8 h-8 text-muted-foreground" />
            </div>
        )}
        <div className="flex flex-col flex-grow p-3">
          <CardHeader className="p-0 pb-1">
            <CardTitle className="text-base flex items-center text-card-foreground">
              <Landmark className="w-4 h-4 mr-1.5 text-primary shrink-0" />
              {itinerary.destination}
            </CardTitle>
            <CardDescription className="text-xs flex items-center text-muted-foreground">
              <CalendarDays className="w-3 h-3 mr-1 shrink-0" />
              {itinerary.travelDates}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 pb-2 text-xs text-muted-foreground flex-grow">
            <p className="line-clamp-2">{itinerary.tripSummary || "View details for more information."}</p>
            {primaryFlight && (
              <div className="mt-1.5 pt-1.5 border-t border-border/20 flex items-center gap-1.5">
                {primaryFlight.airline_logo ? (
                  <Image src={primaryFlight.airline_logo} alt={primaryFlight.name || "Airline"} width={16} height={16} className="rounded-sm" />
                ) : (
                  <Plane className="w-3.5 h-3.5 text-muted-foreground" />
                )}
                <span className="text-xs text-muted-foreground truncate">{primaryFlight.name.substring(0, 25)}{primaryFlight.name.length > 25 ? "..." : ""} - ${primaryFlight.price?.toLocaleString()}</span>
              </div>
            )}
          </CardContent>
          <CardFooter className="p-0 flex justify-between items-center">
            <Badge variant="secondary" className="py-0.5 px-2 text-xs bg-primary/20 text-primary border-primary/30">
              <DollarSign className="w-3 h-3 mr-1" />
              {itinerary.estimatedCost.toLocaleString()}
            </Badge>
            <Button onClick={onViewDetails} size="sm" variant="outline" className="text-xs h-7 px-2.5 border-primary/50 text-primary hover:bg-primary/10 hover:text-primary">
              <Eye className="w-3.5 h-3.5 mr-1" />
              Details
            </Button>
          </CardFooter>
        </div>
      </div>
    </Card>
  );
}
