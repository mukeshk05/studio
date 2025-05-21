
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AppLogo } from '@/components/layout/app-logo';
import { cn } from '@/lib/utils';
import { Search, Plane, Hotel, Compass, Briefcase, Camera, MapPin as MapPinIconLucide, ImageOff, Loader2, AlertTriangle, Sparkles, Building, Route, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { getPopularDestinations } from '@/ai/flows/popular-destinations-flow';
import type { PopularDestinationsOutput, AiDestinationSuggestion } from '@/ai/types/popular-destinations-types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertTitle as ShadcnAlertTitle, AlertDescription as ShadcnAlertDescription} from '@/components/ui/alert';


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

interface CustomMarkerOverlayProps {
    latlng: google.maps.LatLngLiteral;
    map: google.maps.Map;
    destination: AiDestinationSuggestion; // Updated to use AI suggestion type
    onClick: () => void;
}

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
  const [geolocationError, setGeolocationError] = useState<string | null>(null);
  const [aiContextualNote, setAiContextualNote] = useState<string | null>(null);
  const { toast } = useToast();

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const initGoogleMapsApi = useCallback(() => {
    console.log("Google Maps API script loaded, callback initGoogleMapsApiTravelPage executed.");
    setIsMapsScriptLoaded(true);
  }, []);

  useEffect(() => {
    if (!apiKey) {
      console.error("Google Maps API key is missing.");
      setMapsApiError("Google Maps API key is missing. Map functionality is disabled.");
      return;
    }
    if (window.google && window.google.maps) {
      if (!isMapsScriptLoaded) setIsMapsScriptLoaded(true);
      console.log("Google Maps API already available.");
      return;
    }
    const scriptId = 'google-maps-travel-page-script';
    if (document.getElementById(scriptId)) {
        console.log("Google Maps script tag already exists.");
        if (window.google && window.google.maps && !isMapsScriptLoaded) {
            setIsMapsScriptLoaded(true);
        }
        return;
    }
    
    console.log("Attempting to load Google Maps API script...");
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMapsApiTravelPage&libraries=geometry,marker`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      console.error("Failed to load Google Maps API script.");
      setMapsApiError("Failed to load Google Maps. Please check API key and network.");
      setIsMapsScriptLoaded(false); 
    };
    (window as any).initGoogleMapsApiTravelPage = initGoogleMapsApi;
    document.head.appendChild(script);
    return () => { 
        delete (window as any).initGoogleMapsApiTravelPage; 
    };
  }, [apiKey, initGoogleMapsApi, isMapsScriptLoaded]);

  useEffect(() => {
    if (isMapsScriptLoaded && mapRef.current && !map && !isMapInitializing) {
      console.log("Initializing Google Map...");
      setIsMapInitializing(true);
      try {
        const initialMap = new window.google.maps.Map(mapRef.current, {
          center: { lat: 20, lng: 0 },
          zoom: 2,
          styles: modernMapStyle,
          mapTypeControl: true,
          mapTypeControlOptions: { style: window.google.maps.MapTypeControlStyle.HORIZONTAL_BAR, position: window.google.maps.ControlPosition.TOP_RIGHT },
          streetViewControl: false, fullscreenControl: true, zoomControl: true,
        });
        setMap(initialMap);
        console.log("Google Map initialized successfully.");
      } catch (error) {
        console.error("Error initializing the map:", error);
        setMapsApiError("Error initializing the map.");
      } finally {
        setIsMapInitializing(false);
      }
    }
  }, [isMapsScriptLoaded, map, apiKey, isMapInitializing]);

  const handleSelectDestination = useCallback((dest: AiDestinationSuggestion) => {
    setSelectedMapDestination(dest);
    setIsDialogOpen(true);
    if (map && window.google && window.google.maps && dest.latitude && dest.longitude) {
      console.log(`Panning and zooming to AI destination: ${dest.name}`);
      const targetLatLng = { lat: dest.latitude, lng: dest.longitude };
      
      map.panTo(targetLatLng);
      
      const listener = window.google.maps.event.addListenerOnce(map, 'idle', () => {
        console.log(`Map idle after pan, setting zoom to 8 for ${dest.name}`);
        map.setZoom(8);
      });
      setTimeout(() => { 
        if (map.getZoom() !== 8) { // Check if zoom was already set
            console.log(`Fallback zoom for ${dest.name}`);
            map.setZoom(8); 
        }
        window.google.maps.event.removeListener(listener); 
      }, 800); 
    } else if (map) {
      console.warn(`No coordinates for ${dest.name}, cannot pan map.`);
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
        private destination: AiDestinationSuggestion; // Use AiDestinationSuggestion
        private onClick: () => void;
        private mapInstance: google.maps.Map;

        constructor(props: CustomMarkerOverlayProps) {
            super(); 
            this.latlng = new window.google.maps.LatLng(props.latlng.lat, props.latlng.lng);
            this.destination = props.destination; 
            this.onClick = props.onClick;
            this.mapInstance = props.map;
            this.setMap(props.map);
        }
        onAdd() {
            this.div = document.createElement('div'); 
            this.div.className = 'custom-map-marker'; 
            this.div.title = this.destination.name;
            const pulse = document.createElement('div'); 
            pulse.className = 'custom-map-marker-pulse'; 
            this.div.appendChild(pulse);
            this.div.addEventListener('click', this.onClick);
            const panes = this.getPanes();
            if (panes && panes.overlayMouseTarget) {
                panes.overlayMouseTarget.appendChild(this.div);
            } else {
                console.warn("overlayMouseTarget pane not available for marker:", this.destination.name);
                this.mapInstance.getDiv().appendChild(this.div); 
            }
        }
        draw() {
            const projection = this.getProjection(); if (!projection || !this.div) return;
            const point = projection.fromLatLngToDivPixel(this.latlng);
            if (point) { this.div.style.left = point.x + 'px'; this.div.style.top = point.y + 'px'; }
        }
        onRemove() { 
            if (this.div) { 
                this.div.removeEventListener('click', this.onClick); 
                if (this.div.parentNode) {
                     this.div.parentNode.removeChild(this.div); 
                }
                this.div = null; 
            } 
        }
        getPosition() { return this.latlng; }
    }

    console.log("Updating map markers based on AI destinations...");
    markersRef.current.forEach(marker => marker.setMap(null)); 
    const newMarkers: any[] = [];
    const validAiDestinations = aiDestinations.filter(dest => dest.latitude != null && dest.longitude != null);

    validAiDestinations.forEach(dest => {
      const marker = new CustomMarkerOverlay({ 
          latlng: { lat: dest.latitude!, lng: dest.longitude! }, 
          map: map, 
          destination: dest, 
          onClick: () => handleSelectDestination(dest) 
      });
      newMarkers.push(marker);
    });
    markersRef.current = newMarkers;
    console.log(`${newMarkers.length} custom AI markers created.`);

    if (newMarkers.length > 0 && window.google && window.google.maps) {
      const bounds = new window.google.maps.LatLngBounds();
      validAiDestinations.forEach(dest => bounds.extend(new window.google.maps.LatLng(dest.latitude!, dest.longitude!)));
      map.fitBounds(bounds);
      console.log("Map bounds fitted to AI markers.");
      if (newMarkers.length === 1) {
        map.setZoom(6); // Zoom in a bit for a single marker
      } else if (map.getZoom() && map.getZoom()! > 10) { // Don't zoom out too much if already reasonably zoomed
        map.setZoom(Math.max(2, map.getZoom()! - 1));
      } else if (newMarkers.length > 1) {
        map.setZoom(Math.max(1,map.getZoom() || 2)); // Adjust zoom for multiple AI markers, don't go below 1
      }
    } else if (newMarkers.length === 0 && map) {
        map.setCenter({ lat: 20, lng: 0 });
        map.setZoom(2);
    }

    return () => { 
        console.log("Cleaning up AI map markers.");
        markersRef.current.forEach(marker => marker.setMap(null)); 
        markersRef.current = []; 
    };
  }, [map, isMapsScriptLoaded, aiDestinations, handleSelectDestination]);

  const handleFetchAiDestinations = () => {
    setIsFetchingAiDestinations(true);
    setAiDestinationsError(null);
    setGeolocationError(null);
    setAiContextualNote(null);
    setAiDestinations([]); 

    console.log("Attempting to fetch user location...");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          console.log(`Location fetched: ${latitude}, ${longitude}`);
          setUserLocation({ latitude, longitude });
          try {
            console.log("Fetching AI destinations with location...");
            const result = await getPopularDestinations({ userLatitude: latitude, userLongitude: longitude });
            setAiDestinations(result.destinations);
            setAiContextualNote(result.contextualNote || "AI-powered suggestions based on your area.");
            console.log("AI destinations fetched:", result.destinations.length);
          } catch (error) {
            console.error("Error fetching AI destinations with location:", error);
            setAiDestinationsError("Could not fetch location-based suggestions. Showing general ideas.");
            await fetchGeneralAiDestinations();
          } finally {
            setIsFetchingAiDestinations(false);
          }
        },
        async (error) => {
          console.warn(`Geolocation error: ${error.message}`);
          setGeolocationError(`Could not get your location: ${error.message}. Showing general suggestions.`);
          setUserLocation(null);
          await fetchGeneralAiDestinations();
          setIsFetchingAiDestinations(false);
        },
        { timeout: 10000 } 
      );
    } else {
      console.warn("Geolocation is not supported.");
      setGeolocationError("Geolocation is not supported by your browser. Showing general suggestions.");
      fetchGeneralAiDestinations().finally(() => setIsFetchingAiDestinations(false));
    }
  };

  const fetchGeneralAiDestinations = async () => {
    console.log("Fetching general AI destinations...");
    setIsFetchingAiDestinations(true); 
    setAiDestinationsError(null);
    try {
      const result = await getPopularDestinations({}); 
      setAiDestinations(result.destinations);
      setAiContextualNote(result.contextualNote || "General popular destination ideas.");
      console.log("General AI destinations fetched:", result.destinations.length);
    } catch (error) {
      console.error("Error fetching general AI destinations:", error);
      setAiDestinationsError("Could not fetch general destination suggestions at this time.");
      setAiDestinations([]); 
    } finally {
         setIsFetchingAiDestinations(false);
    }
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
            Where to next?
          </h1>
          <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
            Discover flights, hotels, vacation packages, and things to do. Your journey starts here.
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
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-6">Explore on the Map</h2>
          <Card className={cn(glassCardClasses, "h-[500px] p-2 border-primary/20")}>
             {mapsApiError && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-destructive/10 text-destructive-foreground p-4 rounded-md">
                    <AlertTriangle className="w-12 h-12 mb-3"/> <p className="font-semibold text-lg">Map Error</p> <p className="text-sm text-center">{mapsApiError}</p>
                </div>
            )}
            {!mapsApiError && isMapInitializing && (
                 <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                    <Loader2 className="w-10 h-10 animate-spin mb-3 text-primary"/> <p className="text-sm">Initializing Modern Map...</p>
                </div>
            )}
            <div ref={mapRef} className={cn("w-full h-full rounded-md", (mapsApiError || isMapInitializing) ? "hidden" : "")} />
          </Card>
        </section>

        <section className="mb-12 animate-fade-in-up" style={{animationDelay: '0.4s'}}>
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              AI-Powered Destination Ideas
            </h2>
            <Button 
              onClick={handleFetchAiDestinations} 
              disabled={isFetchingAiDestinations} 
              size="lg"
              className={cn(
                "text-lg py-3 group transform transition-all duration-300 ease-out shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 hover:scale-[1.02] active:scale-100",
                "bg-gradient-to-r from-primary to-accent hover:from-accent hover:to-primary focus-visible:ring-4 focus-visible:ring-primary/40 text-primary-foreground"
              )}
            >
              {isFetchingAiDestinations ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2 group-hover:animate-pulse" />}
              {isFetchingAiDestinations ? "Discovering..." : "Discover AI Suggestions"}
            </Button>
          </div>
          {geolocationError && (
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
                <AiDestinationCard key={dest.name + index} destination={dest} />
              ))}
            </div>
          )}
           {!isFetchingAiDestinations && !aiDestinationsError && aiDestinations.length === 0 && (
             <Card className={cn(glassCardClasses, "p-6 text-center text-muted-foreground")}>
                 Click the button above to let Aura AI suggest some destinations for you!
             </Card>
           )}
        </section>
        
        <section className="animate-fade-in-up" style={{animationDelay: '0.6s'}}>
             <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-6">More to Explore (Conceptual)</h2>
            <div className={cn("p-6 text-center text-muted-foreground rounded-xl", glassCardClasses, "border-primary/10")}>
                <Camera className="w-12 h-12 mx-auto mb-3 text-primary/70"/>
                <p>Imagine personalized suggestions appearing here based on your recent searches or saved trips! </p>
                <p className="text-xs mt-1">This section would dynamically update with AI recommendations.</p>
            </div>
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
                    <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-border/50 shadow-lg">
                        {selectedMapDestination.imageUri ? (
                            <Image
                                src={selectedMapDestination.imageUri}
                                alt={`Image of ${selectedMapDestination.name}`}
                                fill
                                className="object-cover"
                                data-ai-hint={selectedMapDestination.imageUri.startsWith('https://placehold.co') ? (selectedMapDestination.imagePrompt || selectedMapDestination.name.toLowerCase().split(" ").slice(0,2).join(" ")) : undefined}
                                sizes="(max-width: 640px) 90vw, 500px"
                            />
                        ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                                <ImageOff className="w-16 h-16 text-muted-foreground" />
                            </div>
                        )}
                    </div>
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
                    <Button asChild size="lg" className="w-full text-lg py-3 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 mt-4">
                        <Link href={`/planner?destination=${encodeURIComponent(selectedMapDestination.name)}&country=${encodeURIComponent(selectedMapDestination.country)}`}>
                            <Plane className="mr-2 h-5 w-5" />
                            Plan a Trip to {selectedMapDestination.name}
                        </Link>
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
      )}

      <footer className={cn("py-6 border-t border-border/30 mt-auto", glassPaneClasses)}>
         <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} BudgetRoam. Explore the world your way.
          </p>
        </div>
      </footer>
    </div>
  );
}

function AiDestinationCard({ destination }: { destination: AiDestinationSuggestion }) {
  const imageHint = destination.imageUri?.startsWith('https://placehold.co') 
    ? (destination.imagePrompt || destination.name.toLowerCase().split(" ").slice(0,2).join(" ")) 
    : undefined;

  return (
    <Card className={cn(glassCardClasses, "overflow-hidden transform hover:scale-[1.03] transition-transform duration-300 ease-out shadow-lg hover:shadow-primary/30 flex flex-col")}>
      <div className="relative w-full aspect-[16/10]">
        {destination.imageUri ? (
          <Image
            src={destination.imageUri}
            alt={destination.name}
            fill
            className="object-cover"
            data-ai-hint={imageHint}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
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
          <Button asChild size="sm" className="w-full glass-interactive text-primary hover:bg-primary/20 hover:text-primary-foreground">
             <Link href={`/planner?destination=${encodeURIComponent(destination.name)}&country=${encodeURIComponent(destination.country)}`}>
                <Sparkles className="mr-2 h-4 w-4" /> Plan Trip
             </Link>
          </Button>
      </CardFooter>
    </Card>
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
        description: `You searched for: ${term}. This would typically trigger a search or navigation.`,
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

