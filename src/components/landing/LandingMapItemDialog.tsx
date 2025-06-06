
"use client";

import React from 'react';
import NextImage from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, MapPin, DollarSign, Info, Plane, Hotel as HotelIcon, ListChecks, Briefcase, ExternalLink, ImageOff, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AiDestinationSuggestion } from '@/ai/types/popular-destinations-types';
import type { BundleSuggestion } from '@/ai/types/smart-bundle-types';
import type { AITripPlannerInput } from '@/ai/types/trip-planner-types';
import type { ActivitySuggestion, FlightOption, HotelOption as LibHotelOption } from '@/lib/types'; // Using LibHotelOption for real hotel data consistency
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

type MapDisplayItem = AiDestinationSuggestion | BundleSuggestion;

interface LandingMapItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: MapDisplayItem | null;
  onPlanTrip: (tripIdea: AITripPlannerInput) => void;
}

const glassCardClasses = "glass-card bg-card/80 dark:bg-card/50 backdrop-blur-lg border-border/20";
const innerGlassEffectClasses = "bg-card/70 dark:bg-card/40 backdrop-blur-md border border-white/10 dark:border-[hsl(var(--primary)/0.1)] rounded-md";
const prominentButtonClasses = "text-lg py-3 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:from-accent hover:to-primary focus-visible:ring-4 focus-visible:ring-primary/40 transform transition-all duration-300 ease-out hover:scale-[1.02] active:scale-100";

