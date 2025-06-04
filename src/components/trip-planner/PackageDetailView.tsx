
"use client";

import React, { useState, useEffect, useRef } from 'react';
import NextImage from 'next/image';
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import type { TripPackageSuggestion, ConceptualDailyPlanItem, SerpApiFlightLeg, SerpApiLayover, ActivitySuggestion } from "@/lib/types";
import { Plane, Hotel as HotelIcon, CalendarDays, DollarSign, Info, MapPin, ExternalLink, ImageOff, Clock, CheckSquare, Route, Briefcase, Star, Sparkles, Ticket, Users, Building, Palette, Utensils, Mountain, FerrisWheel, ListChecks, Loader2, LucideMap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getIataCodeAction } from '@/app/actions'; // For identifying destination airport

const innerGlassEffectClasses = "bg-card/80 dark:bg-card/50 backdrop-blur-md border border-white/10 dark:border-[hsl(var(--primary)/0.1)] rounded-lg";

interface PackageDetailViewProps {
  tripPackage: TripPackageSuggestion;
}

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

function ActivityDisplayCard({ activity }: { activity: ActivitySuggestion }) {
  const imageHint = activity.imageUri?.startsWith('https://placehold.co')
    ? (activity.imagePrompt || activity.name.toLowerCase().split(" ").slice(0, 2).join(" "))
    : undefined;
  return (
    <div className={cn("p-3 rounded-lg mb-3 border border-border/40", innerGlassEffectClasses)}>
      {activity.imageUri && (
         <div className="relative aspect-video w-full rounded-md overflow-hidden mb-2 border border-border/30 shadow-sm">
            <NextImage src={activity.imageUri} alt={activity.name} fill className="object-cover" data-ai-hint={imageHint} />
         </div>
      )}
      <h5 className="font-semibold text-sm text-card-foreground mb-1 flex items-center">
        <LucideMap className="w-4 h-4 mr-2 text-accent" /> {activity.name}
      </h5>
      <Badge variant="outline" className="text-xs capitalize bg-accent/10 text-accent border-accent/30 mb-1">{activity.category}</Badge>
      <p className="text-xs text-muted-foreground leading-relaxed">{activity.description}</p>
      {activity.estimatedPrice && <p className="text-xs font-medium text-primary mt-1">Est. Price: {activity.estimatedPrice}</p>}
    </div>
  );
}

