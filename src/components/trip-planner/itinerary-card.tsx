
"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Itinerary } from "@/lib/types";
import { BookmarkIcon, CalendarDaysIcon, DollarSignIcon, InfoIcon, LandmarkIcon, PlaneIcon, HotelIcon, ExternalLinkIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

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

  const handleFindDeals = () => {
    const baseUrl = "https://www.google.com/search"; 
    const queryParams = new URLSearchParams({
      q: `Book trip to ${itinerary.destination} for ${itinerary.travelDates} with budget ${itinerary.estimatedCost} USD`,
    });
    const bookingUrl = `${baseUrl}?${queryParams.toString()}`;
    window.open(bookingUrl, "_blank", "noopener,noreferrer");
  };

  const hintWords = itinerary.destination.toLowerCase().split(/[\s,]+/);
  const aiHint = hintWords.slice(0, 2).join(" ");

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col overflow-hidden">
      {itinerary.destinationImageUri && (
        <div className="relative w-full h-48 group">
          <Image
            src={itinerary.destinationImageUri}
            alt={`Image of ${itinerary.destination}`}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            data-ai-hint={itinerary.destinationImageUri.startsWith('https://placehold.co') ? aiHint : undefined}
          />
        </div>
      )}
      <CardHeader className="pt-4">
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
      <CardContent className="flex-grow">
        <div className="flex items-start text-sm text-muted-foreground mb-4">
          <InfoIcon className="w-4 h-4 mr-2 mt-1 shrink-0" />
          <p className="whitespace-pre-line">{itinerary.description}</p>
        </div>

        <Accordion type="multiple" className="w-full text-sm">
          {itinerary.flightOptions && itinerary.flightOptions.length > 0 && (
            <AccordionItem value="flights">
              <AccordionTrigger className="text-sm font-medium hover:no-underline">
                <div className="flex items-center">
                  <PlaneIcon className="w-4 h-4 mr-2 text-primary" /> Flight Options ({itinerary.flightOptions.length})
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-1 pb-2 space-y-2">
                {itinerary.flightOptions.map((flight, index) => (
                  <div key={`flight-${index}`} className="p-2 rounded-md border bg-muted/50">
                    <p className="font-semibold text-foreground">{flight.name} - ${flight.price.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{flight.description}</p>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          )}

          {itinerary.hotelOptions && itinerary.hotelOptions.length > 0 && (
            <AccordionItem value="hotels">
              <AccordionTrigger className="text-sm font-medium hover:no-underline">
                <div className="flex items-center">
                  <HotelIcon className="w-4 h-4 mr-2 text-primary" /> Hotel Options ({itinerary.hotelOptions.length})
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-1 pb-2 space-y-2">
                {itinerary.hotelOptions.map((hotel, index) => (
                  <div key={`hotel-${index}`} className="p-2 rounded-md border bg-muted/50">
                    <p className="font-semibold text-foreground">{hotel.name} - ${hotel.price.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{hotel.description}</p>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>

      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-3 pt-4">
        <Button 
          onClick={handleSave} 
          disabled={isSaved} 
          className="w-full sm:flex-1" 
          variant={isSaved ? "secondary" : "outline"}
        >
          <BookmarkIcon className="mr-2 h-4 w-4" />
          {isSaved ? "Saved" : "Save Trip"}
        </Button>
        <Button 
          onClick={handleFindDeals} 
          className="w-full sm:flex-1" 
          variant="default"
        >
          <ExternalLinkIcon className="mr-2 h-4 w-4" />
          Find Deals
        </Button>
      </CardFooter>
    </Card>
  );
}
