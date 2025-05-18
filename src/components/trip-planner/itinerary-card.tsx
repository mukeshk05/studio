"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Itinerary } from "@/lib/types";
import { BookmarkIcon, CalendarDaysIcon, DollarSignIcon, InfoIcon, LandmarkIcon, MapPinIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ItineraryCardProps = {
  itinerary: Itinerary;
  onSaveTrip: (itinerary: Itinerary) => void;
  isSaved: boolean;
};

export function ItineraryCard({ itinerary, onSaveTrip, isSaved }: ItineraryCardProps) {
  const { toast } = useToast();

  const handleSave = () => {
    onSaveTrip(itinerary);
    toast({
      title: "Trip Saved!",
      description: `${itinerary.destination} has been added to your dashboard.`,
    });
  };

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center text-xl">
              <LandmarkIcon className="w-5 h-5 mr-2 text-primary" />
              {itinerary.destination}
            </CardTitle>
            <CardDescription className="flex items-center mt-1">
              <CalendarDaysIcon className="w-4 h-4 mr-2 text-muted-foreground" />
              {itinerary.travelDates}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-lg py-1 px-3">
            <DollarSignIcon className="w-4 h-4 mr-1" />
            {itinerary.estimatedCost.toLocaleString()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-start text-sm text-muted-foreground mb-1">
          <InfoIcon className="w-4 h-4 mr-2 mt-1 shrink-0" />
          <p className="whitespace-pre-line">{itinerary.description}</p>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={isSaved} className="w-full" variant={isSaved ? "outline" : "default"}>
          <BookmarkIcon className="mr-2 h-4 w-4" />
          {isSaved ? "Saved to Dashboard" : "Save This Trip"}
        </Button>
      </CardFooter>
    </Card>
  );
}
