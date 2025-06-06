
"use client";

import React, { useMemo, useState, useCallback } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DollarSign, Plane, Hotel as HotelIcon, Route, Sparkles, ExternalLink, ImageOff, Briefcase, MapPin, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AiDestinationSuggestion } from '@/ai/types/popular-destinations-types';
import type { BundleSuggestion } from '@/ai/types/smart-bundle-types';
import type { AITripPlannerInput } from '@/ai/types/trip-planner-types';
import type { ActivitySuggestion } from '@/lib/types';

type HomePagePackageCardProps = {
  item: AiDestinationSuggestion | BundleSuggestion;
  onPlanTrip: (tripIdea: AITripPlannerInput) => void;
};

const glassCardClasses = "glass-card hover:border-primary/40 bg-card/80 dark:bg-card/50 backdrop-blur-lg";

export function HomePagePackageCard({ item, onPlanTrip }: HomePagePackageCardProps) {
  const [imageLoadError, setImageLoadError] = useState(false);

  const isBundle = 'bundleName' in item;

  const title = isBundle ? (item as BundleSuggestion).bundleName : (item as AiDestinationSuggestion).name;
  const country = isBundle ? (item as BundleSuggestion).tripIdea.destination.split(',').pop()?.trim() : (item as AiDestinationSuggestion).country;
  const description = item.description;
  const imageUri = isBundle ? (item as BundleSuggestion).bundleImageUri : (item as AiDestinationSuggestion).imageUri;
  const imagePrompt = isBundle ? (item as BundleSuggestion).bundleImagePrompt : (item as AiDestinationSuggestion).imagePrompt;
  
  const flightInfo = isBundle ? (item as BundleSuggestion).realFlightExample : (item as AiDestinationSuggestion).flightIdea;
  const hotelInfo = isBundle ? (item as BundleSuggestion).realHotelExample : (item as AiDestinationSuggestion).hotelIdea;
  const activities = isBundle ? (item as BundleSuggestion).suggestedActivities : undefined;
  const estimatedRealPriceRange = isBundle ? (item as BundleSuggestion).estimatedRealPriceRange : undefined;
  const priceFeasibilityNote = isBundle ? (item as BundleSuggestion).priceFeasibilityNote : undefined;
  const aiBudget = isBundle ? (item as BundleSuggestion).tripIdea.budget : undefined;


  const derivedImageHint = useMemo(() => {
    if (imageUri && imageUri.startsWith('https://placehold.co')) {
      return imagePrompt || title.toLowerCase().split(" ").slice(0, 2).join(" ");
    }
    return undefined;
  }, [imageUri, imagePrompt, title]);

  const handleImageError = useCallback(() => {
    console.warn(`[HomePagePackageCard] Image load ERROR for: ${title}, src: ${imageUri}`);
    setImageLoadError(true);
  }, [title, imageUri]);

  const handlePlan = () => {
    const tripIdea: AITripPlannerInput = isBundle 
      ? (item as BundleSuggestion).tripIdea
      : {
          destination: `${(item as AiDestinationSuggestion).name}, ${(item as AiDestinationSuggestion).country}`,
          travelDates: "Next month for 7 days", // Default
          budget: parseInt((item as AiDestinationSuggestion).flightIdea?.priceRange?.match(/\$(\d+)/)?.[1] || (item as AiDestinationSuggestion).hotelIdea?.priceRange?.match(/\$(\d+)/)?.[1] || '2000', 10) * ((item as AiDestinationSuggestion).hotelIdea ? 7 : 1),
        };
    onPlanTrip(tripIdea);
  };
  
  const canDisplayImage = !imageLoadError && imageUri;

  return (
    <Card className={cn(glassCardClasses, "overflow-hidden transform hover:scale-[1.02] transition-transform duration-300 ease-out shadow-lg hover:shadow-primary/30 flex flex-col")}>
      <div className="relative w-full aspect-[16/10] bg-muted/30 group">
        {canDisplayImage ? (
          <Image
            src={imageUri!}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            data-ai-hint={derivedImageHint}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            onError={handleImageError}
          />
        ) : (
          <div className="w-full h-full bg-muted/30 flex items-center justify-center">
            <ImageOff className="w-10 h-10 text-muted-foreground" />
          </div>
        )}
      </div>
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-md font-semibold text-card-foreground">{title}</CardTitle>
        {country && <CardDescription className="text-xs text-muted-foreground">{country}</CardDescription>}
      </CardHeader>
      <CardContent className="p-3 pt-0 text-xs text-muted-foreground flex-grow space-y-1.5">
        {description && <p className="line-clamp-3 mb-1.5">{description}</p>}

        {flightInfo && (
          <div className="text-xs border-t border-border/20 pt-1.5">
            <p className="font-medium text-card-foreground/90 flex items-center"><Plane className="w-3 h-3 mr-1.5 text-primary/70" />Flight Snippet:</p>
            <p className="pl-4 text-muted-foreground">
              {isBundle ? 
                `${(flightInfo as any).name} - ~$${(flightInfo as any).price?.toLocaleString()}` : 
                `${(flightInfo as any).description} (${(flightInfo as any).priceRange})`}
            </p>
          </div>
        )}

        {hotelInfo && (
          <div className="text-xs border-t border-border/20 pt-1.5">
            <p className="font-medium text-card-foreground/90 flex items-center"><HotelIcon className="w-3 h-3 mr-1.5 text-primary/70" />Hotel Snippet:</p>
            <p className="pl-4 text-muted-foreground">
              {isBundle ? 
                `${(hotelInfo as any).name} - ~$${(hotelInfo as any).price_per_night?.toLocaleString()}/night` : 
                `${(hotelInfo as any).type} (${(hotelInfo as any).priceRange})`}
            </p>
          </div>
        )}

        {activities && activities.length > 0 && (
          <div className="text-xs border-t border-border/20 pt-1.5">
             <p className="font-medium text-card-foreground/90 flex items-center"><ListChecks className="w-3 h-3 mr-1.5 text-primary/70" />Activity Highlights:</p>
             <div className="pl-4 flex flex-wrap gap-1 mt-1">
                {activities.slice(0, 2).map(act => (
                    <Badge key={act.name} variant="secondary" className="text-[0.7rem] bg-accent/10 text-accent border-accent/20">{act.name}</Badge>
                ))}
                {activities.length > 2 && <Badge variant="secondary" className="text-[0.7rem] bg-accent/10 text-accent border-accent/20">+{activities.length - 2} more</Badge>}
             </div>
          </div>
        )}
        
        {isBundle && estimatedRealPriceRange && (
            <p className="text-sm font-semibold text-primary mt-1.5 flex items-center">
                <DollarSign className="w-3.5 h-3.5 mr-1" /> Est. Real Price: {estimatedRealPriceRange}
            </p>
        )}
        {isBundle && priceFeasibilityNote && (
            <p className="text-[0.7rem] italic text-muted-foreground/80 mt-0.5">{priceFeasibilityNote}</p>
        )}


      </CardContent>
      <CardFooter className="p-3 pt-2">
        <Button
          size="sm"
          className={cn(
            "w-full text-sm py-2 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40",
            "bg-gradient-to-r from-primary to-accent text-primary-foreground",
            "hover:from-accent hover:to-primary",
            "focus-visible:ring-4 focus-visible:ring-primary/40",
            "transform transition-all duration-300 ease-out hover:scale-[1.02] active:scale-100"
          )}
          onClick={handlePlan}
        >
          <ExternalLink className="mr-2 h-4 w-4" /> Plan This Trip
        </Button>
      </CardFooter>
    </Card>
  );
}
