"use client";

import React, { useState, useEffect, useRef } from 'react';
import NextImage from 'next/image'; // Aliased import
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"; // Added CardDescription
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import type { TripPackageSuggestion, ConceptualDailyPlanItem, SerpApiFlightLeg, SerpApiLayover, ActivitySuggestion } from "@/lib/types"; // Added ActivitySuggestion
import { X, Plane, Hotel as HotelIcon, CalendarDays, DollarSign, Info, MapPin, ExternalLink, ImageOff, Clock, CheckSquare, Route, Briefcase, Star, Sparkles, Ticket, Users, Building, Palette, Utensils, Mountain, FerrisWheel, ListChecks, Loader2, Eye, Map as LucideMap, Compass as CompassIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAddSavedPackage } from '@/lib/firestoreHooks';
import { useAuth } from '@/contexts/AuthContext';
import { getIataCodeAction, getLocalInsiderTips } from '@/app/actions';
import type { LocalInsiderTipsOutput } from '@/ai/flows/local-insider-tips-flow';
import { LocalInsiderTipsDisplay } from '@/components/common/LocalInsiderTipsDisplay';
import { useToast } from '@/hooks/use-toast';


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


export function CombinedTripDetailDialog({ isOpen, onClose, tripPackage, onInitiateBooking }: CombinedTripDetailDialogProps) {
  const mapRef = useRef<HTMLIFrameElement>(null);
  const addSavedPackageMutation = useAddSavedPackage();
  const { currentUser } = useAuth();
  const [resolvedDestinationIata, setResolvedDestinationIata] = useState<string | null>(null);
  const [resolvedOriginIata, setResolvedOriginIata] = useState<string | null>(null);
  const [isLoadingIata, setIsLoadingIata] = useState(false);

  const [outboundLegs, setOutboundLegs] = useState<SerpApiFlightLeg[]>([]);
  const [returnLegs, setReturnLegs] = useState<SerpApiFlightLeg[]>([]);
  const [isRoundTripSuccessfullySplit, setIsRoundTripSuccessfullySplit] = useState(false);
  
  const [localTips, setLocalTips] = useState<LocalInsiderTipsOutput | null>(null);
  const [isLoadingTips, setIsLoadingTips] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchDetails() {
      if (isOpen && tripPackage) {
        setIsLoadingIata(true);
        setIsLoadingTips(true);
        setLocalTips(null);

        let destIata: string | null = null;
        let origIata: string | null = null;
        try {
          destIata = await getIataCodeAction(tripPackage.destinationQuery);
          setResolvedDestinationIata(destIata);
          if (tripPackage.userInput.origin) {
            origIata = await getIataCodeAction(tripPackage.userInput.origin);
            setResolvedOriginIata(origIata);
          } else {
            setResolvedOriginIata(null);
          }
        } catch (error) {
          console.error("Error fetching IATA codes for dialog:", error);
        } finally {
          setIsLoadingIata(false);
        }

        const allFlightLegs = tripPackage.flight.flights || [];
        let tempOutboundLegs: SerpApiFlightLeg[] = [];
        let tempReturnLegs: SerpApiFlightLeg[] = [];
        let tempIsSplitSuccess = false;

        if (tripPackage.flight.type?.toLowerCase() === 'round trip' && allFlightLegs.length > 1 && destIata) {
          let turnaroundIndex = -1;
          for (let i = 0; i < allFlightLegs.length - 1; i++) {
            const currentLeg = allFlightLegs[i];
            const nextLeg = allFlightLegs[i + 1];
            const currentLegArrivalId = currentLeg.arrival_airport?.id?.toUpperCase();
            const destIataUpper = destIata.toUpperCase();
            const nextLegDepartureId = nextLeg.departure_airport?.id?.toUpperCase();
            
            const currentLegArrivalMatchesDest = currentLegArrivalId === destIataUpper;
            const nextLegDepartureMatchesDest = nextLegDepartureId === destIataUpper;
            
            if (currentLegArrivalMatchesDest && nextLegDepartureMatchesDest) {
              if (origIata && tripPackage.userInput.origin) {
                const finalArrivalLeg = allFlightLegs[allFlightLegs.length - 1];
                const finalArrivalId = finalArrivalLeg.arrival_airport?.id?.toUpperCase();
                const origIataUpper = origIata.toUpperCase();
                if (finalArrivalId === origIataUpper) {
                  turnaroundIndex = i; break;
                }
              } else { turnaroundIndex = i; break; }
            }
          }

          if (turnaroundIndex !== -1) {
            tempOutboundLegs = allFlightLegs.slice(0, turnaroundIndex + 1);
            tempReturnLegs = allFlightLegs.slice(turnaroundIndex + 1);
            if (tempReturnLegs.length > 0) tempIsSplitSuccess = true;
            else { tempOutboundLegs = [...allFlightLegs]; tempReturnLegs = []; }
          } else { tempOutboundLegs = [...allFlightLegs]; }
        } else { tempOutboundLegs = [...allFlightLegs]; }
        setOutboundLegs(tempOutboundLegs);
        setReturnLegs(tempReturnLegs);
        setIsRoundTripSuccessfullySplit(tempIsSplitSuccess);

        try {
          const tipsResult = await getLocalInsiderTips({ destination: tripPackage.destinationQuery });
          setLocalTips(tipsResult);
        } catch (tipError) {
          console.error("Error fetching local insider tips:", tipError);
          toast({ title: "Local Tips Error", description: "Could not load local insider tips.", variant: "destructive" });
        } finally {
          setIsLoadingTips(false);
        }
      }
    }
    fetchDetails();
  }, [tripPackage, isOpen, toast]);
  
  if (!tripPackage) return null;

  const { flight, hotel, totalEstimatedCost, durationDays, destinationQuery, travelDatesQuery, userInput, destinationImageUri, suggestedActivities } = tripPackage;
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
      toast({ title: "Login Required", description: "Please log in to save packages.", variant: "destructive" });
      return;
    }
    const packageToSave: TripPackageSuggestion = { ...tripPackage, userId: currentUser.uid, createdAt: new Date().toISOString() };
    try {
      await addSavedPackageMutation.mutateAsync(packageToSave);
      toast({ title: "Package Saved!", description: `Package to ${tripPackage.destinationQuery} saved successfully.` });
    } catch (error: any) {
      toast({ title: "Save Error", description: "Failed to save package. " + error.message, variant: "destructive"});
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
                {destinationImageUri ? (
                    <div className="relative w-8 h-8 mr-2.5 shrink-0 rounded-md overflow-hidden border border-border/20">
                         <NextImage src={destinationImageUri} alt="" fill className="object-cover" />
                    </div>
                ) : (
                    <Ticket className="w-6 h-6 mr-2 text-primary" />
                )}
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
          <ScrollBar />
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
            
            <Tabs defaultValue="flight-hotel" className="w-full">
              <TabsList className={cn("grid w-full grid-cols-2 sm:grid-cols-4 mb-4 glass-pane p-1", "border border-border/50")}>
                <TabsTrigger value="flight-hotel" className="data-[state=active]:bg-primary/80 data-[state=active]:text-primary-foreground text-xs sm:text-sm">Flight & Hotel</TabsTrigger>
                <TabsTrigger value="activities" className="data-[state=active]:bg-primary/80 data-[state=active]:text-primary-foreground text-xs sm:text-sm">Activities</TabsTrigger>
                <TabsTrigger value="daily-plan" className="data-[state=active]:bg-primary/80 data-[state=active]:text-primary-foreground text-xs sm:text-sm">Daily Plan</TabsTrigger>
                <TabsTrigger value="local-insights" className="data-[state=active]:bg-primary/80 data-[state=active]:text-primary-foreground text-xs sm:text-sm">Local Insights</TabsTrigger>
              </TabsList>

              <TabsContent value="flight-hotel">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                         <Tabs defaultValue="hotel-overview" className="w-full">
                            <TabsList className={cn("grid w-full grid-cols-2 sm:grid-cols-3 mb-4 glass-pane p-1", "border border-border/50")}>
                                <TabsTrigger value="hotel-overview" className="data-[state=active]:bg-primary/80 data-[state=active]:text-primary-foreground text-xs sm:text-sm">Overview</TabsTrigger>
                                <TabsTrigger value="hotel-gallery" disabled={!hotel.images || hotel.images.length === 0} className="data-[state=active]:bg-primary/80 data-[state=active]:text-primary-foreground text-xs sm:text-sm">Gallery</TabsTrigger>
                                <TabsTrigger value="hotel-map" className="data-[state=active]:bg-primary/80 data-[state=active]:text-primary-foreground text-xs sm:text-sm">Location</TabsTrigger>
                            </TabsList>
                            <TabsContent value="hotel-overview" className={cn("p-4 rounded-md", innerGlassEffectClasses)}>
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
                            <TabsContent value="hotel-gallery" className={cn("p-4 rounded-md", innerGlassEffectClasses)}>
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
                            <TabsContent value="hotel-map" className={cn("p-4 rounded-md", innerGlassEffectClasses)}>
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
                </div>
              </TabsContent>

              <TabsContent value="activities">
                <Card className={cn(innerGlassEffectClasses, "border-primary/20")}>
                  <CardHeader className="pb-3 pt-4">
                    <CardTitle className="text-lg font-semibold text-primary flex items-center">
                      <LucideMap className="w-5 h-5 mr-2" /> Suggested Activities & Things to Do
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      AI-powered activity suggestions to enrich your trip to {destinationQuery}.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm space-y-3">
                    {suggestedActivities && suggestedActivities.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {suggestedActivities.map((activity, index) => (
                          <ActivityDisplayCard key={`activity-${index}`} activity={activity} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No specific activities were bundled with this package. Explore on your own or let Aura AI suggest some during full planning!</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="daily-plan">
                <Card className={cn(innerGlassEffectClasses, "border-primary/20")}>
                  <CardHeader className="pb-3 pt-4">
                    <CardTitle className="text-lg font-semibold text-primary flex items-center">
                      <ListChecks className="w-5 h-5 mr-2" /> Conceptual Daily Plan
                    </CardTitle>
                     <CardDescription className="text-xs text-muted-foreground">
                      A high-level outline. A detailed plan will be generated by Aura AI if you proceed.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1.5">
                    <div className="space-y-3 relative pl-2">
                      {conceptualDailyPlan.map((item, index) => (
                        <ConceptualDailyPlanDisplay key={`conceptual-day-${index}`} planItem={item} isLast={index === conceptualDailyPlan.length - 1} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="local-insights">
                {isLoadingTips && (
                  <div className="flex flex-col items-center justify-center text-center py-10 text-muted-foreground">
                    <Loader2 className="w-8 h-8 animate-spin mb-3 text-accent" />
                    <p>Fetching Local Insider Tips for {destinationQuery}...</p>
                  </div>
                )}
                {!isLoadingTips && localTips && (
                  <LocalInsiderTipsDisplay tipsData={localTips} destinationName={destinationQuery} />
                )}
                {!isLoadingTips && !localTips && (
                  <Card className={cn(innerGlassEffectClasses, "p-6 text-center text-muted-foreground")}>
                    <CompassIcon className="w-10 h-10 mx-auto mb-2 opacity-70" />
                    Could not load local insider tips for {destinationQuery} at this moment.
                  </Card>
                )}
              </TabsContent>

            </Tabs>
          </div>
        </ScrollArea>

        <DialogFooter className={cn("p-4 sm:p-6 border-t border-border/30 shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center", glassPaneClasses)}>
          <Button
            onClick={handleSavePackage}
            variant="outline"
            size="lg" 
            className="w-full glass-interactive border-accent/50 text-accent hover:bg-accent/10"
            disabled={addSavedPackageMutation.isPending || !currentUser}
          >
            {addSavedPackageMutation.isPending ? <Loader2 className="mr-2 animate-spin" /> : <Briefcase className="mr-2" />}
            {addSavedPackageMutation.isPending ? "Saving..." : (currentUser ? "Save This Package" : "Log in to Save")}
          </Button>
          <Button onClick={() => onInitiateBooking(tripPackage.destinationQuery, tripPackage.travelDatesQuery)} size="lg" className={cn("w-full", prominentButtonClasses)}>
            <Ticket className="mr-2" /> Plan This Package with AI
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