export function LandingMapItemDialog({ isOpen, onClose, item, onPlanTrip }: LandingMapItemDialogProps) {
  const { toast } = useToast();
  const router = useRouter();

  if (!item) return null;

  const isBundle = 'bundleName' in item;

  const title = isBundle ? (item as BundleSuggestion).bundleName : (item as AiDestinationSuggestion).name;
  const description = item.description;
  const imageUri = isBundle ? (item as BundleSuggestion).bundleImageUri : (item as AiDestinationSuggestion).imageUri;
  const imagePrompt = isBundle ? (item as BundleSuggestion).bundleImagePrompt : (item as AiDestinationSuggestion).imagePrompt;
  
  const country = isBundle ? (item as BundleSuggestion).tripIdea.destination.split(',').pop()?.trim() : (item as AiDestinationSuggestion).country;

  // For AiDestinationSuggestion (conceptual)
  const conceptualFlightIdea = !isBundle ? (item as AiDestinationSuggestion).flightIdea : undefined;
  const conceptualHotelIdea = !isBundle ? (item as AiDestinationSuggestion).hotelIdea : undefined;
  
  // For BundleSuggestion (potentially real data)
  const realFlightExample = isBundle ? (item as BundleSuggestion).realFlightExample : undefined;
  const realHotelExample = isBundle ? (item as BundleSuggestion).realHotelExample : undefined;
  const suggestedActivities = isBundle ? (item as BundleSuggestion).suggestedActivities : undefined;
  const estimatedRealPriceRange = isBundle ? (item as BundleSuggestion).estimatedRealPriceRange : undefined;
  const priceFeasibilityNote = isBundle ? (item as BundleSuggestion).priceFeasibilityNote : undefined;
  const aiBudgetString = isBundle ? `$${(item as BundleSuggestion).tripIdea.budget.toLocaleString()}` : undefined;
  
  const derivedImageHint = imageUri && imageUri.startsWith('https://placehold.co')
    ? (imagePrompt || title.toLowerCase().split(" ").slice(0, 2).join(" "))
    : undefined;

  const handlePlan = () => {
    const tripIdea: AITripPlannerInput = isBundle 
      ? (item as BundleSuggestion).tripIdea
      : {
          destination: `${(item as AiDestinationSuggestion).name}${country ? `, ${country}` : ''}`,
          travelDates: "Next month for 7 days", 
          budget: parseInt(conceptualHotelIdea?.priceRange?.match(/\$(\d+)/)?.[1] || conceptualFlightIdea?.priceRange?.match(/\$(\d+)/)?.[1] || '2000', 10) * (conceptualHotelIdea ? 7 : 1),
        };
    onPlanTrip(tripIdea);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className={cn(glassCardClasses, "sm:max-w-2xl md:max-w-3xl max-h-[90vh] flex flex-col p-0 border-primary/30")}>
        <DialogHeader className="p-4 sm:p-6 border-b border-border/30 sticky top-0 z-10 bg-card/80 dark:bg-card/50 backdrop-blur-sm">
          <div className="flex justify-between items-start">
            <div className="flex-grow min-w-0">
              <DialogTitle className="text-xl font-semibold text-foreground truncate flex items-center" title={title}>
                <MapPin className="w-5 h-5 mr-2 text-primary" />
                {title}
              </DialogTitle>
              {country && <DialogDescription className="text-sm text-muted-foreground">{country}</DialogDescription>}
            </div>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-accent/20 hover:text-accent-foreground shrink-0">
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 sm:p-6 space-y-4">
            <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-border/50 shadow-lg bg-muted/30">
              {imageUri ? (
                <NextImage src={imageUri} alt={title} fill className="object-cover" data-ai-hint={derivedImageHint} sizes="(max-width: 768px) 90vw, (max-width: 1200px) 50vw, 700px" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><ImageOff className="w-16 h-16 text-muted-foreground" /></div>
              )}
            </div>

            {description && <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>}
            
            <Separator className="my-3 bg-border/40" />

            {/* Conceptual Data for AiDestinationSuggestion */}
            {!isBundle && (conceptualFlightIdea || conceptualHotelIdea) && (
              <Card className={cn(innerGlassEffectClasses, "p-3")}>
                <CardHeader className="p-0 pb-2"><CardTitle className="text-sm font-medium text-card-foreground">Conceptual Travel Ideas</CardTitle></CardHeader>
                <CardContent className="p-0 text-xs space-y-1.5">
                  {conceptualFlightIdea && (
                    <div>
                      <p className="font-medium text-card-foreground/90 flex items-center"><Plane className="w-3 h-3 mr-1.5 text-primary/70"/>Flight Idea:</p>
                      <p className="pl-5 text-muted-foreground">{conceptualFlightIdea.description} ({conceptualFlightIdea.priceRange})</p>
                    </div>
                  )}
                  {conceptualHotelIdea && (
                    <div>
                      <p className="font-medium text-card-foreground/90 flex items-center"><HotelIcon className="w-3 h-3 mr-1.5 text-primary/70"/>Hotel Idea:</p>
                      <p className="pl-5 text-muted-foreground">{conceptualHotelIdea.type} ({conceptualHotelIdea.priceRange})</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Real/Augmented Data for BundleSuggestion */}
            {isBundle && (
              <div className="space-y-3">
                 {aiBudgetString && (
                    <p className="text-sm text-center font-medium text-muted-foreground">
                        Original AI Budget for this Idea: <span className="text-primary">{aiBudgetString}</span>
                    </p>
                )}
                {estimatedRealPriceRange && (
                  <p className="text-lg font-semibold text-center text-accent mt-1 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 mr-1" /> Est. Real Price: {estimatedRealPriceRange}
                  </p>
                )}
                {priceFeasibilityNote && (
                  <p className={cn("text-xs italic text-center p-2 rounded-md mx-auto max-w-md",
                      priceFeasibilityNote.includes("Good news!") ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20" :
                      priceFeasibilityNote.includes("closer to") ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" :
                      "bg-muted/50 border-border/30 text-muted-foreground"
                  )}>
                    <Info className="w-3 h-3 mr-1.5 inline-block" />
                    {priceFeasibilityNote}
                  </p>
                )}

                {realFlightExample && (
                  <Card className={cn(innerGlassEffectClasses, "p-3")}>
                    <CardHeader className="p-0 pb-1.5"><CardTitle className="text-xs font-medium text-card-foreground flex items-center"><Plane className="w-4 h-4 mr-1.5 text-primary"/>Flight Example</CardTitle></CardHeader>
                    <CardContent className="p-0 text-xs">
                      <p><span className="text-card-foreground/90">Name:</span> {(realFlightExample as unknown as FlightOption).name}</p>
                      <p><span className="text-card-foreground/90">Price:</span> ~${(realFlightExample as unknown as FlightOption).price?.toLocaleString()}</p>
                      {(realFlightExample as unknown as FlightOption).derived_stops_description && <p><span className="text-card-foreground/90">Stops:</span> {(realFlightExample as unknown as FlightOption).derived_stops_description}</p>}
                    </CardContent>
                  </Card>
                )}
                {realHotelExample && (
                  <Card className={cn(innerGlassEffectClasses, "p-3")}>
                    <CardHeader className="p-0 pb-1.5"><CardTitle className="text-xs font-medium text-card-foreground flex items-center"><HotelIcon className="w-4 h-4 mr-1.5 text-primary"/>Hotel Example</CardTitle></CardHeader>
                    <CardContent className="p-0 text-xs">
                      <p><span className="text-card-foreground/90">Name:</span> {(realHotelExample as unknown as LibHotelOption).name}</p> {/* Changed to LibHotelOption for consistency */}
                      {(realHotelExample as unknown as LibHotelOption).price_per_night && <p><span className="text-card-foreground/90">Price:</span> ~${(realHotelExample as unknown as LibHotelOption).price_per_night?.toLocaleString()}/night</p>}
                      {(realHotelExample as unknown as LibHotelOption).rating !== undefined && <p><span className="text-card-foreground/90">Rating:</span> {(realHotelExample as unknown as LibHotelOption).rating?.toFixed(1)} ★</p>}
                    </CardContent>
                  </Card>
                )}
                {suggestedActivities && suggestedActivities.length > 0 && (
                  <Card className={cn(innerGlassEffectClasses, "p-3")}>
                    <CardHeader className="p-0 pb-1.5"><CardTitle className="text-xs font-medium text-card-foreground flex items-center"><ListChecks className="w-4 h-4 mr-1.5 text-primary"/>Activity Highlights</CardTitle></CardHeader>
                    <CardContent className="p-0">
                      <div className="flex flex-wrap gap-1.5">
                        {suggestedActivities.map(act => <Badge key={act.name} variant="secondary" className="text-[0.7rem] bg-accent/10 text-accent border-accent/20">{act.name}</Badge>)}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
        <DialogFooter className={cn("p-4 sm:p-6 border-t border-border/30", "glass-pane")}>
          <Button onClick={handlePlan} size="lg" className={cn(prominentButtonClasses, "w-full")}>
            <ExternalLink className="mr-2 h-5 w-5" /> Plan This Trip
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

