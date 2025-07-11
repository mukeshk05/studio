
"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Itinerary, HotelOption, DailyPlanItem } from "@/lib/types";
import { CalendarDays, DollarSign, Info, Landmark, Trash2, Plane, Hotel, ImageOff, ListChecks, Route, Loader2, Eye, CloudSun, MessageSquareQuote, Leaf, Briefcase, Lightbulb, ScanEye, Users, BookOpenText, RefreshCw, Zap } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogClose,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { getPackingList, PackingListInput, PackingListOutput } from "@/ai/flows/packing-list-flow";
import { getDestinationFact, DestinationFactInput, DestinationFactOutput } from "@/ai/flows/destination-fact-flow";
import { generateTripMemory, GenerateTripMemoryInput, GenerateTripMemoryOutput } from "@/ai/flows/generate-trip-memory-flow";
import { cn } from "@/lib/utils";
import { GroupSyncDialog } from "./GroupSyncDialog";
import { TripTimelineDialog } from "./TripTimelineDialog"; // Added import
import { useUpdateSavedTripMemory } from "@/lib/firestoreHooks"; 
import { formatDistanceToNow } from 'date-fns';


type BookingCardProps = {
  booking: Itinerary;
  onRemoveBooking: (bookingId: string) => void;
  isRemoving?: boolean;
  isAuthLoading?: boolean;
};


