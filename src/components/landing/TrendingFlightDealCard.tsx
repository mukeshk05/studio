
"use client";

import React from 'react';
import NextImage from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plane, DollarSign, ExternalLink, ImageOff, Route, Clock, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SerpApiFlightOption } from '@/ai/types/serpapi-flight-search-types';

interface TrendingFlightDealCardProps {
  deal: SerpApiFlightOption;
  onViewDetails: () => void;
  travelDatesQuery?: string; // Added to display query dates
}

const glassCardClasses = "glass-card hover:border-primary/40 bg-card/80 dark:bg-card/50 backdrop-blur-lg";

function formatDuration(minutes?: number): string {
  if (minutes === undefined || minutes === null || isNaN(minutes)) return "N/A";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

export function TrendingFlightDealCard({ deal, onViewDetails, travelDatesQuery }: TrendingFlightDealCardProps) {
  const [logoError, setLogoError] = React.useState(false);
  const airlineLogoSrc = deal.airline_logo || deal.flights?.[0]?.airline_logo;
  const airlineName = deal.airline || deal.flights?.[0]?.airline || "Airline";
  
  const placeholderImage = `https://placehold.co/600x400.png?text=${encodeURIComponent(deal.derived_arrival_airport_name || 'Flight Deal')}`;
  const dataAiHint = `flight deal ${deal.derived_departure_airport_name} ${deal.derived_arrival_airport_name}`.toLowerCase();

  return (
    <Card className={cn(glassCardClasses, "overflow-hidden transform hover:scale-[1.02] transition-transform duration-300 ease-out shadow-lg hover:shadow-primary/30 flex flex-col")}>
      <div className="relative w-full aspect-[16/9] bg-muted/30 group">
        <NextImage
          src={placeholderImage} // Placeholder for flights
          alt={`Flight to ${deal.derived_arrival_airport_name}`}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          data-ai-hint={dataAiHint}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </div>
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center gap-2 mb-1">
            {airlineLogoSrc && !logoError ? (
                <NextImage src={airlineLogoSrc} alt={`${airlineName} logo`} width={24} height={24} className="rounded-sm object-contain bg-muted/10 p-0.5" onError={() => setLogoError(true)} />
            ) : (
                <Plane className="w-6 h-6 text-primary shrink-0" />
            )}
            <CardTitle className="text-sm font-semibold text-card-foreground truncate" title={`${deal.derived_departure_airport_name} to ${deal.derived_arrival_airport_name}`}>
                Flight to {deal.derived_arrival_airport_name || "Destination"}
            </CardTitle>
        </div>
        <CardDescription className="text-xs text-muted-foreground">
          Route: {deal.derived_departure_airport_name || "Origin"} → {deal.derived_arrival_airport_name || "Destination"}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 pt-0 text-xs text-muted-foreground flex-grow space-y-1.5">
        <div className="flex justify-between items-center">
          <Badge variant="secondary" className="text-sm bg-primary/10 text-primary border-primary/20">
            <DollarSign className="w-3 h-3 mr-1" />{deal.price?.toLocaleString() || 'N/A'}
          </Badge>
          <Badge variant="outline" className="text-xs capitalize border-border/50">{deal.derived_stops_description || "N/A stops"}</Badge>
        </div>
        {travelDatesQuery && (
          <p className="flex items-center text-xs text-muted-foreground"><CalendarDays className="w-3 h-3 mr-1.5 text-primary/70"/> Query Dates: {travelDatesQuery}</p>
        )}
        <p className="flex items-center text-xs text-muted-foreground"><Clock className="w-3 h-3 mr-1.5 text-primary/70"/>Duration: {formatDuration(deal.total_duration)}</p>
      </CardContent>
      <CardFooter className="p-3 pt-2">
        <Button
          size="sm"
          className={cn("w-full text-sm py-2", "shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40", "bg-gradient-to-r from-primary to-accent text-primary-foreground", "hover:from-accent hover:to-primary")}
          onClick={onViewDetails}
        >
          <ExternalLink className="mr-2 h-4 w-4" /> View Flight Details
        </Button>
      </CardFooter>
    </Card>
  );
}
