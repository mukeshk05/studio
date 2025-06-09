
"use client";

import React from 'react';
import NextImage from 'next/image';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import type { SerpApiFlightOption, SerpApiFlightLeg, SerpApiLayover } from '@/ai/types/serpapi-flight-search-types';
import type { SerpApiHotelSuggestion } from '@/ai/types/serpapi-hotel-search-types';
import { X, Plane, Hotel as HotelIcon, CalendarDays, DollarSign, Info, MapPin, ExternalLink, ImageOff, Clock, CheckSquare, Route, Star, Users, Briefcase, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TrendingDeal = SerpApiFlightOption | SerpApiHotelSuggestion;

interface TrendingDealDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  deal: TrendingDeal | null;
  dealType: 'flight' | 'hotel' | null;
}

const glassCardClasses = "glass-card bg-card/80 dark:bg-card/50 backdrop-blur-lg border-border/20";
const innerGlassEffectClasses = "bg-card/70 dark:bg-card/40 backdrop-blur-md border border-white/10 dark:border-[hsl(var(--primary)/0.1)] rounded-md";
const prominentButtonClasses = "text-lg py-3 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:from-accent hover:to-primary focus-visible:ring-4 focus-visible:ring-primary/40 transform transition-all duration-300 ease-out hover:scale-[1.02] active:scale-100";

