
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AppLogo } from '@/components/layout/app-logo';
import { cn } from '@/lib/utils';
import { Search, Plane, Hotel, Compass, Briefcase, Camera, MapPin as MapPinIconLucide, ImageOff, Loader2, AlertTriangle, Sparkles, Building, Route, Info, LocateFixed, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { getPopularDestinations } from '@/app/actions';
import type { PopularDestinationsOutput, AiDestinationSuggestion } from '@/ai/types/popular-destinations-types';
import type { AITripPlannerInput } from '@/ai/types/trip-planner-types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertTitle as ShadcnAlertTitle, AlertDescription as ShadcnAlertDescription} from '@/components/ui/alert';
import { useRouter } from 'next/navigation';


const glassCardClasses = "glass-card hover:border-primary/40 bg-card/80 dark:bg-card/50 backdrop-blur-lg";
const glassPaneClasses = "bg-background/60 dark:bg-background/50 backdrop-blur-xl";

const exploreCategories = [
  { name: "Flights", icon: <Plane className="w-5 h-5" />, href: "/planner" },
  { name: "Hotels", icon: <Hotel className="w-5 h-5" />, href: "/travel#" }, 
  { name: "Things to do", icon: <Compass className="w-5 h-5" />, href: "/travel#" },
  { name: "Packages", icon: <Briefcase className="w-5 h-5" />, href: "/travel#" },
];

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

interface UserLocation {
  latitude: number;
  longitude: number;
}

export default function TravelPage() {
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
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [geolocationError, setGeolocationError] = useState<string | null>(null);
  const [aiContextualNote, setAiContextualNote] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const initGoogleMapsApi = useCallback(() => {
    console.log("[TravelPage] Google Maps API script loaded callback executed.");
    setIsMapsScriptLoaded(true);
  }, []);

  useEffect(() => {
    if (!apiKey) {
      console.error("[TravelPage] Google Maps API key is missing.");
      setMapsApiError("Google Maps API key is missing. Map functionality is disabled.");
      return;
    }
    if (typeof window !== 'undefined' && window.google && window.google.maps) {
        if (!isMapsScriptLoaded) {
            console.log("[TravelPage] Google Maps API already available on window, ensuring script loaded state is true.");
            setIsMapsScriptLoaded(true);
        }
        return;
    }
    const scriptId = 'google-maps-travel-page-script';
    if (document.getElementById(scriptId)) {
        if (typeof window !== 'undefined' && window.google && window.google.maps && !isMapsScriptLoaded) {
            console.log("[TravelPage] Script tag exists, Google Maps API available, ensuring script loaded state is true.");
            setIsMapsScriptLoaded(true);
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
    };
    (window as any).initGoogleMapsApiTravelPage = initGoogleMapsApi;
    document.head.appendChild(script);

    return () => { 
        if ((window as any).initGoogleMapsApiTravelPage) {
            delete (window as any).initGoogleMapsApiTravelPage;
        }
    };
  }, [apiKey, initGoogleMapsApi, isMapsScriptLoaded]);

  useEffect(() => {
    if (isMapsScriptLoaded && mapRef.current && !map && !isMapInitializing) {
      console.log("[TravelPage] Initializing Google Map...");
      setIsMapInitializing(true);
      
      const initializeMap = (center: google.maps.LatLngLiteral, zoom: number) => {
        try {
          if (!mapRef.current) {
            console.error("[TravelPage] Map ref is null during map initialization attempt.");
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
          console.log("[TravelPage] Google Map initialized successfully at:", center);
        } catch (error) {
          console.error("[TravelPage] Error initializing the map:", error);
          setMapsApiError("Error initializing the map.");
        } finally {
          setIsMapInitializing(false);
        }
      };

      console.log("[TravelPage] Attempting to get user geolocation for initial map center...");
      setIsFetchingLocation(true);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userCoords = { lat: position.coords.latitude, lng: position.coords.longitude };
            setUserLocation({ latitude: userCoords.lat, longitude: userCoords.lng });
            setGeolocationError(null);
            console.log("[TravelPage] User location fetched for initial map center:", userCoords);
            initializeMap(userCoords, 10);
            setIsFetchingLocation(false);
          },
          (error) => {
            console.warn("[TravelPage] Could not get user location for initial map center:", error.message);
            setGeolocationError(`Could not get your location: ${error.message}. Map centered globally.`);
            initializeMap({ lat: 20, lng: 0 }, 2); // Fallback center
            setIsFetchingLocation(false);
          },
          { timeout: 8000 }
        );
      } else {
        console.warn("[TravelPage] Geolocation is not supported by this browser for initial map center.");
        setGeolocationError("Geolocation not supported. Map centered globally.");
        initializeMap({ lat: 20, lng: 0 }, 2); // Fallback center
        setIsFetchingLocation(false);
      }
    }
  }, [isMapsScriptLoaded, map, apiKey, isMapInitializing]);


  const handleSelectDestination = useCallback((dest: AiDestinationSuggestion) => {
    setSelectedMapDestination(dest);
    setIsDialogOpen(true);
    if (map && window.google && window.google.maps && dest.latitude != null && dest.longitude != null) {
      console.log(`[TravelPage] Panning and zooming to AI destination: ${dest.name} at ${dest.latitude}, ${dest.longitude}`);
      const targetLatLng = new window.google.maps.LatLng(dest.latitude, dest.longitude);
      
      map.panTo(targetLatLng);
      
      const listener = window.google.maps.event.addListenerOnce(map, 'idle', () => {
        console.log(`[TravelPage] Map idle after pan, setting zoom to 12 for ${dest.name}`);
        map.setZoom(12);
      });
      setTimeout(() => { 
        if (map && map.getZoom() !== 12 ) {
            map.setZoom(12); 
            console.log(`[TravelPage] Fallback zoom set to 12 for ${dest.name}`);
        }
        if (listener) window.google.maps.event.removeListener(listener);
      }, 800);
    } else if (map) {
      console.warn(`[TravelPage] No valid coordinates for ${dest.name} (Lat: ${dest.latitude}, Lng: ${dest.longitude}), cannot pan map.`);
    } else {
      console.warn(`[TravelPage] Map object not available for handleSelectDestination.`);
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
        private destinationData: AiDestinationSuggestion;
        private clickHandler: () => void;
        private mapInstanceRef: google.maps.Map;

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
            this.mapInstanceRef = props.map;
            this.setMap(props.map);
        }

        onAdd() {
            this.div = document.createElement('div');
            this.div.className = 'custom-map-marker';
            this.div.title = this.destinationData.name; 
            
            const pulse = document.createElement('div');
            pulse.className = 'custom-map-marker-pulse'; 
            this.div.appendChild(pulse);

            this.div.addEventListener('click', this.clickHandler);

            const panes = this.getPanes();
            if (panes && panes.overlayMouseTarget) {
                panes.overlayMouseTarget.appendChild(this.div);
            } else {
              console.warn("[TravelPage] CustomMarkerOverlay: overlayMouseTarget pane not available during onAdd. Appending to map div as fallback.");
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

    console.log("[TravelPage] Updating map markers based on AI destinations:", aiDestinations.map(d => ({name: d.name, lat: d.latitude, lng: d.longitude})));
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    
    const newMarkers: any[] = []; 
    const validAiDestinations = aiDestinations.filter(dest => dest.latitude != null && dest.longitude != null);

    validAiDestinations.forEach(dest => {
      if (typeof dest.latitude === 'number' && typeof dest.longitude === 'number') {
        const marker = new CustomMarkerOverlay({
            latlng: { lat: dest.latitude, lng: dest.longitude },
            map: map,
            destination: dest,
            onClick: () => handleSelectDestination(dest)
        });
        newMarkers.push(marker);
      } else {
        console.warn(`[TravelPage] Invalid coordinates for marker: ${dest.name}`, dest.latitude, dest.longitude);
      }
    });
    markersRef.current = newMarkers;
    console.log(`[TravelPage] ${newMarkers.length} custom AI markers created.`);

    if (newMarkers.length > 0 && window.google && window.google.maps) {
      const bounds = new window.google.maps.LatLngBounds();
      newMarkers.forEach(marker => {
        if (marker.getPosition) {
            bounds.extend(marker.getPosition());
        }
      });
      if (!bounds.isEmpty()) {
          map.fitBounds(bounds);
          console.log("[TravelPage] Map bounds fitted to AI markers.");
          
          const listenerId = window.google.maps.event.addListenerOnce(map, 'idle', () => {
            if (map.getZoom()! > 15) {
                map.setZoom(15);
                console.log("[TravelPage] Adjusted map zoom to 15 (was >15).");
            }
            if (newMarkers.length === 1 && map.getZoom()! < 10 ) {
                 map.setZoom(10);
                 console.log("[TravelPage] Single AI marker, adjusted zoom to 10 (was <10).");
            }
          });
      } else if (newMarkers.length > 0) {
          console.warn("[TravelPage] AI markers created but bounds are empty. Could not fit map.");
      }
    } else if (newMarkers.length === 0 && aiDestinations.length > 0) {
        console.warn("[TravelPage] AI destinations present but no valid coordinates for markers. Map not adjusted.");
    }

    return () => {
        console.log("[TravelPage] Cleaning up AI map markers effect.");
        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];
    };
  }, [map, isMapsScriptLoaded, aiDestinations, handleSelectDestination]);

  const handleFetchAiDestinations = async () => {
    setIsFetchingAiDestinations(true);
    setAiDestinationsError(null);
    setAiContextualNote(null);
    setAiDestinations([]); 

    const fetchDestinationsWithLocation = async (lat?: number, lon?: number) => {
      try {
        console.log(`[TravelPage] Fetching AI destinations ${lat != null && lon != null ? `for location: ${lat}, ${lon}` : 'globally'}.`);
        const result: PopularDestinationsOutput = await getPopularDestinations({ userLatitude: lat, userLongitude: lon });
        console.log("[TravelPage] AI Destinations Raw Result from Server:", result.destinations.map(d => ({name: d.name, imageUriProvided: !!d.imageUri, coords: {lat:d.latitude, lng:d.longitude}})));

        if (result && result.destinations) {
            const processedDestinations = result.destinations.map(d => ({
                ...d,
                imageUri: d.imageUri || `https://placehold.co/600x400.png?text=${encodeURIComponent(d.name.substring(0,10))}`
            }));
            setAiDestinations(processedDestinations);
            console.log(`[TravelPage] Setting AI Destinations State with ${processedDestinations.length} items.`);
        } else {
            setAiDestinations([]);
            console.warn("[TravelPage] AI did not return a valid destinations array.");
        }
        setAiContextualNote(result?.contextualNote || (lat != null && lon != null ? "AI-powered suggestions based on your area." : "General popular destination ideas."));
        
        if (!result?.destinations || result.destinations.length === 0){
           setAiDestinationsError("AI couldn't find specific suggestions for this location. Try a broader search or general suggestions.");
        }
      } catch (error) {
        console.error("[TravelPage] Error fetching AI destinations:", error);
        setAiDestinationsError("Could not fetch destination suggestions at this time.");
        setAiDestinations([]);
      } finally {
        setIsFetchingAiDestinations(false);
      }
    };

    setIsFetchingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log(`[TravelPage] Location fetched for AI suggestions: ${latitude}, ${longitude}`);
          setUserLocation({ latitude, longitude });
          setGeolocationError(null);
          setIsFetchingLocation(false);
          fetchDestinationsWithLocation(latitude, longitude);
        },
        (error) => {
          console.warn(`[TravelPage] Geolocation error for AI suggestions: ${error.message}`);
          setGeolocationError(`Could not get your location for personalized suggestions: ${error.message}. Showing general ideas.`);
          setUserLocation(null);
          setIsFetchingLocation(false);
          fetchDestinationsWithLocation();
        },
        { timeout: 10000 }
      );
    } else {
      console.warn("[TravelPage] Geolocation is not supported for AI suggestions.");
      setGeolocationError("Geolocation not supported. Showing general suggestions.");
      setIsFetchingLocation(false);
      fetchDestinationsWithLocation();
    }
  };

  const parseBudget = (priceRange?: string): number => {
    if (!priceRange) return 2000; 
    const match = priceRange.match(/\$(\d+)/); 
    return match ? parseInt(match[1], 10) * 7 : 2000; 
  };

  const handleInitiatePlanningFromTravelPage = (destinationSuggestion: AiDestinationSuggestion) => {
    const plannerInputData: AITripPlannerInput = {
        destination: destinationSuggestion.name + (destinationSuggestion.country ? `, ${destinationSuggestion.country}` : ''),
        travelDates: "Next month for 7 days",
        budget: parseBudget(destinationSuggestion.hotelIdea?.priceRange || destinationSuggestion.flightIdea?.priceRange),
    };

    console.log("[TravelPage] Initiating planning with data:", plannerInputData);
    localStorage.setItem('tripBundleToPlan', JSON.stringify(plannerInputData));
    window.dispatchEvent(new CustomEvent('localStorageUpdated_tripBundleToPlan'));
    router.push('/planner');
    toast({
        title: `Planning Trip to ${destinationSuggestion.name}`,
        description: "Planner opened with destination details. Adjust dates and budget as needed.",
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
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
        </section>

        <section className="mb-12 animate-fade-in-up" style={{animationDelay: '0.4s'}}>
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground flex items-center">
              <Sparkles className="w-7 h-7 mr-2 text-accent"/> AI-Powered Destination Ideas
            </h2>
            <Button 
              onClick={handleFetchAiDestinations} 
              disabled={isFetchingAiDestinations || isFetchingLocation} 
              size="lg"
              className={cn(
                "text-lg py-3 group transform transition-all duration-300 ease-out shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40",
                "bg-gradient-to-r from-primary to-accent text-primary-foreground",
                "hover:from-accent hover:to-primary",
                "focus-visible:ring-4 focus-visible:ring-primary/40"
              )}
            >
              {(isFetchingAiDestinations || isFetchingLocation) ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2 group-hover:animate-pulse" />}
              {(isFetchingAiDestinations || isFetchingLocation) ? "Discovering..." : userLocation ? "Nearby Places with AI" : "AI Suggestions"}
            </Button>
          </div>
          {geolocationError && !isFetchingLocation && (
            <Alert variant="default" className={cn("mb-4 bg-yellow-500/10 border-yellow-500/30 text-yellow-300")}>
              <Info className="h-4 w-4 !text-yellow-400" />
              <ShadcnAlertTitle className="text-yellow-200">Location Notice</ShadcnAlertTitle>
              <ShadcnAlertDescription className="text-yellow-400/80">
                {geolocationError}
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
                  <CardFooter className="p-4 grid grid-cols-2 gap-2"><div className="h-8 bg-muted/40 rounded"></div><div className="h-8 bg-muted/40 rounded"></div></CardFooter>
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
                    key={dest.name + (dest.latitude || index) + (dest.longitude || index) } 
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

      {selectedMapDestination && (
         <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className={cn("sm:max-w-lg md:max-w-xl p-0", glassCardClasses, "border-primary/30")}>
                <DialogHeader className="p-4 sm:p-6 border-b border-border/30 sticky top-0 z-10 bg-card/80 dark:bg-card/50 backdrop-blur-sm">
                    <div className="flex justify-between items-center">
                         <DialogTitle className="text-xl font-semibold text-foreground flex items-center">
                            <MapPinIconLucide className="w-5 h-5 mr-2 text-primary" />
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

interface AiDestinationCardProps {
  destination: AiDestinationSuggestion;
  onSelect: () => void;
  onPlanTrip: () => void; 
}

function AiDestinationCard({ destination, onSelect, onPlanTrip }: AiDestinationCardProps) {
  const [imageLoadError, setImageLoadError] = useState(false);
  
  const handleImageError = useCallback(() => {
    console.warn(`[AiDestinationCard] Image load ERROR for: ${destination.name}, src: ${destination.imageUri}`);
    setImageLoadError(true);
  }, [destination.name, destination.imageUri]);

  const imageIsPlaceholder = !destination.imageUri || destination.imageUri.startsWith('https://placehold.co');
  const imageHint = imageIsPlaceholder 
    ? (destination.imagePrompt || destination.name.toLowerCase().split(" ").slice(0,2).join(" ")) 
    : undefined;

  const canDisplayImage = !imageLoadError && destination.imageUri;

  return (
    <Card 
        className={cn(glassCardClasses, "overflow-hidden transform hover:scale-[1.03] transition-transform duration-300 ease-out shadow-lg hover:shadow-primary/30 flex flex-col cursor-pointer")}
        onClick={onSelect} 
    >
      <div className="relative w-full aspect-[16/10] bg-muted/30 group">
        {canDisplayImage ? (
          <Image
            src={destination.imageUri!} // Asserting not null because of canDisplayImage check
            alt={destination.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            data-ai-hint={imageHint}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            onError={handleImageError}
            priority={false} 
          />
        ) : (
          null // Show nothing if image can't be displayed
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
                onPlanTrip();
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
  const [imageLoadError, setImageLoadError] = useState(false);

  useEffect(() => {
    setImageLoadError(false); 
  }, [destination?.imageUri]);

  if (!destination) return null;

  const imageIsPlaceholder = !destination.imageUri || destination.imageUri.startsWith('https://placehold.co');
  const imageHint = imageIsPlaceholder 
    ? (destination.imagePrompt || destination.name.toLowerCase().split(" ").slice(0,2).join(" ")) 
    : undefined;

  const handleImageError = () => {
    console.warn(`[DialogImageDisplay] Image load ERROR for: ${destination.name}, src: ${destination.imageUri}`);
    setImageLoadError(true);
  };

  const canDisplayImage = !imageLoadError && destination.imageUri;

  return (
    <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-border/50 shadow-lg bg-muted/30">
      {canDisplayImage ? (
        <Image
          src={destination.imageUri!} // Asserting not null due to canDisplayImage check
          alt={`Image of ${destination.name}`}
          fill
          className="object-cover"
          data-ai-hint={imageHint}
          sizes="(max-width: 640px) 90vw, 500px"
          onError={handleImageError}
        />
      ) : (
        null // Show nothing if image can't be displayed
      )}
    </div>
  );
}


interface SearchInputProps {
  initialSearchTerm?: string;
  onSearch?: (term: string) => void;
  placeholder?: string;
}
function SearchInput({ initialSearchTerm = '', onSearch, placeholder = "Search destinations, hotels, flights..."}: SearchInputProps) {
   const [term, setTerm] = useState(initialSearchTerm);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) onSearch(term);
    toast({
        title: "Search Submitted (Conceptual)",
        description: `You searched for: ${term}. This would typically trigger a search or navigation to a results page.`,
    });
  };
  const { toast } = useToast(); 
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
    

    

