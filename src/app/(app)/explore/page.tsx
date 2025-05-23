
"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Image from 'next/image';
// Link component is not used directly for navigation in the buttons, router.push is used.
// If Link is needed elsewhere, it can be re-added. For now, removing to avoid unused import.
// import Link from 'next/link'; 
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Search, Plane, Hotel, Compass, Briefcase, MapPin, ImageOff, Loader2, Sparkles, Building, Route, Info, ExternalLink, Mountain, FerrisWheel, Palette, Utensils, AlertTriangle } from 'lucide-react';
import { getPopularDestinations } from '@/app/actions';
import type { PopularDestinationsOutput, AiDestinationSuggestion, HotelIdea, FlightIdea } from '@/ai/types/popular-destinations-types';
import type { AITripPlannerInput } from '@/ai/types/trip-planner-types';
import { useToast as useShadcnToast } from '@/hooks/use-toast'; // Renamed to avoid conflict if useToast is defined locally
import { useRouter } from 'next/navigation';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { Alert, AlertTitle as ShadcnAlertTitle, AlertDescription as ShadcnAlertDescription } from '@/components/ui/alert';


const glassCardClasses = "glass-card hover:border-primary/40 bg-card/80 dark:bg-card/50 backdrop-blur-lg";

const interestCategories = [
  { name: "Beaches", icon: <Plane className="w-6 h-6" />, hint: "sandy beaches sunny coast", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30", textColor: "text-blue-300" },
  { name: "Mountains", icon: <Mountain className="w-6 h-6" />, hint: "majestic mountains hiking trails", bgColor: "bg-green-500/10", borderColor: "border-green-500/30", textColor: "text-green-300" },
  { name: "Cities", icon: <Building className="w-6 h-6" />, hint: "vibrant city skyline nightlife", bgColor: "bg-purple-500/10", borderColor: "border-purple-500/30", textColor: "text-purple-300" },
  { name: "Adventure", icon: <FerrisWheel className="w-6 h-6" />, hint: "thrilling adventure outdoor activities", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/30", textColor: "text-orange-300" },
  { name: "Culture", icon: <Palette className="w-6 h-6" />, hint: "rich culture historic art", bgColor: "bg-red-500/10", borderColor: "border-red-500/30", textColor: "text-red-300" },
  { name: "Food", icon: <Utensils className="w-6 h-6" />, hint: "delicious food local cuisine", bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/30", textColor: "text-yellow-300" },
];

// Helper Components defined at top-level
interface SearchInputPropsExplore {
  initialSearchTerm?: string;
  onSearch?: (term: string) => void;
  placeholder?: string;
}

function SearchInputExplore({ initialSearchTerm = '', onSearch, placeholder = "Search destinations, hotels, or activities..." }: SearchInputPropsExplore) {
  const [term, setTerm] = useState(initialSearchTerm);
  const { toast } = useShadcnToast();
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) onSearch(term);
    toast({
      title: "Search Submitted (Conceptual)",
      description: `You searched for: ${term}. This would typically trigger a search or navigation.`,
    });
  };
  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
      <Input
        type="search"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-11 pr-4 py-2.5 h-12 text-base bg-input/70 border-border/50 focus:bg-input/90 dark:bg-input/50 rounded-full shadow-inner focus:ring-2 focus:ring-primary/50"
      />
      <button type="submit" className="hidden">Search</button>
    </form>
  );
}

interface AiDestinationCardPropsExplore {
  destination: AiDestinationSuggestion;
  onPlanTrip: (tripIdea: AITripPlannerInput) => void;
}

