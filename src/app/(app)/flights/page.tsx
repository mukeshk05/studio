
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { FormItem } from "@/components/ui/form"; // Added FormItem import
import { cn } from '@/lib/utils';
import { Plane, CalendarIcon as CalendarLucideIcon, Users, Briefcase, ArrowRightLeft, Search, Sparkles, Star, Clock, Loader2 } from 'lucide-react';
import { format, addDays } from 'date-fns';
import type { DateRange } from 'react-day-picker';

const glassCardClasses = "glass-card bg-card/80 dark:bg-card/50 backdrop-blur-lg border-border/20";
const prominentButtonClasses = "text-lg py-3 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:from-accent hover:to-primary focus-visible:ring-4 focus-visible:ring-primary/40 transform transition-all duration-300 ease-out hover:scale-[1.02] active:scale-100";


// Mock Flight Data Interface
interface MockFlight {
  id: string;
  airline: string;
  airlineLogoUrl: string;
  dataAiHint?: string; // Added optional dataAiHint
  origin: { code: string; time: string; airport: string };
  destination: { code: string; time: string; airport: string };
  duration: string;
  stops: string;
  price: number;
  isBest?: boolean;
  layoverInfo?: string;
}

// Mock Flight Data
const mockFlightsData: MockFlight[] = [
  {
    id: '1',
    airline: 'SkyLink Airlines',
    airlineLogoUrl: 'https://placehold.co/100x40.png?text=SkyLink',
    dataAiHint: 'airline logo',
    origin: { code: 'JFK', time: '08:30 AM', airport: 'John F. Kennedy Intl.' },
    destination: { code: 'LAX', time: '11:45 AM', airport: 'Los Angeles Intl.' },
    duration: '6h 15m',
    stops: 'Nonstop',
    price: 345,
    isBest: true,
  },
  {
    id: '2',
    airline: 'Aura Airways',
    airlineLogoUrl: 'https://placehold.co/100x40.png?text=AuraAir',
    dataAiHint: 'airline logo aura',
    origin: { code: 'JFK', time: '10:00 AM', airport: 'John F. Kennedy Intl.' },
    destination: { code: 'LAX', time: '03:30 PM', airport: 'Los Angeles Intl.' },
    duration: '8h 30m',
    stops: '1 Stop (ORD)',
    price: 290,
    layoverInfo: '2h 00m layover in Chicago O\'Hare',
  },
  {
    id: '3',
    airline: 'BudgetRoam Connect',
    airlineLogoUrl: 'https://placehold.co/100x40.png?text=BRoam',
    dataAiHint: 'budget airline logo',
    origin: { code: 'JFK', time: '01:15 PM', airport: 'John F. Kennedy Intl.' },
    destination: { code: 'LAX', time: '04:30 PM', airport: 'Los Angeles Intl.' },
    duration: '6h 15m',
    stops: 'Nonstop',
    price: 315,
  },
];