export function PackageDetailView({ tripPackage }: PackageDetailViewProps) {
  const mapRef = useRef<HTMLIFrameElement>(null);
  const [resolvedDestinationIata, setResolvedDestinationIata] = useState<string | null>(null);
  const [resolvedOriginIata, setResolvedOriginIata] = useState<string | null>(null);
  const [isLoadingIata, setIsLoadingIata] = useState(false);

  const [outboundLegs, setOutboundLegs] = useState<SerpApiFlightLeg[]>([]);
  const [returnLegs, setReturnLegs] = useState<SerpApiFlightLeg[]>([]);
  const [isRoundTripSuccessfullySplit, setIsRoundTripSuccessfullySplit] = useState(false);

  useEffect(() => {
    async function fetchAndProcessFlightData() {
      if (tripPackage) {
        setIsLoadingIata(true);
        let destIata: string | null = null;
        let origIata: string | null = null;
        try {
          console.log(`[PackageDetailView] Fetching IATA for destination: ${tripPackage.destinationQuery}`);
          destIata = await getIataCodeAction(tripPackage.destinationQuery);
          setResolvedDestinationIata(destIata);
          console.log(`[PackageDetailView] Resolved destination IATA: ${destIata}`);
          if (tripPackage.userInput.origin) {
            console.log(`[PackageDetailView] Fetching IATA for origin: ${tripPackage.userInput.origin}`);
            origIata = await getIataCodeAction(tripPackage.userInput.origin);
            setResolvedOriginIata(origIata);
             console.log(`[PackageDetailView] Resolved origin IATA: ${origIata}`);
          } else {
            setResolvedOriginIata(null);
          }
        } catch (error) {
          console.error("Error fetching IATA codes for PackageDetailView:", error);
        } finally {
          setIsLoadingIata(false);
        }

        const allFlightLegs = tripPackage.flight.flights || [];
        let tempOutboundLegs: SerpApiFlightLeg[] = [];
        let tempReturnLegs: SerpApiFlightLeg[] = [];
        let tempIsSplitSuccess = false;

        console.log(`[PackageDetailView] Processing ${allFlightLegs.length} flight legs. Destination IATA: ${destIata}, Origin IATA: ${origIata}`);

        if (tripPackage.flight.type?.toLowerCase() === 'round trip' && allFlightLegs.length > 1 && destIata) {
          let turnaroundIndex = -1;
          for (let i = 0; i < allFlightLegs.length - 1; i++) {
            const currentLeg = allFlightLegs[i];
            const nextLeg = allFlightLegs[i + 1];
            
            const currentLegArrivalId = currentLeg.arrival_airport?.id?.toUpperCase();
            const destIataUpper = destIata.toUpperCase();
            const nextLegDepartureId = nextLeg.departure_airport?.id?.toUpperCase();

            console.log(`[PackageDetailView] Leg ${i}: ${currentLeg.departure_airport?.id} -> ${currentLegArrivalId}. Next leg: ${nextLegDepartureId} -> ${nextLeg.arrival_airport?.id}`);
            
            const currentLegArrivalMatchesDest = currentLegArrivalId === destIataUpper;
            const nextLegDepartureMatchesDest = nextLegDepartureId === destIataUpper;

            if (currentLegArrivalMatchesDest && nextLegDepartureMatchesDest) {
              if (origIata && tripPackage.userInput.origin) {
                const finalArrivalLeg = allFlightLegs[allFlightLegs.length - 1];
                const finalArrivalId = finalArrivalLeg.arrival_airport?.id?.toUpperCase();
                const origIataUpper = origIata.toUpperCase();
                if (finalArrivalId === origIataUpper) {
                  turnaroundIndex = i;
                  console.log(`[PackageDetailView] Turnaround confirmed at index ${i} (matches origin ${origIataUpper}).`);
                  break;
                } else {
                  console.log(`[PackageDetailView] Potential turnaround at index ${i}, but final arrival ${finalArrivalId} doesn't match origin ${origIataUpper}.`);
                }
              } else { 
                turnaroundIndex = i;
                console.log(`[PackageDetailView] Turnaround assumed at index ${i} (no origin IATA to verify).`);
                break;
              }
            }
          }

          if (turnaroundIndex !== -1) {
            tempOutboundLegs = allFlightLegs.slice(0, turnaroundIndex + 1);
            tempReturnLegs = allFlightLegs.slice(turnaroundIndex + 1);
            if (tempReturnLegs.length > 0) {
              tempIsSplitSuccess = true;
              console.log(`[PackageDetailView] Split successful: ${tempOutboundLegs.length} outbound, ${tempReturnLegs.length} return.`);
            } else {
              tempOutboundLegs = [...allFlightLegs]; tempReturnLegs = [];
              console.log(`[PackageDetailView] Split resulted in empty return, showing all as outbound. Total: ${tempOutboundLegs.length}`);
            }
          } else {
            tempOutboundLegs = [...allFlightLegs];
             console.log(`[PackageDetailView] No clear turnaround found based on IATA codes. Showing all ${tempOutboundLegs.length} legs as one segment.`);
          }
        } else {
          tempOutboundLegs = [...allFlightLegs];
           console.log(`[PackageDetailView] Not a round trip or not enough legs/IATA for split. Showing all ${tempOutboundLegs.length} as one segment.`);
        }
        setOutboundLegs(tempOutboundLegs);
        setReturnLegs(tempReturnLegs);
        setIsRoundTripSuccessfullySplit(tempIsSplitSuccess);
      }
    }
    fetchAndProcessFlightData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripPackage]);

  const { flight, hotel, totalEstimatedCost, durationDays, destinationQuery, userInput, destinationImageUri, suggestedActivities } = tripPackage;
  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  const hotelMapQuery = hotel.coordinates?.latitude && hotel.coordinates?.longitude
    ? `${hotel.coordinates.latitude},${hotel.coordinates.longitude}`
    : encodeURIComponent(`${hotel.name}, ${destinationQuery}`);
  
  const hotelMapEmbedUrl = mapsApiKey
    ? `https://www.google.com/maps/embed/v1/place?key=${mapsApiKey}&q=${hotelMapQuery}&zoom=14`
    : "";
  
  const hotelMainImageHint = hotel.thumbnail ? hotel.name?.toLowerCase().split(" ").slice(0,2).join(" ") : "hotel exterior";
  
  const conceptualDailyPlan: ConceptualDailyPlanItem[] = Array.from({ length: Math.max(1, Math.min(durationDays || 3, 7)) }, (_, i) => {
    if (i === 0) return { day: "Day 1", activities: `Arrive in ${destinationQuery}, check into ${hotel.name || 'your accommodation'}, and explore the immediate local area. Enjoy a welcome dinner.` };
    if (i === Math.max(1, durationDays || 3) - 1 && durationDays > 1) return { day: `Day ${durationDays || 3}`, activities: "Enjoy a final breakfast, any last-minute souvenir shopping or a quick visit to a favorite spot, then prepare for departure." };
    if (durationDays === 1 && i === 0) return {day: "Day 1", activities: `Arrive in ${destinationQuery}, check into ${hotel.name || 'your accommodation'}, focus on key experiences, and prepare for departure.`};
    return { day: `Day ${i + 1}`, activities: `Explore key attractions, cultural experiences, and culinary delights specific to ${destinationQuery}. (Detailed activities will be AI-generated upon full planning).` };
  });

  return (
    <div className="space-y-6"> 
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
            <Plane className="w-5 h-5 mr-2" /> Full Flight Journey Details
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          <div className="flex items-center gap-3 mb-2">
            {flight.airline_logo ? (
              <NextImage src={flight.airline_logo} alt={flight.airline || "Airline"} width={70} height={26.25} className="object-contain rounded-sm bg-muted/20 p-0.5" data-ai-hint={flight.airline?.toLowerCase()}/>
            ) : (
              <Plane className="w-6 h-6 text-primary" />
            )}
            <div>
              <p className="font-medium text-card-foreground text-base">{flight.airline || "Selected Airline"} {flight.derived_flight_numbers}</p>
            </div>
          </div>
          <Separator/>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <p><strong className="text-card-foreground/90">Total Price:</strong> ${flight.price?.toLocaleString()}</p>
            <p><strong className="text-card-foreground/90">Trip Type:</strong> {flight.type || "N/A"}</p>
            <p><strong className="text-card-foreground/90">Total Journey Duration:</strong> {formatDuration(flight.total_duration)}</p>
            <p><strong className="text-card-foreground/90">Overall Stops:</strong> {flight.derived_stops_description || "N/A"}</p>
          </div>
          
          {isLoadingIata ? (
              <div className="text-center py-4 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin inline mr-2"/>Resolving airport details for leg separation...</div>
          ) : (
              <div className="mt-4 space-y-1.5">
                  {outboundLegs.length > 0 && (
                      <>
                          <p className="text-xs font-medium text-primary/80 uppercase tracking-wider mt-2 mb-1">Outbound Journey</p>
                          {outboundLegs.map((leg, index) => {
                              const legOriginalIndexInAll = (flight.flights || []).indexOf(leg);
                              const nextLegIsOutbound = index < outboundLegs.length - 1;
                              const layoverAfterThisLeg = flight.layovers?.find((_, lIdx) => lIdx === legOriginalIndexInAll);
                              return (
                              <React.Fragment key={`out-leg-${index}`}>
                                  <FlightLegDisplay leg={leg} isLast={!nextLegIsOutbound && !layoverAfterThisLeg} />
                                  {layoverAfterThisLeg && nextLegIsOutbound && (
                                      <LayoverDisplay layover={layoverAfterThisLeg} />
                                  )}
                                  {nextLegIsOutbound && !layoverAfterThisLeg && (
                                  <div className="flex items-center my-2">
                                      <Separator className="flex-grow border-border/40" />
                                      <Route className="w-3.5 h-3.5 mx-2.5 text-muted-foreground/70" />
                                      <Separator className="flex-grow border-border/40" />
                                  </div>
                                  )}
                              </React.Fragment>
                              );
                          })}
                      </>
                  )}
                  {returnLegs.length > 0 && isRoundTripSuccessfullySplit && (
                       <>
                          <p className="text-xs font-medium text-primary/80 uppercase tracking-wider mt-3 mb-1">Return Journey</p>
                          {returnLegs.map((leg, index) => {
                              const legOriginalIndexInAll = (flight.flights || []).indexOf(leg);
                              const nextLegIsReturn = index < returnLegs.length - 1;
                              const layoverAfterThisLeg = flight.layovers?.find((_, lIdx) => lIdx === legOriginalIndexInAll);
                              return (
                              <React.Fragment key={`ret-leg-${index}`}>
                                  <FlightLegDisplay leg={leg} isLast={!nextLegIsReturn && !layoverAfterThisLeg}/>
                                   {layoverAfterThisLeg && nextLegIsReturn && (
                                      <LayoverDisplay layover={layoverAfterThisLeg} />
                                  )}
                                  {nextLegIsReturn && !layoverAfterThisLeg && (
                                  <div className="flex items-center my-2">
                                      <Separator className="flex-grow border-border/40" />
                                      <Route className="w-3.5 h-3.5 mx-2.5 text-muted-foreground/70" />
                                      <Separator className="flex-grow border-border/40" />
                                  </div>
                                  )}
                              </React.Fragment>
                              );
                          })}
                      </>
                  )}
                   {(!isRoundTripSuccessfullySplit && flight.type?.toLowerCase() === 'round trip' && outboundLegs.length > 0) && (
                       <p className="text-xs text-muted-foreground italic mt-2">All available flight segments are shown. Return details could not be automatically separated with current info or this may be an open-jaw trip.</p>
                   )}
                   {outboundLegs.length === 0 && returnLegs.length === 0 && (
                     <p className="text-xs text-muted-foreground italic mt-3">No detailed flight leg information available for this option.</p>
                   )}
              </div>
          )}

          {flight.link && (
            <Button variant="outline" size="sm" asChild className="w-full sm:w-auto glass-interactive border-primary/40 text-primary hover:bg-primary/10 mt-3.5">
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
              <TabsContent value="overview" className={cn("p-4 rounded-md", innerGlassEffectClasses)}>
                    <div className="relative aspect-video w-full rounded-md overflow-hidden border border-border/30 group bg-muted/30 mb-3 shadow-md">
                    {hotel.thumbnail ? (
                        <NextImage src={hotel.thumbnail} alt={hotel.name || "Hotel image"} fill className="object-cover group-hover:scale-105 transition-transform" data-ai-hint={hotelMainImageHint} sizes="(max-width: 768px) 90vw, 400px" />
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
              <TabsContent value="gallery" className={cn("p-4 rounded-md", innerGlassEffectClasses)}>
                   {hotel.images && hotel.images.length > 0 ? (
                      <Carousel className="w-full max-w-full" opts={{ align: "start", loop: hotel.images.length > 1 }}>
                          <CarouselContent className="-ml-2">
                          {hotel.images.map((img, idx) => (
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
                          {hotel.images.length > (1) && <CarouselPrevious className="ml-12 text-foreground bg-background/70 hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-accent" />}
                          {hotel.images.length > (1) && <CarouselNext className="mr-12 text-foreground bg-background/70 hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-accent" />}
                      </Carousel>
                  ) : (
                      <p className="text-muted-foreground text-center py-4">No additional images available for this hotel.</p>
                  )}
              </TabsContent>
              <TabsContent value="map" className={cn("p-4 rounded-md", innerGlassEffectClasses)}>
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
            <ListChecks className="w-5 h-5 mr-2" /> 
            {suggestedActivities && suggestedActivities.length > 0 ? "Suggested Activities" : "Conceptual Daily Activities Outline"}
          </CardTitle>
           <CardDescription className="text-xs text-muted-foreground">
            {suggestedActivities && suggestedActivities.length > 0 
              ? "Here are some AI-suggested activities for your trip:" 
              : "This is a high-level conceptual outline. A detailed, personalized day-by-day plan will be generated by Aura AI if you proceed to \"Plan This Package\"."
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-1.5">
          <div className="space-y-3 relative pl-2">
            {suggestedActivities && suggestedActivities.length > 0 ? (
                suggestedActivities.map((activity, index) => (
                    <ActivityDisplayCard key={`activity-${index}`} activity={activity} />
                ))
            ) : (
              conceptualDailyPlan.map((item, index) => (
                <ConceptualDailyPlanDisplay key={`conceptual-day-${index}`} planItem={item} isLast={index === conceptualDailyPlan.length - 1} />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
