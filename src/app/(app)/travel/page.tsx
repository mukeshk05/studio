
"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AppLogo } from '@/components/layout/app-logo';
import { cn } from '@/lib/utils';
import { Search, Plane, Hotel, Compass, Briefcase, MapPin, ImageOff, Loader2, AlertTriangle, Sparkles, Building, Route, Info, LocateFixed, ExternalLink, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { getPopularDestinations } from '@/app/actions';
import type { PopularDestinationsOutput, AiDestinationSuggestion, PopularDestinationsInput } from '@/ai/types/popular-destinations-types';
import type { AITripPlannerInput } from '@/ai/types/trip-planner-types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertTitle as ShadcnAlertTitle, AlertDescription as ShadcnAlertDescription} from '@/components/ui/alert';
import { useRouter } from 'next/navigation';

const glassCardClasses = "glass-card hover:border-primary/40 bg-card/80 dark:bg-card/50 backdrop-blur-lg";
const glassPaneClasses = "bg-background/60 dark:bg-background/50 backdrop-blur-xl";

const exploreCategories = [
  { name: "Flights", icon: <Plane className="w-5 h-5" />, href: "/flights" },
  { name: "Hotels", icon: <Hotel className="w-5 h-5" />, href: "/hotels" },
  { name: "Things to do", icon: <Compass className="w-5 h-5" />, href: "/explore" },
  { name: "Packages", icon: <Briefcase className="w-5 h-5" />, href: "/explore" },
];

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

interface UserLocation {
  latitude: number;
  longitude: number;
}

interface SearchInputProps {
  initialSearchTerm?: string;
  onSearch?: (term: string) => void;
  placeholder?: string;
}

function SearchInput({ initialSearchTerm = '', onSearch, placeholder = "Search destinations, hotels, flights..."}: SearchInputProps) {
   const [term, setTerm] = useState(initialSearchTerm);
   const { toast: shadcnToast } = useToast();
   const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) onSearch(term);
    shadcnToast({
        title: "Search Submitted (Conceptual)",
        description: `You searched for: ${term}. This would typically trigger a search or navigation to a results page.`,
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

interface AiDestinationCardProps {
  destination: AiDestinationSuggestion;
  onSelect: () => void;
  onPlanTrip: (data: AiDestinationSuggestion) => void;
}

function AiDestinationCard({ destination, onSelect, onPlanTrip }: AiDestinationCardProps) {
  const [imageLoadError, setImageLoadError] = useState(false);

  const handleImageError = useCallback(() => {
    console.warn(`[AiDestinationCard - TravelPage] Image load ERROR for: ${destination.name}, src: ${destination.imageUri}`);
    setImageLoadError(true);
  }, [destination.name, destination.imageUri]);

  const currentImageSrc = (!imageLoadError && destination.imageUri) ? destination.imageUri : null;
  const imageHint = destination.imageUri?.startsWith('https://placehold.co')
    ? (destination.imagePrompt || destination.name.toLowerCase().split(" ").slice(0,2).join(" "))
    : undefined;

  return (
    <Card
        className={cn(glassCardClasses, "overflow-hidden transform hover:scale-[1.03] transition-transform duration-300 ease-out shadow-lg hover:shadow-primary/30 flex flex-col cursor-pointer")}
        onClick={onSelect}
    >
      <div className="relative w-full aspect-[16/10] bg-muted/30 group">
        {currentImageSrc ? (
          <Image
            src={currentImageSrc}
            alt={destination.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            data-ai-hint={imageHint}
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
            <p className="font-medium text-card-foreground/90 flex items-center"><Building className="w-3 h-3 mr-1.5 text-primary/70"/>Hotel Idea:</p>
            <p className="pl-4 text-muted-foreground">{destination.hotelIdea.type} ({destination.hotelIdea.priceRange})</p>
          </div>
        )}
        {destination.flightIdea && (
          <div className="text-xs border-t border-border/20 pt-1.5 mt-1.5">
            <p className="font-medium text-card-foreground/90 flex items-center"><Route className="w-3 h-3 mr-1.5 text-primary/70"/>Flight Idea:</p>
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
                onPlanTrip(destination);
            }}
          >
             <ExternalLink className="mr-2 h-4 w-4" /> Plan Trip
          </Button>
      </CardFooter>
    </Card>
  );
}

interface DialogImageDisplayProps {
  destination: AiDestinationSuggestion | null;
}

function DialogImageDisplay({ destination }: DialogImageDisplayProps) {
  const [imageLoadError, setDialogImageLoadError] = useState(false);

  useEffect(() => {
    setDialogImageLoadError(false); // Reset error state when destination changes
  }, [destination?.imageUri]);

  if (!destination) return null;

  const currentImageSrc = (!imageLoadError && destination.imageUri) ? destination.imageUri : null;
  const imageHint = destination.imageUri?.startsWith('https://placehold.co')
    ? (destination.imagePrompt || destination.name.toLowerCase().split(" ").slice(0,2).join(" "))
    : undefined;

  const handleImageError = useCallback(() => {
    console.warn(`[DialogImageDisplay - TravelPage] Image load ERROR for: ${destination.name}, src: ${destination.imageUri}`);
    setDialogImageLoadError(true);
  },[destination.name, destination.imageUri]);

  return (
    <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-border/50 shadow-lg bg-muted/30">
      {currentImageSrc ? (
        <Image
          src={currentImageSrc}
          alt={`Image of ${destination.name}`}
          fill
          className="object-cover"
          data-ai-hint={imageHint}
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

export default function TravelPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const markersRef = useRef<(google.maps.OverlayView | google.maps.Marker)[]>([]);
  const mapRef = useRef<HTMLDivElement>(null);
  const [selectedMapDestination, setSelectedMapDestination] = useState<AiDestinationSuggestion | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMapsScriptLoaded, setIsMapsScriptLoaded] = useState(false);
  const [mapsApiError, setMapsApiError] = useState<string | null>(null);
  const [isMapInitializing, setIsMapInitializing] = useState(true);

  const [aiDestinations, setAiDestinations] = useState<AiDestinationSuggestion[]>([]);
  const [isFetchingAiDestinations, setIsFetchingAiDestinations] = useState(false);
  const [aiDestinationsError, setAiDestinationsError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [geolocationError, setGeolocationError] = useState<string | null>(null);
  const [aiContextualNote, setAiContextualNote] = useState<string | null>("Explore top destinations or discover places based on your location!");

  const { toast } = useToast();
  const router = useRouter();

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const initGoogleMapsApiTravelPage = useCallback(() => {
    console.log("[TravelPage] Google Maps API script loaded callback executed.");
    setIsMapsScriptLoaded(true);
  }, []);

  useEffect(() => {
    if (!apiKey) {
      console.error("[TravelPage] Google Maps API key is missing.");
      setMapsApiError("Google Maps API key is missing. Map functionality is disabled.");
      setIsMapInitializing(false);
      return;
    }
    if (typeof window !== 'undefined' && window.google && window.google.maps) {
      if (!isMapsScriptLoaded) setIsMapsScriptLoaded(true); // Already loaded
      return;
    }
    const scriptId = 'google-maps-travel-page-script';
    if (document.getElementById(scriptId)) { // Script tag already exists
      if (typeof window !== 'undefined' && window.google && window.google.maps && !isMapsScriptLoaded) {
          setIsMapsScriptLoaded(true); // Mark as loaded if google object is available
      }
      return;
    }

    console.log("[TravelPage] Attempting to load Google Maps API script...");
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMapsApiTravelPage&libraries=geometry,marker`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      console.error("[TravelPage] Failed to load Google Maps API script.");
      setMapsApiError("Failed to load Google Maps. Please check API key and network.");
      setIsMapsScriptLoaded(false); 
      setIsMapInitializing(false);
    };
    (window as any).initGoogleMapsApiTravelPage = initGoogleMapsApiTravelPage;
    document.head.appendChild(script);

    return () => { // Cleanup function
      if ((window as any).initGoogleMapsApiTravelPage) {
        delete (window as any).initGoogleMapsApiTravelPage;
      }
    };
  }, [apiKey, isMapsScriptLoaded, initGoogleMapsApiTravelPage]);

  const initializeMap = useCallback((center: google.maps.LatLngLiteral, zoom: number) => {
    if (!mapRef.current || !window.google || !window.google.maps) {
      console.warn("[TravelPage] Map ref not ready or Google Maps not loaded for initializeMap.");
      setIsMapInitializing(false); // Ensure this is set
      return;
    }
    try {
      console.log(`[TravelPage] Initializing map at center: ${JSON.stringify(center)} with zoom ${zoom}`);
      const initialMap = new window.google.maps.Map(mapRef.current!, {
        center,
        zoom,
        styles: modernMapStyle,
        mapTypeControl: true,
        mapTypeControlOptions: { style: window.google.maps.MapTypeControlStyle.HORIZONTAL_BAR, position: window.google.maps.ControlPosition.TOP_RIGHT },
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
      });
      setMap(initialMap);
      console.log("[TravelPage] Map initialized successfully.");
    } catch (error) {
      console.error("[TravelPage] Error initializing map:", error);
      setMapsApiError("Error initializing map.");
    } finally {
      setIsMapInitializing(false);
    }
  }, []);

  const useEffectForMapAndInitialLocation = useCallback(() => {
    console.log(`[TravelPage] Map/Location Effect: isMapsScriptLoaded=${isMapsScriptLoaded}, mapRef.current=${!!mapRef.current}, !map=${!map}`);
    if (isMapsScriptLoaded && mapRef.current && !map && !isMapInitializing) { // Check !isMapInitializing to prevent re-runs if already init
        setIsMapInitializing(true); // Set to true before starting process
        setIsFetchingLocation(true);
        console.log("[TravelPage] Maps script loaded, attempting to fetch user location for initial map center.");
        if (navigator.geolocation) {
            console.log("[TravelPage] Geolocation API available. Requesting current position...");
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const userCoords = { lat: position.coords.latitude, lng: position.coords.longitude };
                    console.log("[TravelPage] User location fetched for map:", userCoords);
                    setUserLocation({ latitude: userCoords.lat, longitude: userCoords.lng });
                    setGeolocationError(null);
                    initializeMap(userCoords, 10);
                    setIsFetchingLocation(false);
                },
                (error) => {
                    console.warn("[TravelPage] Geolocation error for map:", error);
                    setGeolocationError(`Could not get your location: ${error.message}. Map centered globally.`);
                    setUserLocation(null);
                    initializeMap({ lat: 20, lng: 0 }, 2); // Default center on error
                    setIsFetchingLocation(false);
                },
                { timeout: 8000, enableHighAccuracy: true, maximumAge: 0 } // Options for better accuracy
            );
        } else {
            console.warn("[TravelPage] Geolocation not supported by this browser for map.");
            setGeolocationError("Geolocation not supported. Map centered globally.");
            setUserLocation(null);
            initializeMap({ lat: 20, lng: 0 }, 2); // Default center
            setIsFetchingLocation(false);
        }
    } else if (isMapsScriptLoaded && mapRef.current && !map && !isMapInitializing && !isFetchingLocation) {
        // Fallback if geolocation was already attempted and failed, but map still not init
        console.log("[TravelPage] Map script loaded, geo attempt finished, map still not init. Defaulting map.");
        initializeMap({ lat: 20, lng: 0 }, 2);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMapsScriptLoaded, map, initializeMap, isMapInitializing]); // Removed isFetchingLocation from deps as it can cause loop

  useEffect(useEffectForMapAndInitialLocation, [useEffectForMapAndInitialLocation]);


  const handleSelectDestination = useCallback((dest: AiDestinationSuggestion) => {
    setSelectedMapDestination(dest);
    setIsDialogOpen(true);
    if (map && window.google && window.google.maps && dest.latitude != null && dest.longitude != null) {
      console.log(`[TravelPage] Panning and zooming to AI destination: ${dest.name} at ${dest.latitude}, ${dest.longitude}`);
      const targetLatLng = new window.google.maps.LatLng(dest.latitude, dest.longitude);

      map.panTo(targetLatLng);
      // Smooth zoom after pan
      const listener = window.google.maps.event.addListenerOnce(map, 'idle', () => {
        const currentZoom = map.getZoom() || 0;
        let targetZoom = 12; // Default zoom for a single selected destination
        
        // If there are multiple markers, fitBounds would have set a broader zoom.
        // This ensures if we click a single item from a list, we zoom into it.
        // If only one marker was on the map and we clicked it, ensure it's not TOO zoomed in.
        if(markersRef.current.length > 1 && currentZoom < targetZoom) {
            map.setZoom(targetZoom);
        } else if (markersRef.current.length === 1 && currentZoom > 15) { // Avoid over-zooming if it was already zoomed
            map.setZoom(15);
        } else if (markersRef.current.length === 1 && currentZoom < 10) {
            map.setZoom(10);
        } else if (currentZoom < targetZoom) {
             map.setZoom(targetZoom);
        }
        
        console.log(`[TravelPage] Map idle after pan to ${dest.name}. Current zoom: ${map.getZoom()}. Target idea: ${targetZoom}`);
      });
      // Failsafe to remove listener
      setTimeout(() => {
        if (listener) window.google.maps.event.removeListener(listener);
      }, 1200); // Slightly longer to ensure idle can fire
    }
  }, [map]);

  useEffect(() => {
    if (!map || !isMapsScriptLoaded || !(window.google && window.google.maps && window.google.maps.OverlayView)) {
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
      return;
    }

    // Define CustomMarkerOverlay class within the scope where google.maps.OverlayView is known
    class CustomMarkerOverlay extends window.google.maps.OverlayView {
        private latlng: google.maps.LatLng;
        private div: HTMLDivElement | null = null;
        private destinationData: AiDestinationSuggestion;
        private clickHandler: () => void;
        private mapInstanceRef: google.maps.Map; // Store map instance

        constructor(props: {
            latlng: google.maps.LatLngLiteral;
            map: google.maps.Map;
            destination: AiDestinationSuggestion;
            onClick: () => void;
        }) {
            super();
            this.latlng = new window.google.maps.LatLng(props.latlng.lat, props.latlng.lng);
            this.destinationData = props.destination;
            this.clickHandler = props.onClick;
            this.mapInstanceRef = props.map; // Store map instance
            this.setMap(props.map);
        }
        onAdd() {
            this.div = document.createElement('div');
            this.div.className = 'custom-map-marker'; // Use CSS for styling
            this.div.title = this.destinationData.name; // Tooltip for marker
            
            // Create a pulse element for animation
            const pulse = document.createElement('div');
            pulse.className = 'custom-map-marker-pulse';
            this.div.appendChild(pulse);

            this.div.addEventListener('click', this.clickHandler);
            const panes = this.getPanes();
            // Add to overlayMouseTarget for click events
            if (panes && panes.overlayMouseTarget) {
                panes.overlayMouseTarget.appendChild(this.div);
            } else {
              // Fallback if overlayMouseTarget is not available (should be rare)
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
                if (this.div.parentNode) {
                  this.div.parentNode.removeChild(this.div);
                }
                this.div = null;
            }
        }
        // Helper to get position if needed by other logic
        getPosition() { return this.latlng; }
    }

    // Clear previous markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    const newMarkers: (google.maps.OverlayView | google.maps.Marker)[] = []; // Type can be either
    const validAiDestinations = aiDestinations.filter(dest => typeof dest.latitude === 'number' && typeof dest.longitude === 'number');
    
    console.log(`[TravelPage] Updating markers for ${validAiDestinations.length} AI destinations.`);

    validAiDestinations.forEach(dest => {
      // Use CustomMarkerOverlay for AI destinations
      const marker = new CustomMarkerOverlay({
          latlng: { lat: dest.latitude!, lng: dest.longitude! },
          map: map,
          destination: dest,
          onClick: () => handleSelectDestination(dest)
      });
      newMarkers.push(marker);
    });
    markersRef.current = newMarkers;

    if (newMarkers.length > 0 && window.google && window.google.maps) {
      const bounds = new window.google.maps.LatLngBounds();
      newMarkers.forEach(marker => {
        // CustomOverlayView has getPosition(), google.maps.Marker also has getPosition()
        if (marker.getPosition) bounds.extend(marker.getPosition()!);
      });
      if (!bounds.isEmpty()) {
          map.fitBounds(bounds, 100); // Add padding
          console.log("[TravelPage] Map bounds fitted to AI markers.");
          // Adjust zoom after fitBounds to prevent over-zooming on single markers
          const listenerId = window.google.maps.event.addListenerOnce(map, 'idle', () => {
            let currentZoom = map.getZoom() || 0;
            if (newMarkers.length === 1 && currentZoom > 12) map.setZoom(12);
            else if (currentZoom > 15) map.setZoom(15); // General cap on zoom after fitBounds
          });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isMapsScriptLoaded, aiDestinations, handleSelectDestination]); // `popularDestinations` removed as it's static

  const fetchAiDestinations = useCallback(async (params: PopularDestinationsInput = {}) => {
    setIsFetchingAiDestinations(true);
    setAiDestinationsError(null);
    setAiContextualNote(null); // Clear previous note
    setAiDestinations([]); // Clear previous suggestions

    let effectiveLat = params.userLatitude;
    let effectiveLng = params.userLongitude;

    // Use component's userLocation state if available and not overridden by params
    if (params.userLatitude === undefined && params.userLongitude === undefined && userLocation) {
        effectiveLat = userLocation.latitude;
        effectiveLng = userLocation.longitude;
    }

    const inputParams: PopularDestinationsInput = {
        ...params,
        userLatitude: effectiveLat,
        userLongitude: effectiveLng
    };

    console.log(`[TravelPage] Fetching AI destinations for ${params.interest ? `interest: ${params.interest}` : 'general'} with location:`, inputParams.userLatitude, inputParams.userLongitude);

    try {
        const result: PopularDestinationsOutput = await getPopularDestinations(inputParams);
        console.log("[TravelPage] AI Destinations Raw Result from Server:", result.destinations.map(d => ({name: d.name, imageUriProvided: !!d.imageUri, coords: {lat:d.latitude, lng:d.longitude}})));

        if (result && result.destinations) {
            const processedDestinations = result.destinations.map(d => ({
                ...d,
                // Ensure imageUri has a fallback if null/undefined from AI before this point
                imageUri: d.imageUri || `https://placehold.co/600x400.png?text=${encodeURIComponent(d.name.substring(0,10))}`
            }));
            setAiDestinations(processedDestinations);
        } else {
            setAiDestinations([]); // Ensure it's an empty array
        }
        setAiContextualNote(result?.contextualNote || (inputParams.userLatitude != null ? "AI-powered suggestions based on your area." : "General popular destination ideas."));

        if (!result?.destinations || result.destinations.length === 0){
           // The contextualNote from AI should cover this, but as a fallback:
           setAiDestinationsError(result?.contextualNote || "AI couldn't find specific suggestions. Try a broader search or general suggestions.");
        }
      } catch (error: any) {
        console.error("[TravelPage] Error fetching AI destinations:", error);
        setAiDestinationsError(`Could not fetch destination suggestions: ${error.message || 'Unknown error'}.`);
        setAiContextualNote(`Error fetching suggestions: ${error.message || 'Unknown error'}.`); // Set note on error too
        toast({
            title: "Error Fetching Destinations",
            description: `AI suggestions could not be loaded: ${error.message || 'Unknown error'}. Please try again.`,
            variant: "destructive",
        });
        setAiDestinations([]); // Ensure empty on error
      } finally {
        setIsFetchingAiDestinations(false);
      }
  }, [userLocation, toast]); // Added toast

  // Fetch initial AI destinations once map is ready and location (if any) is attempted
  useEffect(() => {
    // Fetch only if map is initialized, not currently fetching, and no destinations loaded yet
    if (map && !isMapInitializing && !isFetchingAiDestinations && aiDestinations.length === 0 && !aiDestinationsError) {
        console.log("[TravelPage] Map ready, fetching initial general AI destinations using location:", userLocation);
        fetchAiDestinations({ userLatitude: userLocation?.latitude, userLongitude: userLocation?.longitude });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isMapInitializing, userLocation]); // fetchAiDestinations removed, aiDestinations.length, aiDestinationsError also removed to allow re-fetch if needed


  const parseBudget = (priceRange?: string): number => {
    if (!priceRange) return 2000; // Default budget if no price range
    // Attempt to extract the first number from strings like "$150-$250" or "Under $100" or "$400+"
    const match = priceRange.match(/\$(\d+)/);
    return match ? parseInt(match[1], 10) * 7 : 2000; // Multiply by 7 for a week's budget if it's per night
  };

  const handleInitiatePlanningFromTravelPage = (destinationSuggestion: AiDestinationSuggestion) => {
    // Ensure we have a valid destination name
    const destinationName = destinationSuggestion.name || "Selected Destination";
    const destinationCountry = destinationSuggestion.country ? `, ${destinationSuggestion.country}` : '';

    const plannerInputData: AITripPlannerInput = {
        destination: `${destinationName}${destinationCountry}`,
        travelDates: "Next month for 7 days", // Default sensible travel dates
        budget: parseBudget(destinationSuggestion.hotelIdea?.priceRange || destinationSuggestion.flightIdea?.priceRange),
        // We can pass the user's travel persona if available
        // userPersona: userPersonaData, // Assuming userPersonaData is fetched and available
    };
    console.log("[TravelPage] Initiating planning with data:", plannerInputData);
    localStorage.setItem('tripBundleToPlan', JSON.stringify(plannerInputData));
    window.dispatchEvent(new CustomEvent('localStorageUpdated_tripBundleToPlan')); // For potential listeners
    router.push('/planner'); // Navigate to planner page
    toast({
        title: `Planning Trip to ${destinationName}`,
        description: "Planner opened with destination details. Adjust dates and budget as needed.",
    });
  };

  const prominentButtonClasses = "text-lg py-3 group transform transition-all duration-300 ease-out shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:from-accent hover:to-primary focus-visible:ring-4 focus-visible:ring-primary/40";

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className={cn("sticky top-0 z-40 w-full border-b border-border/30", glassPaneClasses)}>
         <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <AppLogo />
          <div className="relative w-full max-w-lg hidden md:block">
            <SearchInput initialSearchTerm={searchTerm} onSearch={setSearchTerm} />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="md:hidden text-foreground hover:bg-accent/10">
              <Search className="w-5 h-5" />
            </Button>
            <Button variant="outline" size="sm" asChild className="hidden sm:flex glass-interactive">
                <Link href="/dashboard">Dashboard</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <section className="mb-12 text-center animate-fade-in-up">
           <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent mb-4">
            Where to next, Explorer?
          </h1>
          <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
            Discover flights, hotels, attractions, and packages. Let Aura AI guide your journey.
          </p>
          <div className={cn("max-w-2xl mx-auto p-3 rounded-xl shadow-xl", glassCardClasses, "border-primary/20")}>
            <SearchInput initialSearchTerm={searchTerm} onSearch={setSearchTerm} placeholder="Search destinations, hotels, or activities..." />
          </div>
        </section>

        {/* Explore Categories */}
        <section className="mb-12 animate-fade-in-up" style={{animationDelay: '0.2s'}}>
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

        {/* Map Section */}
        <section className="mb-12 animate-fade-in-up" style={{animationDelay: '0.3s'}}>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-6 flex items-center">
            <LocateFixed className="w-7 h-7 mr-2 text-primary"/> Explore on the Map
          </h2>
          <Card className={cn(glassCardClasses, "h-[500px] p-2 border-primary/20")}>
             {mapsApiError && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-destructive/10 text-destructive-foreground p-4 rounded-md">
                    <AlertTriangle className="w-12 h-12 mb-3"/> <p className="font-semibold text-lg">Map Error</p> <p className="text-sm text-center">{mapsApiError}</p>
                </div>
            )}
            {(!mapsApiError && (isMapInitializing || isFetchingLocation)) && (
                 <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                    <Loader2 className="w-10 h-10 animate-spin mb-3 text-primary"/> <p className="text-sm">{isFetchingLocation ? "Getting your location..." : "Initializing Modern Map..."}</p>
                </div>
            )}
            <div ref={mapRef} className={cn("w-full h-full rounded-md", (mapsApiError || isMapInitializing || isFetchingLocation) ? "hidden" : "")} />
          </Card>
           {geolocationError && <p className="text-xs text-center text-amber-500 mt-1"><Info className="inline w-3 h-3 mr-1"/>{geolocationError}</p>}
        </section>

        {/* AI-Powered Destination Ideas Section */}
        <section className="mb-12 animate-fade-in-up" style={{animationDelay: '0.4s'}}>
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground flex items-center">
              <Sparkles className="w-7 h-7 mr-2 text-accent"/> AI-Powered Destination Ideas
            </h2>
            <Button
              onClick={() => fetchAiDestinations({ userLatitude: userLocation?.latitude, userLongitude: userLocation?.longitude })}
              disabled={isFetchingAiDestinations || isFetchingLocation} // Disable if already fetching location for map
              size="lg"
              className={cn(prominentButtonClasses, "py-2.5 text-base")}
            >
              {(isFetchingAiDestinations || (isFetchingLocation && !userLocation) ) ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2 group-hover:animate-pulse" />}
              {(isFetchingAiDestinations || (isFetchingLocation && !userLocation) ) ? "Discovering..." : userLocation ? "Ideas Near Me" : "General Ideas"}
            </Button>
          </div>

           {aiContextualNote && !isFetchingAiDestinations && (
            <Alert variant="default" className={cn("mb-4 bg-primary/10 border-primary/20 text-primary text-sm")}>
                <Info className="h-4 w-4 !text-primary" />
                <ShadcnAlertTitle className="font-semibold">Aura's Note</ShadcnAlertTitle>
                <ShadcnAlertDescription className="text-primary/80">
                {aiContextualNote}
                </ShadcnAlertDescription>
            </Alert>
          )}

          {isFetchingAiDestinations && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, index) => ( // Show 3 skeletons
                <Card key={index} className={cn(glassCardClasses, "overflow-hidden animate-pulse")}>
                  <div className="relative w-full aspect-[16/10] bg-muted/40"></div>
                  <CardHeader className="p-4"><div className="h-5 w-3/4 bg-muted/40 rounded"></div><div className="h-3 w-1/2 bg-muted/40 rounded mt-1"></div></CardHeader>
                  <CardContent className="p-4 pt-0 space-y-1.5"><div className="h-3 w-full bg-muted/40 rounded"></div><div className="h-3 w-5/6 bg-muted/40 rounded"></div></CardContent>
                  <CardFooter className="p-4"><div className="h-10 w-full bg-muted/40 rounded-md"></div></CardFooter>
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
                <AiDestinationCard
                    key={dest.name + (dest.latitude || index) + (dest.longitude || index) } // More unique key
                    destination={dest}
                    onSelect={() => handleSelectDestination(dest)}
                    onPlanTrip={() => handleInitiatePlanningFromTravelPage(dest)}
                />
              ))}
            </div>
          )}
           {!isFetchingAiDestinations && !aiDestinationsError && aiDestinations.length === 0 && (
             <Card className={cn(glassCardClasses, "p-6 text-center text-muted-foreground")}>
                 Click the button above to let Aura AI suggest some destinations for you!
             </Card>
           )}
        </section>

      </main>

      {/* Destination Detail Dialog */}
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
                    <DialogImageDisplay destination={selectedMapDestination} />
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
                        onClick={() => handleInitiatePlanningFromTravelPage(selectedMapDestination)}
                        size="lg"
                        className={cn(prominentButtonClasses, "w-full mt-4", "text-base py-2.5")}
                    >
                        <ExternalLink className="mr-2 h-5 w-5" />
                        Plan a Trip to {selectedMapDestination.name}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
      )}

      {/* Footer */}
      <footer className={cn("py-6 border-t border-border/30 mt-auto", glassPaneClasses)}>
         <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} BudgetRoam. Explore the world your way, intelligently.
          </p>
        </div>
      </footer>
    </div>
  );
}

```