function formatDuration(minutes?: number): string {
  if (minutes === undefined || minutes === null || isNaN(minutes)) return "N/A";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

function FlightLegDisplay({ leg, isLast }: { leg: SerpApiFlightLeg, isLast: boolean }) {
  return (
    <div className={cn("p-2.5 rounded-md", innerGlassEffectClasses, !isLast && "mb-2")}>
      <div className="flex items-center gap-2 mb-1.5">
        {leg.airline_logo && <NextImage src={leg.airline_logo} alt={leg.airline || "Airline logo"} width={24} height={24} className="rounded-sm object-contain bg-muted/20 p-0.5"/>}
        <span className="font-semibold text-sm text-card-foreground">{leg.airline} {leg.flight_number}</span>
        {leg.airplane && <span className="text-muted-foreground text-xs">({leg.airplane})</span>}
      </div>
      <div className="text-xs text-muted-foreground space-y-0.5">
        <p><strong className="text-card-foreground/80">Departs:</strong> {leg.departure_airport?.name} ({leg.departure_airport?.id || 'N/A'}) at {leg.departure_airport?.time || 'N/A'}</p>
        <p><strong className="text-card-foreground/80">Arrives:</strong> {leg.arrival_airport?.name} ({leg.arrival_airport?.id || 'N/A'}) at {leg.arrival_airport?.time || 'N/A'}</p>
        <p><strong className="text-card-foreground/80">Duration:</strong> {formatDuration(leg.duration)}</p>
        {leg.travel_class && <p><strong className="text-card-foreground/80">Class:</strong> {leg.travel_class}</p>}
      </div>
    </div>
  );
}

function LayoverDisplay({ layover }: { layover: SerpApiLayover }) {
    return (
      <div className="pl-6 py-1.5 my-1 text-xs text-muted-foreground border-l-2 border-dashed border-primary/50 ml-[13px]">
        <Clock className="w-3 h-3 inline-block mr-1.5 text-primary/70 relative -left-[25px] top-[1px] bg-background rounded-full p-0.5" />
        <span className="font-medium text-card-foreground/80">Layover:</span> {layover.name || layover.id} ({formatDuration(layover.duration)})
      </div>
    );
}

export function TrendingDealDetailsDialog({ isOpen, onClose, deal, dealType }: TrendingDealDetailsDialogProps) {
  if (!deal || !dealType) return null;

  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  let mapEmbedUrl = "";
  if (dealType === 'hotel' && (deal as SerpApiHotelSuggestion).coordinates) {
    const hotelDeal = deal as SerpApiHotelSuggestion;
    const hotelMapQuery = hotelDeal.coordinates?.latitude && hotelDeal.coordinates?.longitude
      ? `${hotelDeal.coordinates.latitude},${hotelDeal.coordinates.longitude}`
      : encodeURIComponent(`${hotelDeal.name}, ${hotelDeal.type || 'hotel'}`);
    mapEmbedUrl = mapsApiKey
      ? `https://www.google.com/maps/embed/v1/place?key=${mapsApiKey}&q=${hotelMapQuery}&zoom=14`
      : "";
  }

  const title = dealType === 'flight' 
    ? `Flight: ${(deal as SerpApiFlightOption).derived_departure_airport_name} to ${(deal as SerpApiFlightOption).derived_arrival_airport_name}`
    : (deal as SerpApiHotelSuggestion).name || "Hotel Deal";
  
  const bookingLink = deal.link;
  const bookingSiteName = bookingLink ? new URL(bookingLink).hostname.replace('www.', '') : "Booking Provider";
  
  const googleSearchUrl = dealType === 'flight' 
    ? `https://www.google.com/travel/flights/search?q=flights+from+${encodeURIComponent((deal as SerpApiFlightOption).derived_departure_airport_name || '')}+to+${encodeURIComponent((deal as SerpApiFlightOption).derived_arrival_airport_name || '')}`
    : `https://www.google.com/search?q=${encodeURIComponent((deal as SerpApiHotelSuggestion).name || '')}+hotel`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className={cn(glassCardClasses, "sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col p-0 border-primary/30")}>
        <DialogHeader className="p-4 sm:p-6 border-b border-border/30 bg-card/80 dark:bg-card/50 backdrop-blur-sm shrink-0">
          <div className="flex justify-between items-start">
            <div className="flex-grow min-w-0">
              <DialogTitle className="text-xl font-semibold text-foreground truncate flex items-center">
                {dealType === 'flight' ? <Plane className="w-6 h-6 mr-2 text-primary" /> : <HotelIcon className="w-6 h-6 mr-2 text-primary" />}
                {title}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Detailed information from search provider.
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
            {dealType === 'flight' && (
              <Card className={cn(innerGlassEffectClasses, "border-primary/20")}>
                <CardHeader className="pb-3 pt-4">
                  <CardTitle className="text-lg font-semibold text-primary flex items-center">
                    <Ticket className="w-5 h-5 mr-2" /> Flight Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-3">
                  <div className="flex items-center gap-3 mb-2">
                    {(deal as SerpApiFlightOption).airline_logo ? (
                      <NextImage src={(deal as SerpApiFlightOption).airline_logo!} alt={(deal as SerpApiFlightOption).airline || "Airline"} width={70} height={26.25} className="object-contain rounded-sm bg-muted/20 p-0.5"/>
                    ) : (
                      <Plane className="w-6 h-6 text-primary" />
                    )}
                    <div>
                      <p className="font-medium text-card-foreground text-base">{(deal as SerpApiFlightOption).airline || "Selected Airline"} {(deal as SerpApiFlightOption).derived_flight_numbers}</p>
                    </div>
                  </div>
                  <Separator/>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <p><strong className="text-card-foreground/90">Total Price:</strong> ${(deal as SerpApiFlightOption).price?.toLocaleString()}</p>
                    <p><strong className="text-card-foreground/90">Trip Type:</strong> {(deal as SerpApiFlightOption).type || "N/A"}</p>
                    <p><strong className="text-card-foreground/90">Total Journey Duration:</strong> {formatDuration((deal as SerpApiFlightOption).total_duration)}</p>
                    <p><strong className="text-card-foreground/90">Overall Stops:</strong> {(deal as SerpApiFlightOption).derived_stops_description || "N/A"}</p>
                  </div>
                  {(deal as SerpApiFlightOption).flights && ((deal as SerpApiFlightOption).flights!.length > 0) && (
                    <div className="mt-4 space-y-1.5">
                       {(deal as SerpApiFlightOption).flights!.map((leg, index, arr) => {
                         const layoverAfterThisLeg = (deal as SerpApiFlightOption).layovers?.[index];
                         return (
                           <React.Fragment key={`leg-${index}`}>
                             <FlightLegDisplay leg={leg} isLast={index === arr.length - 1 && !layoverAfterThisLeg} />
                             {layoverAfterThisLeg && index < arr.length - 1 && <LayoverDisplay layover={layoverAfterThisLeg} />}
                           </React.Fragment>
                         );
                       })}
                    </div>
                  )}
                  {(deal as SerpApiFlightOption).carbon_emissions?.this_flight && (
                     <p className="text-xs text-muted-foreground italic border-t border-border/30 pt-2 mt-3">CO₂: {(deal as SerpApiFlightOption).carbon_emissions!.this_flight}kg</p>
                  )}
                </CardContent>
              </Card>
            )}

            {dealType === 'hotel' && (
              <Card className={cn(innerGlassEffectClasses, "border-primary/20")}>
                <CardHeader className="pb-3 pt-4">
                  <CardTitle className="text-lg font-semibold text-primary flex items-center">
                    <HotelIcon className="w-5 h-5 mr-2" /> Hotel Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <Tabs defaultValue="hotel-overview" className="w-full">
                    <TabsList className={cn("grid w-full grid-cols-2 sm:grid-cols-3 mb-4 glass-pane p-1", "border border-border/50")}>
                        <TabsTrigger value="hotel-overview" className="data-[state=active]:bg-primary/80 data-[state=active]:text-primary-foreground text-xs sm:text-sm">Overview</TabsTrigger>
                        <TabsTrigger value="hotel-gallery" disabled={!(deal as SerpApiHotelSuggestion).images || (deal as SerpApiHotelSuggestion).images!.length === 0} className="data-[state=active]:bg-primary/80 data-[state=active]:text-primary-foreground text-xs sm:text-sm">Gallery</TabsTrigger>
                        <TabsTrigger value="hotel-map" className="data-[state=active]:bg-primary/80 data-[state=active]:text-primary-foreground text-xs sm:text-sm">Location</TabsTrigger>
                    </TabsList>
                    <TabsContent value="hotel-overview" className={cn("p-4 rounded-md", innerGlassEffectClasses)}>
                        <div className="relative aspect-video w-full rounded-md overflow-hidden border border-border/30 group bg-muted/30 mb-3 shadow-md">
                        {(deal as SerpApiHotelSuggestion).thumbnail ? (
                            <NextImage src={(deal as SerpApiHotelSuggestion).thumbnail!} alt={(deal as SerpApiHotelSuggestion).name || "Hotel image"} fill className="object-cover group-hover:scale-105 transition-transform" data-ai-hint={(deal as SerpApiHotelSuggestion).name?.toLowerCase().split(" ").slice(0,2).join(" ")} />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center"><ImageOff className="w-10 h-10 text-muted-foreground"/></div>
                        )}
                        </div>
                        {(deal as SerpApiHotelSuggestion).type && <Badge variant="outline" className="text-xs capitalize bg-accent/10 text-accent border-accent/30 mb-1.5">{(deal as SerpApiHotelSuggestion).type}</Badge>}
                        {(deal as SerpApiHotelSuggestion).rating && <p className="text-sm flex items-center text-amber-400 mb-1.5"><Star className="w-4 h-4 mr-1 fill-amber-400" /> {(deal as SerpApiHotelSuggestion).rating!.toFixed(1)} / 5 ({(deal as SerpApiHotelSuggestion).reviews || 'N/A'} reviews)</p>}
                        <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{(deal as SerpApiHotelSuggestion).description || "Detailed description not available."}</p>
                        <Separator className="my-2.5"/>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div><strong className="text-card-foreground/90">Price:</strong> {(deal as SerpApiHotelSuggestion).price_details || ((deal as SerpApiHotelSuggestion).price_per_night ? `$${(deal as SerpApiHotelSuggestion).price_per_night!.toLocaleString()}/night` : "N/A")}</div>
                            {(deal as SerpApiHotelSuggestion).total_price && <div><strong className="text-card-foreground/90">Total:</strong> ${(deal as SerpApiHotelSuggestion).total_price!.toLocaleString()}</div>}
                        </div>
                        {(deal as SerpApiHotelSuggestion).amenities && (deal as SerpApiHotelSuggestion).amenities!.length > 0 && (
                        <div className="pt-2.5">
                            <h4 className="font-medium text-card-foreground/90 text-xs mb-1">Key Amenities:</h4>
                            <div className="flex flex-wrap gap-1.5">
                            {(deal as SerpApiHotelSuggestion).amenities!.map((amenity, idx) => <Badge key={idx} variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">{amenity}</Badge>)}
                            </div>
                        </div>
                        )}
                    </TabsContent>
                    <TabsContent value="hotel-gallery" className={cn("p-4 rounded-md", innerGlassEffectClasses)}>
                        {(deal as SerpApiHotelSuggestion).images && (deal as SerpApiHotelSuggestion).images!.length > 0 ? (
                            <Carousel className="w-full max-w-full" opts={{ align: "start", loop: (deal as SerpApiHotelSuggestion).images!.length > 1 }}>
                                <CarouselContent className="-ml-2">
                                {(deal as SerpApiHotelSuggestion).images!.map((img, idx) => (
                                    <CarouselItem key={idx} className="pl-2 md:basis-1/2 lg:basis-1/3">
                                    <div className="relative aspect-square w-full rounded-md overflow-hidden border border-border/30 bg-muted/30 shadow-sm">
                                        {img.thumbnail ? (
                                        <NextImage src={img.thumbnail} alt={`Hotel image ${idx + 1}`} fill className="object-cover" sizes="(max-width: 768px) 45vw, 200px" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center"><ImageOff className="w-8 h-8 text-muted-foreground"/></div>
                                        )}
                                    </div>
                                    </CarouselItem>
                                ))}
                                </CarouselContent>
                                {(deal as SerpApiHotelSuggestion).images!.length > 1 && <CarouselPrevious className="ml-12 text-foreground bg-background/70 hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-accent" />}
                                {(deal as SerpApiHotelSuggestion).images!.length > 1 && <CarouselNext className="mr-12 text-foreground bg-background/70 hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-accent" />}
                            </Carousel>
                        ) : (
                            <p className="text-muted-foreground text-center py-4">No additional images available for this hotel.</p>
                        )}
                    </TabsContent>
                    <TabsContent value="hotel-map" className={cn("p-4 rounded-md", innerGlassEffectClasses)}>
                         {mapsApiKey && ((deal as SerpApiHotelSuggestion).coordinates?.latitude || (deal as SerpApiHotelSuggestion).name) ? (
                            <div className="aspect-video w-full rounded-lg overflow-hidden border border-border/50 shadow-lg">
                            <iframe
                                width="100%"
                                height="100%"
                                style={{ border: 0 }}
                                loading="lazy"
                                allowFullScreen
                                referrerPolicy="no-referrer-when-downgrade"
                                src={mapEmbedUrl}
                                title={`Map of ${(deal as SerpApiHotelSuggestion).name}`}
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
            )}
          </div>
        </ScrollArea>

        <DialogFooter className={cn("p-4 sm:p-6 border-t border-border/30 shrink-0", "glass-pane")}>
          <Button asChild size="lg" className={cn(prominentButtonClasses, "w-full")}>
            <a href={bookingLink || googleSearchUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2"/> {bookingLink ? `View Deal on ${bookingSiteName}` : "Search on Google"}
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
