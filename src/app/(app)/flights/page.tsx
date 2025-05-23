
"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Alert, AlertTitle as ShadcnAlertTitle, AlertDescription as ShadcnAlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

import { cn } from '@/lib/utils';
import { 
  Plane, CalendarDays as CalendarLucideIcon, Users, Briefcase, ArrowRightLeft, Search, 
  Sparkles, Star, Clock, Loader2, Map as LucideMap, Compass, DollarSign, Hotel, TrendingUp, 
  CalendarSearch, BarChartHorizontalBig, LocateFixed, ImageOff, Info, ExternalLink, AlertTriangle, X, MessageSquareQuote, MapPin
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { useToast } from '@/hooks/use-toast';
import { getPopularDestinations, getAiFlightMapDealsAction } from '@/app/actions';
import type { PopularDestinationsInput, AiDestinationSuggestion } from '@/ai/types/popular-destinations-types';
import type { AiFlightMapDealSuggestion, AiFlightMapDealOutput, AiFlightMapDealInput } from '@/ai/types/ai-flight-map-deals-types';
import type { AITripPlannerInput } from '@/ai/types/trip-planner-types';
import { useRouter } from 'next/navigation';

const glassCardClasses = "glass-card bg-card/80 dark:bg-card/50 backdrop-blur-lg border-border/20";
const innerGlassEffectClasses = "bg-card/80 dark:bg-card/50 backdrop-blur-md border border-white/10 dark:border-[hsl(var(--primary)/0.1)] rounded-md";
const prominentButtonClasses = "text-lg py-3 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:from-accent hover:to-primary focus-visible:ring-4 focus-visible:ring-primary/40 transform transition-all duration-300 ease-out hover:scale-[1.02] active:scale-100";
const prominentButtonClassesSm = "text-sm py-2 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:from-accent hover:to-primary focus-visible:ring-2 focus-visible:ring-primary/30 transform transition-all duration-300 ease-out hover:scale-[1.02] active:scale-100";


interface MockFlight {
  id: string;
  airline: string;
  airlineLogoUrl: string;
  dataAiHint?: string;
  origin: { code: string; time: string; airport: string };
  destination: { code: string; time: string; airport: string };
  duration: string;
  stops: string;
  price: number;
  isBest?: boolean;
  layoverInfo?: string;
}

const mockFlightsData: MockFlight[] = [
  { id: '1', airline: 'SkyLink Airlines', airlineLogoUrl: 'https://placehold.co/100x40.png?text=SkyLink', dataAiHint: 'airline logo', origin: { code: 'JFK', time: '08:30 AM', airport: 'John F. Kennedy Intl.' }, destination: { code: 'LAX', time: '11:45 AM', airport: 'Los Angeles Intl.' }, duration: '6h 15m', stops: 'Nonstop', price: 345, isBest: true },
  { id: '2', airline: 'Aura Airways', airlineLogoUrl: 'https://placehold.co/100x40.png?text=AuraAir', dataAiHint: 'airline logo aura', origin: { code: 'JFK', time: '10:00 AM', airport: 'John F. Kennedy Intl.' }, destination: { code: 'LAX', time: '03:30 PM', airport: 'Los Angeles Intl.' }, duration: '8h 30m', stops: '1 Stop (ORD)', price: 290, layoverInfo: '2h 00m layover in Chicago O\'Hare' },
  { id: '3', airline: 'BudgetRoam Connect', airlineLogoUrl: 'https://placehold.co/100x40.png?text=BRoam', dataAiHint: 'budget airline logo', origin: { code: 'JFK', time: '01:15 PM', airport: 'John F. Kennedy Intl.' }, destination: { code: 'LAX', time: '04:30 PM', airport: 'Los Angeles Intl.' }, duration: '6h 15m', stops: 'Nonstop', price: 315 },
];

function MockFlightCard({ flight }: { flight: MockFlight }) {
    return (
        <Card className={cn(glassCardClasses, "mb-4 transform hover:scale-[1.01] transition-transform duration-200 ease-out", flight.isBest && "border-accent/50 ring-2 ring-accent/30")}>
            <CardContent className="p-4 space-y-3">
                {flight.isBest && ( <div className="absolute -top-2 -right-2 bg-accent text-accent-foreground shadow-lg py-1 px-3 text-xs rounded-full flex items-center"><Sparkles className="w-3 h-3 mr-1.5" /> Best Value</div> )}
                <div className="flex items-center gap-4">
                    <Image src={flight.airlineLogoUrl} alt={`${flight.airline} logo`} data-ai-hint={flight.dataAiHint} width={80} height={32} className="h-8 w-auto object-contain rounded" />
                    <span className="text-sm font-medium text-card-foreground">{flight.airline}</span>
                </div>
                <div className="grid grid-cols-3 items-center gap-2 text-sm">
                    <div className="text-left"><p className="font-semibold text-lg text-card-foreground">{flight.origin.time}</p><p className="text-xs text-muted-foreground">{flight.origin.code}</p></div>
                    <div className="text-center">
                        <p className="text-xs text-muted-foreground">{flight.duration}</p>
                        <div className="flex items-center justify-center my-0.5">
                            <div className="w-full h-px bg-border/50"></div><Plane className="w-3 h-3 text-muted-foreground mx-1 shrink-0" /><div className="w-full h-px bg-border/50"></div>
                        </div>
                        <p className="text-xs text-primary font-medium">{flight.stops}</p>
                    </div>
                    <div className="text-right"><p className="font-semibold text-lg text-card-foreground">{flight.destination.time}</p><p className="text-xs text-muted-foreground">{flight.destination.code}</p></div>
                </div>
                 {flight.layoverInfo && (<p className="text-xs text-muted-foreground text-center border-t border-border/30 pt-1.5 mt-1.5">{flight.layoverInfo}</p>)}
            </CardContent>
            <CardFooter className="p-3 bg-muted/20 dark:bg-muted/10 flex justify-between items-center border-t border-border/30">
                <div><p className="text-xl font-bold text-primary">${flight.price}</p><p className="text-xs text-muted-foreground">Round trip per traveler</p></div>
                <Button size="lg" className={cn(prominentButtonClasses, "py-2.5 px-6 text-base")}>Select Flight</Button>
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
    console.warn(`[FlightDestinationSuggestionCard] Image load ERROR for: ${destination.name}, src: ${destination.imageUri}`);
    setImageLoadError(true);
  }, [destination.name, destination.imageUri]);

  const handlePlan = () => {
    const plannerInput: AITripPlannerInput = {
      destination: destination.name + (destination.country ? `, ${destination.country}` : ''),
      travelDates: "Flexible dates", 
      budget: parseInt(destination.flightIdea?.priceRange?.match(/\$(\d+)/)?.[1] || '1000', 10),
    };
    onPlanTrip(plannerInput);
  };

  return (
    <Card className={cn(glassCardClasses, "overflow-hidden transform hover:scale-[1.02] transition-transform duration-300 ease-out shadow-lg hover:shadow-primary/30 flex flex-col")}>
      <div className="relative w-full aspect-[16/10] bg-muted/30 group">
        { !imageLoadError && destination.imageUri ? (
          <Image src={destination.imageUri} alt={destination.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" data-ai-hint={imageHint} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" onError={handleImageError} />
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
        <Button size="sm" className={cn("w-full text-sm py-2", prominentButtonClassesSm, "text-base py-2.5")} onClick={handlePlan}>
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
      travelDates: "Flexible (check specific dates)",
      budget: parseInt(deal.conceptualPriceRange.match(/\$(\d+)/)?.[1] || '1000', 10),
    };
    onPlanTrip(plannerInput);
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
        <div className="p-4 sm:p-6 space-y-4">
          <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-border/50 shadow-lg bg-muted/30">
            {!imageLoadError && deal.imageUri ? (
              <Image src={deal.imageUri} alt={`Image of ${deal.destinationCity}`} fill className="object-cover" data-ai-hint={imageHint} sizes="(max-width: 640px) 90vw, 500px" onError={() => setImageLoadError(true)} />
            ) : (
              <div className="w-full h-full bg-muted/30 flex items-center justify-center"><ImageOff className="w-10 h-10 text-muted-foreground" /></div>
            )}
          </div>
          <p className="text-sm text-card-foreground/90 flex items-center"><DollarSign className="w-4 h-4 mr-1.5 text-green-400" />Conceptual Price: <span className="font-semibold ml-1">{deal.conceptualPriceRange}</span></p>
          <p className="text-xs text-muted-foreground italic flex items-start"><MessageSquareQuote className="w-3.5 h-3.5 mr-1.5 mt-0.5 shrink-0 text-primary/70" />Reason for Deal (AI Concept): {deal.dealReason}</p>
          <Separator className="my-3" />
          <p className="text-xs text-muted-foreground text-center"><Info className="inline w-3 h-3 mr-1" />Prices and deals are AI-generated concepts for exploration, not live offers.</p>
          <Button onClick={handlePlan} size="lg" className={cn(prominentButtonClasses, "w-full mt-3")}>
            <ExternalLink className="mr-2 h-5 w-5" /> Plan Trip to {deal.destinationCity}
          </Button>
        </div>
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

export default function FlightsPage() {
  const [tripType, setTripType] = useState<"round-trip" | "one-way" | "multi-city">("round-trip");
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [dates, setDates] = useState<DateRange | undefined>(undefined);
  const [passengers, setPassengers] = useState("1 adult");
  const [cabinClass, setCabinClass] = useState("economy");
  const [isLoading, setIsLoading] = useState(false);
  const [searchedFlights, setSearchedFlights] = useState<MockFlight[] | null>(null);

  const { toast } = useToast();
  const router = useRouter();

  const [generalAiDestinations, setGeneralAiDestinations] = useState<AiDestinationSuggestion[]>([]);
  const [isFetchingGeneralDests, setIsFetchingGeneralDests] = useState(false);
  const [generalDestsError, setGeneralDestsError] = useState<string | null>(null);
  const [generalContextualNote, setGeneralContextualNote] = useState<string | null>(null);

  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isFetchingUserLocation, setIsFetchingUserLocation] = useState(false);
  const [geolocationError, setGeolocationError] = useState<string | null>(null);
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
  const mapDealMarkersRef = useRef<any[]>([]);
  
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [isMapsScriptLoaded, setIsMapsScriptLoaded] = useState(false);
  const [mapsApiError, setMapsApiError] = useState<string | null>(null);
  const [isMapInitializing, setIsMapInitializing] = useState(false);
  const [isFetchingUserLocationForMap, setIsFetchingUserLocationForMap] = useState(false);
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
      return; 
    }
    if (typeof window !== 'undefined' && window.google && window.google.maps) {
      if (!isMapsScriptLoaded) setIsMapsScriptLoaded(true); 
      return;
    }
    const scriptId = 'google-maps-flights-page-script';
    if (document.getElementById(scriptId)) {
      if (typeof window !== 'undefined' && window.google && window.google.maps && !isMapsScriptLoaded) setIsMapsScriptLoaded(true);
      return;
    }
    console.log("[FlightsPage] Attempting to load Google Maps API script...");
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMapsApiFlightsPage&libraries=marker,geometry`;
    script.async = true; script.defer = true;
    script.onerror = () => { 
      console.error("[FlightsPage] Failed to load Google Maps API script.");
      setMapsApiError("Failed to load Google Maps. Please check API key and network."); 
      setIsMapsScriptLoaded(false); 
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
      console.log(`[FlightsPage] Initializing map at center: ${center.lat}, ${center.lng} with zoom ${zoom}`);
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
    if (isMapsScriptLoaded && mapRef.current && !map && !isMapInitializing) {
      console.log("[FlightsPage] Maps script loaded, attempting to fetch user location for initial map center.");
      setIsFetchingUserLocationForMap(true); setIsMapInitializing(true);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userCoords = { lat: position.coords.latitude, lng: position.coords.longitude };
            setUserLocation(userCoords); 
            console.log("[FlightsPage] User location fetched for map:", userCoords);
            setGeolocationMapError(null); initializeMap(userCoords, 6);
            setIsFetchingUserLocationForMap(false);
          },
          (error) => {
            console.warn("[FlightsPage] Could not get user location for map:", error.message);
            setGeolocationMapError(`Map geo error: ${error.message}. Centering globally.`);
            initializeMap({ lat: 20, lng: 0 }, 2); setIsFetchingUserLocationForMap(false);
          }, { timeout: 7000 }
        );
      } else {
        console.warn("[FlightsPage] Geolocation not supported by this browser for map.");
        setGeolocationMapError("Geolocation not supported. Centering map globally.");
        initializeMap({ lat: 20, lng: 0 }, 2); setIsFetchingUserLocationForMap(false);
      }
    }
  }, [isMapsScriptLoaded, map, isMapInitializing, initializeMap]);


  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault(); setIsLoading(true); setSearchedFlights(null);
    console.log("[FlightsPage] Simulating flight search...");
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSearchedFlights(mockFlightsData); setIsLoading(false);
    console.log("[FlightsPage] Mock flight search complete.");
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
        setGeneralContextualNote(result.contextualNote || "AI-powered general suggestions.");
         if (!result.destinations || result.destinations.length === 0) {
            setGeneralContextualNote(result.contextualNote || "AI couldn't find general flight destinations. Try again later!");
        }
      } else { setGeneralAiDestinations([]); setGeneralContextualNote("No general suggestions available from AI right now."); }
    } catch (error: any) { console.error("[FlightsPage] Error fetching general AI destinations:", error); setGeneralDestsError(`Could not fetch general suggestions: ${error.message}`); }
    finally { setIsFetchingGeneralDests(false); }
  }, []);

  const handleFetchLocationAndDests = useCallback(async () => {
    console.log("[FlightsPage] Attempting to fetch location-based destinations...");
    setIsFetchingLocationDests(true); setLocationDestsError(null); setLocationContextualNote(null);
    let currentLoc = userLocation; 
    if (!currentLoc) { 
      console.log("[FlightsPage] User location not available for suggestions, attempting to fetch...");
      setIsFetchingUserLocation(true); setGeolocationError(null);
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 7000 }));
        currentLoc = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        setUserLocation(currentLoc); 
        console.log("[FlightsPage] User location fetched for AI suggestions:", currentLoc);
      } catch (err: any) { 
        console.warn("[FlightsPage] Geolocation error for AI suggestions:", err.message);
        setGeolocationError(`Location error: ${err.message}. Cannot fetch location-based ideas.`); 
        setIsFetchingLocationDests(false); setIsFetchingUserLocation(false); return; 
      }
      finally { setIsFetchingUserLocation(false); }
    }
    try {
      console.log("[FlightsPage] Fetching popular destinations with location:", currentLoc);
      const result = await getPopularDestinations({ userLatitude: currentLoc?.latitude, userLongitude: currentLoc?.longitude });
      console.log("[FlightsPage] Location-based popular destinations result:", result);
      if (result && result.destinations) {
        const processed = result.destinations.map(d => ({ ...d, imageUri: d.imageUri || `https://placehold.co/600x400.png?text=${encodeURIComponent(d.name.substring(0, 10))}` }));
        setLocationAiDestinations(processed);
        setLocationContextualNote(result.contextualNote || "AI-powered suggestions based on your area.");
         if (!result.destinations || result.destinations.length === 0) {
            setLocationContextualNote(result.contextualNote || "AI couldn't find flight destinations near you. Try exploring general ideas!");
        }
      } else { setLocationAiDestinations([]); setLocationContextualNote("No location-based suggestions available from AI."); }
    } catch (error: any) { console.error("[FlightsPage] Error fetching location-based AI destinations:", error); setLocationDestsError(`Could not fetch location-based suggestions: ${error.message}`); }
    finally { setIsFetchingLocationDests(false); }
  }, [userLocation]);

  useEffect(() => { 
    fetchGeneralPopularFlightDests();
    if (userLocation && locationAiDestinations.length === 0 && !isFetchingLocationDests && !locationDestsError) {
        handleFetchLocationAndDests(); 
    }
  }, [fetchGeneralPopularFlightDests, userLocation, handleFetchLocationAndDests, locationAiDestinations.length, isFetchingLocationDests, locationDestsError]);


  const handleFetchMapDeals = async () => {
    if (!mapDealTargetDestinationCity.trim()) { 
        toast({ title: "Destination City Required", description: "Please enter a destination city for the AI deal map.", variant: "destructive" }); 
        return; 
    }
    if (!userLocation || typeof userLocation.latitude !== 'number' || typeof userLocation.longitude !== 'number') {
        toast({ title: "Location Needed", description: "Your current location is needed for this feature. Please enable location services or try again if fetching failed.", variant: "destructive" });
        setIsFetchingMapDeals(false);
        return;
    }
    if (!map) { 
        toast({ title: "Map Not Ready", description: "The map is still initializing. Please wait.", variant: "destructive" }); 
        setIsFetchingMapDeals(false);
        return; 
    }
    
    console.log(`[FlightsPage] Fetching map deals from user location to: ${mapDealTargetDestinationCity}`);
    setIsFetchingMapDeals(true); 
    setMapDealSuggestions([]); 
    setMapDealError(null);
    
    const originDescription = `User's current location (approx. Lat: ${userLocation.latitude.toFixed(2)}, Lon: ${userLocation.longitude.toFixed(2)})`;

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
      setMapDealError(`Failed to fetch flight deal ideas: ${error.message}`); 
    }
    finally { setIsFetchingMapDeals(false); }
  };

  useEffect(() => { 
    if (!map || !isMapsScriptLoaded || !(window.google && window.google.maps && window.google.maps.OverlayView)) {
      mapDealMarkersRef.current.forEach(marker => marker.setMap(null)); mapDealMarkersRef.current = []; return;
    }
    console.log("[FlightsPage] Updating map deal markers. Suggestions count:", mapDealSuggestions.length);
    
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

    mapDealMarkersRef.current.forEach(marker => marker.setMap(null)); mapDealMarkersRef.current = [];
    const newMarkers: any[] = [];
    if (mapDealSuggestions.length > 0 && window.google && window.google.maps) {
      const bounds = new window.google.maps.LatLngBounds();
      
      if (userLocation) {
          const userMarker = new window.google.maps.Marker({
              position: { lat: userLocation.latitude, lng: userLocation.longitude },
              map: map,
              title: "Your Location",
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
          bounds.extend(userMarker.getPosition()!);
      }

      mapDealSuggestions.forEach(deal => {
        if (deal.latitude != null && deal.longitude != null) {
          const dealMarker = new CustomMapDealMarker({
            latlng: { lat: deal.latitude, lng: deal.longitude }, map: map, deal: deal,
            onClick: () => { setSelectedMapDeal(deal); setIsMapDealDialogOpen(true); }
          });
          newMarkers.push(dealMarker);
          bounds.extend({ lat: deal.latitude, lng: deal.longitude });
        }
      });
      mapDealMarkersRef.current = newMarkers;
      
      if (!bounds.isEmpty()) { 
        map.fitBounds(bounds); 
        const listenerId = window.google.maps.event.addListenerOnce(map, 'idle', () => { 
          if ((map.getZoom() || 0) > 12) map.setZoom(12); 
          if (newMarkers.length <=2 && (map.getZoom() || 0) < 5) map.setZoom(5);
        }); 
      } else {
        console.log("[FlightsPage] Bounds are empty, map not fitted for map deals.");
      }
    }
  }, [map, isMapsScriptLoaded, mapDealSuggestions, userLocation]); 


  return (
    <div className="container mx-auto py-8 px-4 animate-fade-in-up space-y-12">
      <Card className={cn(glassCardClasses, "mb-8")}>
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tight text-foreground flex items-center"><Plane className="w-8 h-8 mr-3 text-primary" />Find Your Next Flight</CardTitle>
          <CardDescription className="text-muted-foreground">Enter your travel details to search for flights.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-6">
            <RadioGroup value={tripType} onValueChange={(value: "round-trip" | "one-way" | "multi-city") => setTripType(value)} className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
              {["round-trip", "one-way", "multi-city"].map((type) => (<FormItem key={type} className="flex-1"><RadioGroupItem value={type} id={type} className="sr-only peer" /><Label htmlFor={type} className={cn("flex items-center justify-center p-3 text-sm font-medium rounded-md border-2 border-muted bg-popover hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary", "transition-all cursor-pointer glass-pane")}>{type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</Label></FormItem>))}
            </RadioGroup>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div className="relative"><Label htmlFor="origin" className="text-sm font-medium text-card-foreground/90">Origin</Label><Input id="origin" value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="City or airport" className="mt-1 bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50 h-12 text-base" /></div>
              <div className="relative flex items-center md:self-end">
                <Button variant="ghost" size="icon" className="mx-1 text-muted-foreground hover:bg-accent/10 hidden md:flex" type="button" onClick={() => { setOrigin(destination); setDestination(origin); }} aria-label="Swap origin and destination"><ArrowRightLeft className="w-5 h-5" /></Button>
                <div className="flex-grow"><Label htmlFor="destination" className="text-sm font-medium text-card-foreground/90">Destination</Label><Input id="destination" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="City or airport" className="mt-1 bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50 h-12 text-base" /></div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid grid-cols-2 gap-2">
                <div><Label htmlFor="departure-date" className="text-sm font-medium text-card-foreground/90">Departure</Label><Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start text-left font-normal mt-1 h-12 text-base glass-interactive",!dates?.from && "text-muted-foreground")}><CalendarLucideIcon className="mr-2 h-4 w-4" />{dates?.from ? format(dates.from, "MMM dd, yyyy") : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className={cn("w-auto p-0", glassCardClasses)} align="start"><Calendar mode="range" selected={dates} onSelect={setDates} initialFocus numberOfMonths={tripType === 'one-way' ? 1 : 2} disabled={{ before: new Date() }} /></PopoverContent></Popover></div>
                {tripType === 'round-trip' && (<div><Label htmlFor="return-date" className="text-sm font-medium text-card-foreground/90">Return</Label><Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start text-left font-normal mt-1 h-12 text-base glass-interactive",!dates?.to && "text-muted-foreground")} disabled={!dates?.from}><CalendarLucideIcon className="mr-2 h-4 w-4" />{dates?.to ? format(dates.to, "MMM dd, yyyy") : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className={cn("w-auto p-0", glassCardClasses)} align="start"><Calendar mode="range" selected={dates} onSelect={setDates} initialFocus numberOfMonths={2} disabled={{ before: dates?.from || new Date() }} /></PopoverContent></Popover></div>)}
                {tripType === 'one-way' && (<div><Label htmlFor="one-way-date" className="text-sm font-medium text-card-foreground/90 opacity-0 md:opacity-100">.</Label></div>)}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label htmlFor="passengers" className="text-sm font-medium text-card-foreground/90 flex items-center"><Users className="w-4 h-4 mr-1.5" /> Passengers</Label><Select value={passengers} onValueChange={setPassengers}><SelectTrigger suppressHydrationWarning className="mt-1 h-12 text-base bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50 glass-interactive"><SelectValue /></SelectTrigger><SelectContent className={glassCardClasses}><SelectItem value="1 adult">1 adult</SelectItem><SelectItem value="2 adults">2 adults</SelectItem><SelectItem value="3 adults">3 adults</SelectItem><SelectItem value="custom">Custom...</SelectItem></SelectContent></Select></div>
                <div><Label htmlFor="cabin-class" className="text-sm font-medium text-card-foreground/90 flex items-center"><Briefcase className="w-4 h-4 mr-1.5" /> Cabin Class</Label><Select value={cabinClass} onValueChange={setCabinClass}><SelectTrigger suppressHydrationWarning className="mt-1 h-12 text-base bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50 glass-interactive"><SelectValue /></SelectTrigger><SelectContent className={glassCardClasses}><SelectItem value="economy">Economy</SelectItem><SelectItem value="premium-economy">Premium Economy</SelectItem><SelectItem value="business">Business</SelectItem><SelectItem value="first">First</SelectItem></SelectContent></Select></div>
              </div>
            </div>
            <Button type="submit" size="lg" className={cn("w-full gap-2", prominentButtonClasses)} disabled={isLoading}>{isLoading ? <Loader2 className="animate-spin" /> : <Search />}{isLoading ? 'Searching...' : 'Search Flights'}</Button>
          </form>
        </CardContent>
      </Card>

      {isLoading && (<div className="text-center py-10 text-muted-foreground"><Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" /><p className="text-lg">Finding the best flight options...</p></div>)}
      {!isLoading && searchedFlights && (<div className="mt-8 animate-fade-in-up"><Separator className="my-6" /><h2 className="text-2xl font-semibold tracking-tight text-foreground mb-6">Flight Options {origin && destination && `from ${origin} to ${destination}`}</h2><div className="grid grid-cols-1 lg:grid-cols-2 gap-6">{searchedFlights.map(flight => (<MockFlightCard key={flight.id} flight={flight} />))}</div></div>)}
      
      <Separator className="my-12 border-border/40" />

      <section className="animate-fade-in-up" style={{animationDelay: '0.2s'}}>
        <Card className={cn(glassCardClasses, "border-primary/30")}>
          <CardHeader>
            <CardTitle className="flex items-center text-xl text-card-foreground">
                <LucideMap className="w-7 h-7 mr-3 text-primary"/> AI-Powered Flight Deal Explorer Map
            </CardTitle>
            <CardDescription className="text-muted-foreground">
                Enter a destination city. Aura AI will find conceptual flight deals from your current location and plot them on the map. Map initializes to your current location.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-grow">
                    <Label htmlFor="map-deal-target-destination" className="text-sm font-medium text-card-foreground/90">Enter Destination City for AI Deals</Label>
                    <Input 
                        id="map-deal-target-destination" 
                        value={mapDealTargetDestinationCity} 
                        onChange={(e) => setMapDealTargetDestinationCity(e.target.value)} 
                        placeholder="e.g., London, UK"
                        className="mt-1 bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50 h-11 text-base"
                    />
                </div>
                <Button onClick={handleFetchMapDeals} disabled={isFetchingMapDeals || !mapDealTargetDestinationCity.trim() || isFetchingUserLocationForMap} className={cn(prominentButtonClassesSm, "w-full sm:w-auto h-11")}>
                    {isFetchingMapDeals ? <Loader2 className="animate-spin" /> : <Sparkles />}
                    {isFetchingMapDeals ? "Scouting Deals..." : "Explore Deals on Map"}
                </Button>
            </div>

            <div className={cn("h-[450px] p-1 rounded-lg shadow-inner", innerGlassEffectClasses, "border-primary/20")}>
              {mapsApiError && <div className="w-full h-full flex flex-col items-center justify-center bg-destructive/10 text-destructive-foreground p-3 rounded-md"><AlertTriangle className="w-10 h-10 mb-2"/><p className="font-semibold">Map Error</p><p className="text-xs text-center">{mapsApiError}</p></div>}
              {(!mapsApiError && (isMapInitializing || isFetchingUserLocationForMap)) && <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground"><Loader2 className="w-8 h-8 animate-spin mb-2 text-primary"/><p className="text-xs">{isFetchingUserLocationForMap ? "Getting your location for map..." : "Initializing Map..."}</p></div>}
              <div ref={mapRef} className={cn("w-full h-full rounded-md", (mapsApiError || isMapInitializing || isFetchingUserLocationForMap) ? "hidden" : "")} />
            </div>
            {geolocationMapError && <p className="text-xs text-center text-amber-500 mt-1"><Info className="inline w-3 h-3 mr-1"/>{geolocationMapError}</p>}
            {!userLocation && !isFetchingUserLocationForMap && !geolocationMapError && <p className="text-xs text-center text-amber-500 mt-1"><Info className="inline w-3 h-3 mr-1"/>Your location is needed to explore deals from your area. Please enable location services.</p>}

            {isFetchingMapDeals && mapDealSuggestions.length === 0 && <div className="text-center py-4 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary"/><p className="text-sm">Aura AI is searching for flight deal ideas to {mapDealTargetDestinationCity} from your location...</p></div>}
            {mapDealError && !isFetchingMapDeals && <div className="text-center py-3 text-sm text-destructive"><AlertTriangle className="inline w-4 h-4 mr-1.5"/>{mapDealError}</div>}
            {!isFetchingMapDeals && mapDealSuggestions.length === 0 && mapDealTargetDestinationCity && !mapDealError && <div className="text-center py-3 text-sm text-muted-foreground">No specific AI deal suggestions found for {mapDealTargetDestinationCity} from your location. Try another destination.</div>}
          </CardContent>
        </Card>
      </section>

      <Separator className="my-12 border-border/40" />

      <section className="animate-fade-in-up" style={{animationDelay: '0.4s'}}>
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground flex items-center"><Sparkles className="w-7 h-7 mr-3 text-accent" />Explore Flight Destinations</h2>
          <Button onClick={fetchGeneralPopularFlightDests} disabled={isFetchingGeneralDests} className={cn(prominentButtonClassesSm, "text-base py-2 px-4")}>
            {isFetchingGeneralDests ? <Loader2 className="animate-spin" /> : <Sparkles />} {isFetchingGeneralDests ? "Loading Ideas..." : "Refresh General Ideas"}
          </Button>
        </div>
        {isFetchingGeneralDests && (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <Card key={i} className={cn(glassCardClasses, "animate-pulse")}><CardHeader><div className="h-32 bg-muted/40 rounded-md"></div><div className="h-5 w-3/4 bg-muted/40 rounded mt-2"></div></CardHeader><CardContent><div className="h-3 w-full bg-muted/40 rounded mb-1"></div><div className="h-3 w-5/6 bg-muted/40 rounded"></div></CardContent><CardFooter><div className="h-8 w-full bg-muted/40 rounded-md"></div></CardFooter></Card>)}</div>)}
        {!isFetchingGeneralDests && generalDestsError && (<div className={cn(glassCardClasses, "p-6 text-center text-destructive border-destructive/50")}><AlertTriangle className="w-10 h-10 mx-auto mb-2" /><p>{generalDestsError}</p></div>)}
        
        {!isFetchingGeneralDests && generalAiDestinations.length === 0 && generalContextualNote && (
          <div className={cn(glassCardClasses, "p-6 text-center text-muted-foreground")}>
            <Info className="w-8 h-8 mx-auto mb-2 text-primary/50" />
            <p>{generalContextualNote}</p>
          </div>
        )}
        {!isFetchingGeneralDests && generalAiDestinations.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {generalAiDestinations.map(dest => (<FlightDestinationSuggestionCard key={dest.name+dest.country+"gen"} destination={dest} onPlanTrip={handlePlanTripFromSuggestion} />))}
          </div>
        )}
      </section>

      <Separator className="my-12 border-border/40" />
      
      <section className="animate-fade-in-up" style={{animationDelay: '0.6s'}}>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-6">Useful tools to help you find the best flight deals</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className={cn(glassCardClasses, "flex flex-col")}>
            <CardHeader className="pb-3"><div className="flex items-center gap-3"><TrendingUp className="w-8 h-8 text-primary" /><CardTitle className="text-lg text-card-foreground">Track Prices</CardTitle></div><CardDescription className="text-xs text-muted-foreground pt-1">Monitor flight prices and get alerts. (Conceptual UI)</CardDescription></CardHeader>
            <CardContent className="flex-grow"><form onSubmit={(e) => { e.preventDefault(); toast({ title: "Price Tracking (Conceptual)", description: `Tracking prices for ${e.currentTarget.origin.value} to ${e.currentTarget.destination.value}.` }); }} className="space-y-3 mt-2"><div><Label htmlFor="track-origin" className="text-xs text-muted-foreground">Origin</Label><Input id="track-origin" name="origin" placeholder="e.g., New York" className="mt-0.5 bg-input/50 border-border/50 h-9 text-sm" /></div><div><Label htmlFor="track-dest" className="text-xs text-muted-foreground">Destination</Label><Input id="track-dest" name="destination" placeholder="e.g., London" className="mt-0.5 bg-input/50 border-border/50 h-9 text-sm" /></div><Button type="submit" className={cn("w-full glass-interactive", prominentButtonClassesSm, "py-2 text-sm")}>Track Prices (Demo)</Button></form></CardContent>
          </Card>
          <Card className={cn(glassCardClasses, "flex flex-col")}><CardHeader className="pb-3"><div className="flex items-center gap-3"><CalendarSearch className="w-8 h-8 text-primary" /><CardTitle className="text-lg text-card-foreground">Date Grid</CardTitle></div><CardDescription className="text-xs text-muted-foreground pt-1">Compares prices across dates. (Conceptual)</CardDescription></CardHeader><CardContent className="flex-grow"><div className="bg-muted/30 dark:bg-muted/10 p-6 rounded-md text-center text-muted-foreground min-h-[150px] flex flex-col items-center justify-center"><CalendarSearch className="w-12 h-12 text-primary/50 mb-2" /><p className="font-semibold text-sm">Date Grid View</p><p className="text-xs">Coming soon!</p></div></CardContent></Card>
          <Card className={cn(glassCardClasses, "flex flex-col")}><CardHeader className="pb-3"><div className="flex items-center gap-3"><BarChartHorizontalBig className="w-8 h-8 text-primary" /><CardTitle className="text-lg text-card-foreground">Price Graph</CardTitle></div><CardDescription className="text-xs text-muted-foreground pt-1">Shows historical price trends. (Conceptual)</CardDescription></CardHeader><CardContent className="flex-grow"><div className="bg-muted/30 dark:bg-muted/10 p-6 rounded-md text-center text-muted-foreground min-h-[150px] flex flex-col items-center justify-center"><BarChartHorizontalBig className="w-12 h-12 text-primary/50 mb-2" /><p className="font-semibold text-sm">Price Trend Graph</p><p className="text-xs">Coming soon!</p></div></CardContent></Card>
        </div>
      </section>

      <Separator className="my-12 border-border/40" />

      <section className="animate-fade-in-up" style={{animationDelay: '0.8s'}}>
         <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground flex items-center"><LocateFixed className="w-7 h-7 mr-3 text-accent" />Popular flight destinations {userLocation ? 'from your area' : ' (Location N/A)'}</h2>
           <Button onClick={handleFetchLocationAndDests} disabled={isFetchingUserLocation || isFetchingLocationDests} className={cn(prominentButtonClassesSm, "text-base py-2 px-4")}>
            {(isFetchingUserLocation || isFetchingLocationDests) ? <Loader2 className="animate-spin" /> : <Sparkles />}{(isFetchingUserLocation || isFetchingLocationDests) ? "Finding Nearby Ideas..." : "Refresh Nearby Ideas"}
          </Button>
        </div>
        {isFetchingUserLocation && !userLocation && <div className="text-center py-4 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mr-2 inline-block" />Fetching your location to find relevant flights...</div>}
        {geolocationError && !isFetchingUserLocation && <p className="text-sm text-destructive mb-4 text-center sm:text-left"><AlertTriangle className="inline w-4 h-4 mr-1"/>{geolocationError}</p>}
        
        {isFetchingLocationDests && (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <Card key={`loc-${i}`} className={cn(glassCardClasses, "animate-pulse")}><CardHeader><div className="h-32 bg-muted/40 rounded-md"></div><div className="h-5 w-3/4 bg-muted/40 rounded mt-2"></div></CardHeader><CardContent><div className="h-3 w-full bg-muted/40 rounded mb-1"></div><div className="h-3 w-5/6 bg-muted/40 rounded"></div></CardContent><CardFooter><div className="h-8 w-full bg-muted/40 rounded-md"></div></CardFooter></Card>)}</div>)}
        {!isFetchingLocationDests && locationDestsError && (<div className={cn(glassCardClasses, "p-6 text-center text-destructive border-destructive/50")}><AlertTriangle className="w-10 h-10 mx-auto mb-2" /><p>{locationDestsError}</p></div>)}
        
        {!isFetchingLocationDests && locationAiDestinations.length === 0 && locationContextualNote && (
          <div className={cn(glassCardClasses, "p-6 text-center text-muted-foreground")}>
            <Info className="w-8 h-8 mx-auto mb-2 text-primary/50" />
            <p>{locationContextualNote}</p>
          </div>
        )}

        {!isFetchingLocationDests && locationAiDestinations.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {locationAiDestinations.map(dest => (<FlightDestinationSuggestionCard key={dest.name+dest.country+"loc"} destination={dest} onPlanTrip={handlePlanTripFromSuggestion} />))}
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
    </div>
  );
}
```You're right, the error "Cannot read properties of undefined (reading 'toFixed')" on line 459 of `src/app/(app)/flights/page.tsx` indicates that `userLocation` is `null` or `undefined` when that line is executed, even though we have a check for it.

The line is:
`const originDescription = \`User's current location (approx. Lat: ${userLocation.latitude.toFixed(2)}, Lon: ${userLocation.longitude.toFixed(2)})\`;`

The existing check `if (!userLocation)` before this line is intended to prevent this. If the error still occurs at this exact spot, it could mean:
1.  The execution flow is somehow bypassing the `if (!userLocation)` check, or the state update for `userLocation` is not happening as expected before `handleFetchMapDeals` is called again.
2.  `userLocation` is truthy (e.g., an empty object `{}`) but doesn't have `latitude` or `longitude` properties.

Let's make the check more robust and ensure `setIsFetchingMapDeals(false)` is called in all early exit paths of `handleFetchMapDeals`.

**Plan:**
I will refine the `handleFetchMapDeals` function in `src/app/(app)/flights/page.tsx` to:
1.  Ensure the guard condition for `userLocation` also checks for the presence and type of `latitude` and `longitude`.
2.  Ensure `setIsFetchingMapDeals(false)` is called consistently if the function exits early due to validation failures.
3.  Ensure `setIsFetchingMapDeals(true)` is set only *after* all initial validations (destination city, user location, map instance) have passed.

(Omitted from agent history: changes suggested and applied to the following files: /src/app/(app)/flights/page.tsx)
I've updated the `handleFetchMapDeals` function in `src/app/(app)/flights/page.tsx`.

**Key Changes:**
1.  **Robust `userLocation` Check:** The check for `userLocation` is now more thorough:
    ```typescript
    if (!userLocation || typeof userLocation.latitude !== 'number' || typeof userLocation.longitude !== 'number') {
        toast({ title: "Location Needed", /* ... */ });
        setIsFetchingMapDeals(false); // Ensure loading state is reset
        return;
    }
    ```
    This verifies not only that `userLocation` exists but also that its `latitude` and `longitude` properties are numbers before attempting to use them.
2.  **Loading State Management:**
    *   `setIsFetchingMapDeals(true)` is now called only *after* all preliminary checks (target destination city, user location availability, and map instance readiness) have passed.
    *   `setIsFetchingMapDeals(false)` is ensured in the `finally` block and in all early `return` paths within the validation checks.

These changes make the validation logic more robust and should prevent the "Cannot read properties of undefined (reading 'toFixed')" error by ensuring `userLocation.latitude` and `userLocation.longitude` are only accessed when they are confirmed to be valid numbers. The loading state management is also more consistent now.