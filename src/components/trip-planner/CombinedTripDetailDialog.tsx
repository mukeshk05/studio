
"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import type { TripPackageSuggestion, SerpApiFlightOption, SerpApiHotelSuggestion } from "@/lib/types";
import { X, Plane, Hotel as HotelIcon, CalendarDays, DollarSign, Info, MapPin, ExternalLink, ImageOff, Clock, CheckSquare, Route, Briefcase, Star, Sparkles, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from '@/hooks/use-toast';

type CombinedTripDetailDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  tripPackage: TripPackageSuggestion | null;
  onInitiateBooking: (destination: string, travelDates: string) => void;
};

const glassPaneClasses = "glass-pane";
const glassCardClasses = "glass-card";
const innerGlassEffectClasses = "bg-card/80 dark:bg-card/50 backdrop-blur-md border border-white/10 dark:border-[hsl(var(--primary)/0.1)] rounded-lg";

function formatDuration(minutes?: number): string {
  if (minutes === undefined || minutes === null) return "N/A";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

export function CombinedTripDetailDialog({ isOpen, onClose, tripPackage, onInitiateBooking }: CombinedTripDetailDialogProps) {
  const { toast } = useToast();

  if (!tripPackage) return null;

  const { flight, hotel, totalEstimatedCost, durationDays, destinationQuery, travelDatesQuery, userInput } = tripPackage;
  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const handleConceptualSave = () => {
    toast({
      title: "Save Package (Conceptual)",
      description: "This specific flight + hotel package would be saved to your dashboard in a full implementation.",
    });
  };
  
  const flightImageHint = flight.airline_logo ? flight.airline?.toLowerCase() : "airline logo";
  const hotelMainImageHint = hotel.thumbnail ? hotel.name?.toLowerCase().split(" ").slice(0,2).join(" ") : "hotel exterior";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className={cn(glassCardClasses, "sm:max-w-3xl md:max-w-4xl lg:max-w-5xl max-h-[95vh] flex flex-col p-0 border-primary/30")}>
        <DialogHeader className="p-4 sm:p-6 border-b border-border/30 sticky top-0 z-20 bg-card/80 dark:bg-card/50 backdrop-blur-sm">
          <div className="flex justify-between items-start">
            <div className="flex-grow min-w-0">
              <DialogTitle className="text-xl font-semibold text-foreground truncate flex items-center">
                <Briefcase className="w-6 h-6 mr-2 text-primary" />
                Your Trip Package to {destinationQuery}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Dates: {travelDatesQuery} ({durationDays} days) | User Budget: ~${userInput.budget.toLocaleString()}
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-accent/20 hover:text-accent-foreground shrink-0">
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-grow">
          <div className="p-4 sm:p-6 space-y-6">
            <Card className={cn(innerGlassEffectClasses, "border-accent/20 shadow-lg")}>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-2xl font-bold text-accent text-center flex items-center justify-center gap-2">
                   <DollarSign className="w-7 h-7" /> Total Estimated Package Cost: ~${totalEstimatedCost.toLocaleString()}
                </CardTitle>
              </CardHeader>
            </Card>

            {/* Flight Details Section */}
            <Card className={cn(innerGlassEffectClasses, "border-primary/20")}>
              <CardHeader className="pb-3 pt-4">
                <CardTitle className="text-lg font-semibold text-primary flex items-center">
                  <Plane className="w-5 h-5 mr-2" /> Flight Details
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <div className="flex items-center gap-3">
                  {flight.airline_logo ? (
                    <Image src={flight.airline_logo} alt={flight.airline || "Airline"} width={60} height={24} className="object-contain rounded-sm bg-muted/20 p-0.5" data-ai-hint={flightImageHint} />
                  ) : (
                    <Plane className="w-6 h-6 text-primary" />
                  )}
                  <div>
                    <p className="font-medium text-card-foreground">{flight.airline || "Selected Airline"} {flight.derived_flight_numbers}</p>
                    <p className="text-xs text-muted-foreground">Price: ${flight.price?.toLocaleString()}</p>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div><strong className="text-card-foreground/90">From:</strong> {flight.derived_departure_airport_name} at {flight.derived_departure_time}</div>
                  <div><strong className="text-card-foreground/90">To:</strong> {flight.derived_arrival_airport_name} at {flight.derived_arrival_time}</div>
                  <div><strong className="text-card-foreground/90">Duration:</strong> {formatDuration(flight.total_duration)} ({flight.derived_stops_description})</div>
                </div>
                {flight.link && (
                  <Button variant="outline" size="sm" asChild className="w-full sm:w-auto glass-interactive border-primary/40 text-primary hover:bg-primary/10 mt-2">
                    <a href={flight.link} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4 mr-2" />View Flight on Google Flights</a>
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Hotel Details Section */}
            <Card className={cn(innerGlassEffectClasses, "border-primary/20")}>
              <CardHeader className="pb-3 pt-4">
                <CardTitle className="text-lg font-semibold text-primary flex items-center">
                  <HotelIcon className="w-5 h-5 mr-2" /> Hotel Details
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  <div className="space-y-2">
                    <h3 className="text-md font-medium text-card-foreground">{hotel.name}</h3>
                    {hotel.type && <Badge variant="outline" className="text-xs capitalize bg-accent/10 text-accent border-accent/30">{hotel.type}</Badge>}
                    {hotel.rating && <p className="text-xs flex items-center text-amber-400"><Star className="w-3.5 h-3.5 mr-1 fill-amber-400" /> {hotel.rating.toFixed(1)} / 5 ({hotel.reviews || 'N/A'} reviews)</p>}
                    <p className="text-xs text-muted-foreground">{hotel.description || "Detailed description not available."}</p>
                  </div>
                  <div className="relative aspect-video w-full rounded-md overflow-hidden border border-border/30 group bg-muted/30">
                    {hotel.thumbnail ? (
                      <Image src={hotel.thumbnail} alt={hotel.name || "Hotel image"} fill className="object-cover group-hover:scale-105 transition-transform" data-ai-hint={hotelMainImageHint} sizes="(max-width: 768px) 90vw, 400px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><ImageOff className="w-10 h-10 text-muted-foreground"/></div>
                    )}
                  </div>
                </div>

                {hotel.images && hotel.images.length > 1 && (
                  <Carousel className="w-full max-w-full mt-3" opts={{ align: "start", loop: true }}>
                    <CarouselContent className="-ml-2">
                      {hotel.images.map((img, idx) => (
                        <CarouselItem key={idx} className="pl-2 md:basis-1/2 lg:basis-1/3">
                          <div className="relative aspect-video w-full rounded-md overflow-hidden border border-border/30 bg-muted/30">
                            {img.thumbnail ? (
                               <Image src={img.thumbnail} alt={`Hotel image ${idx + 1}`} fill className="object-cover" sizes="(max-width: 768px) 45vw, 200px" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center"><ImageOff className="w-8 h-8 text-muted-foreground"/></div>
                            )}
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <CarouselPrevious className="ml-12 text-foreground bg-background/70 hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-accent" />
                    <CarouselNext className="mr-12 text-foreground bg-background/70 hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-accent" />
                  </Carousel>
                )}

                <Separator className="my-3"/>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div><strong className="text-card-foreground/90">Price:</strong> {hotel.price_details || (hotel.price_per_night ? `$${hotel.price_per_night.toLocaleString()}/night` : "N/A")}</div>
                  <div><strong className="text-card-foreground/90">Total for Stay ({durationDays} days):</strong> ~${((hotel.price_per_night || 0) * durationDays).toLocaleString()}</div>
                </div>
                
                {hotel.amenities && hotel.amenities.length > 0 && (
                  <div>
                    <h4 className="font-medium text-card-foreground/90 text-xs mb-1">Key Amenities:</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {hotel.amenities.slice(0, 6).map((amenity, idx) => <Badge key={idx} variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">{amenity}</Badge>)}
                      {hotel.amenities.length > 6 && <Badge variant="outline" className="text-xs">+{hotel.amenities.length - 6} more</Badge>}
                    </div>
                  </div>
                )}

                {hotel.link && (
                  <Button variant="outline" size="sm" asChild className="w-full sm:w-auto glass-interactive border-primary/40 text-primary hover:bg-primary/10 mt-3">
                    <a href={hotel.link} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4 mr-2" />View Hotel Deal</a>
                  </Button>
                )}

                 {mapsApiKey && hotel.coordinates?.latitude && hotel.coordinates?.longitude && (
                    <div className="mt-3">
                        <h4 className="font-medium text-card-foreground/90 text-xs mb-1">Location:</h4>
                        <div className="aspect-[16/9] w-full rounded-md overflow-hidden border border-border/50">
                        <iframe
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            loading="lazy"
                            allowFullScreen
                            referrerPolicy="no-referrer-when-downgrade"
                            src={`https://www.google.com/maps/embed/v1/place?key=${mapsApiKey}&q=${hotel.coordinates.latitude},${hotel.coordinates.longitude}&zoom=15`}
                            title={`Map of ${hotel.name}`}
                        ></iframe>
                        </div>
                    </div>
                )}
              </CardContent>
            </Card>

          </div>
        </ScrollArea>

        <DialogFooter className={cn("p-4 sm:p-6 border-t border-border/30 grid grid-cols-1 sm:grid-cols-3 gap-3", glassPaneClasses)}>
          <Button onClick={handleConceptualSave} variant="outline" size="lg" className="w-full glass-interactive border-accent/50 text-accent hover:bg-accent/10">
            <Sparkles className="mr-2" />Save Package (Future)
          </Button>
          <Button onClick={() => onInitiateBooking(destinationQuery, travelDatesQuery)} size="lg" className={cn("w-full", "text-lg py-3 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:from-accent hover:to-primary focus-visible:ring-4 focus-visible:ring-primary/40 transform transition-all duration-300 ease-out hover:scale-[1.02] active:scale-100", "sm:col-span-2")}>
            <Ticket className="mr-2" /> Start Booking This Package
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
