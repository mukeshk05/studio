"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Itinerary } from "@/lib/types";
import { CalendarDaysIcon, DollarSignIcon, InfoIcon, LandmarkIcon, Trash2Icon } from "lucide-react";

type BookingCardProps = {
  booking: Itinerary;
  onRemoveBooking: (bookingId: string) => void;
};

export function BookingCard({ booking, onRemoveBooking }: BookingCardProps) {
  return (
    <Card className="shadow-md">
      <CardHeader>
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
      <CardContent>
         <div className="flex items-start text-sm text-muted-foreground mb-1">
          <InfoIcon className="w-4 h-4 mr-2 mt-1 shrink-0" />
          <p className="text-xs max-h-20 overflow-y-auto whitespace-pre-line">{booking.description}</p>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={() => onRemoveBooking(booking.id)} variant="outline" size="sm" className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive">
          <Trash2Icon className="mr-2 h-4 w-4" />
          Remove Trip
        </Button>
      </CardFooter>
    </Card>
  );
}
