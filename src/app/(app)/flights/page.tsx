
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { FormItem } from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertTitle as ShadcnAlertTitle, AlertDescription as ShadcnAlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { FlightProgressIndicator } from '@/components/ui/FlightProgressIndicator';


import { cn } from '@/lib/utils';
import {
  Plane,
  CalendarDays as CalendarLucideIcon,
  Users,
  Briefcase,
  ArrowRightLeft,
  Search,
  Sparkles,
  Star,
  Clock,
  Loader2,
  Map as LucideMap,
  Compass,
  DollarSign,
  Hotel,
  TrendingUp,
  CalendarSearch,
  BarChartHorizontalBig,
  LocateFixed,
  ImageOff,
  Info,
  ExternalLink,
  AlertTriangle,
  X,
  MessageSquareQuote,
  MapPin,
  ListFilter,
  Route,
  CheckCircle,
  PieChart,
  Grid2X2,
  Lightbulb,
  Ticket,
  Globe
} from 'lucide-react';
import { format, addDays, isValid, parseISO } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { useToast } from '@/hooks/use-toast';
import { 
  getPopularDestinations, 
  getRealFlightsAction, 
  getAiFlightMapDealsAction, 
  getPriceAdviceAction,
  getConceptualDateGridAction,
  getConceptualPriceGraphAction
} from '@/app/actions';
import type { PopularDestinationsInput, AiDestinationSuggestion } from '@/ai/types/popular-destinations-types';
import type { AiFlightMapDealSuggestion, AiFlightMapDealOutput, AiFlightMapDealInput } from '@/ai/types/ai-flight-map-deals-types';
import type { SerpApiFlightSearchInput, SerpApiFlightSearchOutput, SerpApiFlightOption, SerpApiFlightLeg } from '@/ai/types/serpapi-flight-search-types'; 
import type { PriceAdvisorInput, PriceAdvisorOutput } from '@/ai/flows/price-advisor-flow';
import type { ConceptualDateGridInput, ConceptualDateGridOutput, DatePricePoint } from '@/ai/types/ai-conceptual-date-grid-types';
import type { ConceptualPriceGraphInput, ConceptualPriceGraphOutput, ConceptualDataPoint } from '@/ai/types/ai-conceptual-price-graph-types';


import type { AITripPlannerInput } from '@/ai/types/trip-planner-types';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAddTrackedItem } from '@/lib/firestoreHooks';

const glassCardClasses = "glass-card bg-card/80 dark:bg-card/50 backdrop-blur-lg border-border/20";
const innerGlassEffectClasses = "bg-card/80 dark:bg-card/50 backdrop-blur-md border border-white/10 dark:border-[hsl(var(--primary)/0.1)] rounded-md";
const prominentButtonClasses = "text-lg py-3 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:from-accent hover:to-primary focus-visible:ring-4 focus-visible:ring-primary/40 transform transition-all duration-300 ease-out hover:scale-[1.02] active:scale-100";
const prominentButtonClassesSm = "text-sm py-2 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:from-accent hover:to-primary focus-visible:ring-2 focus-visible:ring-primary/30 transform transition-all duration-300 ease-out hover:scale-[1.02] active:scale-100";


interface RealFlightResultCardProps {
  flightOption: SerpApiFlightOption;
  onViewDetails: () => void;
}