function MockFlightCard({ flight }: { flight: MockFlight }) {
    return (
        <Card className={cn(glassCardClasses, "mb-4 transform hover:scale-[1.01] transition-transform duration-200 ease-out", flight.isBest && "border-accent/50 ring-2 ring-accent/30")}>
            <CardContent className="p-4 space-y-3">
                {flight.isBest && (
                    <Badge className="absolute -top-2 -right-2 bg-accent text-accent-foreground shadow-lg py-1 px-3 text-xs">
                        <Sparkles className="w-3 h-3 mr-1.5" /> Best Value
                    </Badge>
                )}
                <div className="flex items-center gap-4">
                    <img src={flight.airlineLogoUrl} alt={`${flight.airline} logo`} data-ai-hint={flight.dataAiHint} className="h-8 object-contain rounded" />
                    <span className="text-sm font-medium text-card-foreground">{flight.airline}</span>
                </div>
                <div className="grid grid-cols-3 items-center gap-2 text-sm">
                    <div className="text-left">
                        <p className="font-semibold text-lg text-card-foreground">{flight.origin.time}</p>
                        <p className="text-xs text-muted-foreground">{flight.origin.code}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-muted-foreground">{flight.duration}</p>
                        <div className="flex items-center justify-center my-0.5">
                            <div className="w-full h-px bg-border/50"></div>
                            <Plane className="w-3 h-3 text-muted-foreground mx-1 shrink-0" />
                            <div className="w-full h-px bg-border/50"></div>
                        </div>
                        <p className="text-xs text-primary font-medium">{flight.stops}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-semibold text-lg text-card-foreground">{flight.destination.time}</p>
                        <p className="text-xs text-muted-foreground">{flight.destination.code}</p>
                    </div>
                </div>
                 {flight.layoverInfo && (
                    <p className="text-xs text-muted-foreground text-center border-t border-border/30 pt-1.5 mt-1.5">{flight.layoverInfo}</p>
                )}
            </CardContent>
            <CardFooter className="p-3 bg-muted/20 dark:bg-muted/10 flex justify-between items-center border-t border-border/30">
                <div className="text-left">
                    <p className="text-xl font-bold text-primary">${flight.price}</p>
                    <p className="text-xs text-muted-foreground">Round trip per traveler</p>
                </div>
                <Button size="lg" className={cn(prominentButtonClasses, "py-2.5 px-6 text-base")}>Select Flight</Button>
            </CardFooter>
        </Card>
    );
}


