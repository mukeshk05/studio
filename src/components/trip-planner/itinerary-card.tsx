
"use client";

import React, { useState } from "react"; // Added useState
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Itinerary, HotelOption, DailyPlanItem } from "@/lib/types";
import { BookmarkIcon, CalendarDaysIcon, DollarSignIcon, InfoIcon, LandmarkIcon, PlaneIcon, HotelIcon, ExternalLinkIcon, ImageOffIcon, ListChecksIcon, RouteIcon, Loader2Icon, EyeIcon } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { cn } from "@/lib/utils";
import { HotelDetailDialog } from "./HotelDetailDialog"; // Import the new dialog

type ItineraryCardProps = {
  itinerary: Itinerary; 
  onSaveTrip: (itineraryData: Omit<Itinerary, 'id'>) => void; 
  isSaved: boolean;
  isSaving?: boolean;
  isDetailedView?: boolean; 
};

// Updated HotelOptionDisplay to be clickable and more visually distinct
function HotelOptionDisplay({ hotel, onClick }: { hotel: HotelOption; onClick: () => void; }) {
  const hintWords = hotel.name.toLowerCase().split(/[\s,]+/).slice(0, 2).join(" ");
  const aiHint = hintWords.length > 0 ? hintWords : "hotel building";

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-2 rounded-lg border border-border/50 bg-card/50 hover:bg-accent/10 hover:border-accent/40 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all duration-150 flex gap-3 text-left group"
      )}
      aria-label={`View details for ${hotel.name}`}
    >
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-md overflow-hidden border border-border/30">
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
          <div className="w-full h-full bg-muted/50 flex items-center justify-center">
            <ImageOffIcon className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="flex-grow">
        <p className="font-semibold text-card-foreground group-hover:text-accent">{hotel.name}</p>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-1">{hotel.description}</p>
        <Badge variant="secondary" className="text-xs bg-primary/20 text-primary border-primary/30">
            <DollarSignIcon className="w-3 h-3 mr-1"/> ${hotel.price.toLocaleString()}
        </Badge>
      </div>
      <EyeIcon className="w-5 h-5 text-muted-foreground self-center ml-auto shrink-0 group-hover:text-accent transition-colors" />
    </button>
  );
}

function DailyPlanDisplay({ planItem }: { planItem: DailyPlanItem }) {
  return (
    <div className="p-2.5 rounded-lg border border-border/50 bg-card/30 shadow-sm mb-2">
      <h5 className="font-semibold text-sm text-primary mb-1 flex items-center">
        <RouteIcon className="w-4 h-4 mr-2 shrink-0" />
        {planItem.day}
      </h5>
      <p className="text-xs text-muted-foreground whitespace-pre-line pl-6">{planItem.activities}</p>
    </div>
  );
}