function AiDestinationCardExplore({ destination, onPlanTrip }: AiDestinationCardPropsExplore): JSX.Element {
  const [imageLoadError, setImageLoadError] = useState<boolean>(false);

  const derivedImageHint: string | undefined = useMemo(() => {
    if (destination.imageUri && destination.imageUri.startsWith('https://placehold.co')) {
      if (destination.imagePrompt) {
        return destination.imagePrompt;
      } else if (destination.name) {
        return destination.name.toLowerCase().split(" ").slice(0, 2).join(" ");
      }
    }
    return undefined;
  }, [destination.imageUri, destination.imagePrompt, destination.name]);

  const handleImageError = useCallback(() => {
    console.warn(`[AiDestinationCardExplore] Image load ERROR for: ${destination.name}, src: ${destination.imageUri}`);
    setImageLoadError(true);
  }, [destination.name, destination.imageUri]);
  
  const canDisplayImage: boolean = !imageLoadError && !!destination.imageUri;

  return (
    <Card className={cn(glassCardClasses, "overflow-hidden transform hover:scale-[1.03] transition-transform duration-300 ease-out shadow-lg hover:shadow-primary/30 flex flex-col")}>
      <div className="relative w-full aspect-[16/10] bg-muted/30 group">
        {canDisplayImage && destination.imageUri ? (
          <Image
            src={destination.imageUri}
            alt={destination.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            data-ai-hint={derivedImageHint}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            onError={handleImageError}
            priority={false}
          />
        ) : (
          <div className="w-full h-full bg-muted/30 flex items-center justify-center">
            <ImageOff className="w-10 h-10 text-muted-foreground" />
          </div>
        )}
      </div>
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-md font-semibold text-card-foreground">{destination.name}</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">{destination.country}</CardDescription>
      </CardHeader>
      <CardContent className="p-3 pt-0 text-xs text-muted-foreground flex-grow space-y-1.5">
        <p className="line-clamp-3">{destination.description}</p>
        {destination.hotelIdea && (
          <div className="text-xs border-t border-border/20 pt-1.5 mt-1.5">
            <p className="font-medium text-card-foreground/90 flex items-center"><Building className="w-3 h-3 mr-1.5 text-primary/70" />Hotel Idea:</p>
            <p className="pl-4 text-muted-foreground">{destination.hotelIdea.type} ({destination.hotelIdea.priceRange})</p>
          </div>
        )}
        {destination.flightIdea && (
          <div className="text-xs border-t border-border/20 pt-1.5 mt-1.5">
            <p className="font-medium text-card-foreground/90 flex items-center"><Route className="w-3 h-3 mr-1.5 text-primary/70" />Flight Idea:</p>
            <p className="pl-4 text-muted-foreground">{destination.flightIdea.description} ({destination.flightIdea.priceRange})</p>
          </div>
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
          onClick={() => {
            const plannerInput: AITripPlannerInput = {
              destination: destination.name + (destination.country ? `, ${destination.country}` : ''),
              travelDates: "Next month for 7 days", 
              budget: parseInt(destination.hotelIdea?.priceRange?.match(/\$(\d+)/)?.[1] || destination.flightIdea?.priceRange?.match(/\$(\d+)/)?.[1] || '2000', 10) * (destination.hotelIdea?.priceRange ? 7 : 1),
            };
            onPlanTrip(plannerInput);
          }}
        >
          <ExternalLink className="mr-2 h-4 w-4" /> Plan Trip
        </Button>
      </CardFooter>
    </Card>
  );
}

interface DialogImageDisplayPropsExplorePage { 
  destination: AiDestinationSuggestion | null;
}

function DialogImageDisplayExplorePage({ destination }: DialogImageDisplayPropsExplorePage) {
  const [imageLoadError, setImageLoadError] = useState(false);

  useEffect(() => {
    setImageLoadError(false); 
  }, [destination?.imageUri]);

  if (!destination) return null;

  const derivedImageHint: string | undefined = useMemo(() => {
    if (destination.imageUri && destination.imageUri.startsWith('https://placehold.co')) {
      if (destination.imagePrompt) {
        return destination.imagePrompt;
      } else if (destination.name) {
        return destination.name.toLowerCase().split(" ").slice(0,2).join(" ");
      }
    }
    return undefined;
  }, [destination.imageUri, destination.imagePrompt, destination.name]);

  const handleImageError = useCallback(() => {
    console.warn(`[DialogImageDisplayExplorePage] Image load ERROR for: ${destination.name}, src: ${destination.imageUri}`);
    setImageLoadError(true);
  }, [destination.name, destination.imageUri]);

  const canDisplayImage: boolean = !imageLoadError && !!destination.imageUri;

  return (
    <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-border/50 shadow-lg bg-muted/30">
      {canDisplayImage && destination.imageUri ? (
        <Image
          src={destination.imageUri}
          alt={`Image of ${destination.name}`}
          fill
          className="object-cover"
          data-ai-hint={derivedImageHint}
          sizes="(max-width: 640px) 90vw, 500px"
          onError={handleImageError}
        />
      ) : (
        <div className="w-full h-full bg-muted/30 flex items-center justify-center">
          <ImageOff className="w-10 h-10 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}


export default function ExplorePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [aiDestinations, setAiDestinations] = useState<AiDestinationSuggestion[]>([]);
  const [isFetchingAiDestinations, setIsFetchingAiDestinations] = useState(false);
  const [aiDestinationsError, setAiDestinationsError] = useState<string | null>(null);
  const [aiContextualNote, setAiContextualNote] = useState<string | null>(null);
  const [selectedDestinationDialog, setSelectedDestinationDialog] = useState<AiDestinationSuggestion | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { toast } = useShadcnToast();
  const router = useRouter();

  const fetchGlobalPopularDestinations = useCallback(async () => {
    setIsFetchingAiDestinations(true);
    setAiDestinationsError(null);
    setAiContextualNote(null);
    setAiDestinations([]);

    try {
      const result: PopularDestinationsOutput = await getPopularDestinations({}); 
      if (result && result.destinations) {
        const processedDestinations = result.destinations.map(d => ({
          ...d,
          imageUri: d.imageUri || `https://placehold.co/600x400.png?text=${encodeURIComponent(d.name.substring(0, 10))}`
        }));
        setAiDestinations(processedDestinations);
      } else {
        setAiDestinations([]);
      }
      setAiContextualNote(result?.contextualNote || "General popular destination ideas from AI.");
      if (!result?.destinations || result.destinations.length === 0) {
        setAiDestinationsError("AI couldn't find specific suggestions at this moment. Try again later!");
      }
    } catch (error) {
      console.error("[ExplorePage] Error fetching AI destinations:", error);
      setAiDestinationsError("Could not fetch destination suggestions. Please check your connection or try again.");
      setAiDestinations([]);
    } finally {
      setIsFetchingAiDestinations(false);
    }
  }, []);

  useEffect(() => {
    fetchGlobalPopularDestinations();
  }, [fetchGlobalPopularDestinations]);

  const handlePlanTrip = (tripIdea: AITripPlannerInput) => {
    localStorage.setItem('tripBundleToPlan', JSON.stringify(tripIdea));
    window.dispatchEvent(new CustomEvent('localStorageUpdated_tripBundleToPlan'));
    router.push('/planner');
    toast({
      title: `Planning Trip to ${tripIdea.destination}`,
      description: "Planner opened with destination details. Adjust dates and budget as needed.",
    });
  };
  
  const handleInterestClick = (interestName: string, hint: string) => {
     toast({
      title: `Exploring: ${interestName}`,
      description: `AI would now conceptually search for destinations related to '${hint}'. (Full functionality pending backend integration)`,
    });
  };
  
  const handleOpenDialog = (destination: AiDestinationSuggestion) => {
    setSelectedDestinationDialog(destination);
    setIsDialogOpen(true);
  };


  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <section className="mb-12 text-center animate-fade-in-up">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent mb-4">
            Explore Your Next Adventure
          </h1>
          <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
            Discover amazing destinations, get travel inspiration, and let Aura AI guide your journey.
          </p>
          <div className={cn("max-w-2xl mx-auto p-3 rounded-xl shadow-xl", glassCardClasses, "border-primary/20")}>
            <SearchInputExplore placeholder="Where do you want to go?" />
          </div>
        </section>

        <section className="mb-12 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-6 flex items-center">
            <Compass className="w-7 h-7 mr-3 text-primary" /> Travel by Interest
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {interestCategories.map((category) => (
              <button
                key={category.name}
                onClick={() => handleInterestClick(category.name, category.hint)}
                className={cn(
                  "p-4 rounded-xl transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2",
                  glassCardClasses,
                  category.bgColor,
                  category.borderColor,
                  "hover:border-opacity-70 focus:ring-opacity-50",
                  "flex flex-col items-center justify-center aspect-square text-center group"
                )}
              >
                <div className={cn("mb-2 transition-transform duration-300 group-hover:scale-110", category.textColor)}>
                  {React.cloneElement(category.icon, { className: "w-8 h-8 sm:w-10 sm:h-10" })}
                </div>
                <span className={cn("text-xs sm:text-sm font-medium transition-colors duration-300", category.textColor, "group-hover:text-opacity-100")}>
                  {category.name}
                </span>
              </button>
            ))}
          </div>
        </section>
        
        <Separator className="my-10 border-border/30" />

        <section className="mb-12 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground flex items-center">
              <Sparkles className="w-7 h-7 mr-3 text-accent" /> Top Destinations Worldwide
            </h2>
            <Button
              onClick={fetchGlobalPopularDestinations}
              disabled={isFetchingAiDestinations}
              size="lg"
              className={cn(
                "text-lg py-3 group transform transition-all duration-300 ease-out shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40",
                "bg-gradient-to-r from-primary to-accent text-primary-foreground",
                "hover:from-accent hover:to-primary",
                "focus-visible:ring-4 focus-visible:ring-primary/40"
              )}
            >
              {isFetchingAiDestinations ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2 group-hover:animate-pulse" />}
              {isFetchingAiDestinations ? "Discovering..." : "Refresh Suggestions"}
            </Button>
          </div>
          {aiContextualNote && !isFetchingAiDestinations && (
            <p className="text-sm text-muted-foreground italic mb-4 text-center sm:text-left">{aiContextualNote}</p>
          )}

          {isFetchingAiDestinations && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, index) => (
                <Card key={index} className={cn(glassCardClasses, "overflow-hidden animate-pulse")}>
                  <div className="relative w-full aspect-[16/10] bg-muted/40"></div>
                  <CardHeader className="p-4"><div className="h-5 w-3/4 bg-muted/40 rounded"></div><div className="h-3 w-1/2 bg-muted/40 rounded mt-1"></div></CardHeader>
                  <CardContent className="p-4 pt-0 space-y-1.5"><div className="h-3 w-full bg-muted/40 rounded"></div><div className="h-3 w-5/6 bg-muted/40 rounded"></div></CardContent>
                  <CardFooter className="p-4"><div className="h-8 w-full bg-muted/40 rounded"></div></CardFooter>
                </Card>
              ))}
            </div>
          )}

          {!isFetchingAiDestinations && aiDestinationsError && (
            <Card className={cn(glassCardClasses, "border-destructive/30")}>
              <CardContent className="p-6 text-center text-destructive">
                <AlertTriangle className="w-10 h-10 mx-auto mb-2" />
                <p className="font-semibold">{aiDestinationsError}</p>
              </CardContent>
            </Card>
          )}

          {!isFetchingAiDestinations && aiDestinations.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {aiDestinations.map((dest, index) => (
                <div key={dest.name + (dest.latitude || index) + (dest.longitude || index)} onClick={() => handleOpenDialog(dest)} className="cursor-pointer">
                  <AiDestinationCardExplore
                    destination={dest}
                    onPlanTrip={handlePlanTrip}
                  />
                </div>
              ))}
            </div>
          )}
          {!isFetchingAiDestinations && !aiDestinationsError && aiDestinations.length === 0 && (
            <Card className={cn(glassCardClasses, "p-6 text-center text-muted-foreground")}>
              Click the button above to let Aura AI suggest some global destinations!
            </Card>
          )}
        </section>

        <Separator className="my-10 border-border/30" />
        <section className="mb-12 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-6">Ideas for you (Coming Soon)</h2>
            <Card className={cn(glassCardClasses, "p-6 text-center")}>
                <p className="text-muted-foreground">Personalized trip ideas based on your Travel DNA and past journeys will appear here!</p>
            </Card>
        </section>
      </main>

      {selectedDestinationDialog && (
         <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className={cn("sm:max-w-lg md:max-w-xl p-0", glassCardClasses, "border-primary/30")}>
                <DialogHeader className="p-4 sm:p-6 border-b border-border/30 sticky top-0 z-10 bg-card/80 dark:bg-card/50 backdrop-blur-sm">
                    <div className="flex justify-between items-center">
                         <DialogTitle className="text-xl font-semibold text-foreground flex items-center">
                            <MapPin className="w-5 h-5 mr-2 text-primary" />
                            {selectedDestinationDialog.name}
                         </DialogTitle>
                        <DialogClose asChild>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-accent/20 hover:text-accent-foreground">
                                <X className="h-5 w-5" />
                            </Button>
                        </DialogClose>
                    </div>
                     <DialogDescription className="text-sm text-muted-foreground">{selectedDestinationDialog.country}</DialogDescription>
                </DialogHeader>
                <div className="p-4 sm:p-6 space-y-4">
                    <DialogImageDisplayExplorePage destination={selectedDestinationDialog} />
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {selectedDestinationDialog.description}
                    </p>
                    {selectedDestinationDialog.hotelIdea && (
                        <div className="text-xs border-t border-border/30 pt-2 mt-2">
                            <p className="font-medium text-card-foreground/90 flex items-center"><Building className="w-3.5 h-3.5 mr-1.5 text-primary/80"/>Hotel Idea:</p>
                            <p className="pl-5 text-muted-foreground">{selectedDestinationDialog.hotelIdea.type} ({selectedDestinationDialog.hotelIdea.priceRange})</p>
                        </div>
                    )}
                    {selectedDestinationDialog.flightIdea && (
                        <div className="text-xs border-t border-border/30 pt-2 mt-2">
                            <p className="font-medium text-card-foreground/90 flex items-center"><Route className="w-3.5 h-3.5 mr-1.5 text-primary/80"/>Flight Idea:</p>
                            <p className="pl-5 text-muted-foreground">{selectedDestinationDialog.flightIdea.description} ({selectedDestinationDialog.flightIdea.priceRange})</p>
                        </div>
                    )}
                    <Button 
                        onClick={() => {
                            const plannerInput: AITripPlannerInput = {
                                destination: selectedDestinationDialog.name + (selectedDestinationDialog.country ? `, ${selectedDestinationDialog.country}` : ''),
                                travelDates: "Next month for 7 days",
                                budget: parseInt(selectedDestinationDialog.hotelIdea?.priceRange?.match(/\$(\d+)/)?.[1] || selectedDestinationDialog.flightIdea?.priceRange?.match(/\$(\d+)/)?.[1] || '2000', 10) * (selectedDestinationDialog.hotelIdea?.priceRange ? 7 : 1),
                            };
                            handlePlanTrip(plannerInput);
                            setIsDialogOpen(false);
                        }}
                        size="lg" 
                        className={cn(
                            "w-full text-lg py-3 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 mt-4",
                            "bg-gradient-to-r from-primary to-accent text-primary-foreground",
                            "hover:from-accent hover:to-primary",
                            "focus-visible:ring-4 focus-visible:ring-primary/40",
                            "transform transition-all duration-300 ease-out hover:scale-[1.02] active:scale-100"
                        )}
                    >
                        <ExternalLink className="mr-2 h-5 w-5" />
                        Plan a Trip to {selectedDestinationDialog.name}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

    