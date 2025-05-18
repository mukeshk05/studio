
"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Itinerary, HotelOption, DailyPlanItem } from "@/lib/types";
import { BookmarkIcon, CalendarDaysIcon, DollarSignIcon, InfoIcon, LandmarkIcon, PlaneIcon, HotelIcon, ExternalLinkIcon, ImageOffIcon, ListChecksIcon, RouteIcon } from "lucide-react";
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

function HotelOptionDisplay({ hotel }: { hotel: HotelOption }) {
  const hintWords = hotel.name.toLowerCase().split(/[\s,]+/);
  const aiHint = hintWords.slice(0, 2).join(" ");

  return (
    <div className="p-2 rounded-md border bg-muted/50 flex gap-3">
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-md overflow-hidden border">
        {hotel.hotelImageUri && hotel.hotelImageUri !== "" ? (
           <Image
              src={hotel.hotelImageUri}
              alt={`Image of ${hotel.name}`}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 20vw, 10vw"
              data-ai-hint={hotel.hotelImageUri.startsWith('https://placehold.co') ? aiHint : undefined}
            />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <ImageOffIcon className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
      </div>
      <div>
        <p className="font-semibold text-foreground">{hotel.name} - ${hotel.price.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground line-clamp-3">{hotel.description}</p>
      </div>
    </div>
  );
}

function DailyPlanDisplay({ planItem }: { planItem: DailyPlanItem }) {
  return (
    <div className="p-2.5 rounded-lg border bg-background shadow-sm mb-2">
      <h5 className="font-semibold text-sm text-primary mb-1 flex items-center">
        <RouteIcon className="w-4 h-4 mr-2 shrink-0" />
        {planItem.day}
      </h5>
      <p className="text-xs text-muted-foreground whitespace-pre-line pl-6">{planItem.activities}</p>
    </div>
  );
}


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
           <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
            <Badge variant="secondary" className="text-lg py-1 px-3 text-white bg-black/50 border-black/30 backdrop-blur-sm">
                <DollarSignIcon className="w-4 h-4 mr-1" />
                {itinerary.estimatedCost.toLocaleString()}
            </Badge>
          </div>
        </div>
      )}
      <CardHeader className="pt-4 pb-2">
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
         {!itinerary.destinationImageUri && ( 
            <Badge variant="secondary" className="text-lg py-1 px-3">
              <DollarSignIcon className="w-4 h-4 mr-1" />
              {itinerary.estimatedCost.toLocaleString()}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-grow pt-2">
        {itinerary.tripSummary && (
          <div className="text-sm text-muted-foreground mb-4">
            <h4 className="text-sm font-semibold text-foreground mb-1 flex items-center"><InfoIcon className="w-4 h-4 mr-2 shrink-0" /> Trip Summary</h4>
            <p className="text-xs pl-6 border-l-2 border-border ml-1 py-1">{itinerary.tripSummary}</p>
          </div>
        )}

        <Accordion type="multiple" className="w-full text-sm" defaultValue={['daily-plan']}>
          {itinerary.dailyPlan && itinerary.dailyPlan.length > 0 && (
            <AccordionItem value="daily-plan">
              <AccordionTrigger className="text-sm font-medium hover:no-underline py-2">
                <div className="flex items-center">
                  <ListChecksIcon className="w-4 h-4 mr-2 text-primary" /> Daily Itinerary ({itinerary.dailyPlan.length} days)
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-1 space-y-1.5 max-h-60 overflow-y-auto">
                {itinerary.dailyPlan.map((planItem, index) => (
                  <DailyPlanDisplay key={`plan-${index}`} planItem={planItem} />
                ))}
              </AccordionContent>
            </AccordionItem>
          )}

          {itinerary.flightOptions && itinerary.flightOptions.length > 0 && (
            <AccordionItem value="flights">
              <AccordionTrigger className="text-sm font-medium hover:no-underline py-2">
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
              <AccordionTrigger className="text-sm font-medium hover:no-underline py-2">
                <div className="flex items-center">
                  <HotelIcon className="w-4 h-4 mr-2 text-primary" /> Hotel Options ({itinerary.hotelOptions.length})
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-1 pb-2 space-y-2">
                {itinerary.hotelOptions.map((hotel, index) => (
                  <HotelOptionDisplay key={`hotel-${index}`} hotel={hotel} />
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

