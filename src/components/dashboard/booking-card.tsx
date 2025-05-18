
"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Itinerary } from "@/lib/types";
import { CalendarDaysIcon, DollarSignIcon, InfoIcon, LandmarkIcon, Trash2Icon, PlaneIcon, HotelIcon } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type BookingCardProps = {
  booking: Itinerary;
  onRemoveBooking: (bookingId: string) => void;
};

export function BookingCard({ booking, onRemoveBooking }: BookingCardProps) {
  
  const hintWords = booking.destination.toLowerCase().split(/[\s,]+/);
  const aiHint = hintWords.slice(0, 2).join(" ");

  return (
    <Card className="shadow-md flex flex-col overflow-hidden">
      {booking.destinationImageUri && (
        <div className="relative w-full h-40 group"> {/* Slightly smaller height for dashboard card */}
          <Image
            src={booking.destinationImageUri}
            alt={`Image of ${booking.destination}`}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            data-ai-hint={booking.destinationImageUri.startsWith('https://placehold.co') ? aiHint : undefined}
          />
        </div>
      )}
      <CardHeader className="pt-3 pb-2"> {/* Adjust padding */}
         <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center text-lg">
              <LandmarkIcon className="w-5 h-5 mr-2 text-primary" />
              {booking.destination}
            </CardTitle>
            <CardDescription className="flex items-center mt-1 text-xs">
              <CalendarDaysIcon className="w-3 h-3 mr-1 text-muted-foreground" />
              {booking.travelDates}
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-md py-1 px-2">
            <DollarSignIcon className="w-3 h-3 mr-1" />
            {booking.estimatedCost.toLocaleString()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-grow pt-2 pb-3"> {/* Adjust padding */}
         <div className="flex items-start text-sm text-muted-foreground mb-3">
          <InfoIcon className="w-4 h-4 mr-2 mt-1 shrink-0" />
          <p className="text-xs max-h-16 overflow-y-auto whitespace-pre-line">{booking.description}</p>
        </div>

        <Accordion type="multiple" className="w-full text-sm">
          {booking.flightOptions && booking.flightOptions.length > 0 && (
            <AccordionItem value="flights">
              <AccordionTrigger className="text-xs font-medium hover:no-underline py-2">
                <div className="flex items-center">
                  <PlaneIcon className="w-3 h-3 mr-2 text-primary" /> Flight Options ({booking.flightOptions.length})
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-1 pb-2 space-y-1">
                {booking.flightOptions.map((flight, index) => (
                  <div key={`saved-flight-${booking.id}-${index}`} className="p-1.5 rounded-md border bg-muted/30">
                    <p className="font-semibold text-xs text-foreground">{flight.name} - ${flight.price.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{flight.description}</p>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          )}

          {booking.hotelOptions && booking.hotelOptions.length > 0 && (
            <AccordionItem value="hotels">
              <AccordionTrigger className="text-xs font-medium hover:no-underline py-2">
                 <div className="flex items-center">
                    <HotelIcon className="w-3 h-3 mr-2 text-primary" /> Hotel Options ({booking.hotelOptions.length})
                  </div>
              </AccordionTrigger>
              <AccordionContent className="pt-1 pb-2 space-y-1">
                {booking.hotelOptions.map((hotel, index) => (
                  <div key={`saved-hotel-${booking.id}-${index}`} className="p-1.5 rounded-md border bg-muted/30">
                    <p className="font-semibold text-xs text-foreground">{hotel.name} - ${hotel.price.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{hotel.description}</p>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>

      </CardContent>
      <CardFooter className="pt-3"> {/* Adjust padding */}
        <Button onClick={() => onRemoveBooking(booking.id)} variant="outline" size="sm" className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive">
          <Trash2Icon className="mr-2 h-4 w-4" />
          Remove Trip
        </Button>
      </CardFooter>
    </Card>
  );
}