export function ItineraryCard({ itinerary, onSaveTrip, isSaved, isSaving, isDetailedView = false }: ItineraryCardProps) {
  const [selectedHotel, setSelectedHotel] = useState<HotelOption | null>(null);
  const [isHotelDetailOpen, setIsHotelDetailOpen] = useState(false);

  const handleSaveClick = () => {
    const { id, ...dataToSave } = itinerary; 
    onSaveTrip(dataToSave);
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

  const openHotelDetailDialog = (hotel: HotelOption) => {
    setSelectedHotel(hotel);
    setIsHotelDetailOpen(true);
  };

  return (
    <>
    <Card className={cn("shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col overflow-hidden glass-card border-primary/20")}>
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
           <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <Badge variant="secondary" className="text-lg py-1 px-3 text-white bg-black/70 border-black/30 backdrop-blur-sm">
                <DollarSignIcon className="w-4 h-4 mr-1" />
                {itinerary.estimatedCost.toLocaleString()}
            </Badge>
          </div>
        </div>
      )}
      <CardHeader className="pt-4 pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center text-xl text-card-foreground">
              <LandmarkIcon className="w-5 h-5 mr-2 text-primary" />
              {itinerary.destination}
            </CardTitle>
            <CardDescription className="flex items-center mt-1 text-muted-foreground">
              <CalendarDaysIcon className="w-4 h-4 mr-2" />
              {itinerary.travelDates}
            </CardDescription>
          </div>
         {!itinerary.destinationImageUri && ( 
            <Badge variant="secondary" className="text-lg py-1 px-3 bg-primary/20 text-primary border-primary/30">
              <DollarSignIcon className="w-4 h-4 mr-1" />
              {itinerary.estimatedCost.toLocaleString()}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-grow pt-2 text-card-foreground">
        {itinerary.tripSummary && (
          <div className="text-sm text-muted-foreground mb-4">
            <h4 className="text-sm font-semibold text-card-foreground mb-1 flex items-center"><InfoIcon className="w-4 h-4 mr-2 shrink-0 text-primary" /> Trip Summary</h4>
            <p className="text-xs pl-6 border-l-2 border-border/50 ml-1 py-1">{itinerary.tripSummary}</p>
          </div>
        )}

        <Accordion type="multiple" className="w-full text-sm" defaultValue={ isDetailedView && itinerary.dailyPlan && itinerary.dailyPlan.length > 0 ? ['daily-plan'] : []}>
          {itinerary.dailyPlan && itinerary.dailyPlan.length > 0 && (
            <AccordionItem value="daily-plan" className="border-border/30">
              <AccordionTrigger className="text-sm font-medium hover:no-underline py-2 text-card-foreground/90 [&[data-state=open]>svg]:text-primary">
                <div className="flex items-center">
                  <ListChecksIcon className="w-4 h-4 mr-2 text-primary" /> Daily Itinerary ({itinerary.dailyPlan.length} days)
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-1 space-y-1.5 max-h-60 overflow-y-auto">
                {itinerary.dailyPlan.map((planItem, index) => (
                  <DailyPlanDisplay key={`plan-${itinerary.id}-${index}`} planItem={planItem} />
                ))}
              </AccordionContent>
            </AccordionItem>
          )}

          {itinerary.flightOptions && itinerary.flightOptions.length > 0 && (
            <AccordionItem value="flights" className="border-border/30">
              <AccordionTrigger className="text-sm font-medium hover:no-underline py-2 text-card-foreground/90 [&[data-state=open]>svg]:text-primary">
                <div className="flex items-center">
                  <PlaneIcon className="w-4 h-4 mr-2 text-primary" /> Flight Options ({itinerary.flightOptions.length})
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-1 pb-2 space-y-2">
                {itinerary.flightOptions.map((flight, index) => (
                  <div key={`flight-${itinerary.id}-${index}`} className="p-2 rounded-md border border-border/50 bg-card/50">
                    <p className="font-semibold text-card-foreground">{flight.name} - ${flight.price.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{flight.description}</p>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          )}

          {itinerary.hotelOptions && itinerary.hotelOptions.length > 0 && (
            <AccordionItem value="hotels" className="border-border/30">
              <AccordionTrigger className="text-sm font-medium hover:no-underline py-2 text-card-foreground/90 [&[data-state=open]>svg]:text-primary">
                <div className="flex items-center">
                  <HotelIcon className="w-4 h-4 mr-2 text-primary" /> Hotel Options ({itinerary.hotelOptions.length})
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-1 pb-2 space-y-2">
                {itinerary.hotelOptions.map((hotel, index) => (
                  <HotelOptionDisplay 
                    key={`hotel-${itinerary.id}-${index}`} 
                    hotel={hotel} 
                    onClick={() => openHotelDetailDialog(hotel)}
                  />
                ))}
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>

      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-3 pt-4">
        <Button 
          onClick={handleSaveClick} 
          disabled={isSaved || isSaving} 
          className="w-full sm:flex-1" 
          variant={isSaved ? "secondary" : "outline"}
        >
          {isSaving ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : <BookmarkIcon className="mr-2 h-4 w-4" />}
          {isSaving ? "Saving..." : isSaved ? "Saved To Dashboard" : "Save Trip"}
        </Button>
        <Button 
          onClick={handleFindDeals} 
          className="w-full sm:flex-1 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40" 
          variant="default"
        >
          <ExternalLinkIcon className="mr-2 h-4 w-4" />
          Find Deals
        </Button>
      </CardFooter>
    </Card>

    {selectedHotel && (
      <HotelDetailDialog
        isOpen={isHotelDetailOpen}
        onClose={() => {
          setIsHotelDetailOpen(false);
          setSelectedHotel(null); // Clear selected hotel on close
        }}
        hotel={selectedHotel}
        destinationName={itinerary.destination}
      />
    )}
    </>
  );
}
