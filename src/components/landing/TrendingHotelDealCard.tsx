
"use client";

import React from 'react';
import NextImage from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Hotel, DollarSign, Star, MapPin, ExternalLink, ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SerpApiHotelSuggestion } from '@/ai/types/serpapi-hotel-search-types';

interface TrendingHotelDealCardProps {
  deal: SerpApiHotelSuggestion;
  onViewDetails: () => void;
  destinationQuery?: string; // Added to display query location
}

const glassCardClasses = "glass-card hover:border-primary/40 bg-card/80 dark:bg-card/50 backdrop-blur-lg";

export function TrendingHotelDealCard({ deal, onViewDetails, destinationQuery }: TrendingHotelDealCardProps) {
  const [imageLoadError, setImageLoadError] = React.useState(false);
  const imageSrc = deal.thumbnail || deal.images?.[0]?.thumbnail;
  const dataAiHint = deal.name ? `hotel ${deal.name.toLowerCase().split(" ").slice(0,2).join(" ")}` : "hotel exterior";

  return (
    <Card className={cn(glassCardClasses, "overflow-hidden transform hover:scale-[1.02] transition-transform duration-300 ease-out shadow-lg hover:shadow-primary/30 flex flex-col")}>
      <div className="relative w-full aspect-[16/9] bg-muted/30 group">
        {imageSrc && !imageLoadError ? (
          <NextImage
            src={imageSrc}
            alt={deal.name || "Hotel image"}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            data-ai-hint={dataAiHint}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            onError={() => setImageLoadError(true)}
          />
        ) : (
          <div className="w-full h-full bg-muted/30 flex items-center justify-center">
            <ImageOff className="w-10 h-10 text-muted-foreground" />
          </div>
        )}
      </div>
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-sm font-semibold text-card-foreground truncate" title={deal.name}>
          <Hotel className="w-4 h-4 mr-1.5 inline-block text-primary" />{deal.name || "Hotel Name"}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          {deal.type || "Hotel"} {destinationQuery ? `in ${destinationQuery}` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 pt-0 text-xs text-muted-foreground flex-grow space-y-1.5">
        <div className="flex justify-between items-center">
            <Badge variant="secondary" className="text-sm bg-primary/10 text-primary border-primary/20">
                <DollarSign className="w-3 h-3 mr-1" />
                {deal.price_details || (deal.price_per_night ? `${deal.price_per_night.toLocaleString()}/night` : 'N/A')}
            </Badge>
            {deal.rating && (
                <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-400 bg-amber-500/10">
                    <Star className="w-3 h-3 mr-1 fill-amber-400"/>{deal.rating.toFixed(1)} ({deal.reviews || 'N/A'})
                </Badge>
            )}
        </div>
        {deal.amenities && deal.amenities.length > 0 && (
            <p className="text-xs text-muted-foreground line-clamp-1">Amenities: {deal.amenities.slice(0,2).join(', ')}{deal.amenities.length > 2 ? '...' : ''}</p>
        )}
      </CardContent>
      <CardFooter className="p-3 pt-2">
        <Button
          size="sm"
          className={cn("w-full text-sm py-2", "shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40", "bg-gradient-to-r from-primary to-accent text-primary-foreground", "hover:from-accent hover:to-primary")}
          onClick={onViewDetails}
        >
          <ExternalLink className="mr-2 h-4 w-4" /> View Hotel Details
        </Button>
      </CardFooter>
    </Card>
  );
}

