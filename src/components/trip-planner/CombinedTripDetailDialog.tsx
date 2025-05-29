"use client";

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import type { TripPackageSuggestion, ConceptualDailyPlanItem, SerpApiFlightLeg, SerpApiLayover } from "@/lib/types";
import { X, Plane, Hotel as HotelIcon, CalendarDays, DollarSign, Info, MapPin, ExternalLink, ImageOff, Clock, CheckSquare, Route, Briefcase, Star, Sparkles, Ticket, Users, Building, Palette, Utensils, Mountain, FerrisWheel, ListChecks, Save, Loader2, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAddSavedPackage } from '@/lib/firestoreHooks';
import { useAuth } from '@/contexts/AuthContext';

const glassPaneClasses = "glass-pane";
const glassCardClasses = "glass-card";
const innerGlassEffectClasses = "bg-card/80 dark:bg-card/50 backdrop-blur-md border border-white/10 dark:border-[hsl(var(--primary)/0.1)] rounded-lg";
const prominentButtonClasses = "text-lg py-3 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:from-accent hover:to-primary focus-visible:ring-4 focus-visible:ring-primary/40 transform transition-all duration-300 ease-out hover:scale-[1.02] active:scale-100";

interface CombinedTripDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tripPackage: TripPackageSuggestion | null;
  onInitiateBooking: (destination: string, travelDates: string) => void;
}

