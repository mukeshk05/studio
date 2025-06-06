
"use client";

import Link from 'next/link';
import React, { useEffect, useState, useCallback } from 'react';
import { AppLogo } from '@/components/layout/app-logo';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { HomePagePackageCard } from '@/components/landing/HomePagePackageCard';
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  Search, Plane, Hotel, Compass, Briefcase, LogIn, UserPlus, User, LogOut, Sparkles, MapPin, Loader2, AlertTriangle, Info, ListChecks
} from 'lucide-react';
import { getPopularDestinations, generateSmartBundles as generateSmartBundlesAction } from './actions';
import type { PopularDestinationsOutput, AiDestinationSuggestion, PopularDestinationsInput } from '@/ai/types/popular-destinations-types';
import type { SmartBundleOutput, BundleSuggestion, SmartBundleInput } from '@/ai/types/smart-bundle-types';
import type { AITripPlannerInput } from '@/ai/types/trip-planner-types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

const glassPaneClasses = "bg-background/60 dark:bg-background/50 backdrop-blur-xl";
const glassCardClasses = "glass-card hover:border-primary/40 bg-card/80 dark:bg-card/50 backdrop-blur-lg";

const exploreCategories = [
  { name: "Flights", icon: <Plane className="w-5 h-5" />, href: "/flights" },
  { name: "Hotels", icon: <Hotel className="w-5 h-5" />, href: "/hotels" },
  { name: "Things to do", icon: <ListChecks className="w-5 h-5" />, href: "/things-to-do" },
  { name: "Packages", icon: <Briefcase className="w-5 h-5" />, href: "/explore" },
];

interface UserLocation { latitude: number; longitude: number; }

