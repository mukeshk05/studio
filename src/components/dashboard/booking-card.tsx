
"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Itinerary, HotelOption, DailyPlanItem } from "@/lib/types";
import { CalendarDaysIcon, DollarSignIcon, InfoIcon, LandmarkIcon, Trash2Icon, PlaneIcon, HotelIcon, ImageOffIcon, ListChecksIcon, RouteIcon, Loader2Icon } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type BookingCardProps = {
  booking: Itinerary;
  onRemoveBooking: (bookingId: string) => void;
  isRemoving?: boolean;
};


function SavedHotelOptionDisplay({ hotel }: { hotel: HotelOption }) {
  const hintWords = hotel.name.toLowerCase().split(/[\s,]+/);
  const aiHint = hintWords.slice(0, 2).join(" ");

  return (
    <div className="p-1.5 rounded-md border bg-muted/30 dark:bg-muted/20 flex gap-2">
      <div className="relative w-16 h-16 shrink-0 rounded-sm overflow-hidden border">
        {hotel.hotelImageUri && hotel.hotelImageUri !== "" ? (
           <Image
              src={hotel.hotelImageUri}
              alt={`Image of ${hotel.name}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 15vw, 8vw"
              data-ai-hint={hotel.hotelImageUri.startsWith('https://placehold.co') ? aiHint : undefined}
            />
        ) : (
          <div className="w-full h-full bg-muted/50 dark:bg-muted/30 flex items-center justify-center">
            <ImageOffIcon className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
      </div>
      <div>
        <p className="font-semibold text-xs text-foreground">{hotel.name} - ${hotel.price.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground line-clamp-2">{hotel.description}</p>
      </div>
    </div>
  );
}

function SavedDailyPlanDisplay({ planItem }: { planItem: DailyPlanItem }) {
  return (
    <div className="p-2 rounded-md border bg-muted/30 dark:bg-muted/20 mb-1.5">
      <h5 className="font-semibold text-xs text-foreground mb-0.5 flex items-center">
        <RouteIcon className="w-3 h-3 mr-1.5 shrink-0 text-primary" />
        {planItem.day}
      </h5>
      <p className="text-xs text-muted-foreground whitespace-pre-line pl-5">{planItem.activities}</p>
    </div>
  );
}
const glassEffectClasses = "bg-card/60 dark:bg-card/40 backdrop-blur-lg border-white/20 shadow-xl";

export function BookingCard({ booking, onRemoveBooking, isRemoving }: BookingCardProps) {
  
  const hintWords = booking.destination.toLowerCase().split(/[\s,]+/);
  const aiHint = hintWords.slice(0, 2).join(" ");

  return (
    <Card className={`${glassEffectClasses} flex flex-col overflow-hidden border-none`}>
      {booking.destinationImageUri && (
        <div className="relative w-full h-40 group">
          <Image
            src={booking.destinationImageUri}
            alt={`Image of ${booking.destination}`}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            data-ai-hint={booking.destinationImageUri.startsWith('https://placehold.co') ? aiHint : undefined}
          />
           <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
            <Badge variant="outline" className="text-md py-1 px-2 text-white bg-black/50 border-black/30 backdrop-blur-sm">
                <DollarSignIcon className="w-3 h-3 mr-1" />
                {booking.estimatedCost.toLocaleString()}
            </Badge>
          </div>
        </div>
      )}
      <CardHeader className="pt-3 pb-2">
         <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center text-lg text-foreground">
              <LandmarkIcon className="w-5 h-5 mr-2 text-primary" />
              {booking.destination}
            </CardTitle>
            <CardDescription className="flex items-center mt-1 text-xs text-foreground/80">
              <CalendarDaysIcon className="w-3 h-3 mr-1 text-muted-foreground" />
              {booking.travelDates}
            </CardDescription>
          </div>
          {!booking.destinationImageUri && (
             <Badge variant="outline" className="text-md py-1 px-2 bg-background/70 text-foreground border-border/50">
                <DollarSignIcon className="w-3 h-3 mr-1" />
                {booking.estimatedCost.toLocaleString()}
             </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-grow pt-2 pb-3">
         {booking.tripSummary && (
           <div className="text-xs text-muted-foreground mb-3">
              <h4 className="text-xs font-semibold text-foreground mb-0.5 flex items-center"><InfoIcon className="w-3 h-3 mr-1.5 shrink-0 text-primary" /> Trip Summary</h4>
              <p className="pl-5 text-xs border-l border-border/50 ml-0.5 py-0.5 text-foreground/80">{booking.tripSummary}</p>
           </div>
         )}

        <Accordion type="multiple" className="w-full text-sm"  defaultValue={booking.dailyPlan && booking.dailyPlan.length > 0 ? ['daily-plan'] : []}>
          {booking.dailyPlan && booking.dailyPlan.length > 0 && (
            <AccordionItem value="daily-plan" className="border-border/50">
              <AccordionTrigger className="text-xs font-medium hover:no-underline py-2 text-foreground/90 [&[data-state=open]>svg]:text-primary">
                <div className="flex items-center">
                  <ListChecksIcon className="w-3 h-3 mr-2 text-primary" /> Daily Itinerary ({booking.dailyPlan.length} days)
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-1 pb-0 space-y-1 max-h-40 overflow-y-auto">
                {booking.dailyPlan.map((planItem, index) => (
                  <SavedDailyPlanDisplay key={`saved-plan-${booking.id}-${index}`} planItem={planItem} />
                ))}
              </AccordionContent>
            </AccordionItem>
          )}
          
          {booking.flightOptions && booking.flightOptions.length > 0 && (
            <AccordionItem value="flights" className="border-border/50">
              <AccordionTrigger className="text-xs font-medium hover:no-underline py-2 text-foreground/90 [&[data-state=open]>svg]:text-primary">
                <div className="flex items-center">
                  <PlaneIcon className="w-3 h-3 mr-2 text-primary" /> Flight Options ({booking.flightOptions.length})
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-1 pb-2 space-y-1">
                {booking.flightOptions.map((flight, index) => (
                  <div key={`saved-flight-${booking.id}-${index}`} className="p-1.5 rounded-md border bg-muted/30 dark:bg-muted/20">
                    <p className="font-semibold text-xs text-foreground">{flight.name} - ${flight.price.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{flight.description}</p>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          )}

          {booking.hotelOptions && booking.hotelOptions.length > 0 && (
            <AccordionItem value="hotels" className="border-border/50">
              <AccordionTrigger className="text-xs font-medium hover:no-underline py-2 text-foreground/90 [&[data-state=open]>svg]:text-primary">
                 <div className="flex items-center">
                    <HotelIcon className="w-3 h-3 mr-2 text-primary" /> Hotel Options ({booking.hotelOptions.length})
                  </div>
              </AccordionTrigger>
              <AccordionContent className="pt-1 pb-2 space-y-1.5">
                {booking.hotelOptions.map((hotel, index) => (
                   <SavedHotelOptionDisplay key={`saved-hotel-${booking.id}-${index}`} hotel={hotel} />
                ))}
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>

      </CardContent>
      <CardFooter className="pt-3">
        <Button onClick={() => onRemoveBooking(booking.id)} variant="outline" size="sm" className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30" disabled={isRemoving}>
          {isRemoving ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : <Trash2Icon className="mr-2 h-4 w-4" />}
          {isRemoving ? "Removing..." : "Remove Trip"}
        </Button>
      </CardFooter>
    </Card>
  );
}