function formatDuration(minutes?: number): string {
  if (minutes === undefined || minutes === null || isNaN(minutes)) return "N/A";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

function FlightLegDisplay({ leg, isLast }: { leg: SerpApiFlightLeg, isLast: boolean }) {
  return (
    <div className={cn("p-2 rounded-md", innerGlassEffectClasses, !isLast && "mb-2")}>
      <div className="flex items-center gap-2 mb-1">
        {leg.airline_logo && <Image src={leg.airline_logo} alt={leg.airline || ""} width={20} height={20} className="rounded-sm"/>}
        <span className="font-semibold text-xs text-card-foreground">{leg.airline} {leg.flight_number}</span>
        {leg.airplane && <span className="text-muted-foreground text-[0.65rem]">({leg.airplane})</span>}
      </div>
      <p className="text-xs text-muted-foreground">
        <strong className="text-card-foreground/80">Departs:</strong> {leg.departure_airport?.name} ({leg.departure_airport?.id}) at {leg.departure_airport?.time || 'N/A'}
      </p>
      <p className="text-xs text-muted-foreground">
        <strong className="text-card-foreground/80">Arrives:</strong> {leg.arrival_airport?.name} ({leg.arrival_airport?.id}) at {leg.arrival_airport?.time || 'N/A'}
      </p>
      <p className="text-xs text-muted-foreground"><strong className="text-card-foreground/80">Duration:</strong> {formatDuration(leg.duration)}</p>
      {leg.travel_class && <p className="text-xs text-muted-foreground"><strong className="text-card-foreground/80">Class:</strong> {leg.travel_class}</p>}
    </div>
  );
}

function LayoverDisplay({ layover }: { layover: SerpApiLayover }) {
    return (
      <div className="pl-8 py-1 text-xs text-muted-foreground">
        <span className="font-medium text-card-foreground/80">Layover:</span> {layover.name || layover.id} ({formatDuration(layover.duration)})
      </div>
    );
}

function ConceptualDailyPlanDisplay({ planItem, isLast }: { planItem: ConceptualDailyPlanItem, isLast: boolean }) {
  return (
    <div className={cn("relative flex items-start", !isLast ? "pb-4" : "pb-1")}>
      <div className="absolute left-[5px] top-[11px] h-full w-0.5 bg-primary/30"></div>
      <div className="relative z-10 flex h-3 w-3 items-center justify-center rounded-full bg-primary ring-2 ring-background mt-1"></div>
      <div className={cn("ml-4 pl-3 py-2 pr-2 rounded-md w-full text-xs", innerGlassEffectClasses)}>
        <h5 className="font-semibold text-primary mb-0.5">{planItem.day}</h5>
        <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
          {planItem.activities}
        </p>
      </div>
    </div>
  );
}

export function CombinedTripDetailDialog({ isOpen, onClose, tripPackage, onInitiateBooking }: CombinedTripDetailDialogProps) {
  const { toast } = useToast();
  const mapRef = useRef<HTMLIFrameElement>(null);
  const addSavedPackageMutation = useAddSavedPackage();
  const { currentUser } = useAuth();
  const [isSavingPackage, setIsSavingPackage] = useState(false);

  if (!tripPackage) return null;

  const { flight, hotel, totalEstimatedCost, durationDays, destinationQuery, travelDatesQuery, userInput, destinationImageUri } = tripPackage;
  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  const hotelMapQuery = hotel.coordinates?.latitude && hotel.coordinates?.longitude
    ? `${hotel.coordinates.latitude},${hotel.coordinates.longitude}`
    : encodeURIComponent(`${hotel.name}, ${destinationQuery}`);
  
  const hotelMapEmbedUrl = mapsApiKey
    ? `https://www.google.com/maps/embed/v1/place?key=${mapsApiKey}&q=${hotelMapQuery}&zoom=14`
    : "";

  const handleSavePackage = async () => {
    if (!tripPackage) return;
    if (!currentUser?.uid) {
      toast({ title: "Authentication Error", description: "Please log in to save this package.", variant: "destructive"});
      return;
    }

    setIsSavingPackage(true);
    try {
      const packageToSave: TripPackageSuggestion = {
        ...tripPackage,
        userId: currentUser.uid, // Ensure current user's ID is used
        createdAt: new Date().toISOString(), // Use client-side timestamp for consistency if serverTimestamp causes issues, or ensure firestore types are correct
      };
      console.log("[CombinedTripDetailDialog] Package to save:", JSON.stringify(packageToSave).substring(0,500)+"...");

      await addSavedPackageMutation.mutateAsync(packageToSave);
      toast({
        title: "Package Saved!",
        description: `Trip package to ${tripPackage.destinationQuery} saved to your dashboard.`,
      });
    } catch (error: any) {
      console.error("[CombinedTripDetailDialog] Error saving package:", error);
      toast({ title: "Save Error", description: error.message || "Could not save the trip package.", variant: "destructive" });
    } finally {
      setIsSavingPackage(false);
    }
  };
  
  const hotelMainImageHint = hotel.thumbnail ? hotel.name?.toLowerCase().split(" ").slice(0,2).join(" ") : "hotel exterior";
  
  const conceptualDailyPlan: ConceptualDailyPlanItem[] = Array.from({ length: Math.max(1, Math.min(durationDays || 3, 7)) }, (_, i) => {
    if (i === 0) return { day: "Day 1", activities: `Arrive in ${destinationQuery}, check into ${hotel.name || 'your accommodation'}, and explore the immediate local area. Enjoy a welcome dinner.` };
    if (i === Math.max(1, durationDays || 3) - 1 && durationDays > 1) return { day: `Day ${durationDays || 3}`, activities: "Enjoy a final breakfast, any last-minute souvenir shopping or a quick visit to a favorite spot, then prepare for departure." };
    if (durationDays === 1 && i === 0) return {day: "Day 1", activities: `Arrive in ${destinationQuery}, check into ${hotel.name || 'your accommodation'}, focus on key experiences, and prepare for departure.`};
    return { day: `Day ${i + 1}`, activities: `Explore key attractions, cultural experiences, and culinary delights specific to ${destinationQuery}. (Detailed activities will be AI-generated upon full planning).` };
  });


  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className={cn(glassCardClasses, "sm:max-w-3xl md:max-w-4xl lg:max-w-5xl max-h-[95vh] flex flex-col p-0 border-primary/30 overflow-hidden")}>
        <DialogHeader className="p-4 sm:p-6 border-b border-border/30 bg-card/80 dark:bg-card/50 backdrop-blur-sm shrink-0">
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

        <ScrollArea className="flex-1 min-h-0"> 
          <div className="p-4 sm:p-6 space-y-6"> 
            <Card className={cn(innerGlassEffectClasses, "border-accent/20 shadow-lg")}>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-2xl font-bold text-accent text-center flex items-center justify-center gap-2">
                   <DollarSign className="w-7 h-7" /> Total Estimated Package Cost: ~${totalEstimatedCost.toLocaleString()}
                </CardTitle>
                 <CardDescription className="text-center text-xs text-muted-foreground">
                    (Flight: ${flight.price?.toLocaleString() || 'N/A'} + Hotel: ~${((hotel.price_per_night || 0) * durationDays).toLocaleString()})
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className={cn(innerGlassEffectClasses, "border-primary/20")}>
              <CardHeader className="pb-3 pt-4">
                <CardTitle className="text-lg font-semibold text-primary flex items-center">
                  <Plane className="w-5 h-5 mr-2" /> Flight Details
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <div className="flex items-center gap-3 mb-2">
                  {flight.airline_logo ? (
                    <Image src={flight.airline_logo} alt={flight.airline || "Airline"} width={60} height={22.5} className="object-contain rounded-sm bg-muted/20 p-0.5" data-ai-hint={flight.airline?.toLowerCase()} />
                  ) : (
                    <Plane className="w-5 h-5 text-primary" />
                  )}
                  <div>
                    <p className="font-medium text-card-foreground text-sm">{flight.airline || "Selected Airline"} {flight.derived_flight_numbers}</p>
                  </div>
                </div>
                <Separator/>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <p><strong className="text-card-foreground/90">Price:</strong> ${flight.price?.toLocaleString()}</p>
                  <p><strong className="text-card-foreground/90">Type:</strong> {flight.type || "N/A"}</p>
                  <p><strong className="text-card-foreground/90">Total Duration:</strong> {formatDuration(flight.total_duration)}</p>
                  <p><strong className="text-card-foreground/90">Stops:</strong> {flight.derived_stops_description || "N/A"}</p>
                </div>
                
                {flight.flights && flight.flights.length > 0 && (
                    <div className="mt-3 space-y-2">
                        <h4 className="text-xs font-semibold text-card-foreground/80">Flight Legs:</h4>
                        {flight.flights.map((leg, index, arr) => (
                            <React.Fragment key={`leg-${index}`}>
                                <FlightLegDisplay leg={leg} isLast={index === arr.length -1 && (!flight.layovers || flight.layovers.length <= index )}/>
                                {flight.layovers && flight.layovers[index] && index < arr.length -1 && (
                                    <LayoverDisplay layover={flight.layovers[index]} />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                )}

                {flight.link && (
                  <Button variant="outline" size="sm" asChild className="w-full sm:w-auto glass-interactive border-primary/40 text-primary hover:bg-primary/10 mt-3">
                    <a href={flight.link} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4 mr-2" />View Flight on Google Flights</a>
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className={cn(innerGlassEffectClasses, "border-primary/20")}>
              <CardHeader className="pb-3 pt-4">
                <CardTitle className="text-lg font-semibold text-primary flex items-center">
                  <HotelIcon className="w-5 h-5 mr-2" /> Hotel Details: {hotel.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                 <Tabs defaultValue="overview" className="w-full">
                    <TabsList className={cn("grid w-full grid-cols-2 sm:grid-cols-3 mb-4 glass-pane p-1", "border border-border/50")}>
                        <TabsTrigger value="overview" className="data-[state=active]:bg-primary/80 data-[state=active]:text-primary-foreground text-xs sm:text-sm">Overview</TabsTrigger>
                        <TabsTrigger value="gallery" disabled={!hotel.images || hotel.images.length === 0} className="data-[state=active]:bg-primary/80 data-[state=active]:text-primary-foreground text-xs sm:text-sm">Gallery</TabsTrigger>
                        <TabsTrigger value="map" className="data-[state=active]:bg-primary/80 data-[state=active]:text-primary-foreground text-xs sm:text-sm">Location</TabsTrigger>
                    </TabsList>
                    <TabsContent value="overview" className={cn(glassCardClasses, "p-4 rounded-md")}>
                          <div className="relative aspect-video w-full rounded-md overflow-hidden border border-border/30 group bg-muted/30 mb-3 shadow-md">
                          {hotel.thumbnail ? (
                              <Image src={hotel.thumbnail} alt={hotel.name || "Hotel image"} fill className="object-cover group-hover:scale-105 transition-transform" data-ai-hint={hotelMainImageHint} sizes="(max-width: 768px) 90vw, 400px" />
                          ) : (
                              <div className="w-full h-full flex items-center justify-center"><ImageOff className="w-10 h-10 text-muted-foreground"/></div>
                          )}
                          </div>
                          {hotel.type && <Badge variant="outline" className="text-xs capitalize bg-accent/10 text-accent border-accent/30 mb-1.5">{hotel.type}</Badge>}
                          {hotel.rating && <p className="text-sm flex items-center text-amber-400 mb-1.5"><Star className="w-4 h-4 mr-1 fill-amber-400" /> {hotel.rating.toFixed(1)} / 5 ({hotel.reviews || 'N/A'} reviews)</p>}
                          <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{hotel.description || "Detailed description not available."}</p>
                          <Separator className="my-2.5"/>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              <div><strong className="text-card-foreground/90">Price:</strong> {hotel.price_details || (hotel.price_per_night ? `$${hotel.price_per_night.toLocaleString()}/night` : "N/A")}</div>
                              <div><strong className="text-card-foreground/90">Total for Stay ({durationDays} days):</strong> ~${((hotel.price_per_night || 0) * durationDays).toLocaleString()}</div>
                          </div>
                          {hotel.amenities && hotel.amenities.length > 0 && (
                          <div className="pt-2.5">
                              <h4 className="font-medium text-card-foreground/90 text-xs mb-1">Key Amenities:</h4>
                              <div className="flex flex-wrap gap-1.5">
                              {hotel.amenities.map((amenity, idx) => <Badge key={idx} variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">{amenity}</Badge>)}
                              </div>
                          </div>
                          )}
                          {hotel.link && (
                          <Button variant="outline" size="sm" asChild className="w-full sm:w-auto glass-interactive border-primary/40 text-primary hover:bg-primary/10 mt-3.5">
                              <a href={hotel.link} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4 mr-2" />View Hotel Deal</a>
                          </Button>
                          )}
                    </TabsContent>
                    <TabsContent value="gallery" className={cn(glassCardClasses, "p-4 rounded-md")}>
                         {hotel.images && hotel.images.length > 0 ? (
                            <Carousel className="w-full max-w-full" opts={{ align: "start", loop: hotel.images.length > 1 }}>
                                <CarouselContent className="-ml-2">
                                {hotel.images.map((img, idx) => (
                                    <CarouselItem key={idx} className="pl-2 md:basis-1/2 lg:basis-1/3">
                                    <div className="relative aspect-square w-full rounded-md overflow-hidden border border-border/30 bg-muted/30 shadow-sm">
                                        {img.thumbnail ? (
                                        <Image src={img.thumbnail} alt={`Hotel image ${idx + 1}`} fill className="object-cover" sizes="(max-width: 768px) 45vw, 200px" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center"><ImageOff className="w-8 h-8 text-muted-foreground"/></div>
                                        )}
                                    </div>
                                    </CarouselItem>
                                ))}
                                </CarouselContent>
                                {hotel.images.length > (1) && <CarouselPrevious className="ml-12 text-foreground bg-background/70 hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-accent" />}
                                {hotel.images.length > (1) && <CarouselNext className="mr-12 text-foreground bg-background/70 hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-accent" />}
                            </Carousel>
                        ) : (
                            <p className="text-muted-foreground text-center py-4">No additional images available for this hotel.</p>
                        )}
                    </TabsContent>
                    <TabsContent value="map" className={cn(glassCardClasses, "p-4 rounded-md")}>
                         {mapsApiKey && (hotel.coordinates?.latitude && hotel.coordinates?.longitude || hotel.name) ? (
                            <div className="aspect-video w-full rounded-lg overflow-hidden border border-border/50 shadow-lg">
                            <iframe
                                ref={mapRef}
                                width="100%"
                                height="100%"
                                style={{ border: 0 }}
                                loading="lazy"
                                allowFullScreen
                                referrerPolicy="no-referrer-when-downgrade"
                                src={hotelMapEmbedUrl}
                                title={`Map of ${hotel.name}`}
                            ></iframe>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground bg-muted/30 dark:bg-muted/10 p-4 rounded-md">
                            <p>{mapsApiKey ? "Hotel location data unavailable for map." : "Google Maps API Key is missing."}</p>
                            {!mapsApiKey && <p className="text-xs">Configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable maps.</p>}
                            </div>
                        )}
                    </TabsContent>
                 </Tabs>
              </CardContent>
            </Card>
            
            <Card className={cn(innerGlassEffectClasses, "border-primary/20")}>
              <CardHeader className="pb-3 pt-4">
                <CardTitle className="text-lg font-semibold text-primary flex items-center">
                  <ListChecks className="w-5 h-5 mr-2" /> Conceptual Daily Activities Outline
                </CardTitle>
                 <CardDescription className="text-xs text-muted-foreground">
                  This is a high-level conceptual outline. A detailed, personalized day-by-day plan will be generated by Aura AI if you proceed to "Plan This Package".
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm space-y-1.5">
                <div className="space-y-1 relative pl-2">
                  {conceptualDailyPlan.map((item, index) => (
                    <ConceptualDailyPlanDisplay key={`conceptual-day-${index}`} planItem={item} isLast={index === conceptualDailyPlan.length - 1} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        <DialogFooter className={cn("p-4 sm:p-6 border-t border-border/30 shrink-0 grid grid-cols-1 sm:grid-cols-3 gap-3", glassPaneClasses)}>
          <Button
            onClick={handleSavePackage}
            variant="outline"
            size="sm" 
            className="w-full glass-interactive border-accent/50 text-accent hover:bg-accent/10"
            disabled={addSavedPackageMutation.isPending}
          >
            {addSavedPackageMutation.isPending ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />}
            {addSavedPackageMutation.isPending ? "Saving..." : "Save Package"}
          </Button>
          <Button
            onClick={() => toast({ title: "Feature Coming Soon!", description: "A dedicated page for this package will be available in the future."})}
            variant="outline"
            size="sm" 
            className="w-full glass-interactive"
          >
            <ExternalLink className="mr-2" /> View on Full Page
          </Button>
          <Button onClick={() => onInitiateBooking(tripPackage.destinationQuery, tripPackage.travelDatesQuery)} size="lg" className={cn("w-full", prominentButtonClasses)}>
            <Ticket className="mr-2" /> Plan This Package with AI
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