export default function LandingPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const { currentUser, logout, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [geolocationError, setGeolocationError] = useState<string | null>(null);

  const [popularDestinations, setPopularDestinations] = useState<AiDestinationSuggestion[]>([]);
  const [isLoadingPopular, setIsLoadingPopular] = useState(true);
  const [popularError, setPopularError] = useState<string | null>(null);
  const [popularContextualNote, setPopularContextualNote] = useState<string | null>(null);

  const [smartBundles, setSmartBundles] = useState<BundleSuggestion[]>([]);
  const [isLoadingSmartBundles, setIsLoadingSmartBundles] = useState(false);
  const [smartBundlesError, setSmartBundlesError] = useState<string | null>(null);
  const [smartBundlesContextualNote, setSmartBundlesContextualNote] = useState<string | null>(null);

  const fetchPopularDestinations = useCallback(async (loc?: UserLocation) => {
    setIsLoadingPopular(true);
    setPopularError(null);
    try {
      const input: PopularDestinationsInput = loc ? { userLatitude: loc.latitude, userLongitude: loc.longitude } : {};
      const result = await getPopularDestinations(input);
      setPopularDestinations(result.destinations || []);
      setPopularContextualNote(result.contextualNote || (result.destinations?.length === 0 ? "No popular destinations found at the moment." : "Explore these popular spots!"));
    } catch (error: any) {
      setPopularError(`Failed to load popular destinations: ${error.message}`);
      setPopularContextualNote(`Error: ${error.message}`);
    } finally {
      setIsLoadingPopular(false);
    }
  }, []);

  const fetchSmartBundles = useCallback(async () => {
    if (!currentUser?.uid) return;
    setIsLoadingSmartBundles(true);
    setSmartBundlesError(null);
    try {
      const input: SmartBundleInput = { userId: currentUser.uid };
      const result = await generateSmartBundlesAction(input);
      setSmartBundles(result.suggestions || []);
      setSmartBundlesContextualNote(result.suggestions?.length === 0 ? "No personalized bundles found yet. Explore more or update your Travel DNA!" : "Here are some smart ideas tailored for you!");
    } catch (error: any) {
      setSmartBundlesError(`Failed to load smart bundles: ${error.message}`);
      setSmartBundlesContextualNote(`Error fetching smart bundles: ${error.message}`);
    } finally {
      setIsLoadingSmartBundles(false);
    }
  }, [currentUser?.uid]);

  useEffect(() => {
    fetchPopularDestinations(); 
  }, [fetchPopularDestinations]);
  
  useEffect(() => {
    if (currentUser && smartBundles.length === 0 && !isLoadingSmartBundles) { 
        fetchSmartBundles();
    } else if (!currentUser) {
        setSmartBundles([]);
        setSmartBundlesContextualNote("Log in to see personalized trip ideas!");
    }
  }, [currentUser, fetchSmartBundles, smartBundles.length, isLoadingSmartBundles]);

  const handleAttemptGetLocationAndFetchPopular = () => {
    setIsFetchingLocation(true);
    setGeolocationError(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = { latitude: position.coords.latitude, longitude: position.coords.longitude };
          setUserLocation(loc);
          fetchPopularDestinations(loc);
          setIsFetchingLocation(false);
        },
        (error) => {
          setGeolocationError(`Could not get location: ${error.message}. Showing global suggestions.`);
          setIsFetchingLocation(false);
          fetchPopularDestinations();
        },
        { timeout: 8000 }
      );
    } else {
      setGeolocationError("Geolocation is not supported by your browser. Showing global suggestions.");
      setIsFetchingLocation(false);
      fetchPopularDestinations();
    }
  };
  
  const handlePlanTrip = (tripIdea: AITripPlannerInput) => {
    localStorage.setItem('tripBundleToPlan', JSON.stringify(tripIdea));
    window.dispatchEvent(new CustomEvent('localStorageUpdated_tripBundleToPlan'));
    router.push('/planner');
  };

  const handleSearchSubmit = (term: string) => {
    router.push(`/explore?q=${encodeURIComponent(term)}`);
    toast({
      title: "Navigating to Explore",
      description: `Searching for: ${term}`,
    });
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className={cn("sticky top-0 z-40 w-full border-b border-border/30", glassPaneClasses)}>
         <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <AppLogo />
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link href="/travel" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-foreground hover:bg-accent/10 hover:text-accent-foreground")}>
              <Plane className="w-4 h-4 mr-1.5" />Travel
            </Link>
            <Link href="/explore" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-foreground hover:bg-accent/10 hover:text-accent-foreground")}>
              <Compass className="w-4 h-4 mr-1.5" />Explore
            </Link>
            {authLoading ? (
              <Skeleton className="h-9 w-20 rounded-md bg-muted/50" />
            ) : currentUser ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 hover:bg-accent/20">
                    <Avatar className="h-9 w-9 border border-primary/50">
                      <AvatarImage src={currentUser.photoURL || undefined} alt={currentUser.displayName || currentUser.email || "User"} />
                      <AvatarFallback className="bg-primary/20 text-primary"><User className="h-5 w-5" /></AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className={cn("w-56", glassCardClasses, "border-border/50")} align="end" forceMount>
                  <DropdownMenuLabel className="font-normal text-card-foreground">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{currentUser.displayName || currentUser.email?.split('@')[0]}</p>
                      {currentUser.email && <p className="text-xs leading-none text-muted-foreground">{currentUser.email}</p>}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-border/50"/>
                  <DropdownMenuItem asChild><Link href="/planner" className="cursor-pointer focus:bg-accent/20 focus:text-accent-foreground">Planner</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="/dashboard" className="cursor-pointer focus:bg-accent/20 focus:text-accent-foreground">Dashboard</Link></DropdownMenuItem>
                  <DropdownMenuItem onClick={logout} className="cursor-pointer focus:bg-destructive/20 focus:text-destructive-foreground"><LogOut className="mr-2 h-4 w-4" />Log out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="text-foreground hover:bg-accent/10 hover:text-accent-foreground"><Link href="/login"><LogIn className="mr-1.5 h-4 w-4"/>Login</Link></Button>
                <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/30"><Link href="/signup"><UserPlus className="mr-1.5 h-4 w-4"/>Sign Up</Link></Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <section className="mb-12 text-center animate-fade-in-up">
           <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent mb-4">
            Your Smart Travel Companion
          </h1>
          <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
            Discover, plan, and book your next adventure with AI-powered insights and real-time data.
          </p>
          <div className={cn("max-w-xl mx-auto p-2 rounded-xl shadow-xl", glassCardClasses, "border-primary/20")}>
            <form onSubmit={(e) => {e.preventDefault(); handleSearchSubmit(searchTerm);}} className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                 <Input
                    type="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search for a destination (e.g., 'Paris', 'beaches in Thailand')"
                    className="w-full pl-10 pr-4 py-2.5 h-12 text-base bg-input/70 border-border/50 focus:bg-input/90 dark:bg-input/50 rounded-full shadow-inner focus:ring-2 focus:ring-primary/50"
                />
            </form>
          </div>
        </section>

        <section className="mb-12 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className={cn("grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 p-3 rounded-xl", glassCardClasses, "border-primary/10")}>
            {exploreCategories.map((category) => (
              <Link key={category.name} href={category.href} passHref>
                <Button
                  variant="ghost"
                  className="w-full h-24 sm:h-28 flex flex-col items-center justify-center p-2 text-center transition-all duration-200 ease-in-out hover:bg-primary/10 group rounded-lg"
                >
                  <div className="mb-1.5 text-primary group-hover:text-accent transition-colors">
                    {React.cloneElement(category.icon, { className: cn(category.icon.props.className, "w-7 h-7 sm:w-8 sm:h-8") })}
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-card-foreground group-hover:text-accent transition-colors">{category.name}</span>
                </Button>
              </Link>
            ))}
          </div>
        </section>

        <Separator className="my-10 border-border/30" />

        <section className="mb-12 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground flex items-center">
              <MapPin className="w-7 h-7 mr-2 text-primary" /> Popular Destinations
            </h2>
            <Button onClick={handleAttemptGetLocationAndFetchPopular} disabled={isFetchingLocation || isLoadingPopular} variant="outline" className="glass-interactive">
              {(isFetchingLocation || isLoadingPopular) ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2" />}
              {(isFetchingLocation || isLoadingPopular) ? "Updating..." : "Refresh with Location"}
            </Button>
          </div>
          {geolocationError && <p className="text-xs text-center text-amber-500 mb-3"><Info className="inline w-3 h-3 mr-1"/>{geolocationError}</p>}
          {popularContextualNote && !isLoadingPopular && <p className="text-sm text-muted-foreground italic mb-4 text-center sm:text-left">{popularContextualNote}</p>}

          {isLoadingPopular && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {[...Array(4)].map((_, i) => <Skeleton key={`pop-skel-${i}`} className="h-96 rounded-lg bg-muted/30" />)}
            </div>
          )}
          {!isLoadingPopular && popularError && (
            <Card className={cn(glassCardClasses, "border-destructive/50")}><CardContent className="p-6 text-center text-destructive"><AlertTriangle className="w-10 h-10 mx-auto mb-2" /><p className="font-semibold">Error</p><p>{popularError}</p></CardContent></Card>
          )}
          {!isLoadingPopular && popularDestinations.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {popularDestinations.map((dest) => (
                <HomePagePackageCard key={dest.name + (dest.country || '')} item={dest} onPlanTrip={handlePlanTrip} />
              ))}
            </div>
          )}
        </section>

        {currentUser && (
          <>
            <Separator className="my-10 border-border/30" />
            <section className="mb-12 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
                <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground flex items-center">
                  <Sparkles className="w-7 h-7 mr-2 text-accent" /> Smart Trip Ideas For You
                </h2>
                 <Button onClick={fetchSmartBundles} disabled={isLoadingSmartBundles} variant="outline" className="glass-interactive">
                    {isLoadingSmartBundles ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2" />}
                    {isLoadingSmartBundles ? "Thinking..." : "Refresh My Ideas"}
                </Button>
              </div>
              {smartBundlesContextualNote && !isLoadingSmartBundles && <p className="text-sm text-muted-foreground italic mb-4 text-center sm:text-left">{smartBundlesContextualNote}</p>}
              
              {isLoadingSmartBundles && (
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[...Array(3)].map((_, i) => <Skeleton key={`smart-skel-${i}`} className="h-96 rounded-lg bg-muted/30" />)}
                </div>
              )}
              {!isLoadingSmartBundles && smartBundlesError && (
                <Card className={cn(glassCardClasses, "border-destructive/50")}><CardContent className="p-6 text-center text-destructive"><AlertTriangle className="w-10 h-10 mx-auto mb-2" /><p className="font-semibold">Error</p><p>{smartBundlesError}</p></CardContent></Card>
              )}
              {!isLoadingSmartBundles && smartBundles.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {smartBundles.map((bundle) => (
                    <HomePagePackageCard key={bundle.bundleName} item={bundle} onPlanTrip={handlePlanTrip} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <footer className={cn("py-6 border-t border-border/30 mt-auto", glassPaneClasses)}>
         <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} BudgetRoam. Your AI Travel Planner.
          </p>
        </div>
      </footer>
    </div>
  );
}
