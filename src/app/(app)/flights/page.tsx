
"use client";

import React, { useState, useEffect, useCallback } from 'react';
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
import { cn } from '@/lib/utils';
import { 
  Plane, CalendarDays as CalendarLucideIcon, Users, Briefcase, ArrowRightLeft, Search, 
  Sparkles, Star, Clock, Loader2, Map, Compass, DollarSign, Hotel, TrendingUp, 
  CalendarSearch, BarChartHorizontalBig, LocateFixed, ImageOff, Info, ExternalLink, AlertTriangle
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { useToast } from '@/hooks/use-toast';
import { getPopularDestinations } from '@/app/actions';
import type { PopularDestinationsInput, AiDestinationSuggestion } from '@/ai/types/popular-destinations-types';
import type { AITripPlannerInput } from '@/ai/types/trip-planner-types';
import { useRouter } from 'next/navigation';

const glassCardClasses = "glass-card bg-card/80 dark:bg-card/50 backdrop-blur-lg border-border/20";
const prominentButtonClasses = "text-lg py-3 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:from-accent hover:to-primary focus-visible:ring-4 focus-visible:ring-primary/40 transform transition-all duration-300 ease-out hover:scale-[1.02] active:scale-100";

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

interface UserLocation { latitude: number; longitude: number; }

interface FlightDestinationSuggestionCardProps {
  destination: AiDestinationSuggestion;
  onPlanTrip: (tripIdea: AITripPlannerInput) => void;
}

function FlightDestinationSuggestionCard({ destination, onPlanTrip }: FlightDestinationSuggestionCardProps) {
  const [imageLoadError, setImageLoadError] = useState(false);
  const imageHint = destination.imageUri?.startsWith('https://placehold.co')
    ? (destination.imagePrompt || destination.name.toLowerCase().split(" ").slice(0, 2).join(" "))
    : undefined;

  const handleImageError = useCallback(() => setImageLoadError(true), []);

  const handlePlan = () => {
    const plannerInput: AITripPlannerInput = {
      destination: destination.name + (destination.country ? `, ${destination.country}` : ''),
      travelDates: "Flexible dates", // Placeholder for flight suggestions
      budget: parseInt(destination.flightIdea?.priceRange?.match(/\$(\d+)/)?.[1] || '1000', 10), // Example budget
    };
    onPlanTrip(plannerInput);
  };

  return (
    <Card className={cn(glassCardClasses, "overflow-hidden transform hover:scale-[1.02] transition-transform duration-300 ease-out shadow-lg hover:shadow-primary/30 flex flex-col")}>
      <div className="relative w-full aspect-[16/10] bg-muted/30 group">
        {!imageLoadError && destination.imageUri ? (
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
        <Button size="sm" className={cn("w-full text-sm py-2", prominentButtonClasses, "text-base py-2.5")} onClick={handlePlan}>
          <ExternalLink className="mr-2 h-4 w-4" /> Plan This Trip
        </Button>
      </CardFooter>
    </Card>
  );
}

function ToolCard({ icon, title, description, children }: { icon: React.ReactNode, title: string, description: string, children?: React.ReactNode }) {
  return (
    <Card className={cn(glassCardClasses, "flex flex-col")}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          {icon}
          <CardTitle className="text-lg text-card-foreground">{title}</CardTitle>
        </div>
        <CardDescription className="text-xs text-muted-foreground pt-1">{description}</CardDescription>
      </CardHeader>
      {children && <CardContent className="flex-grow">{children}</CardContent>}
    </Card>
  );
}

export default function FlightsPage() {
  const [tripType, setTripType] = useState<"round-trip" | "one-way" | "multi-city">("round-trip");
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [dates, setDates] = useState<DateRange | undefined>({ from: new Date(), to: addDays(new Date(), 7) });
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
  
  const [trackOrigin, setTrackOrigin] = useState('');
  const [trackDestination, setTrackDestination] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSearchedFlights(null);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSearchedFlights(mockFlightsData);
    setIsLoading(false);
  };

  const handlePlanTripFromSuggestion = (tripIdea: AITripPlannerInput) => {
    localStorage.setItem('tripBundleToPlan', JSON.stringify(tripIdea));
    window.dispatchEvent(new CustomEvent('localStorageUpdated_tripBundleToPlan'));
    router.push('/planner');
  };

  const fetchPopularDestinations = useCallback(async (params: PopularDestinationsInput, type: 'general' | 'location') => {
    if (type === 'general') {
      setIsFetchingGeneralDests(true);
      setGeneralDestsError(null);
    } else {
      setIsFetchingLocationDests(true);
      setLocationDestsError(null);
    }

    try {
      const result = await getPopularDestinations(params);
      if (result && result.destinations) {
        const processed = result.destinations.map(d => ({
          ...d,
          imageUri: d.imageUri || `https://placehold.co/600x400.png?text=${encodeURIComponent(d.name.substring(0, 10))}`
        }));
        if (type === 'general') {
          setGeneralAiDestinations(processed);
          setGeneralContextualNote(result.contextualNote || "AI-powered suggestions.");
        } else {
          setLocationAiDestinations(processed);
          setLocationContextualNote(result.contextualNote || "AI-powered suggestions based on your area.");
        }
      } else {
        if (type === 'general') setGeneralAiDestinations([]); else setLocationAiDestinations([]);
      }
      if (!result?.destinations || result.destinations.length === 0) {
        const errorMsg = "AI couldn't find specific suggestions. Try again later!";
        if (type === 'general') setGeneralDestsError(errorMsg); else setLocationDestsError(errorMsg);
      }
    } catch (error) {
      console.error(`Error fetching AI destinations (${type}):`, error);
      const errorMsg = "Could not fetch destination suggestions. Please try again.";
      if (type === 'general') setGeneralDestsError(errorMsg); else setLocationDestsError(errorMsg);
    } finally {
      if (type === 'general') setIsFetchingGeneralDests(false); else setIsFetchingLocationDests(false);
    }
  }, []);

  const handleFetchLocationAndDests = useCallback(() => {
    setIsFetchingUserLocation(true);
    setGeolocationError(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = { latitude: position.coords.latitude, longitude: position.coords.longitude };
          setUserLocation(loc);
          fetchPopularDestinations({ userLatitude: loc.latitude, userLongitude: loc.longitude }, 'location');
          setIsFetchingUserLocation(false);
        },
        (error) => {
          setGeolocationError(`Location access denied or unavailable: ${error.message}. Showing global popular flights.`);
          fetchPopularDestinations({}, 'location'); // Fallback to global if location fails
          setIsFetchingUserLocation(false);
        },
        { timeout: 8000 }
      );
    } else {
      setGeolocationError("Geolocation not supported. Showing global popular flights.");
      fetchPopularDestinations({}, 'location');
      setIsFetchingUserLocation(false);
    }
  }, [fetchPopularDestinations]);

  useEffect(() => {
    handleFetchLocationAndDests(); // Fetch location-based on mount
  }, [handleFetchLocationAndDests]);

  const handleTrackPricesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackOrigin || !trackDestination) {
      toast({ title: "Input Incomplete", description: "Please enter both origin and destination to track prices.", variant: "destructive" });
      return;
    }
    toast({ title: "Price Tracking (Conceptual)", description: `AI will now monitor prices for flights from ${trackOrigin} to ${trackDestination}. You'll be notified of significant changes! (This is a UI demo)` });
  };


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
                <div><Label htmlFor="passengers" className="text-sm font-medium text-card-foreground/90 flex items-center"><Users className="w-4 h-4 mr-1.5" /> Passengers</Label><Select value={passengers} onValueChange={setPassengers}><SelectTrigger className="mt-1 h-12 text-base bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50 glass-interactive"><SelectValue /></SelectTrigger><SelectContent className={glassCardClasses}><SelectItem value="1 adult">1 adult</SelectItem><SelectItem value="2 adults">2 adults</SelectItem><SelectItem value="3 adults">3 adults</SelectItem><SelectItem value="custom">Custom...</SelectItem></SelectContent></Select></div>
                <div><Label htmlFor="cabin-class" className="text-sm font-medium text-card-foreground/90 flex items-center"><Briefcase className="w-4 h-4 mr-1.5" /> Cabin Class</Label><Select value={cabinClass} onValueChange={setCabinClass}><SelectTrigger className="mt-1 h-12 text-base bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50 glass-interactive"><SelectValue /></SelectTrigger><SelectContent className={glassCardClasses}><SelectItem value="economy">Economy</SelectItem><SelectItem value="premium-economy">Premium Economy</SelectItem><SelectItem value="business">Business</SelectItem><SelectItem value="first">First</SelectItem></SelectContent></Select></div>
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
        <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-6 flex items-center"><Compass className="w-7 h-7 mr-3 text-primary" />Explore destinations on the map</h2>
        <ToolCard icon={<Map className="w-8 h-8 text-primary" />} title="Interactive Flight Price Map" description="Visually explore flight prices to destinations around the world. Click on the map to see estimated costs. (Conceptual Feature)">
           <div className="bg-muted/30 dark:bg-muted/10 p-6 rounded-md text-center text-muted-foreground min-h-[200px] flex flex-col items-center justify-center">
            <Map className="w-16 h-16 text-primary/50 mb-3" />
            <p className="font-semibold">Interactive Map Coming Soon!</p>
            <p className="text-xs">Imagine a dynamic map here showing live price estimates as you explore.</p>
          </div>
        </ToolCard>
      </section>

      <Separator className="my-12 border-border/40" />

      <section className="animate-fade-in-up" style={{animationDelay: '0.4s'}}>
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground flex items-center"><Sparkles className="w-7 h-7 mr-3 text-accent" />Explore Flight Destinations</h2>
          <Button onClick={() => fetchPopularDestinations({}, 'general')} disabled={isFetchingGeneralDests} className={cn(prominentButtonClasses, "text-base py-2.5 px-5")}>
            {isFetchingGeneralDests ? <Loader2 className="animate-spin" /> : <Sparkles />} {isFetchingGeneralDests ? "Loading Ideas..." : "Refresh General Ideas"}
          </Button>
        </div>
        {generalContextualNote && <p className="text-sm text-muted-foreground italic mb-4">{generalContextualNote}</p>}
        {isFetchingGeneralDests && (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <Card key={i} className={cn(glassCardClasses, "animate-pulse")}><CardHeader><div className="h-32 bg-muted/40 rounded-md"></div><div className="h-5 w-3/4 bg-muted/40 rounded mt-2"></div></CardHeader><CardContent><div className="h-3 w-full bg-muted/40 rounded mb-1"></div><div className="h-3 w-5/6 bg-muted/40 rounded"></div></CardContent><CardFooter><div className="h-8 w-full bg-muted/40 rounded-md"></div></CardFooter></Card>)}</div>)}
        {!isFetchingGeneralDests && generalDestsError && (<div className={cn(glassCardClasses, "p-6 text-center text-destructive border-destructive/50")}><AlertTriangle className="w-10 h-10 mx-auto mb-2" /><p>{generalDestsError}</p></div>)}
        {!isFetchingGeneralDests && generalAiDestinations.length > 0 && (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{generalAiDestinations.map(dest => (<FlightDestinationSuggestionCard key={dest.name+dest.country} destination={dest} onPlanTrip={handlePlanTripFromSuggestion} />))}</div>)}
      </section>

      <Separator className="my-12 border-border/40" />
      
      <section className="animate-fade-in-up" style={{animationDelay: '0.6s'}}>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-6">Useful tools to help you find the best flight deals</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ToolCard icon={<TrendingUp className="w-8 h-8 text-primary" />} title="Track Prices" description="Monitor flight prices for specific routes and get alerts when they change.">
            <form onSubmit={handleTrackPricesSubmit} className="space-y-3 mt-2">
              <div><Label htmlFor="track-origin" className="text-xs text-muted-foreground">Origin</Label><Input id="track-origin" value={trackOrigin} onChange={e=>setTrackOrigin(e.target.value)} placeholder="e.g., New York" className="mt-0.5 bg-input/50 border-border/50 h-9 text-sm" /></div>
              <div><Label htmlFor="track-dest" className="text-xs text-muted-foreground">Destination</Label><Input id="track-dest" value={trackDestination} onChange={e=>setTrackDestination(e.target.value)} placeholder="e.g., London" className="mt-0.5 bg-input/50 border-border/50 h-9 text-sm" /></div>
              <Button type="submit" className="w-full glass-interactive">Track Prices (Demo)</Button>
            </form>
          </ToolCard>
          <ToolCard icon={<CalendarSearch className="w-8 h-8 text-primary" />} title="Date Grid (Conceptual)" description="Compares prices across a range of dates in a calendar view to help you find the cheapest days to fly." />
          <ToolCard icon={<BarChartHorizontalBig className="w-8 h-8 text-primary" />} title="Price Graph (Conceptual)" description="Shows historical price trends for a route, helping you decide if now is a good time to book." />
        </div>
      </section>

      <Separator className="my-12 border-border/40" />

      <section className="animate-fade-in-up" style={{animationDelay: '0.8s'}}>
         <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground flex items-center"><LocateFixed className="w-7 h-7 mr-3 text-accent" />Popular flight destinations from {userLocation ? 'your area' : '...'}</h2>
           <Button onClick={handleFetchLocationAndDests} disabled={isFetchingUserLocation || isFetchingLocationDests} className={cn(prominentButtonClasses, "text-base py-2.5 px-5")}>
            {(isFetchingUserLocation || isFetchingLocationDests) ? <Loader2 className="animate-spin" /> : <Sparkles />}{(isFetchingUserLocation || isFetchingLocationDests) ? "Discovering..." : "Refresh Nearby Ideas"}
          </Button>
        </div>
        {geolocationError && <p className="text-sm text-destructive mb-4">{geolocationError}</p>}
        {locationContextualNote && <p className="text-sm text-muted-foreground italic mb-4">{locationContextualNote}</p>}
        {(isFetchingUserLocation || isFetchingLocationDests) && (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <Card key={`loc-${i}`} className={cn(glassCardClasses, "animate-pulse")}><CardHeader><div className="h-32 bg-muted/40 rounded-md"></div><div className="h-5 w-3/4 bg-muted/40 rounded mt-2"></div></CardHeader><CardContent><div className="h-3 w-full bg-muted/40 rounded mb-1"></div><div className="h-3 w-5/6 bg-muted/40 rounded"></div></CardContent><CardFooter><div className="h-8 w-full bg-muted/40 rounded-md"></div></CardFooter></Card>)}</div>)}
        {!isFetchingLocationDests && locationDestsError && (<div className={cn(glassCardClasses, "p-6 text-center text-destructive border-destructive/50")}><AlertTriangle className="w-10 h-10 mx-auto mb-2" /><p>{locationDestsError}</p></div>)}
        {!isFetchingLocationDests && locationAiDestinations.length > 0 && (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{locationAiDestinations.map(dest => (<FlightDestinationSuggestionCard key={dest.name+dest.country+"loc"} destination={dest} onPlanTrip={handlePlanTripFromSuggestion} />))}</div>)}
      </section>
    </div>
  );
}

