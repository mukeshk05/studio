
"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Search, Plane, Hotel, Compass, Briefcase, MapPin, ImageOff, Loader2, Sparkles, Building, Route, Info, ExternalLink, Mountain, FerrisWheel, Palette, Utensils, AlertTriangle, X, LocateFixed, Lightbulb } from 'lucide-react';
import { getPopularDestinations, getExploreIdeasAction } from '@/app/actions';
import type { PopularDestinationsOutput, AiDestinationSuggestion, PopularDestinationsInput } from '@/ai/types/popular-destinations-types';
import type { ExploreIdeaSuggestion, ExploreIdeasOutput } from '@/ai/types/explore-ideas-types'; // New types
import type { AITripPlannerInput } from '@/ai/types/trip-planner-types';
import { useToast as useShadcnToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Alert, AlertTitle as ShadcnAlertTitle, AlertDescription as ShadcnAlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext'; // For fetching user ID

const glassCardClasses = "glass-card hover:border-primary/40 bg-card/80 dark:bg-card/50 backdrop-blur-lg";

const interestCategories = [
  { name: "Beaches", icon: <Plane className="w-6 h-6" />, hint: "sandy beaches sunny coast", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30", textColor: "text-blue-300" },
  { name: "Mountains", icon: <Mountain className="w-6 h-6" />, hint: "majestic mountains hiking trails", bgColor: "bg-green-500/10", borderColor: "border-green-500/30", textColor: "text-green-300" },
  { name: "Cities", icon: <Building className="w-6 h-6" />, hint: "vibrant city skyline nightlife", bgColor: "bg-purple-500/10", borderColor: "border-purple-500/30", textColor: "text-purple-300" },
  { name: "Adventure", icon: <FerrisWheel className="w-6 h-6" />, hint: "thrilling adventure outdoor activities", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/30", textColor: "text-orange-300" },
  { name: "Culture", icon: <Palette className="w-6 h-6" />, hint: "rich culture historic art", bgColor: "bg-red-500/10", borderColor: "border-red-500/30", textColor: "text-red-300" },
  { name: "Food", icon: <Utensils className="w-6 h-6" />, hint: "delicious food local cuisine", bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/30", textColor: "text-yellow-300" },
];

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
  onSelect: () => void;
}

function AiDestinationCardExplore({ destination, onPlanTrip, onSelect }: AiDestinationCardPropsExplore) {
  const [imageLoadError, setImageLoadError] = useState<boolean>(false);

  const derivedImageHint = useMemo(() => {
    if (destination.imageUri && destination.imageUri.startsWith('https://placehold.co')) {
      return destination.imagePrompt || destination.name.toLowerCase().split(" ").slice(0, 2).join(" ");
    }
    return undefined;
  }, [destination.imageUri, destination.imagePrompt, destination.name]);

  const handleImageError = useCallback(() => {
    console.warn(`[AiDestinationCardExplore] Image load ERROR for: ${destination.name}, src: ${destination.imageUri}`);
    setImageLoadError(true);
  }, [destination.name, destination.imageUri]);

  const canDisplayImage = !imageLoadError && destination.imageUri;

  return (
    <Card 
      className={cn(glassCardClasses, "overflow-hidden transform hover:scale-[1.03] transition-transform duration-300 ease-out shadow-lg hover:shadow-primary/30 flex flex-col cursor-pointer")}
      onClick={onSelect}
    >
      <div className="relative w-full aspect-[16/10] bg-muted/30 group">
        {canDisplayImage ? (
          <Image
            src={destination.imageUri!}
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
          onClick={(e) => {
            e.stopPropagation(); 
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

interface PersonalizedIdeaCardProps {
  idea: ExploreIdeaSuggestion;
  onPlanTrip: (tripIdea: AITripPlannerInput) => void;
}

function PersonalizedIdeaCard({ idea, onPlanTrip }: PersonalizedIdeaCardProps) {
  const [imageLoadError, setImageLoadError] = useState(false);
  const derivedImageHint = useMemo(() => {
    if (idea.imageUri && idea.imageUri.startsWith('https://placehold.co')) {
      return idea.imagePrompt || idea.title.toLowerCase().split(" ").slice(0, 2).join(" ");
    }
    return undefined;
  }, [idea.imageUri, idea.imagePrompt, idea.title]);

  const handleImageError = useCallback(() => {
    console.warn(`[PersonalizedIdeaCard] Image load ERROR for: ${idea.title}, src: ${idea.imageUri}`);
    setImageLoadError(true);
  }, [idea.title, idea.imageUri]);

  const canDisplayImage = !imageLoadError && idea.imageUri;

  return (
    <Card className={cn(glassCardClasses, "overflow-hidden transform hover:scale-[1.03] transition-transform duration-300 ease-out shadow-lg hover:shadow-accent/30 flex flex-col")}>
      <div className="relative w-full aspect-[16/10] bg-muted/30 group">
        {canDisplayImage ? (
          <Image
            src={idea.imageUri!}
            alt={idea.title}
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
        <CardTitle className="text-md font-semibold text-accent">{idea.title}</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          {idea.destination}, {idea.country}
        </CardDescription>
        {idea.originalSearchHint && (
          <Badge variant="outline" className="text-xs mt-1 w-fit border-accent/40 text-accent/90 bg-accent/5">
            <Lightbulb className="w-3 h-3 mr-1.5" /> {idea.originalSearchHint}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="p-3 pt-0 text-xs text-muted-foreground flex-grow space-y-1.5">
        <p className="line-clamp-3">{idea.description}</p>
        {idea.hotelIdea && (
          <div className="text-xs border-t border-border/20 pt-1.5 mt-1.5">
            <p className="font-medium text-card-foreground/90 flex items-center"><Building className="w-3 h-3 mr-1.5 text-accent/70" />Hotel Idea:</p>
            <p className="pl-4 text-muted-foreground">{idea.hotelIdea.type} ({idea.hotelIdea.priceRange})</p>
          </div>
        )}
        {idea.flightIdea && (
          <div className="text-xs border-t border-border/20 pt-1.5 mt-1.5">
            <p className="font-medium text-card-foreground/90 flex items-center"><Route className="w-3 h-3 mr-1.5 text-accent/70" />Flight Idea:</p>
            <p className="pl-4 text-muted-foreground">{idea.flightIdea.description} ({idea.flightIdea.priceRange})</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="p-3 pt-2">
        <Button
          size="sm"
          className={cn(
            "w-full text-sm py-2 shadow-md shadow-accent/30 hover:shadow-lg hover:shadow-accent/40",
            "bg-gradient-to-r from-accent to-primary text-primary-foreground",
            "hover:from-primary hover:to-accent",
            "focus-visible:ring-4 focus-visible:ring-accent/40",
            "transform transition-all duration-300 ease-out hover:scale-[1.02] active:scale-100"
          )}
          onClick={() => {
            const plannerInput: AITripPlannerInput = {
              destination: idea.destination + (idea.country ? `, ${idea.country}` : ''),
              travelDates: "Next available month for 1 week", // Generic placeholder
              budget: parseInt(idea.hotelIdea?.priceRange?.match(/\$(\d+)/)?.[1] || idea.flightIdea?.priceRange?.match(/\$(\d+)/)?.[1] || '2500', 10) * 7,
            };
            onPlanTrip(plannerInput);
          }}
        >
          <ExternalLink className="mr-2 h-4 w-4" /> Plan This Idea
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

  const derivedImageHint = useMemo(() => {
    if (destination.imageUri && destination.imageUri.startsWith('https://placehold.co')) {
      return destination.imagePrompt || destination.name.toLowerCase().split(" ").slice(0,2).join(" ");
    }
    return undefined;
  }, [destination.imageUri, destination.imagePrompt, destination.name]);

  const handleImageError = useCallback(() => {
    console.warn(`[DialogImageDisplayExplorePage] Image load ERROR for: ${destination.name}, src: ${destination.imageUri}`);
    setImageLoadError(true);
  }, [destination.name, destination.imageUri]);

  const canDisplayImage = !imageLoadError && destination.imageUri;

  return (
    <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-border/50 shadow-lg bg-muted/30">
      {canDisplayImage ? (
        <Image
          src={destination.imageUri!}
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

interface UserLocation {
  latitude: number;
  longitude: number;
}

export default function ExplorePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const markersRef = useRef<any[]>([]); 
  const mapRef = useRef<HTMLDivElement>(null);
  const [selectedMapDestination, setSelectedMapDestination] = useState<AiDestinationSuggestion | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMapsScriptLoaded, setIsMapsScriptLoaded] = useState(false);
  const [mapsApiError, setMapsApiError] = useState<string | null>(null);
  const [isMapInitializing, setIsMapInitializing] = useState(false);

  const [aiDestinations, setAiDestinations] = useState<AiDestinationSuggestion[]>([]);
  const [isFetchingAiDestinations, setIsFetchingAiDestinations] = useState(false);
  const [aiDestinationsError, setAiDestinationsError] = useState<string | null>(null);
  
  const [exploreIdeas, setExploreIdeas] = useState<ExploreIdeaSuggestion[] | null>(null);
  const [isFetchingExploreIdeas, setIsFetchingExploreIdeas] = useState(false);
  const [exploreIdeasError, setExploreIdeasError] = useState<string | null>(null);
  const [exploreIdeasContextualNote, setExploreIdeasContextualNote] = useState<string | null>(null);

  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [geolocationError, setGeolocationError] = useState<string | null>(null);
  const [aiContextualNote, setAiContextualNote] = useState<string | null>("Explore top destinations or discover places based on your interests!");
  const [currentFetchType, setCurrentFetchType] = useState<string | null>(null);


  const { toast } = useShadcnToast();
  const router = useRouter();
  const { currentUser } = useAuth();

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const initGoogleMapsApi = useCallback(() => {
    console.log("[ExplorePage] Google Maps API script loaded callback executed.");
    setIsMapsScriptLoaded(true);
  }, []);

  useEffect(() => {
    if (!apiKey) {
      console.error("[ExplorePage] Google Maps API key is missing.");
      setMapsApiError("Google Maps API key is missing. Map functionality is disabled.");
      return;
    }
    if (typeof window !== 'undefined' && window.google && window.google.maps) {
        if (!isMapsScriptLoaded) setIsMapsScriptLoaded(true);
        return;
    }
    const scriptId = 'google-maps-explore-page-script';
    if (document.getElementById(scriptId)) {
        if (typeof window !== 'undefined' && window.google && window.google.maps && !isMapsScriptLoaded) setIsMapsScriptLoaded(true);
        return;
    }
    
    console.log("[ExplorePage] Attempting to load Google Maps API script...");
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMapsApiExplorePage&libraries=marker`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      console.error("[ExplorePage] Failed to load Google Maps API script.");
      setMapsApiError("Failed to load Google Maps. Please check API key and network.");
      setIsMapsScriptLoaded(false); 
    };
    (window as any).initGoogleMapsApiExplorePage = initGoogleMapsApi;
    document.head.appendChild(script);

    return () => { 
        if ((window as any).initGoogleMapsApiExplorePage) {
            delete (window as any).initGoogleMapsApiExplorePage;
        }
    };
  }, [apiKey, initGoogleMapsApi, isMapsScriptLoaded]);
  
  const initializeMap = useCallback((center: google.maps.LatLngLiteral, zoom: number) => {
    try {
      if (!mapRef.current) {
        console.error("[ExplorePage] Map ref is null during map initialization attempt.");
        setIsMapInitializing(false);
        return;
      }
      const initialMap = new window.google.maps.Map(mapRef.current!, {
        center,
        zoom,
        styles: modernMapStyle,
        mapTypeControl: true,
        mapTypeControlOptions: { style: window.google.maps.MapTypeControlStyle.HORIZONTAL_BAR, position: window.google.maps.ControlPosition.TOP_RIGHT },
        streetViewControl: false, fullscreenControl: true, zoomControl: true,
      });
      setMap(initialMap);
      console.log("[ExplorePage] Google Map initialized successfully at:", center);
    } catch (error) {
      console.error("[ExplorePage] Error initializing the map:", error);
      setMapsApiError("Error initializing the map.");
    } finally {
      setIsMapInitializing(false);
    }
  }, []);

  const fetchUserLocationAndInitialData = useCallback(() => {
    console.log("[ExplorePage] Attempting to get user geolocation and initial data...");
    setIsFetchingLocation(true);
    setIsMapInitializing(true); // For map init based on location
    
    const fetchInitialAiDestinations = (loc?: UserLocation) => {
        fetchAiDestinations({ userLatitude: loc?.latitude, userLongitude: loc?.longitude }, "top_destinations");
    };

    const fetchPersonalizedExploreIdeas = () => {
        if (currentUser?.uid) {
            setIsFetchingExploreIdeas(true);
            setExploreIdeasError(null);
            getExploreIdeasAction({ userId: currentUser.uid })
                .then(result => {
                    setExploreIdeas(result.suggestions || []);
                    setExploreIdeasContextualNote(result.contextualNote || null);
                    if (!result.suggestions || result.suggestions.length === 0) {
                         setExploreIdeasContextualNote(result.contextualNote || "No personalized ideas found based on your history yet. Try searching for some trips!");
                    }
                })
                .catch(err => {
                    console.error("[ExplorePage] Error fetching explore ideas:", err);
                    setExploreIdeasError("Could not fetch personalized ideas. Please try again.");
                })
                .finally(() => setIsFetchingExploreIdeas(false));
        } else {
             setExploreIdeasContextualNote("Log in to see personalized ideas based on your search history!");
        }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userCoords = { lat: position.coords.latitude, lng: position.coords.longitude };
          const userLocationData = { latitude: userCoords.lat, longitude: userCoords.lng };
          setUserLocation(userLocationData);
          setGeolocationError(null);
          console.log("[ExplorePage] User location fetched:", userCoords);
          initializeMap(userCoords, 10);
          fetchInitialAiDestinations(userLocationData);
          fetchPersonalizedExploreIdeas();
          setIsFetchingLocation(false);
        },
        (error) => {
          console.warn("[ExplorePage] Could not get user location:", error.message);
          setGeolocationError(`Could not get your location: ${error.message}. Map centered globally. Showing global suggestions.`);
          initializeMap({ lat: 20, lng: 0 }, 2); // Fallback center
          fetchInitialAiDestinations(); // Fetch global top destinations
          fetchPersonalizedExploreIdeas(); // Still try to fetch personalized if user is logged in
          setIsFetchingLocation(false);
        },
        { timeout: 8000 }
      );
    } else {
      console.warn("[ExplorePage] Geolocation is not supported by this browser.");
      setGeolocationError("Geolocation not supported. Map centered globally. Showing global suggestions.");
      initializeMap({ lat: 20, lng: 0 }, 2); // Fallback center
      fetchInitialAiDestinations();
      fetchPersonalizedExploreIdeas();
      setIsFetchingLocation(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initializeMap, currentUser?.uid]); // fetchAiDestinations dependency removed for now, will be added back with proper definition


  useEffect(() => {
    if (isMapsScriptLoaded && mapRef.current && !map && !isMapInitializing) {
      fetchUserLocationAndInitialData();
    }
  }, [isMapsScriptLoaded, map, isMapInitializing, fetchUserLocationAndInitialData]);

  const handleSelectDestination = useCallback((dest: AiDestinationSuggestion | ExploreIdeaSuggestion) => {
     // For now, we cast ExploreIdeaSuggestion to AiDestinationSuggestion if needed for the dialog
     // A more robust solution might involve different dialogs or a union type for selectedMapDestination
    const dialogDest: AiDestinationSuggestion = {
        name: dest.destination, // Assuming 'destination' field holds the main place name
        country: dest.country,
        description: dest.description,
        latitude: dest.latitudeString ? parseFloat(dest.latitudeString) : undefined,
        longitude: dest.longitudeString ? parseFloat(dest.longitudeString) : undefined,
        imagePrompt: dest.imagePrompt,
        imageUri: dest.imageUri || undefined, // Use imageUri if available
        hotelIdea: dest.hotelIdea,
        flightIdea: dest.flightIdea,
    };
    setSelectedMapDestination(dialogDest);
    setIsDialogOpen(true);

    if (map && window.google && window.google.maps && dialogDest.latitude != null && dialogDest.longitude != null) {
      const targetLatLng = new window.google.maps.LatLng(dialogDest.latitude, dialogDest.longitude);
      map.panTo(targetLatLng);
      const listener = window.google.maps.event.addListenerOnce(map, 'idle', () => {
        map.setZoom(Math.max(map.getZoom() || 0, 12)); 
      });
       setTimeout(() => { 
        if (map && (map.getZoom() || 0) < 12) map.setZoom(12); 
        if (listener) window.google.maps.event.removeListener(listener);
      }, 800);
    }
  }, [map]);

  useEffect(() => {
    if (!map || !isMapsScriptLoaded || !(window.google && window.google.maps && window.google.maps.OverlayView)) {
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
      return;
    }

    class CustomMarkerOverlay extends window.google.maps.OverlayView {
        private latlng: google.maps.LatLng;
        private div: HTMLDivElement | null = null;
        private destinationData: AiDestinationSuggestion | ExploreIdeaSuggestion; // Can be either
        private clickHandler: () => void;
        private mapInstanceRef: google.maps.Map;

        constructor(props: {
            latlng: google.maps.LatLngLiteral;
            map: google.maps.Map;
            destination: AiDestinationSuggestion | ExploreIdeaSuggestion;
            onClick: () => void;
        }) {
            super();
            this.latlng = new window.google.maps.LatLng(props.latlng.lat, props.latlng.lng);
            this.destinationData = props.destination;
            this.clickHandler = props.onClick;
            this.mapInstanceRef = props.map;
            this.setMap(props.map);
        }
        onAdd() {
            this.div = document.createElement('div');
            this.div.className = 'custom-map-marker';
            this.div.title = (this.destinationData as AiDestinationSuggestion).name || (this.destinationData as ExploreIdeaSuggestion).title;
            const pulse = document.createElement('div');
            pulse.className = 'custom-map-marker-pulse';
            this.div.appendChild(pulse);
            this.div.addEventListener('click', this.clickHandler);
            const panes = this.getPanes();
            if (panes && panes.overlayMouseTarget) {
                panes.overlayMouseTarget.appendChild(this.div);
            } else {
              this.mapInstanceRef.getDiv().appendChild(this.div);
            }
        }
        draw() {
            const projection = this.getProjection();
            if (!projection || !this.div) return;
            const point = projection.fromLatLngToDivPixel(this.latlng);
            if (point) {
                this.div.style.left = point.x + 'px';
                this.div.style.top = point.y + 'px';
            }
        }
        onRemove() {
            if (this.div) {
                this.div.removeEventListener('click', this.clickHandler);
                this.div.parentNode?.removeChild(this.div);
                this.div = null;
            }
        }
        getPosition() { return this.latlng; }
    }

    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    
    const newMarkers: any[] = [];
    // Combine both types of suggestions for map markers if they have coordinates
    const allDisplayableSuggestions = [
        ...aiDestinations.filter(d => d.latitude != null && d.longitude != null),
        ...(exploreIdeas || []).filter(idea => idea.latitudeString != null && idea.longitudeString != null)
            .map(idea => ({ // Adapt ExploreIdeaSuggestion to a common structure for markers
                name: idea.title, // Use title for display
                country: idea.country,
                description: idea.description,
                latitude: parseFloat(idea.latitudeString!),
                longitude: parseFloat(idea.longitudeString!),
                imagePrompt: idea.imagePrompt,
                imageUri: idea.imageUri,
                hotelIdea: idea.hotelIdea,
                flightIdea: idea.flightIdea,
            }))
    ];


    allDisplayableSuggestions.forEach(dest => {
      if (dest.latitude != null && dest.longitude != null) {
            newMarkers.push(new CustomMarkerOverlay({
                latlng: { lat: dest.latitude!, lng: dest.longitude! },
                map: map,
                destination: dest, // Pass the original object
                onClick: () => handleSelectDestination(dest)
            }));
        }
    });
    markersRef.current = newMarkers;

    if (newMarkers.length > 0 && window.google && window.google.maps) {
      const bounds = new window.google.maps.LatLngBounds();
      newMarkers.forEach(marker => {
        if (marker.getPosition) bounds.extend(marker.getPosition());
      });
      if (!bounds.isEmpty()) {
          map.fitBounds(bounds);
          const listenerId = window.google.maps.event.addListenerOnce(map, 'idle', () => {
            if ((map.getZoom() || 0) > 15) map.setZoom(15);
            if (newMarkers.length === 1 && (map.getZoom() || 0) < 10 ) map.setZoom(10);
          });
      }
    }
    // No explicit return from this effect, only side effects (marker cleanup and creation)
  }, [map, isMapsScriptLoaded, aiDestinations, exploreIdeas, handleSelectDestination]);
  
  const fetchAiDestinations = useCallback(async (params: PopularDestinationsInput = {}, fetchType: string) => {
    setIsFetchingAiDestinations(true);
    setAiDestinationsError(null);
    setCurrentFetchType(fetchType);

    const inputParams: PopularDestinationsInput = { ...params };
    // Use already fetched userLocation if available and not overridden by params
    if (userLocation && params.userLatitude === undefined && params.userLongitude === undefined) {
        inputParams.userLatitude = userLocation.latitude;
        inputParams.userLongitude = userLocation.longitude;
    }

    try {
      const result: PopularDestinationsOutput = await getPopularDestinations(inputParams);
      if (result && result.destinations) {
        const processedDestinations = result.destinations.map(d => ({
          ...d,
          imageUri: d.imageUri || `https://placehold.co/600x400.png?text=${encodeURIComponent(d.name.substring(0, 10))}`
        }));
        setAiDestinations(processedDestinations);
      } else {
        setAiDestinations([]);
      }
      setAiContextualNote(result?.contextualNote || "AI-powered suggestions.");
      if (!result?.destinations || result.destinations.length === 0) {
        setAiDestinationsError(params.interest ? `AI couldn't find specific suggestions for '${params.interest}'. Try a broader interest!` : "AI couldn't find specific suggestions. Try again later!");
      }
    } catch (error) {
      console.error("[ExplorePage] Error fetching AI destinations:", error);
      setAiDestinationsError("Could not fetch destination suggestions. Please check your connection or try again.");
      setAiDestinations([]);
    } finally {
      setIsFetchingAiDestinations(false);
    }
  }, [userLocation]); 

  useEffect(() => {
    if (!currentFetchType && userLocation !== undefined && isMapsScriptLoaded && !map) { // Initial fetch if location is resolved and map is not yet init
       fetchUserLocationAndInitialData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation, currentFetchType, isMapsScriptLoaded, map]); 

  useEffect(() => { // For personalized ideas based on user login
    if (currentUser?.uid && !exploreIdeas && !isFetchingExploreIdeas) {
        setIsFetchingExploreIdeas(true);
        setExploreIdeasError(null);
        getExploreIdeasAction({ userId: currentUser.uid })
            .then(result => {
                setExploreIdeas(result.suggestions || []);
                setExploreIdeasContextualNote(result.contextualNote || null);
                if (!result.suggestions || result.suggestions.length === 0) {
                     setExploreIdeasContextualNote(result.contextualNote || "No personalized ideas found based on your history yet. Try searching for some trips!");
                }
            })
            .catch(err => {
                console.error("[ExplorePage] Error fetching explore ideas on auth change:", err);
                setExploreIdeasError("Could not fetch personalized ideas. Please try again.");
            })
            .finally(() => setIsFetchingExploreIdeas(false));
    } else if (!currentUser) {
        setExploreIdeas(null); // Clear ideas if user logs out
        setExploreIdeasContextualNote("Log in to see personalized ideas based on your search history!");
    }
  }, [currentUser, isFetchingExploreIdeas, exploreIdeas]);


  const handleInterestClick = (interestName: string, hint: string) => {
     fetchAiDestinations({ interest: hint, userLatitude: userLocation?.latitude, userLongitude: userLocation?.longitude }, `interest_${interestName.toLowerCase().replace(/\s+/g, '_')}`);
  };

  const handleInitiatePlanning = (destinationData: AiDestinationSuggestion | ExploreIdeaSuggestion) => {
    const isExploreIdea = 'title' in destinationData; // Differentiate type
    const plannerInputData: AITripPlannerInput = {
        destination: isExploreIdea ? destinationData.destination : destinationData.name + (destinationData.country ? `, ${destinationData.country}` : ''),
        travelDates: "Next month for 7 days",
        budget: parseInt(destinationData.hotelIdea?.priceRange?.match(/\$(\d+)/)?.[1] || destinationData.flightIdea?.priceRange?.match(/\$(\d+)/)?.[1] || '2000', 10) * (destinationData.hotelIdea?.priceRange ? 7 : 1),
    };
    localStorage.setItem('tripBundleToPlan', JSON.stringify(plannerInputData));
    window.dispatchEvent(new CustomEvent('localStorageUpdated_tripBundleToPlan'));
    router.push('/planner');
    toast({
        title: `Planning Trip to ${isExploreIdea ? destinationData.destination : destinationData.name}`,
        description: "Planner opened with destination details. Adjust dates and budget as needed.",
    });
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
        
        <section className="mb-12 animate-fade-in-up" style={{animationDelay: '0.3s'}}>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-6 flex items-center">
            <LocateFixed className="w-7 h-7 mr-2 text-primary"/> Explore on the Map
          </h2>
          <Card className={cn(glassCardClasses, "h-[500px] p-2 border-primary/20")}>
             {mapsApiError && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-destructive/10 text-destructive-foreground p-3 rounded-md"><AlertTriangle className="w-10 h-10 mb-2"/><p className="font-semibold">Map Error</p><p className="text-xs text-center">{mapsApiError}</p></div>
            )}
            {(!mapsApiError && (isMapInitializing || (isFetchingLocation && !map) )) && (
                 <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                    <Loader2 className="w-10 h-10 animate-spin mb-3 text-primary"/><p className="text-sm">{isFetchingLocation ? "Getting your location..." : "Initializing Modern Map..."}</p>
                </div>
            )}
            <div ref={mapRef} className={cn("w-full h-full rounded-md", (mapsApiError || isMapInitializing || (isFetchingLocation && !map)) ? "hidden" : "")} />
          </Card>
        </section>

        {/* AI-Powered Destination Ideas Section */}
        <section className="mb-12 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground flex items-center">
              <Sparkles className="w-7 h-7 mr-3 text-accent" /> 
              {currentFetchType?.startsWith("interest_") ? `Destinations for ${currentFetchType.replace("interest_", "").replace(/_/g, " ")}` : "Top Destinations"}
            </h2>
             <Button
                onClick={() => fetchAiDestinations({ userLatitude: userLocation?.latitude, userLongitude: userLocation?.longitude }, "top_destinations")}
                disabled={isFetchingAiDestinations || isFetchingLocation}
                size="lg"
                className={cn(
                    "text-lg py-3 group transform transition-all duration-300 ease-out shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40",
                    "bg-gradient-to-r from-primary to-accent text-primary-foreground",
                    "hover:from-accent hover:to-primary",
                    "focus-visible:ring-4 focus-visible:ring-primary/40"
                )}
            >
                {(isFetchingAiDestinations && currentFetchType === "top_destinations") ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2 group-hover:animate-pulse" />}
                {(isFetchingAiDestinations && currentFetchType === "top_destinations") ? "Discovering..." : "Refresh Top Suggestions"}
            </Button>
          </div>

          {geolocationError && !isFetchingLocation && (
            <Alert variant="default" className={cn("mb-4 bg-yellow-500/10 border-yellow-500/30 text-yellow-300")}>
              <Info className="h-4 w-4 !text-yellow-400" />
              <ShadcnAlertTitle className="text-yellow-200">Location Notice</ShadcnAlertTitle>
              <ShadcnAlertDescription className="text-yellow-400/80">
                {geolocationError} {currentFetchType?.startsWith("interest_") ? `Showing global results for ${currentFetchType.replace("interest_","").replace("_"," ")}.` : "Showing global Top Destinations."}
              </ShadcnAlertDescription>
            </Alert>
          )}
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
                <AiDestinationCardExplore 
                    key={dest.name + (dest.latitude || index) + (dest.longitude || index) } 
                    destination={dest} 
                    onSelect={() => handleSelectDestination(dest)}
                    onPlanTrip={() => handleInitiatePlanning(dest)}
                />
              ))}
            </div>
          )}
           {!isFetchingAiDestinations && !aiDestinationsError && aiDestinations.length === 0 && !currentFetchType && (
             <Card className={cn(glassCardClasses, "p-6 text-center text-muted-foreground")}>
                 Click "Refresh Top Suggestions" to let Aura AI suggest some destinations for you!
             </Card>
           )}
        </section>
        
        <Separator className="my-10 border-border/30" />

        {/* Personalized "Ideas for You" Section */}
        <section className="mb-12 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-6 flex items-center">
                <Lightbulb className="w-7 h-7 mr-3 text-accent" /> Ideas For You
            </h2>
            {exploreIdeasContextualNote && (!isFetchingExploreIdeas || (exploreIdeas && exploreIdeas.length > 0)) && (
                 <p className="text-sm text-muted-foreground italic mb-4 text-center sm:text-left">{exploreIdeasContextualNote}</p>
            )}

            {isFetchingExploreIdeas && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {[...Array(2)].map((_, index) => (
                        <Card key={`idea-skeleton-${index}`} className={cn(glassCardClasses, "overflow-hidden animate-pulse")}>
                            <div className="relative w-full aspect-[16/10] bg-muted/40"></div>
                            <CardHeader className="p-4"><div className="h-5 w-3/4 bg-muted/40 rounded"></div><div className="h-3 w-1/2 bg-muted/40 rounded mt-1"></div></CardHeader>
                            <CardContent className="p-4 pt-0 space-y-1.5"><div className="h-3 w-full bg-muted/40 rounded"></div><div className="h-3 w-5/6 bg-muted/40 rounded"></div></CardContent>
                            <CardFooter className="p-4"><div className="h-8 w-full bg-muted/40 rounded"></div></CardFooter>
                        </Card>
                    ))}
                </div>
            )}

            {!isFetchingExploreIdeas && exploreIdeasError && (
                <Card className={cn(glassCardClasses, "border-destructive/30")}>
                    <CardContent className="p-6 text-center text-destructive">
                        <AlertTriangle className="w-10 h-10 mx-auto mb-2" />
                        <p className="font-semibold">{exploreIdeasError}</p>
                    </CardContent>
                </Card>
            )}

            {!isFetchingExploreIdeas && exploreIdeas && exploreIdeas.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {exploreIdeas.map((idea) => (
                        <PersonalizedIdeaCard
                            key={idea.id}
                            idea={idea}
                            onPlanTrip={() => handleInitiatePlanning(idea)}
                        />
                    ))}
                </div>
            )}
             {!isFetchingExploreIdeas && !exploreIdeasError && (!exploreIdeas || exploreIdeas.length === 0) && currentUser && (
                <Card className={cn(glassCardClasses, "p-6 text-center text-muted-foreground")}>
                    No personalized ideas available yet. Your past searches will help Aura AI suggest trips here!
                </Card>
            )}
            {!currentUser && !isFetchingExploreIdeas && (
                 <Card className={cn(glassCardClasses, "p-6 text-center text-muted-foreground")}>
                    Log in to discover personalized trip ideas based on your search history.
                </Card>
            )}
        </section>
      </main>

      {selectedMapDestination && (
         <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className={cn("sm:max-w-lg md:max-w-xl p-0", glassCardClasses, "border-primary/30")}>
                <DialogHeader className="p-4 sm:p-6 border-b border-border/30 sticky top-0 z-10 bg-card/80 dark:bg-card/50 backdrop-blur-sm">
                    <div className="flex justify-between items-center">
                         <DialogTitle className="text-xl font-semibold text-foreground flex items-center">
                            <MapPin className="w-5 h-5 mr-2 text-primary" />
                            {selectedMapDestination.name}
                         </DialogTitle>
                        <DialogClose asChild>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-accent/20 hover:text-accent-foreground">
                                <X className="h-5 w-5" />
                            </Button>
                        </DialogClose>
                    </div>
                     <DialogDescription className="text-sm text-muted-foreground">{selectedMapDestination.country}</DialogDescription>
                </DialogHeader>
                <div className="p-4 sm:p-6 space-y-4">
                    <DialogImageDisplayExplorePage destination={selectedMapDestination} />
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {selectedMapDestination.description}
                    </p>
                    {selectedMapDestination.hotelIdea && (
                        <div className="text-xs border-t border-border/30 pt-2 mt-2">
                            <p className="font-medium text-card-foreground/90 flex items-center"><Building className="w-3.5 h-3.5 mr-1.5 text-primary/80"/>Hotel Idea:</p>
                            <p className="pl-5 text-muted-foreground">{selectedMapDestination.hotelIdea.type} ({selectedMapDestination.hotelIdea.priceRange})</p>
                        </div>
                    )}
                    {selectedMapDestination.flightIdea && (
                        <div className="text-xs border-t border-border/30 pt-2 mt-2">
                            <p className="font-medium text-card-foreground/90 flex items-center"><Route className="w-3.5 h-3.5 mr-1.5 text-primary/80"/>Flight Idea:</p>
                            <p className="pl-5 text-muted-foreground">{selectedMapDestination.flightIdea.description} ({selectedMapDestination.flightIdea.priceRange})</p>
                        </div>
                    )}
                    <Button 
                        onClick={() => handleInitiatePlanning(selectedMapDestination)}
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
                        Plan a Trip to {selectedMapDestination.name}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

const modernMapStyle = [
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





