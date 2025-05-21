
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AppLogo } from '@/components/layout/app-logo';
import { cn } from '@/lib/utils';
import { Search, Plane, Hotel, Compass, Briefcase, Camera, MapPin as MapPinIconLucide, ImageOff, Loader2, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { X } from "lucide-react";

const glassCardClasses = "glass-card hover:border-primary/40 bg-card/80 dark:bg-card/50 backdrop-blur-lg";
const glassPaneClasses = "bg-background/60 dark:bg-background/50 backdrop-blur-xl";

const exploreCategories = [
  { name: "Flights", icon: <Plane className="w-5 h-5" />, href: "/planner" },
  { name: "Hotels", icon: <Hotel className="w-5 h-5" />, href: "/travel#" }, 
  { name: "Things to do", icon: <Compass className="w-5 h-5" />, href: "/travel#" },
  { name: "Packages", icon: <Briefcase className="w-5 h-5" />, href: "/travel#" },
];

const popularDestinations = [
  { name: "Paris", country: "France", imageSrc: "https://placehold.co/600x400.png", dataAiHint: "paris eiffel tower", description: "Iconic landmarks, art, and romance.", lat: 48.8566, lng: 2.3522 },
  { name: "Rome", country: "Italy", imageSrc: "https://placehold.co/600x400.png", dataAiHint: "rome colosseum", description: "Ancient history and delicious cuisine.", lat: 41.9028, lng: 12.4964 },
  { name: "Tokyo", country: "Japan", imageSrc: "https://placehold.co/600x400.png", dataAiHint: "tokyo cityscape modern", description: "Futuristic cityscapes and rich traditions.", lat: 35.6895, lng: 139.6917 },
  { name: "Bali", country: "Indonesia", imageSrc: "https://placehold.co/600x400.png", dataAiHint: "bali beach tropical", description: "Tropical beaches and serene temples.", lat: -8.3405, lng: 115.0920 },
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
  destination: typeof popularDestinations[0];
  onClick: () => void;
}

class CustomMarkerOverlay extends google.maps.OverlayView {
  private latlng: google.maps.LatLng;
  private div: HTMLDivElement | null = null;
  private destination: typeof popularDestinations[0];
  private onClick: () => void;

  constructor(props: CustomMarkerOverlayProps) {
    super();
    this.latlng = new google.maps.LatLng(props.latlng.lat, props.latlng.lng);
    this.destination = props.destination;
    this.onClick = props.onClick;
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
    if (panes) {
      panes.overlayMouseTarget.appendChild(this.div);
    }
  }

  draw() {
    const projection = this.getProjection();
    if (!projection || !this.div) {
      return;
    }
    const point = projection.fromLatLngToDivPixel(this.latlng);
    if (point) {
      this.div.style.left = point.x + 'px';
      this.div.style.top = point.y + 'px';
    }
  }

  onRemove() {
    if (this.div) {
      this.div.removeEventListener('click', this.onClick);
      this.div.parentNode?.removeChild(this.div);
      this.div = null;
    }
  }
  
  getPosition() {
    return this.latlng;
  }
}


export default function TravelPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<CustomMarkerOverlay[]>([]);
  const mapRef = useRef<HTMLDivElement>(null);
  const [selectedDestination, setSelectedDestination] = useState<(typeof popularDestinations)[0] | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMapsScriptLoaded, setIsMapsScriptLoaded] = useState(false);
  const [mapsApiError, setMapsApiError] = useState<string | null>(null);
  const [isMapInitializing, setIsMapInitializing] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const initGoogleMapsApi = useCallback(() => {
    console.log("Travel Page: Google Maps API script loaded, window.google:", window.google);
    setIsMapsScriptLoaded(true);
  }, []);


  useEffect(() => {
    if (!apiKey) {
      console.error("Travel Page: Google Maps API key is missing.");
      setMapsApiError("Google Maps API key is missing. Map functionality is disabled.");
      return;
    }

    if (window.google && window.google.maps) {
      console.log("Travel Page: Google Maps API already loaded.");
      if (!isMapsScriptLoaded) setIsMapsScriptLoaded(true);
      return;
    }
    
    const scriptId = 'google-maps-travel-page-script';
    if (document.getElementById(scriptId)) {
      console.log("Travel Page: Google Maps script tag already present.");
      // If script is present but not loaded, initGoogleMapsApi might not have been called
      // Or it might be loading. We rely on isMapsScriptLoaded state.
      return;
    }
    
    console.log("Travel Page: Loading Google Maps API script...");
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMapsApiTravelPage`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      console.error("Travel Page: Failed to load Google Maps API script.");
      setMapsApiError("Failed to load Google Maps. Please check API key and network.");
      setIsMapsScriptLoaded(false); 
    };
    (window as any).initGoogleMapsApiTravelPage = initGoogleMapsApi;
    document.head.appendChild(script);

    return () => {
      delete (window as any).initGoogleMapsApiTravelPage;
      // Consider removing the script tag if component unmounts, though usually not critical
    };
  }, [apiKey, initGoogleMapsApi, isMapsScriptLoaded]);


  useEffect(() => {
    if (isMapsScriptLoaded && mapRef.current && !map) {
      console.log("Travel Page: Maps API script loaded, initializing map...");
      setIsMapInitializing(true);
      if (!mapRef.current) {
        console.error("Travel Page: Map container ref is not available at initialization.");
        setIsMapInitializing(false);
        return;
      }
      
      try {
        const initialMap = new window.google.maps.Map(mapRef.current, {
          center: { lat: 20, lng: 0 },
          zoom: 2,
          styles: modernMapStyle,
          mapTypeControlOptions: {
            style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
            position: google.maps.ControlPosition.TOP_RIGHT,
          },
          streetViewControl: false,
          fullscreenControl: true,
        });
        setMap(initialMap);
        console.log("Travel Page: Map initialized:", initialMap);
      } catch (error) {
        console.error("Travel Page: Error initializing map:", error);
        setMapsApiError("Error initializing the map.");
      } finally {
        setIsMapInitializing(false);
      }
    }
  }, [isMapsScriptLoaded, map, apiKey]);


  const handleSelectDestination = useCallback((dest: typeof popularDestinations[0]) => {
    setSelectedDestination(dest);
    setIsDialogOpen(true);
    if (map) {
      const targetLatLng = { lat: dest.lat, lng: dest.lng };
      const currentZoom = map.getZoom() || 2;
      const targetZoom = 8; // Zoom level for viewing a city

      // Smooth pan and zoom sequence
      if (Math.abs(currentZoom - targetZoom) > 2 || 
          google.maps.geometry.spherical.computeDistanceBetween(map.getCenter()!, new google.maps.LatLng(targetLatLng)) > 1000000 // If very far
         ) {
         map.setZoom(Math.min(currentZoom, 4)); // Quickly zoom out if far or zoom levels are very different
      }
      
      map.panTo(targetLatLng);

      // Listen for idle event to ensure pan is mostly complete before zooming
      const listener = google.maps.event.addListenerOnce(map, 'idle', () => {
          map.setZoom(targetZoom);
      });
      // Fallback in case idle doesn't fire quickly (e.g., map already centered)
      setTimeout(() => {
        if (map.getZoom() !== targetZoom) {
            map.setZoom(targetZoom);
        }
        google.maps.event.removeListener(listener);
      }, 800); // Adjust delay as needed
    }
  }, [map]);

  useEffect(() => {
    if (map && popularDestinations.length > 0 && window.google && window.google.maps && window.google.maps.OverlayView) {
      markers.forEach(marker => marker.setMap(null)); // Clear existing custom overlays
      const newMarkers: CustomMarkerOverlay[] = [];

      popularDestinations.forEach(dest => {
        const marker = new CustomMarkerOverlay({
            latlng: { lat: dest.lat, lng: dest.lng },
            map: map,
            destination: dest,
            onClick: () => handleSelectDestination(dest)
        });
        newMarkers.push(marker);
      });
      setMarkers(newMarkers);

      if (newMarkers.length > 0) {
        const bounds = new window.google.maps.LatLngBounds();
        popularDestinations.forEach(dest => {
          bounds.extend(new window.google.maps.LatLng(dest.lat, dest.lng));
        });
        map.fitBounds(bounds);
        if (newMarkers.length === 1) {
            map.setZoom(6);
        } else {
             const currentZoom = map.getZoom() || 2;
             if (currentZoom > 5) map.setZoom(Math.max(2, currentZoom -1)); 
        }
      }
    }
    return () => {
        markers.forEach(marker => marker.setMap(null));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, popularDestinations, handleSelectDestination]); // handleSelectDestination is stable due to useCallback

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
                    <AlertTriangle className="w-12 h-12 mb-3"/>
                    <p className="font-semibold text-lg">Map Error</p>
                    <p className="text-sm text-center">{mapsApiError}</p>
                </div>
            )}
            {!mapsApiError && isMapInitializing && (
                 <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                    <Loader2 className="w-10 h-10 animate-spin mb-3 text-primary"/>
                    <p className="text-sm">Initializing Modern Map...</p>
                </div>
            )}
            <div ref={mapRef} className={cn("w-full h-full rounded-md", (mapsApiError || isMapInitializing) ? "hidden" : "")} />
          </Card>
        </section>

        <section className="mb-12 animate-fade-in-up" style={{animationDelay: '0.4s'}}>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-6">Popular Destinations</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {popularDestinations.map((dest) => (
              <Card 
                key={dest.name} 
                className={cn(glassCardClasses, "overflow-hidden transform hover:scale-[1.03] transition-transform duration-300 ease-out shadow-lg hover:shadow-primary/30 cursor-pointer")}
                onClick={() => handleSelectDestination(dest)}
              >
                <div className="relative w-full aspect-[16/10]">
                  <Image
                    src={dest.imageSrc}
                    alt={dest.name}
                    fill
                    className="object-cover"
                    data-ai-hint={dest.dataAiHint}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                </div>
                <CardHeader className="p-4">
                  <CardTitle className="text-lg text-card-foreground">{dest.name}</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">{dest.country}</CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-sm text-muted-foreground line-clamp-2">{dest.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
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

      {selectedDestination && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className={cn("sm:max-w-lg md:max-w-xl p-0", glassCardClasses, "border-primary/30")}>
                <DialogHeader className="p-4 sm:p-6 border-b border-border/30 sticky top-0 z-10 bg-card/80 dark:bg-card/50 backdrop-blur-sm">
                    <div className="flex justify-between items-center">
                         <DialogTitle className="text-xl font-semibold text-foreground flex items-center">
                            <MapPinIconLucide className="w-5 h-5 mr-2 text-primary" />
                            {selectedDestination.name}
                         </DialogTitle>
                        <DialogClose asChild>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-accent/20 hover:text-accent-foreground">
                                <X className="h-5 w-5" />
                            </Button>
                        </DialogClose>
                    </div>
                     <DialogDescription className="text-sm text-muted-foreground">{selectedDestination.country}</DialogDescription>
                </DialogHeader>
                <div className="p-4 sm:p-6 space-y-4">
                    <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-border/50 shadow-lg">
                        {selectedDestination.imageSrc ? (
                            <Image
                                src={selectedDestination.imageSrc}
                                alt={`Image of ${selectedDestination.name}`}
                                fill
                                className="object-cover"
                                data-ai-hint={selectedDestination.dataAiHint}
                                sizes="(max-width: 640px) 90vw, 500px"
                            />
                        ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                                <ImageOff className="w-16 h-16 text-muted-foreground" />
                            </div>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {selectedDestination.description}
                    </p>
                    <Button asChild size="lg" className="w-full text-lg py-3 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 mt-4">
                        <Link href={`/planner?destination=${encodeURIComponent(selectedDestination.name)}`}>
                            <Plane className="mr-2 h-5 w-5" />
                            Plan a Trip to {selectedDestination.name}
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
    console.log("Conceptual search submitted:", term);
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