export default function FlightsPage() {
  const [tripType, setTripType] = useState<"round-trip" | "one-way" | "multi-city">("round-trip");
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [dates, setDates] = useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 7),
  });
  const [passengers, setPassengers] = useState("1 adult");
  const [cabinClass, setCabinClass] = useState("economy");

  const [isLoading, setIsLoading] = useState(false);
  const [searchedFlights, setSearchedFlights] = useState<MockFlight[] | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSearchedFlights(null);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSearchedFlights(mockFlightsData); // Show mock data
    setIsLoading(false);
  };

  return (
    <div className="container mx-auto py-8 px-4 animate-fade-in-up">
      <Card className={cn(glassCardClasses, "mb-8")}>
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tight text-foreground flex items-center">
            <Plane className="w-8 h-8 mr-3 text-primary" />
            Find Your Next Flight
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Enter your travel details to search for flights. AI insights coming soon to this page!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-6">
            <RadioGroup
              value={tripType}
              onValueChange={(value: "round-trip" | "one-way" | "multi-city") => setTripType(value)}
              className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4"
            >
              {["round-trip", "one-way", "multi-city"].map((type) => (
                <FormItem key={type} className="flex-1">
                  <RadioGroupItem value={type} id={type} className="sr-only peer" />
                  <Label
                    htmlFor={type}
                    className={cn(
                      "flex items-center justify-center p-3 text-sm font-medium rounded-md border-2 border-muted bg-popover hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary",
                      "transition-all cursor-pointer glass-pane"
                    )}
                  >
                    {type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Label>
                </FormItem>
              ))}
            </RadioGroup>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div className="relative">
                <Label htmlFor="origin" className="text-sm font-medium text-card-foreground/90">Origin</Label>
                <Input
                  id="origin"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="City or airport"
                  className="mt-1 bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50 h-12 text-base"
                />
              </div>
              <div className="relative flex items-center md:self-end">
                <Button
                  variant="ghost"
                  size="icon"
                  className="mx-1 text-muted-foreground hover:bg-accent/10 hidden md:flex"
                  type="button"
                  onClick={() => { setOrigin(destination); setDestination(origin); }}
                  aria-label="Swap origin and destination"
                >
                  <ArrowRightLeft className="w-5 h-5" />
                </Button>
                <div className="flex-grow">
                    <Label htmlFor="destination" className="text-sm font-medium text-card-foreground/90">Destination</Label>
                    <Input
                        id="destination"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        placeholder="City or airport"
                        className="mt-1 bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50 h-12 text-base"
                    />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <Label htmlFor="departure-date" className="text-sm font-medium text-card-foreground/90">Departure</Label>
                        <Popover>
                        <PopoverTrigger asChild>
                            <Button
                            variant="outline"
                            className={cn(
                                "w-full justify-start text-left font-normal mt-1 h-12 text-base glass-interactive",
                                !dates?.from && "text-muted-foreground"
                            )}
                            >
                            <CalendarLucideIcon className="mr-2 h-4 w-4" />
                            {dates?.from ? format(dates.from, "MMM dd, yyyy") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className={cn("w-auto p-0", glassCardClasses)} align="start">
                            <Calendar
                            mode="range"
                            selected={dates}
                            onSelect={setDates}
                            initialFocus
                            numberOfMonths={tripType === 'one-way' ? 1 : 2}
                            disabled={{ before: new Date() }}
                            />
                        </PopoverContent>
                        </Popover>
                    </div>
                    {tripType === 'round-trip' && (
                        <div>
                        <Label htmlFor="return-date" className="text-sm font-medium text-card-foreground/90">Return</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                "w-full justify-start text-left font-normal mt-1 h-12 text-base glass-interactive",
                                !dates?.to && "text-muted-foreground"
                                )}
                                disabled={!dates?.from}
                            >
                                <CalendarLucideIcon className="mr-2 h-4 w-4" />
                                {dates?.to ? format(dates.to, "MMM dd, yyyy") : <span>Pick a date</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className={cn("w-auto p-0", glassCardClasses)} align="start">
                            <Calendar
                                mode="range"
                                selected={dates}
                                onSelect={setDates}
                                initialFocus
                                numberOfMonths={2}
                                disabled={{ before: dates?.from || new Date() }}
                            />
                            </PopoverContent>
                        </Popover>
                        </div>
                    )}
                    {tripType === 'one-way' && ( // Single date picker for one-way
                         <div>
                            <Label htmlFor="one-way-date" className="text-sm font-medium text-card-foreground/90 opacity-0 md:opacity-100">.</Label> 
                             {/* Hidden label for spacing on mobile, visible on md+ for alignment */}
                         </div>
                    )}
                </div>


                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <Label htmlFor="passengers" className="text-sm font-medium text-card-foreground/90 flex items-center">
                            <Users className="w-4 h-4 mr-1.5" /> Passengers
                        </Label>
                        <Select value={passengers} onValueChange={setPassengers}>
                            <SelectTrigger className="mt-1 h-12 text-base bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50 glass-interactive">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className={glassCardClasses}>
                                <SelectItem value="1 adult">1 adult</SelectItem>
                                <SelectItem value="2 adults">2 adults</SelectItem>
                                <SelectItem value="3 adults">3 adults</SelectItem>
                                <SelectItem value="custom">Custom...</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="cabin-class" className="text-sm font-medium text-card-foreground/90 flex items-center">
                            <Briefcase className="w-4 h-4 mr-1.5" /> Cabin Class
                        </Label>
                         <Select value={cabinClass} onValueChange={setCabinClass}>
                            <SelectTrigger className="mt-1 h-12 text-base bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50 glass-interactive">
                                <SelectValue />
                            </SelectTrigger>
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

            <Button type="submit" size="lg" className={cn("w-full gap-2", prominentButtonClasses)} disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : <Search />}
              {isLoading ? 'Searching for Flights...' : 'Search Flights'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="text-center py-10 text-muted-foreground">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg">Finding the best flight options for you...</p>
        </div>
      )}

      {!isLoading && searchedFlights && (
        <div className="mt-8 animate-fade-in-up">
          <Separator className="my-6" />
          <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-6">
            Flight Options {origin && destination && `from ${origin} to ${destination}`}
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {searchedFlights.map(flight => (
              <MockFlightCard key={flight.id} flight={flight} />
            ))}
          </div>
        </div>
      )}
      {!isLoading && searchedFlights === null && (
        <div className="text-center py-10 text-muted-foreground mt-6">
            <Plane className="w-16 h-16 mx-auto mb-3 opacity-30"/>
          <p>Enter your flight details above and click "Search Flights" to see available options.</p>
        </div>
      )}
    </div>
  );
}