function RealFlightResultCard({ flightOption, onViewDetails }: RealFlightResultCardProps) {
  const [logoError, setLogoError] = useState(false);

  const airlineLogoSrc = flightOption.airline_logo || flightOption.flights?.[0]?.airline_logo;
  const airlineName = flightOption.airline || flightOption.flights?.[0]?.airline || "Multiple Airlines";
  const airlinePlaceholderText = airlineName.split(' ')[0];
  
  useEffect(() => {
    setLogoError(false); 
  }, [airlineLogoSrc]);

  const formatDuration = (minutes?: number) => {
    if (minutes === undefined || minutes === null) return "N/A";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  return (
    <Card className={cn(glassCardClasses, "mb-4 transform hover:scale-[1.01] transition-transform duration-200 ease-out")}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoError || !airlineLogoSrc ? (
              <Image
                src={`https://placehold.co/80x30.png?text=${encodeURIComponent(airlinePlaceholderText)}`}
                alt={`${airlineName} logo placeholder`}
                data-ai-hint={`logo ${airlinePlaceholderText.toLowerCase()}`}
                width={80}
                height={30}
                className="h-auto object-contain rounded-sm bg-muted/20 p-0.5"
              />
            ) : (
              <Image
                src={airlineLogoSrc}
                alt={`${airlineName} logo`}
                width={80}
                height={30}
                className="h-auto object-contain rounded-sm bg-muted/20 p-0.5"
                onError={() => {
                  console.warn(`Error loading image from ${airlineLogoSrc} for ${airlineName}. Falling back to placeholder.`);
                  setLogoError(true);
                }}
              />
            )}
            <div>
              <p className="text-sm font-semibold text-card-foreground">{airlineName}</p>
              {flightOption.derived_flight_numbers && <p className="text-xs text-muted-foreground">{flightOption.derived_flight_numbers}</p>}
            </div>
          </div>
          <Badge variant="outline" className="text-xs border-accent/50 text-accent bg-accent/10">{flightOption.derived_stops_description}</Badge>
        </div>

        <div className="flex items-center justify-between text-xs text-card-foreground/90">
          <div className="text-center">
            <p className="font-medium">{flightOption.derived_departure_time || "N/A"}</p>
            <p className="text-muted-foreground">{flightOption.derived_departure_airport_name || "N/A"}</p>
          </div>
          <div className="flex flex-col items-center text-muted-foreground">
            <Route className="w-4 h-4 mb-0.5" />
            <span className="text-[0.65rem] leading-tight">{formatDuration(flightOption.total_duration)}</span>
          </div>
          <div className="text-center">
            <p className="font-medium">{flightOption.derived_arrival_time || "N/A"}</p>
            <p className="text-muted-foreground">{flightOption.derived_arrival_airport_name || "N/A"}</p>
          </div>
        </div>
        
        {flightOption.carbon_emissions?.this_flight && (
          <p className="text-xs text-muted-foreground italic border-t border-border/20 pt-2 mt-2">
            CO₂: {flightOption.carbon_emissions.this_flight}kg 
            {flightOption.carbon_emissions.difference_percent !== undefined && 
             ` (${flightOption.carbon_emissions.difference_percent > 0 ? '+' : ''}${flightOption.carbon_emissions.difference_percent}% vs typical)`}
          </p>
        )}

      </CardContent>
      <CardFooter className="p-3 bg-muted/20 dark:bg-muted/10 flex justify-between items-center border-t border-border/30">
        <p className="text-lg font-bold text-primary">${flightOption.price?.toLocaleString() || 'N/A'}</p>
        <Button size="sm" onClick={onViewDetails} className={cn(prominentButtonClassesSm, "py-1.5 px-4 text-sm")}>
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
}


interface FlightDestinationSuggestionCardProps {
  destination: AiDestinationSuggestion;
  onPlanTrip: (tripIdea: AITripPlannerInput) => void;
}

function FlightDestinationSuggestionCard({ destination, onPlanTrip }: FlightDestinationSuggestionCardProps) {
  const [imageLoadError, setImageLoadError] = useState(false);
  const imageHint = destination.imageUri?.startsWith('https://placehold.co')
    ? (destination.imagePrompt || destination.name.toLowerCase().split(" ").slice(0, 2).join(" "))
    : undefined;

  const handleImageError = useCallback(() => {
    if(destination.imageUri) { 
        console.warn(`[FlightDestinationSuggestionCard] Image load ERROR for: ${destination.name}, src: ${destination.imageUri}`);
    }
    setImageLoadError(true);
  }, [destination.name, destination.imageUri]);

  const handlePlan = () => {
    const plannerInput: AITripPlannerInput = {
      destination: destination.name + (destination.country ? `, ${destination.country}` : ''),
      travelDates: "Flexible dates", 
      budget: parseInt(destination.flightIdea?.priceRange?.match(/\$(\d+)/)?.[0].replace('$','') || '1000', 10),
    };
    onPlanTrip(plannerInput);
  };
  
  const canDisplayImage = !imageLoadError && destination.imageUri;

  return (
    <Card className={cn(glassCardClasses, "overflow-hidden transform hover:scale-[1.02] transition-transform duration-300 ease-out shadow-lg hover:shadow-primary/30 flex flex-col")}>
      <div className="relative w-full aspect-[16/10] bg-muted/30 group">
        { canDisplayImage ? (
          <Image src={destination.imageUri!} alt={destination.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" data-ai-hint={imageHint} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" onError={handleImageError} />
        ) : (
          <div className="w-full h-full bg-muted/30 flex items-center justify-center"><ImageOff className="w-10 h-10 text-muted-foreground" /></div>
        )}
      </div>
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-md font-semibold text-card-foreground">{destination.name}</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">{destination.country}</CardDescription>
      </CardHeader>
      <CardContent className="p-3 pt-0 text-xs text-muted-foreground flex-grow space-y-1.5">
        <p className="line-clamp-2">{destination.description}</p>
        {destination.flightIdea && (
          <div className="text-xs border-t border-border/20 pt-1.5 mt-1.5">
            <p className="font-medium text-card-foreground/90 flex items-center"><Plane className="w-3 h-3 mr-1.5 text-primary/70" />Conceptual Flight Deal:</p>
            <p className="pl-4 text-muted-foreground">{destination.flightIdea.description} ({destination.flightIdea.priceRange})</p>
          </div>
        )}
        {destination.hotelIdea && (
          <div className="text-xs border-t border-border/20 pt-1.5 mt-1.5">
            <p className="font-medium text-card-foreground/90 flex items-center"><Hotel className="w-3 h-3 mr-1.5 text-primary/70" />Hotel Idea:</p>
            <p className="pl-4 text-muted-foreground">{destination.hotelIdea.type} ({destination.hotelIdea.priceRange})</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="p-3 pt-2">
        <Button size="sm" className={cn("w-full text-sm py-2", prominentButtonClassesSm)} onClick={handlePlan}>
          <ExternalLink className="mr-2 h-4 w-4" /> Plan This Trip
        </Button>
      </CardFooter>
    </Card>
  );
}

interface MapDealDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  deal: AiFlightMapDealSuggestion | null;
  onPlanTrip: (tripIdea: AITripPlannerInput) => void;
}

function MapDealDetailsDialog({ isOpen, onClose, deal, onPlanTrip }: MapDealDetailsDialogProps) {
  if (!deal) return null;
  const [imageLoadError, setImageLoadError] = useState(false);
  const imageHint = deal.imageUri?.startsWith('https://placehold.co')
    ? (deal.imagePrompt || deal.destinationCity.toLowerCase().split(" ").slice(0,2).join(" "))
    : undefined;

  const handlePlan = () => {
    const plannerInput: AITripPlannerInput = {
      destination: `${deal.destinationCity}, ${deal.country}`,
      travelDates: deal.dealVariations?.[0]?.travelDatesHint || "Flexible (check specific dates)",
      budget: parseInt(deal.conceptualPriceRange.match(/\$(\d+)/)?.[0].replace('$','') || '1000', 10),
    };
    onPlanTrip(plannerInput);
    onClose();
  };
  
  const canDisplayImage = !imageLoadError && deal.imageUri;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className={cn(glassCardClasses, "sm:max-w-lg md:max-w-xl p-0 border-primary/30")}>
        <DialogHeader className="p-4 sm:p-6 border-b border-border/30 sticky top-0 z-10 bg-card/80 dark:bg-card/50 backdrop-blur-sm">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-xl font-semibold text-foreground flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-primary" /> {deal.destinationCity}, {deal.country}
            </DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-accent/20 hover:text-accent-foreground">
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">AI Simulated Flight Deal</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-150px)]">
          <div className="p-4 sm:p-6 space-y-4">
            <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-border/50 shadow-lg bg-muted/30">
              {canDisplayImage ? (
                <Image src={deal.imageUri!} alt={`Image of ${deal.destinationCity}`} fill className="object-cover" data-ai-hint={imageHint} sizes="(max-width: 640px) 90vw, 500px" onError={() => setImageLoadError(true)} />
              ) : (
                <div className="w-full h-full bg-muted/30 flex items-center justify-center"><ImageOff className="w-10 h-10 text-muted-foreground" /></div>
              )}
            </div>
            <p className="text-sm text-card-foreground/90 flex items-center"><DollarSign className="w-4 h-4 mr-1.5 text-green-400" />Conceptual Price: <span className="font-semibold ml-1">{deal.conceptualPriceRange}</span></p>
            <p className="text-xs text-muted-foreground italic flex items-start"><MessageSquareQuote className="w-3.5 h-3.5 mr-1.5 mt-0.5 shrink-0 text-primary/70" />Reason for Deal (AI Concept): {deal.dealReason}</p>

            {deal.dealVariations && deal.dealVariations.length > 0 && (
              <div className={cn(innerGlassEffectClasses, "p-3 rounded-md mt-3")}>
                <h4 className="text-sm font-semibold text-card-foreground mb-2 flex items-center">
                  <ListFilter className="w-4 h-4 mr-2 text-accent"/> Alternative Ideas for this Route:
                </h4>
                <div className="space-y-2">
                  {deal.dealVariations.map((variation, index) => (
                    <div key={index} className="text-xs p-2 rounded-md border border-border/30 bg-background/30">
                      <p><strong className="text-primary/90">Travel:</strong> {variation.travelDatesHint}</p>
                      <p><strong className="text-primary/90">Est. Price:</strong> {variation.conceptualPriceVariation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator className="my-3" />
            <p className="text-xs text-muted-foreground text-center"><Info className="inline w-3 h-3 mr-1" />Prices and deals are AI-generated concepts for exploration, not live offers.</p>
            <Button onClick={handlePlan} size="lg" className={cn(prominentButtonClasses, "w-full mt-3")}>
              <ExternalLink className="mr-2 h-5 w-5" /> Plan Trip to {deal.destinationCity}
            </Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

interface RealFlightDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  flight: SerpApiFlightOption | null;
}

function RealFlightDetailsDialog({ isOpen, onClose, flight }: RealFlightDetailsDialogProps) {
  if (!flight) return null;

  const formatLegDuration = (minutes?: number) => {
    if (minutes === undefined || minutes === null) return "N/A";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className={cn(glassCardClasses, "sm:max-w-xl p-0 border-primary/30")}>
        <DialogHeader className="p-4 sm:p-6 border-b border-border/30 sticky top-0 z-10 bg-card/80 dark:bg-card/50 backdrop-blur-sm">
           <div className="flex justify-between items-center">
            <DialogTitle className="text-lg font-semibold text-foreground flex items-center">
              <Ticket className="w-5 h-5 mr-2 text-primary" />
              Flight Details: {flight.derived_departure_airport_name} to {flight.derived_arrival_airport_name}
            </DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-accent/20 hover:text-accent-foreground">
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Airline: {flight.airline || "Multiple Airlines"} - Total Price: ${flight.price?.toLocaleString() || 'N/A'}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(80vh-160px)]"> 
          <div className="p-4 sm:p-6 space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <p className="font-medium text-card-foreground">Total Price:</p>
              <p className="text-lg font-bold text-primary">${flight.price?.toLocaleString() || 'N/A'}</p>
            </div>
            <Separator/>
            <p><strong className="text-card-foreground/90">Total Duration:</strong> {formatLegDuration(flight.total_duration)}</p>
            <p><strong className="text-card-foreground/90">Type:</strong> {flight.type || "N/A"}</p>
            <p><strong className="text-card-foreground/90">Stops:</strong> {flight.derived_stops_description || "N/A"}</p>
            
            {flight.flights && flight.flights.length > 0 && (
              <div className="mt-3 space-y-3">
                <h4 className="text-sm font-semibold text-card-foreground">Flight Legs:</h4>
                {flight.flights.map((leg, index) => (
                  <Card key={index} className={cn(innerGlassEffectClasses, "p-3 text-xs")}>
                    <div className="flex items-center gap-2 mb-1">
                      {leg.airline_logo && <Image src={leg.airline_logo} alt={leg.airline || ""} width={20} height={20} className="rounded-sm"/>}
                      <span className="font-semibold text-card-foreground">{leg.airline} {leg.flight_number}</span>
                      {leg.airplane && <span className="text-muted-foreground text-[0.7rem]">({leg.airplane})</span>}
                    </div>
                    <p><strong className="text-card-foreground/80">Departs:</strong> {leg.departure_airport?.name} ({leg.departure_airport?.id}) at {leg.departure_airport?.time}</p>
                    <p><strong className="text-card-foreground/80">Arrives:</strong> {leg.arrival_airport?.name} ({leg.arrival_airport?.id}) at {leg.arrival_airport?.time}</p>
                    <p><strong className="text-card-foreground/80">Duration:</strong> {formatLegDuration(leg.duration)}</p>
                    {leg.travel_class && <p><strong className="text-card-foreground/80">Class:</strong> {leg.travel_class}</p>}
                    {leg.extensions && leg.extensions.length > 0 && <p><strong className="text-card-foreground/80">Notes:</strong> {leg.extensions.join(', ')}</p>}
                  </Card>
                ))}
              </div>
            )}

            {flight.layovers && flight.layovers.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <h4 className="text-sm font-semibold text-card-foreground">Layovers:</h4>
                {flight.layovers.map((layover, index) => (
                  <p key={index} className="text-xs text-muted-foreground pl-2">
                    - {layover.name || layover.id} ({formatLegDuration(layover.duration)})
                  </p>
                ))}
              </div>
            )}
             {flight.carbon_emissions && (
              <p className="text-xs text-muted-foreground italic border-t border-border/20 pt-2 mt-2">
                Estimated CO₂: {flight.carbon_emissions.this_flight || 'N/A'}kg 
                {flight.carbon_emissions.difference_percent !== undefined && 
                ` (${flight.carbon_emissions.difference_percent > 0 ? '+' : ''}${flight.carbon_emissions.difference_percent}% vs typical for route)`}
              </p>
            )}
          </div>
        </ScrollArea>
        <DialogFooter className={cn("p-4 sm:p-6 border-t border-border/30", "glass-pane")}>
          {flight.link ? (
            <Button asChild size="lg" className={cn(prominentButtonClasses, "w-full")}>
              <a href={flight.link} target="_blank" rel="noopener noreferrer">
                <Globe className="mr-2" /> View on Google Flights
              </a>
            </Button>
          ) : (
            <Button size="lg" className={cn(prominentButtonClasses, "w-full")} disabled>
               Booking Link Not Available
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


interface UserLocation { latitude: number; longitude: number; }
const modernMapStyle: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "hsl(var(--primary))" }, { lightness: -20 }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] },
];

const priceLevelMapping: Record<string, number> = {
  "very low": 1, "low": 2, "average": 3, "slightly high": 4,
  "high": 5, "peak": 6, "very high": 7,
};
const priceIndicatorToNumericForGraph = (indicator: string): number => {
  const lowerIndicator = indicator.toLowerCase();
  for (const key in priceLevelMapping) {
    if (lowerIndicator.includes(key)) {
      return priceLevelMapping[key];
    }
  }
  return 3; 
};

const yAxisTickFormatter = (value: number): string => {
  const mapping: Record<number, string> = {
    1: "V.Low", 2: "Low", 3: "Avg", 4: "S.High", 5: "High", 6: "Peak", 7: "V.High"
  };
  return mapping[value] || value.toString(); 
};

const priceGraphChartConfig = {
  priceLevel: {
    label: "Rel. Price Level",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;


export default function FlightsPage() {
  const [tripType, setTripType] = useState<"round-trip" | "one-way">("round-trip"); 
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [dates, setDates] = useState<DateRange | undefined>(undefined);

  const originInputRef = useRef<HTMLInputElement>(null);
  const destinationInputRef = useRef<HTMLInputElement>(null);
  const mapDealTargetDestinationCityInputRef = useRef<HTMLInputElement>(null);
  const trackOriginInputRef = useRef<HTMLInputElement>(null);
  const trackDestinationInputRef = useRef<HTMLInputElement>(null);
  const dateGridOriginInputRef = useRef<HTMLInputElement>(null);
  const dateGridDestinationInputRef = useRef<HTMLInputElement>(null);
  const priceGraphOriginInputRef = useRef<HTMLInputElement>(null);
  const priceGraphDestinationInputRef = useRef<HTMLInputElement>(null);


  const [passengers, setPassengers] = useState("1 adult"); 
  const [cabinClass, setCabinClass] = useState("economy"); 


  const [isLoadingRealFlights, setIsLoadingRealFlights] = useState(false);
  const [realFlightData, setRealFlightData] = useState<SerpApiFlightSearchOutput | null>(null);
  const [selectedFlightForDetails, setSelectedFlightForDetails] = useState<SerpApiFlightOption | null>(null);
  const [isFlightDetailsDialogOpen, setIsFlightDetailsDialogOpen] = useState(false);


  const { toast } = useToast();
  const router = useRouter();
  const { currentUser } = useAuth();
  const addTrackedItemMutation = useAddTrackedItem();

  const [generalAiDestinations, setGeneralAiDestinations] = useState<AiDestinationSuggestion[]>([]);
  const [isFetchingGeneralDests, setIsFetchingGeneralDests] = useState(false);
  const [generalDestsError, setGeneralDestsError] = useState<string | null>(null);
  const [generalContextualNote, setGeneralContextualNote] = useState<string | null>(null);

  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isFetchingUserLocationForSuggestions, setIsFetchingUserLocationForSuggestions] = useState(false);
  const [geolocationSuggestionsError, setGeolocationSuggestionsError] = useState<string | null>(null);
  const [locationAiDestinations, setLocationAiDestinations] = useState<AiDestinationSuggestion[]>([]);
  const [isFetchingLocationDests, setIsFetchingLocationDests] = useState(false);
  const [locationDestsError, setLocationDestsError] = useState<string | null>(null);
  const [locationContextualNote, setLocationContextualNote] = useState<string | null>(null);

  const [mapDealTargetDestinationCity, setMapDealTargetDestinationCity] = useState('');
  const [isFetchingMapDeals, setIsFetchingMapDeals] = useState(false);
  const [mapDealSuggestions, setMapDealSuggestions] = useState<AiFlightMapDealSuggestion[]>([]);
  const [mapDealError, setMapDealError] = useState<string | null>(null);
  const [selectedMapDeal, setSelectedMapDeal] = useState<AiFlightMapDealSuggestion | null>(null);
  const [isMapDealDialogOpen, setIsMapDealDialogOpen] = useState(false);
  const mapDealMarkersRef = useRef<(google.maps.OverlayView | google.maps.Marker)[]>([]);
  const routePolylineRef = useRef<google.maps.Polyline | null>(null);
  const userLocationMarkerRef = useRef<google.maps.Marker | null>(null);

  const [trackOrigin, setTrackOrigin] = useState('');
  const [trackDestination, setTrackDestination] = useState('');
  const [trackTravelDates, setTrackTravelDates] = useState('');
  const [trackTargetPrice, setTrackTargetPrice] = useState('');
  const [trackCurrentConceptualPrice, setTrackCurrentConceptualPrice] = useState('');
  const [trackPriceAiAdvice, setTrackPriceAiAdvice] = useState<string | null>(null);
  const [isTrackingPrice, setIsTrackingPrice] = useState(false);

  const [dateGridOrigin, setDateGridOrigin] = useState('');
  const [dateGridDestination, setDateGridDestination] = useState('');
  const [dateGridMonth, setDateGridMonth] = useState('');
  const [dateGridResult, setDateGridResult] = useState<ConceptualDateGridOutput | null>(null);
  const [isLoadingDateGrid, setIsLoadingDateGrid] = useState(false);

  const [priceGraphOrigin, setPriceGraphOrigin] = useState('');
  const [priceGraphDestination, setPriceGraphDestination] = useState('');
  const [priceGraphDatesHint, setPriceGraphDatesHint] = useState('');
  const [priceGraphResult, setPriceGraphResult] = useState<ConceptualPriceGraphOutput | null>(null);
  const [isLoadingPriceGraph, setIsLoadingPriceGraph] = useState(false);


  const [map, setMap] = useState<google.maps.Map | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [isMapsScriptLoaded, setIsMapsScriptLoaded] = useState(false);
  const [mapsApiError, setMapsApiError] = useState<string | null>(null);
  const [isMapInitializing, setIsMapInitializing] = useState(true); 
  const [isFetchingUserLocationForMap, setIsFetchingUserLocationForMap] = useState(true); 
  const [geolocationMapError, setGeolocationMapError] = useState<string | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    setDates({ from: new Date(), to: addDays(new Date(), 7) });
  }, []);


  const initGoogleMapsApiFlightsPage = useCallback(() => {
    console.log("[FlightsPage] Google Maps API script loaded callback executed.");
    setIsMapsScriptLoaded(true);
  }, []);

  useEffect(() => {
    if (!apiKey) {
      console.error("[FlightsPage] Google Maps API key is missing.");
      setMapsApiError("Google Maps API key is missing. Map functionality is disabled.");
      setIsFetchingUserLocationForMap(false);
      setIsMapInitializing(false);
      return;
    }
    if (typeof window !== 'undefined' && window.google && window.google.maps) {
      if(!isMapsScriptLoaded) setIsMapsScriptLoaded(true); return;
    }
    const scriptId = 'google-maps-flights-page-script';
    if (document.getElementById(scriptId)) {
      if (typeof window !== 'undefined' && window.google && window.google.maps && !isMapsScriptLoaded) setIsMapsScriptLoaded(true);
      return;
    }
    console.log("[FlightsPage] Attempting to load Google Maps API script...");
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMapsApiFlightsPage&libraries=places,marker,geometry`;
    script.async = true; script.defer = true;
    script.onerror = () => {
      console.error("[FlightsPage] Failed to load Google Maps API script.");
      setMapsApiError("Failed to load Google Maps script. Please check API key and network.");
      setIsMapsScriptLoaded(false);
      setIsFetchingUserLocationForMap(false);
      setIsMapInitializing(false);
    };
    (window as any).initGoogleMapsApiFlightsPage = initGoogleMapsApiFlightsPage;
    document.head.appendChild(script);
    return () => { if ((window as any).initGoogleMapsApiFlightsPage) delete (window as any).initGoogleMapsApiFlightsPage; };
  }, [apiKey, isMapsScriptLoaded, initGoogleMapsApiFlightsPage]);

  const initializeMap = useCallback((center: google.maps.LatLngLiteral, zoom: number) => {
    if (!mapRef.current || !window.google || !window.google.maps) {
      console.warn("[FlightsPage] Map ref not ready or Google Maps not loaded for initializeMap.");
      setIsMapInitializing(false); return;
    }
    try {
      console.log(`[FlightsPage] Initializing map at center: ${JSON.stringify(center)} with zoom ${zoom}`);
      const newMap = new window.google.maps.Map(mapRef.current!, {
        center, zoom, styles: modernMapStyle,
        mapTypeControl: true, mapTypeControlOptions: { style: window.google.maps.MapTypeControlStyle.HORIZONTAL_BAR, position: window.google.maps.ControlPosition.TOP_RIGHT },
        streetViewControl: false, fullscreenControl: true, zoomControl: true,
      });
      setMap(newMap);
      console.log("[FlightsPage] Map initialized successfully.");
    } catch (error) { console.error("[FlightsPage] Error initializing map:", error); setMapsApiError("Error initializing map."); }
    finally { setIsMapInitializing(false); }
  }, []);

   useEffect(() => {
    console.log(`[FlightsPage] Map/Location Effect: isMapsScriptLoaded=${isMapsScriptLoaded}, mapRef.current=${!!mapRef.current}, !map=${!map}, isFetchingUserLocationForMap=${isFetchingUserLocationForMap}`);
    if (isMapsScriptLoaded && mapRef.current && !map && isFetchingUserLocationForMap) { 
      console.log("[FlightsPage] Maps script loaded, attempting to fetch user location for initial map center.");
       setIsMapInitializing(true);
      if (navigator.geolocation) {
        console.log("[FlightsPage] Geolocation API available. Requesting current position...");
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userCoords = { lat: position.coords.latitude, lng: position.coords.longitude };
            console.log("[FlightsPage] User location fetched for map:", userCoords);
            setUserLocation({latitude: userCoords.lat, longitude: userCoords.lng});
            setGeolocationMapError(null);
            initializeMap(userCoords, 6); 
          },
          (error) => {
            console.warn("[FlightsPage] Geolocation error for map:", error);
            setGeolocationMapError(`Map geo error: ${error.message}. Centering globally.`);
            setUserLocation(null);
            initializeMap({ lat: 20, lng: 0 }, 2);
          }, { timeout: 8000, enableHighAccuracy: true, maximumAge: 0 }
        );
      } else {
        console.warn("[FlightsPage] Geolocation not supported by this browser for map.");
        setGeolocationMapError("Geolocation not supported. Centering map globally.");
        setUserLocation(null);
        initializeMap({ lat: 20, lng: 0 }, 2);
      }
      setIsFetchingUserLocationForMap(false); 
    } else if (isMapsScriptLoaded && mapRef.current && !map && !isMapInitializing && !isFetchingUserLocationForMap) { 
        console.log("[FlightsPage] Maps script loaded, geo attempt already finished/skipped, map not init. Initializing with default.");
        setIsMapInitializing(true);
        initializeMap({ lat: 20, lng: 0 }, 2);
    }
  }, [isMapsScriptLoaded, map, isMapInitializing, initializeMap, isFetchingUserLocationForMap]);


  const handleSearchFlights = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast({ title: "Please Log In", description: "You need to be logged in to search for flights.", variant: "destructive" });
      return;
    }
    if (!origin || !destination || !dates?.from) {
      toast({ title: "Missing Information", description: "Please provide origin, destination, and departure date.", variant: "destructive" });
      return;
    }

    setIsLoadingRealFlights(true);
    setRealFlightData(null);
    
    const input: SerpApiFlightSearchInput = {
      origin,
      destination,
      departureDate: format(dates.from, "yyyy-MM-dd"),
      returnDate: dates.to && tripType === 'round-trip' ? format(dates.to, "yyyy-MM-dd") : undefined,
      tripType,
    };

    console.log("[FlightsPage] Calling Real Flight Search with input:", input);

    try {
      const result: SerpApiFlightSearchOutput = await getRealFlightsAction(input);
      console.log("[FlightsPage] Real Flight Search result:", result);
      setRealFlightData(result);
      if (result.error || (!result.best_flights?.length && !result.other_flights?.length)) {
        toast({
          title: "No Flights Found",
          description: result.error || result.search_summary || "SerpApi couldn't find flight options for this search. Try different parameters.",
          variant: "default"
        });
      } else {
         toast({
          title: "Flight Search Complete!",
          description: result.search_summary || "Scroll down to see flight options.",
        });
      }
    } catch (error: any) {
      console.error("[FlightsPage] Error calling Real Flight Search:", error);
      toast({
        title: "Search Error",
        description: `Failed to get flight ideas: ${error.message || 'Unknown error'}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsLoadingRealFlights(false);
    }
  };

  const handlePlanTripFromSuggestion = (tripIdea: AITripPlannerInput) => {
    console.log("[FlightsPage] Preparing to plan trip from suggestion:", tripIdea);
    localStorage.setItem('tripBundleToPlan', JSON.stringify(tripIdea));
    window.dispatchEvent(new CustomEvent('localStorageUpdated_tripBundleToPlan'));
    router.push('/planner');
  };

  const fetchGeneralPopularFlightDests = useCallback(async () => {
    console.log("[FlightsPage] Fetching general popular flight destinations...");
    setIsFetchingGeneralDests(true); setGeneralDestsError(null); setGeneralContextualNote(null);
    try {
      const result = await getPopularDestinations({});
      console.log("[FlightsPage] General popular destinations result:", result);
      if (result && result.destinations) {
        const processed = result.destinations.map(d => ({ ...d, imageUri: d.imageUri || `https://placehold.co/600x400.png?text=${encodeURIComponent(d.name.substring(0, 10))}` }));
        setGeneralAiDestinations(processed);
      } else {
         setGeneralAiDestinations([]);
      }
       setGeneralContextualNote(result?.contextualNote || (result.destinations && result.destinations.length === 0 ? "AI couldn't find general flight destinations. Try again later!" : "Explore these popular spots for flights!"));
    } catch (error: any) {
        console.error("[FlightsPage] Error fetching general AI destinations:", error);
        setGeneralDestsError(`Could not fetch general suggestions: ${error.message}`);
        setGeneralContextualNote("Error fetching general suggestions. Please try again.");
    }
    finally { setIsFetchingGeneralDests(false); }
  }, []);

  const handleFetchLocationAndDests = useCallback(async () => {
    console.log("[FlightsPage] Attempting to fetch location-based destinations. Current userLocation:", userLocation);
    setIsFetchingLocationDests(true); setLocationDestsError(null); setLocationContextualNote(null);

    let currentLoc = userLocation;
    if (!currentLoc) {
      console.log("[FlightsPage] User location not available for suggestions, attempting to fetch on demand...");
      setIsFetchingUserLocationForSuggestions(true); setGeolocationSuggestionsError(null);
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 7000, enableHighAccuracy: true, maximumAge: 0 }));
        currentLoc = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        setUserLocation(currentLoc); 
        console.log("[FlightsPage] User location fetched on demand for AI suggestions:", currentLoc);
         setGeolocationSuggestionsError(null);
      } catch (err: any) {
        console.warn("[FlightsPage] On-demand geolocation error for AI suggestions:", err.message);
        setGeolocationSuggestionsError(`Location error: ${err.message}. Cannot fetch location-based ideas. Ensure location services are enabled and try refreshing.`);
        setLocationContextualNote(`Could not get your location to find nearby flight ideas: ${err.message}. Ensure permissions are granted.`);
        setIsFetchingLocationDests(false); setIsFetchingUserLocationForSuggestions(false); return;
      }
      finally { setIsFetchingUserLocationForSuggestions(false); }
    }

    try {
      console.log("[FlightsPage] Fetching popular destinations with location:", currentLoc);
      const result = await getPopularDestinations({ userLatitude: currentLoc?.latitude, userLongitude: currentLoc?.longitude });
      console.log("[FlightsPage] Location-based popular destinations result:", result);
      if (result && result.destinations) {
        const processed = result.destinations.map(d => ({ ...d, imageUri: d.imageUri || `https://placehold.co/600x400.png?text=${encodeURIComponent(d.name.substring(0, 10))}` }));
        setLocationAiDestinations(processed);
      } else {
        setLocationAiDestinations([]);
      }
      setLocationContextualNote(result?.contextualNote || (result.destinations && result.destinations.length === 0 ? "AI couldn't find flight destinations near you. Try exploring general ideas!" : "Popular flight spots near your location."));
    } catch (error: any) {
        console.error("[FlightsPage] Error fetching location-based AI destinations:", error);
        setLocationDestsError(`Could not fetch location-based suggestions: ${error.message}`);
        setLocationContextualNote(`Error fetching location-based ideas: ${error.message}.`);
    }
    finally { setIsFetchingLocationDests(false); }
  }, [userLocation]);

  useEffect(() => {
    fetchGeneralPopularFlightDests();
    if (userLocation && locationAiDestinations.length === 0 && !isFetchingLocationDests && !locationDestsError) { 
      handleFetchLocationAndDests();
    } else if (!userLocation && !geolocationMapError && isFetchingUserLocationForMap === false && locationAiDestinations.length === 0 && !isFetchingLocationDests) {
        
        setLocationContextualNote("Enable location or search to see relevant flight ideas.");
    }
  }, [userLocation, geolocationMapError, fetchGeneralPopularFlightDests, handleFetchLocationAndDests, locationAiDestinations.length, isFetchingLocationDests, locationDestsError, isFetchingUserLocationForMap]);


 const handleFetchMapDeals = async () => {
    if (!userLocation || typeof userLocation.latitude !== 'number' || typeof userLocation.longitude !== 'number') {
      toast({
        title: "Location Needed",
        description: "Your current location is required for the AI Deal Explorer. Please ensure location services are enabled and permissions were granted when the page loaded, then try again.",
        variant: "destructive",
        duration: 8000,
      });
      return;
    }
    if (!mapDealTargetDestinationCity.trim()) {
      toast({ title: "Destination City Required", description: "Please enter a destination city for the AI deal map.", variant: "destructive" });
      return;
    }
    if (!map) {
      toast({ title: "Map Not Ready", description: "The map is still initializing. Please wait.", variant: "destructive" });
      return;
    }

    setIsFetchingMapDeals(true); setMapDealSuggestions([]); setMapDealError(null);
    
    const originDescription = `User's current location (approx. Lat: ${userLocation.latitude.toFixed(2)}, Lon: ${userLocation.longitude.toFixed(2)})`;
    console.log(`[FlightsPage] Fetching map deals from: ${originDescription} to: ${mapDealTargetDestinationCity}`);

    try {
      const input: AiFlightMapDealInput = {
        originDescription: originDescription,
        targetDestinationCity: mapDealTargetDestinationCity
      };
      const result: AiFlightMapDealOutput = await getAiFlightMapDealsAction(input);
      console.log("[FlightsPage] Map deals result:", result);
      setMapDealSuggestions(result.suggestions || []);
      if (!result.suggestions || result.suggestions.length === 0) {
        setMapDealError(result.contextualNote || `AI couldn't find flight deal ideas to ${mapDealTargetDestinationCity} from your location.`);
      }
    } catch (error: any) {
      console.error("[FlightsPage] Error fetching AI flight map deals:", error);
      setMapDealError(`Failed to fetch flight deal ideas: ${error.message || 'Unknown error'}`);
    }
    finally { setIsFetchingMapDeals(false); }
  };

  useEffect(() => {
    if (!map || !isMapsScriptLoaded || !(window.google && window.google.maps && window.google.maps.OverlayView)) {
      mapDealMarkersRef.current.forEach(marker => marker.setMap(null)); mapDealMarkersRef.current = [];
      if(userLocationMarkerRef.current) userLocationMarkerRef.current.setMap(null); userLocationMarkerRef.current = null;
      if(routePolylineRef.current) routePolylineRef.current.setMap(null); routePolylineRef.current = null;
      return;
    }
    console.log("[FlightsPage] Updating map deal markers. Suggestions count:", mapDealSuggestions.length);

    mapDealMarkersRef.current.forEach(marker => marker.setMap(null)); mapDealMarkersRef.current = [];
    if(userLocationMarkerRef.current) userLocationMarkerRef.current.setMap(null); userLocationMarkerRef.current = null;
    if(routePolylineRef.current) routePolylineRef.current.setMap(null); routePolylineRef.current = null;

    class CustomMapDealMarker extends window.google.maps.OverlayView {
        private latlng: google.maps.LatLng; private div: HTMLDivElement | null = null; private dealData: AiFlightMapDealSuggestion;
        private clickHandler: () => void; private mapInstanceRef: google.maps.Map;
        constructor(props: { latlng: google.maps.LatLngLiteral; map: google.maps.Map; deal: AiFlightMapDealSuggestion; onClick: () => void; }) {
            super(); this.latlng = new window.google.maps.LatLng(props.latlng.lat, props.latlng.lng);
            this.dealData = props.deal; this.clickHandler = props.onClick; this.mapInstanceRef = props.map; this.setMap(props.map);
        }
        onAdd() {
            this.div = document.createElement('div'); this.div.className = 'custom-map-marker-price'; 
            this.div.innerHTML = `<span class="price-text">${this.dealData.conceptualPriceRange.split('-')[0].trim()}</span><span class="pulse-price"></span>`;
            this.div.title = `${this.dealData.destinationCity}: ${this.dealData.conceptualPriceRange}`;
            this.div.addEventListener('click', this.clickHandler);
            const panes = this.getPanes();
            if (panes && panes.overlayMouseTarget) panes.overlayMouseTarget.appendChild(this.div); else this.mapInstanceRef.getDiv().appendChild(this.div);
        }
        draw() { const proj = this.getProjection(); if (!proj || !this.div) return; const p = proj.fromLatLngToDivPixel(this.latlng); if (p) { this.div.style.left = p.x + 'px'; this.div.style.top = p.y + 'px'; } }
        onRemove() { if (this.div) { this.div.removeEventListener('click', this.clickHandler); if (this.div.parentNode) this.div.parentNode.removeChild(this.div); this.div = null; } }
        getPosition() { return this.latlng; }
    }

    const newMarkers: (google.maps.OverlayView | google.maps.Marker)[] = [];
    if (mapDealSuggestions.length > 0 && window.google && window.google.maps) {
      const bounds = new window.google.maps.LatLngBounds();

      let originLatLng: google.maps.LatLng | null = null;
      if (userLocation) {
          originLatLng = new window.google.maps.LatLng(userLocation.latitude, userLocation.longitude);
          const userMarker = new window.google.maps.Marker({
              position: originLatLng,
              map: map,
              title: "Your Location (Origin)",
              icon: {
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 8,
                  fillColor: "hsl(var(--primary))",
                  fillOpacity: 1,
                  strokeColor: "hsl(var(--background))",
                  strokeWeight: 2,
              }
          });
          newMarkers.push(userMarker);
          userLocationMarkerRef.current = userMarker;
          bounds.extend(originLatLng);
      }

      mapDealSuggestions.forEach(deal => {
        if (deal.latitude != null && deal.longitude != null) {
          const destinationLatLng = new window.google.maps.LatLng(deal.latitude, deal.longitude);
          const dealMarker = new CustomMapDealMarker({
            latlng: { lat: deal.latitude, lng: deal.longitude }, map: map, deal: deal,
            onClick: () => { setSelectedMapDeal(deal); setIsMapDealDialogOpen(true); }
          });
          newMarkers.push(dealMarker);
          bounds.extend(destinationLatLng);

          if (originLatLng) {
            const routePath = [originLatLng, destinationLatLng];
            const polyline = new window.google.maps.Polyline({
              path: routePath,
              geodesic: true,
              strokeColor: 'hsl(var(--accent))', 
              strokeOpacity: 0.9, 
              strokeWeight: 5, 
              icons: [{ 
                icon: {
                  path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                  scale: 4, 
                  strokeColor: 'hsl(var(--accent-foreground))', 
                  fillColor: 'hsl(var(--accent))', 
                  fillOpacity: 1,
                },
                offset: '100%', 
                repeat: '80px' 
              }]
            });
            polyline.setMap(map);
            if (routePolylineRef.current) routePolylineRef.current.setMap(null); 
            routePolylineRef.current = polyline; 
          }
        }
      });
      mapDealMarkersRef.current = newMarkers;

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, {top: 50, bottom: 50, left: 50, right: 50}); 
        const listenerId = window.google.maps.event.addListenerOnce(map, 'idle', () => {
          let currentZoom = map.getZoom() || 0;
          if (currentZoom > 10 && newMarkers.length > 2) { 
            map.setZoom(Math.min(currentZoom, 10));
          } else if (currentZoom > 12) {
             map.setZoom(12);
          }
        });
      }
    }
  }, [map, isMapsScriptLoaded, mapDealSuggestions, userLocation, setSelectedMapDeal, setIsMapDealDialogOpen]);

 const initializeAutocomplete = useCallback((inputRef: React.RefObject<HTMLInputElement>, onPlaceChanged: (place: google.maps.places.PlaceResult) => void, options?: google.maps.places.AutocompleteOptions) => {
    if (isMapsScriptLoaded && window.google && window.google.maps.places && inputRef.current) {
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, options);
      autocomplete.setFields(['formatted_address', 'name', 'geometry']);
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.geometry || place.formatted_address || place.name) {
          onPlaceChanged(place);
        }
      });
    }
  }, [isMapsScriptLoaded]);

  useEffect(() => {
    initializeAutocomplete(originInputRef, (place) => setOrigin(place.formatted_address || place.name || ''), { types: ['geocode'] });
    initializeAutocomplete(destinationInputRef, (place) => setDestination(place.formatted_address || place.name || ''), { types: ['geocode'] });
    initializeAutocomplete(mapDealTargetDestinationCityInputRef, (place) => setMapDealTargetDestinationCity(place.formatted_address || place.name || ''), { types: ['(cities)'] });
    
    initializeAutocomplete(trackOriginInputRef, (place) => setTrackOrigin(place.formatted_address || place.name || ''), { types: ['geocode'] });
    initializeAutocomplete(trackDestinationInputRef, (place) => setTrackDestination(place.formatted_address || place.name || ''), { types: ['geocode'] });

    initializeAutocomplete(dateGridOriginInputRef, (place) => setDateGridOrigin(place.formatted_address || place.name || ''), { types: ['geocode'] });
    initializeAutocomplete(dateGridDestinationInputRef, (place) => setDateGridDestination(place.formatted_address || place.name || ''), { types: ['geocode'] });
    
    initializeAutocomplete(priceGraphOriginInputRef, (place) => setPriceGraphOrigin(place.formatted_address || place.name || ''), { types: ['geocode'] });
    initializeAutocomplete(priceGraphDestinationInputRef, (place) => setPriceGraphDestination(place.formatted_address || place.name || ''), { types: ['geocode'] });

  }, [isMapsScriptLoaded, initializeAutocomplete]);

  const handleTrackPriceAndGetAdvice = async () => {
    if (!currentUser) {
      toast({ title: "Please Log In", description: "You need to be logged in to track prices.", variant: "destructive" });
      return;
    }

    const currentTrackOrigin = trackOrigin.trim();
    const currentTrackDestination = trackDestination.trim();
    const currentTrackTargetPrice = trackTargetPrice.trim();
    const currentTrackCurrentConceptualPrice = trackCurrentConceptualPrice.trim();

    if (!currentTrackOrigin || !currentTrackDestination || !currentTrackTargetPrice || !currentTrackCurrentConceptualPrice) {
      let missingFields = [];
      if (!currentTrackOrigin) missingFields.push("Origin");
      if (!currentTrackDestination) missingFields.push("Destination");
      if (!currentTrackTargetPrice) missingFields.push("Target Price");
      if (!currentTrackCurrentConceptualPrice) missingFields.push("Current Price");
      
      toast({ 
        title: "Missing Information", 
        description: `Please fill in the following required fields for price tracking: ${missingFields.join(', ')}.`, 
        variant: "destructive" 
      });
      return;
    }
    const targetPriceNum = parseFloat(currentTrackTargetPrice);
    const currentPriceNum = parseFloat(currentTrackCurrentConceptualPrice);

    if (isNaN(targetPriceNum) || targetPriceNum <= 0 || isNaN(currentPriceNum) || currentPriceNum <= 0) {
      toast({ title: "Invalid Price", description: "Target and current prices must be positive numbers.", variant: "destructive" });
      return;
    }

    setIsTrackingPrice(true);
    setTrackPriceAiAdvice(null);
    try {
      const itemName = `Flight from ${currentTrackOrigin} to ${currentTrackDestination}`;
      await addTrackedItemMutation.mutateAsync({
        itemType: 'flight',
        itemName,
        originCity: currentTrackOrigin,
        destination: currentTrackDestination,
        targetPrice: targetPriceNum,
        currentPrice: currentPriceNum,
        travelDates: trackTravelDates.trim() || undefined,
      });
      toast({ title: "Price Tracking Started", description: `${itemName} is now being tracked!` });

      const adviceInput: PriceAdvisorInput = {
        itemType: 'flight',
        itemName,
        originCity: currentTrackOrigin,
        destination: currentTrackDestination,
        targetPrice: targetPriceNum,
        currentPrice: currentPriceNum,
      };
      const adviceResult = await getPriceAdviceAction(adviceInput);
      setTrackPriceAiAdvice(adviceResult.advice);
    } catch (error: any) {
      console.error("Error tracking price or getting advice:", error);
      toast({ title: "Error", description: `Could not start tracking or get advice: ${error.message}`, variant: "destructive" });
    } finally {
      setIsTrackingPrice(false);
    }
  };

  const handleGetDateGridInsights = async () => {
    if (!dateGridOrigin || !dateGridDestination || !dateGridMonth) {
      toast({ title: "Missing Information", description: "Origin, Destination, and Month are required for Date Grid.", variant: "destructive"});
      return;
    }
    setIsLoadingDateGrid(true); setDateGridResult(null);
    try {
      const result = await getConceptualDateGridAction({ origin: dateGridOrigin, destination: dateGridDestination, monthToExplore: dateGridMonth });
      setDateGridResult(result);
      if (!result.gridSummary && (!result.datePricePoints || result.datePricePoints.length === 0)) {
        toast({ title: "No Insights", description: "AI couldn't generate date grid insights for this query."});
      }
    } catch (error: any) {
      toast({ title: "AI Error", description: `Failed to get date grid insights: ${error.message}`, variant: "destructive"});
    } finally {
      setIsLoadingDateGrid(false);
    }
  };

  const handleGetPriceTrendInsights = async () => {
    if (!priceGraphOrigin || !priceGraphDestination || !priceGraphDatesHint) {
      toast({ title: "Missing Information", description: "Origin, Destination, and Dates Hint are required for Price Graph.", variant: "destructive"});
      return;
    }
    setIsLoadingPriceGraph(true); setPriceGraphResult(null);
    try {
      const result = await getConceptualPriceGraphAction({ origin: priceGraphOrigin, destination: priceGraphDestination, travelDatesHint: priceGraphDatesHint });
      setPriceGraphResult(result);
       if (!result.trendDescription && (!result.conceptualDataPoints || result.conceptualDataPoints.length === 0)) {
        toast({ title: "No Insights", description: "AI couldn't generate price trend insights for this query."});
      }
    } catch (error: any) {
      toast({ title: "AI Error", description: `Failed to get price trend insights: ${error.message}`, variant: "destructive"});
    } finally {
      setIsLoadingPriceGraph(false);
    }
  };


  return (
    <div className="container mx-auto py-8 px-4 animate-fade-in-up space-y-12">
      <Card className={cn(glassCardClasses, "mb-8 overflow-hidden shadow-xl border-primary/30")}>
        <CardHeader className="bg-primary/5 p-6">
          <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center">
            <Plane className="w-7 h-7 sm:w-8 sm:h-8 mr-3 text-primary" />
            Book Your Flight
          </CardTitle>
          <CardDescription className="text-muted-foreground text-sm sm:text-base">
            Enter your travel details below. Our AI, powered by SerpApi, will help you find flight options and provide insights.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSearchFlights} className="space-y-6">
            <RadioGroup 
              value={tripType} 
              onValueChange={(value: "round-trip" | "one-way") => setTripType(value)} 
              className="grid grid-cols-2 gap-3 mb-5"
            >
              {["round-trip", "one-way"].map((type) => (
                <FormItem key={type} className="flex-1">
                  <RadioGroupItem value={type} id={`tripType-${type}`} className="sr-only peer" />
                  <Label 
                    htmlFor={`tripType-${type}`} 
                    className={cn(
                      "flex items-center justify-center p-3 text-sm font-medium rounded-md border-2 border-muted bg-popover hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary",
                      "transition-all cursor-pointer glass-interactive shadow-sm hover:shadow-md"
                    )}
                  >
                    {type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Label>
                </FormItem>
              ))}
            </RadioGroup>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 items-end">
              <div className="relative">
                <Label htmlFor="origin" className="text-sm font-medium text-card-foreground/90">Origin</Label>
                <Input ref={originInputRef} id="origin" value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="City or airport" className="mt-1 bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50 h-12 text-base" />
              </div>
              <div className="relative flex items-center md:self-end">
                <Button variant="ghost" size="icon" className="mx-1 text-muted-foreground hover:bg-accent/10 hidden md:flex" type="button" onClick={() => { setOrigin(destination); setDestination(origin); }} aria-label="Swap origin and destination"><ArrowRightLeft className="w-5 h-5" /></Button>
                <div className="flex-grow">
                  <Label htmlFor="destination" className="text-sm font-medium text-card-foreground/90">Destination</Label>
                  <Input ref={destinationInputRef} id="destination" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="City or airport" className="mt-1 bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50 h-12 text-base" />
                </div>
              </div>
            
              <div className={cn("grid gap-3", tripType === 'round-trip' ? 'grid-cols-2' : 'grid-cols-1')}>
                <div>
                  <Label htmlFor="departure-date" className="text-sm font-medium text-card-foreground/90">Departure</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal mt-1 h-12 text-base glass-interactive",!dates?.from && "text-muted-foreground")}>
                        <CalendarLucideIcon className="mr-2 h-4 w-4" />
                        {dates?.from && isValid(dates.from) ? format(dates.from, "MMM dd, yyyy") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className={cn("w-auto p-0", glassCardClasses)} align="start">
                      <Calendar mode="range" selected={dates} onSelect={setDates} initialFocus numberOfMonths={tripType === 'one-way' ? 1 : 2} disabled={{ before: new Date(new Date().setDate(new Date().getDate()-1)) }} />
                    </PopoverContent>
                  </Popover>
                </div>
                {tripType === 'round-trip' && (
                  <div>
                    <Label htmlFor="return-date" className="text-sm font-medium text-card-foreground/90">Return</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal mt-1 h-12 text-base glass-interactive",!dates?.to && "text-muted-foreground")} disabled={!dates?.from}>
                          <CalendarLucideIcon className="mr-2 h-4 w-4" />
                          {dates?.to && isValid(dates.to) ? format(dates.to, "MMM dd, yyyy") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className={cn("w-auto p-0", glassCardClasses)} align="start">
                        <Calendar mode="range" selected={dates} onSelect={setDates} initialFocus numberOfMonths={2} disabled={{ before: dates?.from || new Date(new Date().setDate(new Date().getDate()-1)) }} />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3"> 
                <div>
                  <Label htmlFor="passengers" className="text-sm font-medium text-card-foreground/90 flex items-center"><Users className="w-4 h-4 mr-1.5" /> Passengers</Label>
                  <Select value={passengers} onValueChange={setPassengers}>
                    <SelectTrigger className="mt-1 h-12 text-base bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50 glass-interactive"><SelectValue /></SelectTrigger>
                    <SelectContent className={glassCardClasses}>
                      <SelectItem value="1 adult">1 adult</SelectItem>
                      <SelectItem value="2 adults">2 adults</SelectItem>
                      <SelectItem value="3 adults">3 adults</SelectItem>
                      <SelectItem value="custom">Custom...</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="cabin-class" className="text-sm font-medium text-card-foreground/90 flex items-center"><Briefcase className="w-4 h-4 mr-1.5" /> Cabin Class</Label>
                  <Select value={cabinClass} onValueChange={setCabinClass}>
                    <SelectTrigger className="mt-1 h-12 text-base bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50 glass-interactive"><SelectValue /></SelectTrigger>
                    <SelectContent className={glassCardClasses}>
                      <SelectItem value="economy">Economy</SelectItem>
                      <SelectItem value="premium-economy">Premium Economy</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="first">First</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <Button type="submit" size="lg" className={cn("w-full gap-2 mt-6", prominentButtonClasses)} disabled={isLoadingRealFlights || !origin || !destination || !dates?.from}>
              {isLoadingRealFlights ? <Loader2 className="animate-spin" /> : <Search />}
              {isLoadingRealFlights ? 'Searching Real Flights...' : 'Search Flights (SerpApi)'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {isLoadingRealFlights && (<FlightProgressIndicator message="SerpApi is searching for flight options..." className="my-10" />)}

      {realFlightData && (realFlightData.best_flights?.length || realFlightData.other_flights?.length) && !isLoadingRealFlights && (
        <div className="mt-8 animate-fade-in-up">
          <Separator className="my-6" />
           <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-2">
            Real Flight Information (from SerpApi)
          </h2>
          {realFlightData.search_summary && (
             <Alert variant="default" className={cn("mb-4 bg-primary/10 border-primary/20 text-primary text-sm")}>
                <Info className="h-4 w-4 !text-primary" />
                <ShadcnAlertTitle className="font-semibold">Search Note</ShadcnAlertTitle>
                <ShadcnAlertDescription className="text-primary/80">
                {realFlightData.search_summary}
                </ShadcnAlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {(realFlightData.best_flights || []).concat(realFlightData.other_flights || []).map((flightOpt, index) => ( 
              <RealFlightResultCard 
                key={`real-flight-${index}-${flightOpt.flights?.[0]?.flight_number || index}`} 
                flightOption={flightOpt}
                onViewDetails={() => { setSelectedFlightForDetails(flightOpt); setIsFlightDetailsDialogOpen(true); }}
              />
            ))}
          </div>
        </div>
      )}
      {!isLoadingRealFlights && realFlightData && (!realFlightData.best_flights?.length && !realFlightData.other_flights?.length) && (
         <div className="mt-8 text-center text-muted-foreground">
          {realFlightData.search_summary || realFlightData.error || "No flight options found by SerpApi for this query. Try adjusting your search."}
          </div>
      )}
       {!isLoadingRealFlights && realFlightData?.error && (
         <Alert variant="destructive" className="mt-8">
            <AlertTriangle className="h-4 w-4" />
            <ShadcnAlertTitle>Search Error</ShadcnAlertTitle>
            <ShadcnAlertDescription>{realFlightData.error}</ShadcnAlertDescription>
         </Alert>
      )}


      <Separator className="my-12 border-border/40" />

      
      <section className="animate-fade-in-up" style={{animationDelay: '0.2s'}}>
        <Card className={cn(glassCardClasses, "border-primary/30")}>
          <CardHeader>
            <CardTitle className="flex items-center text-xl text-card-foreground">
                <LucideMap className="w-7 h-7 mr-3 text-primary"/> AI-Powered Flight Deal Explorer Map
            </CardTitle>
            <CardDescription className="text-muted-foreground">
                Enter a destination city. Aura AI will find conceptual flight deals from your current location and plot the route.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-grow">
                    <Label htmlFor="map-deal-target-destination" className="text-sm font-medium text-card-foreground/90">Enter Destination City for AI Deals</Label>
                    <Input
                        ref={mapDealTargetDestinationCityInputRef}
                        id="map-deal-target-destination"
                        value={mapDealTargetDestinationCity}
                        onChange={(e) => setMapDealTargetDestinationCity(e.target.value)}
                        placeholder="e.g., London, UK"
                        className="mt-1 bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50 h-11 text-base"
                    />
                </div>
                <Button onClick={handleFetchMapDeals} disabled={isFetchingMapDeals || !mapDealTargetDestinationCity.trim() || isFetchingUserLocationForMap} className={cn(prominentButtonClassesSm, "w-full sm:w-auto h-11")}>
                    {isFetchingMapDeals || isFetchingUserLocationForMap ? <Loader2 className="animate-spin" /> : <Sparkles />}
                    {isFetchingMapDeals ? "Scouting..." : (isFetchingUserLocationForMap ? "Getting Loc..." : "Explore Deals on Map")}
                </Button>
            </div>

            <div className={cn("h-[450px] p-1 rounded-lg shadow-inner", innerGlassEffectClasses, "border-primary/20")}>
              {mapsApiError && <div className="w-full h-full flex flex-col items-center justify-center bg-destructive/10 text-destructive-foreground p-3 rounded-md"><AlertTriangle className="w-10 h-10 mb-2"/><p className="font-semibold">Map Error</p><p className="text-xs text-center">{mapsApiError}</p></div>}
              {(!mapsApiError && (isMapInitializing || isFetchingUserLocationForMap)) && <FlightProgressIndicator message={isFetchingUserLocationForMap ? "Getting your location for map..." : "Initializing Map..."} className="h-full" />}
              <div ref={mapRef} className={cn("w-full h-full rounded-md", (mapsApiError || isMapInitializing || isFetchingUserLocationForMap) ? "hidden" : "")} />
            </div>
            {geolocationMapError && <p className="text-xs text-center text-amber-500 mt-1"><Info className="inline w-3 h-3 mr-1"/>{geolocationMapError}</p>}


            {isFetchingMapDeals && mapDealSuggestions.length === 0 && <FlightProgressIndicator message={`Aura AI is searching for flight deal ideas to ${mapDealTargetDestinationCity} from your location...`} className="py-4" />}
            {mapDealError && !isFetchingMapDeals && <div className="text-center py-3 text-sm text-destructive"><AlertTriangle className="inline w-4 h-4 mr-1.5"/>{mapDealError}</div>}
            {!isFetchingMapDeals && mapDealSuggestions.length === 0 && mapDealTargetDestinationCity && !mapDealError && <div className="text-center py-3 text-sm text-muted-foreground">No specific AI deal suggestions found for {mapDealTargetDestinationCity} from your location. Try another destination.</div>}
          </CardContent>
        </Card>
      </section>

      <Separator className="my-12 border-border/40" />

      <section className="animate-fade-in-up" style={{animationDelay: '0.4s'}}>
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground flex items-center"><Sparkles className="w-7 h-7 mr-3 text-accent" />Explore Flight Destinations (General)</h2>
          <Button onClick={fetchGeneralPopularFlightDests} disabled={isFetchingGeneralDests} className={cn(prominentButtonClassesSm, "text-base py-2 px-4")}>
            {isFetchingGeneralDests ? <Loader2 className="animate-spin" /> : <Sparkles />} {isFetchingGeneralDests ? "Loading Ideas..." : "Refresh General Ideas"}
          </Button>
        </div>
         {isFetchingGeneralDests && (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <Card key={i} className={cn(glassCardClasses, "animate-pulse")}><CardHeader><div className="h-32 bg-muted/40 rounded-md"></div><div className="h-5 w-3/4 bg-muted/40 rounded mt-2"></div></CardHeader><CardContent><div className="h-3 w-full bg-muted/40 rounded mb-1"></div><div className="h-3 w-5/6 bg-muted/40 rounded"></div></CardContent><CardFooter><div className="h-8 w-full bg-muted/40 rounded-md"></div></CardFooter></Card>)}</div>)}

        {!isFetchingGeneralDests && generalDestsError && (
            <Alert variant="destructive" className={cn(glassCardClasses, "p-6 text-center border-destructive/50")}>
                <AlertTriangle className="w-10 h-10 mx-auto mb-2" />
                <ShadcnAlertTitle>Error Fetching General Ideas</ShadcnAlertTitle>
                <ShadcnAlertDescription>{generalDestsError}</ShadcnAlertDescription>
            </Alert>
        )}
         {!isFetchingGeneralDests && generalAiDestinations.length === 0 && generalContextualNote && (
            <Alert variant="default" className={cn("mb-4 bg-primary/10 border-primary/20 text-primary text-sm")}>
              <Info className="h-4 w-4 !text-primary" />
              <ShadcnAlertTitle className="font-semibold">Aura's Note</ShadcnAlertTitle>
              <ShadcnAlertDescription className="text-primary/80">
                {generalContextualNote}
              </ShadcnAlertDescription>
            </Alert>
        )}
         {!isFetchingGeneralDests && generalAiDestinations.length === 0 && !generalContextualNote && !generalDestsError && (
          <div className={cn(glassCardClasses, "p-6 text-center text-muted-foreground")}>
            Click "Refresh General Ideas" to let Aura AI suggest some flight destinations!
          </div>
        )}
        {!isFetchingGeneralDests && generalAiDestinations.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {generalAiDestinations.map((dest, index) => (<FlightDestinationSuggestionCard key={`gen-dest-${index}-${dest.name}`} destination={dest} onPlanTrip={handlePlanTripFromSuggestion} />))}
          </div>
        )}
      </section>

      <Separator className="my-12 border-border/40" />

      
      <section className="animate-fade-in-up" style={{animationDelay: '0.6s'}}>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-6">Useful tools to help you find the best flight deals</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <Card className={cn(glassCardClasses, "flex flex-col border-accent/30")}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3"><TrendingUp className="w-8 h-8 text-accent" /><CardTitle className="text-lg text-card-foreground">Track Prices &amp; Get AI Advice</CardTitle></div>
              <CardDescription className="text-xs text-muted-foreground pt-1">Monitor flight prices and get AI insights.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-3 mt-2">
              <div><Label htmlFor="track-origin" className="text-xs text-muted-foreground">Origin</Label><Input ref={trackOriginInputRef} id="track-origin" value={trackOrigin} onChange={e => setTrackOrigin(e.target.value)} placeholder="e.g., New York" className="mt-0.5 bg-input/50 border-border/50 h-9 text-sm" /></div>
              <div><Label htmlFor="track-dest" className="text-xs text-muted-foreground">Destination</Label><Input ref={trackDestinationInputRef} id="track-dest" value={trackDestination} onChange={e => setTrackDestination(e.target.value)} placeholder="e.g., London" className="mt-0.5 bg-input/50 border-border/50 h-9 text-sm" /></div>
              <div><Label htmlFor="track-dates" className="text-xs text-muted-foreground">Travel Dates (Optional)</Label><Input id="track-dates" value={trackTravelDates} onChange={e => setTrackTravelDates(e.target.value)} placeholder="e.g., Mid-December" className="mt-0.5 bg-input/50 border-border/50 h-9 text-sm" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label htmlFor="track-target-price" className="text-xs text-muted-foreground">Target Price ($)</Label><Input id="track-target-price" type="number" value={trackTargetPrice} onChange={e => setTrackTargetPrice(e.target.value)} placeholder="e.g., 300" className="mt-0.5 bg-input/50 border-border/50 h-9 text-sm" /></div>
                <div><Label htmlFor="track-current-price" className="text-xs text-muted-foreground">Current Price ($)</Label><Input id="track-current-price" type="number" value={trackCurrentConceptualPrice} onChange={e => setTrackCurrentConceptualPrice(e.target.value)} placeholder="e.g., 350" className="mt-0.5 bg-input/50 border-border/50 h-9 text-sm" /></div>
              </div>
              {trackPriceAiAdvice && (
                <Alert variant="default" className="p-2.5 text-xs border-accent/50 bg-accent/10 text-card-foreground">
                  <Sparkles className="h-4 w-4 text-accent" />
                  <ShadcnAlertTitle className="text-xs font-semibold text-accent mb-0.5">AI Advice</ShadcnAlertTitle>
                  <ShadcnAlertDescription className="text-xs">{trackPriceAiAdvice}</ShadcnAlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleTrackPriceAndGetAdvice} 
                className={cn("w-full glass-interactive py-2 text-sm", prominentButtonClassesSm)} 
                disabled={isTrackingPrice || !currentUser || !trackOrigin.trim() || !trackDestination.trim() || !trackTargetPrice.trim() || !trackCurrentConceptualPrice.trim()}
              >
                {isTrackingPrice ? <Loader2 className="animate-spin"/> : <CheckCircle />}
                {isTrackingPrice ? "Processing..." : "Track &amp; Get Advice"}
              </Button>
            </CardFooter>
          </Card>

          
          <Card className={cn(glassCardClasses, "flex flex-col border-accent/30")}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3"><Grid2X2 className="w-8 h-8 text-accent" /><CardTitle className="text-lg text-card-foreground">Conceptual Date Grid</CardTitle></div>
              <CardDescription className="text-xs text-muted-foreground pt-1">AI insights on price variations across dates.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-3 mt-2">
              <div><Label htmlFor="date-grid-origin" className="text-xs text-muted-foreground">Origin</Label><Input ref={dateGridOriginInputRef} id="date-grid-origin" value={dateGridOrigin} onChange={e => setDateGridOrigin(e.target.value)} placeholder="e.g., Los Angeles" className="mt-0.5 bg-input/50 border-border/50 h-9 text-sm" /></div>
              <div><Label htmlFor="date-grid-dest" className="text-xs text-muted-foreground">Destination</Label><Input ref={dateGridDestinationInputRef} id="date-grid-dest" value={dateGridDestination} onChange={e => setDateGridDestination(e.target.value)} placeholder="e.g., Tokyo" className="mt-0.5 bg-input/50 border-border/50 h-9 text-sm" /></div>
              <div><Label htmlFor="date-grid-month" className="text-xs text-muted-foreground">Month to Explore</Label><Input id="date-grid-month" value={dateGridMonth} onChange={e => setDateGridMonth(e.target.value)} placeholder="e.g., December 2024" className="mt-0.5 bg-input/50 border-border/50 h-9 text-sm" /></div>
              {isLoadingDateGrid && <div className="text-center py-2"><Loader2 className="w-5 h-5 animate-spin text-accent mx-auto" /></div>}
              {dateGridResult && (
                <div className={cn("p-3 mt-2 rounded-md border border-border/40 bg-background/30 text-xs space-y-2", innerGlassEffectClasses)}>
                  <p className="font-semibold text-card-foreground">AI Date Insights:</p>
                  <p className="italic text-muted-foreground">{dateGridResult.gridSummary}</p>
                  {dateGridResult.datePricePoints && dateGridResult.datePricePoints.length > 0 && (
                    <div className="pt-1 space-y-1">
                      <p className="font-medium text-card-foreground/90">Example Price Points:</p>
                      {dateGridResult.datePricePoints.map((dp, i) => (
                        <Card key={i} className={cn("p-2 bg-card/50 dark:bg-card/40 border-border/30 shadow-sm")}>
                          <p className="font-semibold text-sm text-primary">{dp.dateLabel}</p>
                          <p className="text-xs text-muted-foreground">Price Idea: <span className="text-primary/90">{dp.priceIndicator}</span></p>
                          {dp.notes && <p className="text-xs italic text-muted-foreground/80 mt-0.5">Note: {dp.notes}</p>}
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={handleGetDateGridInsights} className={cn("w-full glass-interactive py-2 text-sm", prominentButtonClassesSm)} disabled={isLoadingDateGrid}>
                 {isLoadingDateGrid ? <Loader2 className="animate-spin"/> : <Sparkles />}
                Get Date Insights
              </Button>
            </CardFooter>
          </Card>

          
          <Card className={cn(glassCardClasses, "flex flex-col border-accent/30")}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3"><PieChart className="w-8 h-8 text-accent" /><CardTitle className="text-lg text-card-foreground">Conceptual Price Graph</CardTitle></div>
              <CardDescription className="text-xs text-muted-foreground pt-1">AI insights on price trends.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-3 mt-2">
              <div><Label htmlFor="price-graph-origin" className="text-xs text-muted-foreground">Origin</Label><Input ref={priceGraphOriginInputRef} id="price-graph-origin" value={priceGraphOrigin} onChange={e => setPriceGraphOrigin(e.target.value)} placeholder="e.g., London" className="mt-0.5 bg-input/50 border-border/50 h-9 text-sm" /></div>
              <div><Label htmlFor="price-graph-dest" className="text-xs text-muted-foreground">Destination</Label><Input ref={priceGraphDestinationInputRef} id="price-graph-dest" value={priceGraphDestination} onChange={e => setPriceGraphDestination(e.target.value)} placeholder="e.g., Rome" className="mt-0.5 bg-input/50 border-border/50 h-9 text-sm" /></div>
              <div><Label htmlFor="price-graph-dates" className="text-xs text-muted-foreground">Travel Dates Hint</Label><Input id="price-graph-dates" value={priceGraphDatesHint} onChange={e => setPriceGraphDatesHint(e.target.value)} placeholder="e.g., Next 3 months" className="mt-0.5 bg-input/50 border-border/50 h-9 text-sm" /></div>
              {isLoadingPriceGraph && <div className="text-center py-2"><Loader2 className="w-5 h-5 animate-spin text-accent mx-auto" /></div>}
              {priceGraphResult && (
                 <div className={cn("p-3 mt-2 rounded-md border border-border/40 bg-background/30 text-xs space-y-2", innerGlassEffectClasses)}>
                  <p className="font-semibold text-card-foreground">AI Price Trend Insights:</p>
                  <p className="italic text-muted-foreground mb-2">{priceGraphResult.trendDescription}</p>
                   {priceGraphResult.conceptualDataPoints && priceGraphResult.conceptualDataPoints.length > 0 ? (
                    <ChartContainer config={priceGraphChartConfig} className="min-h-[200px] w-full">
                      <LineChart data={priceGraphResult.conceptualDataPoints.map(dp => ({ timeframe: dp.timeframe, priceLevel: priceIndicatorToNumericForGraph(dp.relativePriceIndicator), originalIndicator: dp.relativePriceIndicator }))}
                       margin={{ top: 5, right: 20, left: -15, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.4)" />
                        <XAxis dataKey="timeframe" tickLine={false} axisLine={false} tickMargin={8} className="text-[0.65rem]" />
                        <YAxis dataKey="priceLevel" type="number" domain={[0, 8]} ticks={[1,2,3,4,5,6,7]} tickFormatter={yAxisTickFormatter} tickLine={false} axisLine={false} tickMargin={8} className="text-[0.65rem]" />
                        <RechartsTooltip
                            cursor={false}
                            content={<ChartTooltipContent 
                                        indicator="line" 
                                        labelKey="priceLevel" 
                                        nameKey="timeframe" 
                                        formatter={(value, name, props) => {
                                            const payloadItem = props.payload?.[0]?.payload;
                                            if (payloadItem) {
                                                return (
                                                    <div className="text-xs">
                                                        <p className="font-semibold">{payloadItem.timeframe}</p>
                                                        <p>Relative Price: {payloadItem.originalIndicator}</p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />} 
                        />
                        <Line type="monotone" dataKey="priceLevel" stroke="var(--color-priceLevel)" strokeWidth={2.5} dot={{ r: 4, fill: "var(--color-priceLevel)" }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ChartContainer>
                  ) : (
                    <p className="text-muted-foreground text-center">No trend data points to display.</p>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={handleGetPriceTrendInsights} className={cn("w-full glass-interactive py-2 text-sm", prominentButtonClassesSm)} disabled={isLoadingPriceGraph}>
                {isLoadingPriceGraph ? <Loader2 className="animate-spin"/> : <Sparkles />}
                Get Trend Insights
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      <Separator className="my-12 border-border/40" />

      
      <section className="animate-fade-in-up" style={{animationDelay: '0.8s'}}>
         <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground flex items-center"><LocateFixed className="w-7 h-7 mr-3 text-accent" />Popular flight destinations {userLocation ? 'from your area' : ' (Location N/A)'}</h2>
           <Button onClick={handleFetchLocationAndDests} disabled={isFetchingUserLocationForSuggestions || isFetchingLocationDests} className={cn(prominentButtonClassesSm, "text-base py-2 px-4")}>
            {(isFetchingUserLocationForSuggestions || isFetchingLocationDests) ? <Loader2 className="animate-spin" /> : <Sparkles />}{(isFetchingUserLocationForSuggestions || isFetchingLocationDests) ? "Finding Ideas..." : "Refresh Nearby Ideas"}
          </Button>
        </div>
        {(isFetchingUserLocationForSuggestions && !userLocation) && <FlightProgressIndicator message="Fetching your location to find relevant flights..." className="my-4" />}

        {!isFetchingUserLocationForSuggestions && geolocationSuggestionsError && (
            <Alert variant="default" className={cn("mb-4 bg-amber-500/10 border-amber-500/30 text-amber-300")}>
              <AlertTriangle className="h-4 w-4 !text-amber-400" />
              <ShadcnAlertTitle className="text-amber-200">Location Error</ShadcnAlertTitle>
              <ShadcnAlertDescription className="text-amber-400/80">
                {geolocationSuggestionsError}
              </ShadcnAlertDescription>
            </Alert>
        )}

        {isFetchingLocationDests && (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <Card key={`loc-${i}`} className={cn(glassCardClasses, "animate-pulse")}><CardHeader><div className="h-32 bg-muted/40 rounded-md"></div><div className="h-5 w-3/4 bg-muted/40 rounded mt-2"></div></CardHeader><CardContent><div className="h-3 w-full bg-muted/40 rounded mb-1"></div><div className="h-3 w-5/6 bg-muted/40 rounded"></div></CardContent><CardFooter><div className="h-8 w-full bg-muted/40 rounded-md"></div></CardFooter></Card>)}</div>)}

        {!isFetchingLocationDests && locationDestsError && (
            <Alert variant="destructive" className={cn(glassCardClasses, "p-6 text-center border-destructive/50")}>
                <AlertTriangle className="w-10 h-10 mx-auto mb-2" />
                <ShadcnAlertTitle>Error Fetching Suggestions</ShadcnAlertTitle>
                <ShadcnAlertDescription>{locationDestsError}</ShadcnAlertDescription>
            </Alert>
        )}

        {!isFetchingLocationDests && locationAiDestinations.length === 0 && locationContextualNote && (
          <Alert variant="default" className={cn("mb-4 bg-primary/10 border-primary/20 text-primary text-sm")}>
            <Info className="h-4 w-4 !text-primary" />
            <ShadcnAlertTitle className="font-semibold">Aura's Note</ShadcnAlertTitle>
            <ShadcnAlertDescription className="text-primary/80">
              {locationContextualNote}
            </ShadcnAlertDescription>
          </Alert>
        )}
         {!isFetchingLocationDests && locationAiDestinations.length === 0 && !locationContextualNote && !locationDestsError && (
            <div className={cn(glassCardClasses, "p-6 text-center text-muted-foreground")}>
               {userLocation ? "Click 'Refresh Nearby Ideas' to find flight ideas from your area!" : "Enable location permissions and click the button to fetch ideas, or refresh the page."}
            </div>
        )}

        {!isFetchingLocationDests && locationAiDestinations.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {locationAiDestinations.map((dest, index) => (<FlightDestinationSuggestionCard key={`loc-dest-${index}-${dest.name}`} destination={dest} onPlanTrip={handlePlanTripFromSuggestion} />))}
          </div>
        )}
      </section>

       {selectedMapDeal && (
        <MapDealDetailsDialog
          isOpen={isMapDealDialogOpen}
          onClose={() => setIsMapDealDialogOpen(false)}
          deal={selectedMapDeal}
          onPlanTrip={handlePlanTripFromSuggestion}
        />
      )}

      {selectedFlightForDetails && (
        <RealFlightDetailsDialog
          isOpen={isFlightDetailsDialogOpen}
          onClose={() => { setIsFlightDetailsDialogOpen(false); setSelectedFlightForDetails(null);}}
          flight={selectedFlightForDetails}
        />
      )}
    </div>
  );
}