function SavedHotelOptionDisplay({ hotel }: { hotel: HotelOption }) {
  const hintWords = hotel.name.toLowerCase().split(/[\s,]+/);
  const aiHint = hintWords.slice(0, 2).join(" ");

  return (
    <div className="p-1.5 rounded-md border border-border/50 bg-card/50 flex gap-2">
      <div className="relative w-16 h-16 shrink-0 rounded-sm overflow-hidden border border-border/30">
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
          <div className="w-full h-full bg-muted/50 flex items-center justify-center">
            <ImageOff className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
      </div>
      <div>
        <p className="font-semibold text-xs text-card-foreground">{hotel.name} - ${hotel.price.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground line-clamp-2">{hotel.description}</p>
      </div>
    </div>
  );
}

function SavedDailyPlanDisplay({ planItem }: { planItem: DailyPlanItem }) {
  return (
    <div className="p-2 rounded-md border border-border/50 bg-card/50 mb-1.5">
      <h5 className="font-semibold text-xs text-card-foreground mb-0.5 flex items-center">
        <Route className="w-3 h-3 mr-1.5 shrink-0 text-primary" />
        {planItem.day}
      </h5>
      <p className="text-xs text-muted-foreground whitespace-pre-line pl-5">{planItem.activities}</p>
    </div>
  );
}
const glassEffectClasses = "glass-card";

export function BookingCard({ booking, onRemoveBooking, isRemoving, isAuthLoading }: BookingCardProps) {
  const { toast } = useToast();
  const [isPackingListDialogOpen, setIsPackingListDialogOpen] = useState(false);
  const [isFactDialogOpen, setIsFactDialogOpen] = useState(false);
  const [isArVrDialogOpen, setIsArVrDialogOpen] = useState(false);
  const [isGroupSyncDialogOpen, setIsGroupSyncDialogOpen] = useState(false);
  const [isMemoryDialogOpen, setIsMemoryDialogOpen] = useState(false);
  const [isTimelineDialogOpen, setIsTimelineDialogOpen] = useState(false); // New state for timeline dialog

  const [packingList, setPackingList] = useState<string[] | null>(null);
  const [destinationFact, setDestinationFact] = useState<string | null>(null);
  const [currentTripMemory, setCurrentTripMemory] = useState<{text: string, generatedAt?: string} | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  const updateSavedTripMemoryMutation = useUpdateSavedTripMemory();

  const hintWords = booking.destination.toLowerCase().split(/[\s,]+/);
  const aiHint = hintWords.slice(0, 2).join(" ");
  const panoramicAiHint = `panoramic view ${aiHint}`;

  const formatDailyPlanForAI = (dailyPlan: Itinerary['dailyPlan']): string => {
    if (!dailyPlan || dailyPlan.length === 0) return "No detailed daily plan available for this trip.";
    return dailyPlan.map(day => `${day.day}: ${day.activities.substring(0, 150)}...`).join('\\n');
  };

  const handleFetchPackingList = async () => {
    setIsLoadingAI(true);
    setPackingList(null);
    try {
      const duration = booking.dailyPlan && booking.dailyPlan.length > 0
        ? `${booking.dailyPlan.length} day${booking.dailyPlan.length !== 1 ? 's' : ''}`
        : "a few days";

      const input: PackingListInput = {
        destination: booking.destination,
        travelDates: booking.travelDates,
        tripDuration: duration,
        weatherContext: booking.weatherContext, // Pass along if available
      };
      const result: PackingListOutput = await getPackingList(input);
      setPackingList(result.packingList);
    } catch (error) {
      console.error("Error fetching packing list:", error);
      toast({ title: "Error", description: "Could not fetch packing list.", variant: "destructive" });
      setPackingList(["Failed to load packing list."]);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleFetchFunFact = async () => {
    setIsLoadingAI(true);
    setDestinationFact(null);
    try {
      const input: DestinationFactInput = { destination: booking.destination };
      const result: DestinationFactOutput = await getDestinationFact(input);
      setDestinationFact(result.fact);
    } catch (error) {
      console.error("Error fetching fun fact:", error);
      toast({ title: "Error", description: "Could not fetch fun fact.", variant: "destructive" });
      setDestinationFact("Failed to load fun fact.");
    } finally {
      setIsLoadingAI(false);
    }
  };

  const triggerMemoryGeneration = async () => {
    setIsLoadingAI(true);
    setCurrentTripMemory(null); 
    try {
      const input: GenerateTripMemoryInput = {
        destination: booking.destination,
        travelDates: booking.travelDates,
        tripSummary: booking.tripSummary || undefined,
        dailyPlanActivities: formatDailyPlanForAI(booking.dailyPlan),
      };
      const result: GenerateTripMemoryOutput = await generateTripMemory(input);
      const newMemory = {
        memoryText: result.memoryText,
        generatedAt: new Date().toISOString(),
      };
      setCurrentTripMemory({text: newMemory.memoryText, generatedAt: newMemory.generatedAt});
      await updateSavedTripMemoryMutation.mutateAsync({ tripId: booking.id, memory: newMemory });
      toast({ title: "Trip Memory Updated!", description: "A new memory snippet has been generated and saved."});
    } catch (error) {
      console.error("Error generating trip memory:", error);
      toast({ title: "Error", description: "Could not generate trip memory.", variant: "destructive" });
      setCurrentTripMemory({text: "Failed to generate a memory for this trip."});
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleOpenMemoryDialog = () => {
    if (booking.aiGeneratedMemory?.memoryText) {
      setCurrentTripMemory({text: booking.aiGeneratedMemory.memoryText, generatedAt: booking.aiGeneratedMemory.generatedAt});
    } else {
      setCurrentTripMemory(null); 
      triggerMemoryGeneration(); 
    }
    setIsMemoryDialogOpen(true);
  };


  return (
    <>
    <Card className={cn(glassEffectClasses, "flex flex-col overflow-hidden border-primary/20")}>
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
           <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
            <Badge variant="secondary" className="text-md py-1 px-2 text-white bg-black/60 border-black/30 backdrop-blur-sm">
                <DollarSign className="w-3 h-3 mr-1" />
                {booking.estimatedCost.toLocaleString()}
            </Badge>
          </div>
        </div>
      )}
      <CardHeader className="pt-3 pb-2">
         <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center text-lg text-card-foreground">
              <Landmark className="w-5 h-5 mr-2 text-primary" />
              {booking.destination}
            </CardTitle>
            <CardDescription className="flex items-center mt-1 text-xs text-muted-foreground">
              <CalendarDays className="w-3 h-3 mr-1" />
              {booking.travelDates}
            </CardDescription>
          </div>
          {!booking.destinationImageUri && (
             <Badge variant="secondary" className="text-md py-1 px-2 bg-background/70 text-foreground border-border/50">
                <DollarSign className="w-3 h-3 mr-1" />
                {booking.estimatedCost.toLocaleString()}
             </Badge>
          )}
        </div>
         <div className="mt-1.5 text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
             <span className="flex items-center opacity-70">
                <CloudSun className="w-3.5 h-3.5 mr-1.5 text-sky-400" />
                Weather, risks & visa reminders considered.
             </span>
             <span className="flex items-center opacity-70">
                <Leaf className="w-3.5 h-3.5 mr-1.5 text-green-400" />
                Sustainability aspects conceptually included.
             </span>
        </div>
      </CardHeader>
      <CardContent className="flex-grow pt-2 pb-3 text-card-foreground">
         {booking.tripSummary && (
           <div className="text-xs text-muted-foreground mb-3">
              <h4 className="text-xs font-semibold text-card-foreground mb-0.5 flex items-center"><Info className="w-3 h-3 mr-1.5 shrink-0 text-primary" /> Trip Summary</h4>
              <p className="pl-5 text-xs border-l border-border/50 ml-0.5 py-0.5">{booking.tripSummary}</p>
           </div>
         )}
        
        {booking.culturalTip && (
          <div className="text-xs text-muted-foreground mb-3">
            <h4 className="text-xs font-semibold text-card-foreground mb-0.5 flex items-center"><MessageSquareQuote className="w-3 h-3 mr-1.5 shrink-0 text-accent" /> Cultural Tip</h4>
            <p className="pl-5 text-xs border-l border-accent/50 ml-0.5 py-0.5">{booking.culturalTip}</p>
          </div>
        )}
        {booking.aiTripSummary?.text && (
          <div className="text-xs text-muted-foreground mb-3">
            <h4 className="text-xs font-semibold text-card-foreground mb-0.5 flex items-center"><Zap className="w-3 h-3 mr-1.5 shrink-0 text-yellow-400" /> AI Generated Summary</h4>
            <p className="pl-5 text-xs italic border-l border-yellow-400/50 ml-0.5 py-0.5">{booking.aiTripSummary.text}</p>
          </div>
        )}


        <Accordion type="multiple" className="w-full text-sm"  defaultValue={booking.dailyPlan && booking.dailyPlan.length > 0 ? ['daily-plan'] : []}>
          {booking.dailyPlan && booking.dailyPlan.length > 0 && (
            <AccordionItem value="daily-plan" className="border-border/30">
              <AccordionTrigger className="text-xs font-medium hover:no-underline py-2 text-card-foreground/90 [&[data-state=open]>svg]:text-primary">
                <div className="flex items-center">
                  <ListChecks className="w-3 h-3 mr-2 text-primary" /> Daily Itinerary ({booking.dailyPlan.length} days)
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
            <AccordionItem value="flights" className="border-border/30">
              <AccordionTrigger className="text-xs font-medium hover:no-underline py-2 text-card-foreground/90 [&[data-state=open]>svg]:text-primary">
                <div className="flex items-center">
                  <Plane className="w-3 h-3 mr-2 text-primary" /> Flight Options ({booking.flightOptions.length})
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-1 pb-2 space-y-1">
                {booking.flightOptions.map((flight, index) => (
                  <div key={`saved-flight-${booking.id}-${index}`} className="p-1.5 rounded-md border border-border/50 bg-card/50">
                    <p className="font-semibold text-xs text-card-foreground">{flight.name} - ${flight.price.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{flight.description}</p>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          )}

          {booking.hotelOptions && booking.hotelOptions.length > 0 && (
            <AccordionItem value="hotels" className="border-border/30">
              <AccordionTrigger className="text-xs font-medium hover:no-underline py-2 text-card-foreground/90 [&[data-state=open]>svg]:text-primary">
                 <div className="flex items-center">
                    <Hotel className="w-3 h-3 mr-2 text-primary" /> Hotel Options ({booking.hotelOptions.length})
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
      <CardFooter className="pt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2"> {/* Changed to 3 columns for wider screens */}
        <Button onClick={() => { setIsPackingListDialogOpen(true); handleFetchPackingList(); }} variant="outline" size="sm" className="w-full glass-interactive">
          <Briefcase className="mr-1 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />List
        </Button>
        <Button onClick={() => { setIsFactDialogOpen(true); handleFetchFunFact(); }} variant="outline" size="sm" className="w-full glass-interactive">
          <Lightbulb className="mr-1 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />Fact
        </Button>
        <Button onClick={() => setIsArVrDialogOpen(true)} variant="outline" size="sm" className="w-full glass-interactive">
          <ScanEye className="mr-1 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />Preview
        </Button>
        <Button onClick={() => setIsGroupSyncDialogOpen(true)} variant="outline" size="sm" className="w-full glass-interactive">
          <Users className="mr-1 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />Sync
        </Button>
        <Button onClick={handleOpenMemoryDialog} variant="outline" size="sm" className="w-full glass-interactive" disabled={isAuthLoading}>
          <BookOpenText className="mr-1 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />Memory
        </Button>
        <Button onClick={() => setIsTimelineDialogOpen(true)} variant="outline" size="sm" className="w-full glass-interactive"> {/* New Timeline Button */}
          <Route className="mr-1 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />Timeline
        </Button>
        <Button onClick={() => onRemoveBooking(booking.id)} variant="outline" size="sm" className="w-full text-destructive hover:bg-destructive/10 border-destructive/50 col-span-2 sm:col-span-3 lg:col-span-1" disabled={isRemoving || isAuthLoading}>
          {isRemoving || isAuthLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          <span className="ml-1 sm:ml-2">{isRemoving ? '' : (isAuthLoading ? '...' : 'Remove')}</span>
        </Button>
      </CardFooter>
    </Card>

    {/* Packing List Dialog */}
    <AlertDialog open={isPackingListDialogOpen} onOpenChange={setIsPackingListDialogOpen}>
        <AlertDialogContent className={cn(glassEffectClasses)}>
            <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-card-foreground"><Briefcase className="w-5 h-5 mr-2 text-primary"/>AI Packing List for {booking.destination}</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
                Here's a suggested packing list. Remember to adjust based on your specific needs and check a detailed forecast!
            </AlertDialogDescription>
            </AlertDialogHeader>
            <ScrollArea className="max-h-60 my-4">
                {isLoadingAI && !packingList ? (
                    <div className="flex items-center justify-center p-4 text-muted-foreground">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating list...
                    </div>
                ) : packingList && packingList.length > 0 ? (
                    <ul className="list-disc pl-5 space-y-1 text-sm text-card-foreground/90">
                    {packingList.map((item, index) => <li key={index}>{item}</li>)}
                    </ul>
                ) : (
                     <p className="text-sm text-muted-foreground">No packing list generated or an error occurred.</p>
                )}
            </ScrollArea>
            <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsPackingListDialogOpen(false)} className="bg-primary hover:bg-primary/90">Close</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    {/* Fun Fact Dialog */}
    <AlertDialog open={isFactDialogOpen} onOpenChange={setIsFactDialogOpen}>
        <AlertDialogContent className={cn(glassEffectClasses)}>
            <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-card-foreground"><Lightbulb className="w-5 h-5 mr-2 text-accent"/>Fun Fact about {booking.destination}</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
                A little something interesting about your destination!
            </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="my-4 min-h-[50px]">
            {isLoadingAI && !destinationFact ? (
                <div className="flex items-center justify-center p-4 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Discovering fact...
                </div>
            ) : destinationFact ? (
                <p className="text-sm text-card-foreground/90">{destinationFact}</p>
            ) : (
                <p className="text-sm text-muted-foreground">No fact available or an error occurred.</p>
            )}
            </div>
            <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsFactDialogOpen(false)} className="bg-primary hover:bg-primary/90">Got it!</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    {/* AR/VR Preview Dialog Placeholder */}
    <AlertDialog open={isArVrDialogOpen} onOpenChange={setIsArVrDialogOpen}>
        <AlertDialogContent className={cn(glassEffectClasses, "sm:max-w-lg")}>
            <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center text-card-foreground">
                    <ScanEye className="w-5 h-5 mr-2 text-purple-400"/>Immersive AR/VR Preview
                </AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                    Get a glimpse of {booking.destination}!
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="my-4 space-y-4">
                <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-border/30 shadow-lg">
                    <Image
                        src={`https://placehold.co/800x450.png`}
                        alt={`Conceptual AR/VR Preview for ${booking.destination}`}
                        fill
                        className="object-cover"
                        data-ai-hint={panoramicAiHint}
                    />
                </div>
                <p className="text-sm text-card-foreground/90 text-center">
                    Imagine stepping into the vibrant streets and landscapes of <strong>{booking.destination}</strong>.
                    A full AR/VR experience could bring your travel dreams to life before you even pack your bags!
                </p>
                <p className="text-xs text-muted-foreground text-center">
                    (Full AR/VR feature coming soon. This is a conceptual placeholder.)
                </p>
            </div>
            <AlertDialogFooter>
              <AlertDialogClose asChild>
                <Button onClick={() => setIsArVrDialogOpen(false)} className="bg-primary hover:bg-primary/90">Awesome!</Button>
              </AlertDialogClose>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    {/* AI Trip Memory Dialog */}
    <AlertDialog open={isMemoryDialogOpen} onOpenChange={setIsMemoryDialogOpen}>
        <AlertDialogContent className={cn(glassEffectClasses)}>
            <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center text-card-foreground">
                    <BookOpenText className="w-5 h-5 mr-2 text-orange-400"/>AI Trip Memory
                </AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                    A nostalgic snippet of your trip to {booking.destination}.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="my-4 min-h-[60px]">
                {isLoadingAI && !currentTripMemory?.text ? (
                    <div className="flex items-center justify-center p-4 text-muted-foreground">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating memory...
                    </div>
                ) : currentTripMemory?.text ? (
                    <div>
                        <p className="text-sm text-card-foreground/90 whitespace-pre-line">{currentTripMemory.text}</p>
                        {currentTripMemory.generatedAt && (
                             <p className="text-xs text-muted-foreground mt-2">
                                Generated: {formatDistanceToNow(new Date(currentTripMemory.generatedAt), { addSuffix: true })}
                             </p>
                        )}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">No memory snippet available yet. Click "Refresh Memory" to generate one.</p>
                )}
            </div>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                 <Button variant="outline" onClick={triggerMemoryGeneration} disabled={isLoadingAI || updateSavedTripMemoryMutation.isPending || isAuthLoading} className="w-full sm:w-auto glass-interactive">
                    {isLoadingAI || updateSavedTripMemoryMutation.isPending || isAuthLoading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                    Refresh Memory
                </Button>
                <AlertDialogAction onClick={() => setIsMemoryDialogOpen(false)} className="bg-primary hover:bg-primary/90 w-full sm:w-auto">Close</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    {booking && ( 
      <GroupSyncDialog
        isOpen={isGroupSyncDialogOpen}
        onClose={() => setIsGroupSyncDialogOpen(false)}
        trip={booking} 
      />
    )}
    {booking && (
      <TripTimelineDialog
        isOpen={isTimelineDialogOpen}
        onClose={() => setIsTimelineDialogOpen(false)}
        trip={booking}
      />
    )}
    </>
  );
}
