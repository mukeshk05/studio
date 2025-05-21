
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AppLogo } from '@/components/layout/app-logo';
import { cn } from '@/lib/utils';
import { Search, Plane, Hotel, Compass, Briefcase, Camera, MapPin as MapPinIconLucide, ImageOff, Loader2, AlertTriangle } from 'lucide-react'; // Renamed MapPin to avoid conflict
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { X } from "lucide-react";

const glassCardClasses = "glass-card hover:border-primary/40 bg-card/80 dark:bg-card/50 backdrop-blur-lg";
const glassPaneClasses = "bg-background/60 dark:bg-background/50 backdrop-blur-xl";

const exploreCategories = [
  { name: "Flights", icon: <Plane className="w-5 h-5" />, href: "/planner" },
  { name: "Hotels", icon: <Hotel className="w-5 h-5" />, href: "/travel#" }, // Placeholder for now
  { name: "Things to do", icon: <Compass className="w-5 h-5" />, href: "/travel#" },
  { name: "Packages", icon: <Briefcase className="w-5 h-5" />, href: "/travel#" },
];

const popularDestinations = [
  { name: "Paris", country: "France", imageSrc: "https://placehold.co/600x400.png", dataAiHint: "paris eiffel tower", description: "Iconic landmarks, art, and romance.", lat: 48.8566, lng: 2.3522 },
  { name: "Rome", country: "Italy", imageSrc: "https://placehold.co/600x400.png", dataAiHint: "rome colosseum", description: "Ancient history and delicious cuisine.", lat: 41.9028, lng: 12.4964 },
  { name: "Tokyo", country: "Japan", imageSrc: "https://placehold.co/600x400.png", dataAiHint: "tokyo cityscape modern", description: "Futuristic cityscapes and rich traditions.", lat: 35.6895, lng: 139.6917 },
  { name: "Bali", country: "Indonesia", imageSrc: "https://placehold.co/600x400.png", dataAiHint: "bali beach tropical", description: "Tropical beaches and serene temples.", lat: -8.3405, lng: 115.0920 },
];

// Modern map style (darker, desaturated with accent highlights)
const modernMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#263c3f" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b9a76" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#38414e" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#212a37" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca5b3" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "hsl(var(--primary))" }, { lightness: -20 } ], // Using primary color from theme
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1f2835" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#f3d19c" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#2f3948" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#17263c" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#515c6d" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#17263c" }],
  },
];


export default function TravelPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const mapRef = useRef<HTMLDivElement>(null);
  const [selectedDestination, setSelectedDestination] = useState<(typeof popularDestinations)[0] | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMapsScriptLoaded, setIsMapsScriptLoaded] = useState(false);
  const [mapsApiError, setMapsApiError] = useState<string | null>(null);
  const [isMapInitializing, setIsMapInitializing] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const initGoogleMapsApi = useCallback(() => {
    console.log("Google Maps API script loaded, window.google:", window.google);
    setIsMapsScriptLoaded(true);
  }, []);


  useEffect(() => {
    if (!apiKey) {
      console.error("Google Maps API key is missing. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.");
      setMapsApiError("Google Maps API key is missing. Map functionality is disabled.");
      return;
    }

    if (window.google && window.google.maps) {
      console.log("Google Maps API already loaded.");
      setIsMapsScriptLoaded(true);
      return;
    }

    if (document.getElementById('google-maps-script')) {
      console.log("Google Maps script tag already present.");
      // It might be loaded but not yet available on window.google, wait for callback
      return;
    }
    
    console.log("Loading Google Maps API script...");
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMapsApi`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      console.error("Failed to load Google Maps API script.");
      setMapsApiError("Failed to load Google Maps. Please check your API key and network connection.");
      setIsMapsScriptLoaded(false); // Ensure it's marked as not loaded on error
    };
    (window as any).initGoogleMapsApi = initGoogleMapsApi;
    document.head.appendChild(script);

    return () => {
      // Clean up the global callback
      delete (window as any).initGoogleMapsApi;
    };
  }, [apiKey, initGoogleMapsApi]);


  useEffect(() => {
    if (isMapsScriptLoaded && mapRef.current && !map) {
      console.log("Maps API script loaded, initializing map...");
      setIsMapInitializing(true);
      if (!mapRef.current) {
        console.error("Map container ref is not available at initialization.");
        setIsMapInitializing(false);
        return;
      }
      console.log("Map container dimensions:", mapRef.current.offsetWidth, mapRef.current.offsetHeight);
      if (mapRef.current.offsetWidth === 0 || mapRef.current.offsetHeight === 0) {
        console.warn("Map container has zero dimensions. Map might not render correctly.");
        // You might want to retry or wait for dimensions to be set
      }

      const initialMap = new window.google.maps.Map(mapRef.current, {
        center: { lat: 20, lng: 0 }, // Default center
        zoom: 2,
        styles: modernMapStyle, // Apply modern style
        mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID, // Optional: For cloud-based styling
        zoomControl: true,
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
          position: google.maps.ControlPosition.TOP_RIGHT,
        },
        streetViewControl: false,
        fullscreenControl: true,
      });
      setMap(initialMap);
      setIsMapInitializing(false);
      console.log("Map initialized:", initialMap);
    }
  }, [isMapsScriptLoaded, map, apiKey]);


  useEffect(() => {
    if (map && popularDestinations.length > 0) {
      // Clear existing markers before adding new ones
      markers.forEach(marker => marker.setMap(null));
      const newMarkers: google.maps.Marker[] = [];

      popularDestinations.forEach(dest => {
        const marker = new window.google.maps.Marker({
          position: { lat: dest.lat, lng: dest.lng },
          map: map,
          title: dest.name,
           // icon: { // Example for custom marker (optional)
          //   url: '/path/to/custom-marker.svg', // Replace with your SVG or image
          //   scaledSize: new window.google.maps.Size(30, 30),
          // },
        });
        marker.addListener('click', () => {
          setSelectedDestination(dest);
          setIsDialogOpen(true);
          map.panTo(marker.getPosition() as google.maps.LatLng);
          map.setZoom(Math.max(map.getZoom() || 8, 8)); // Zoom in a bit if not already
        });
        newMarkers.push(marker);
      });
      setMarkers(newMarkers);

      // Fit map to markers if there are destinations
      if (newMarkers.length > 0) {
        const bounds = new window.google.maps.LatLngBounds();
        popularDestinations.forEach(dest => {
          bounds.extend(new window.google.maps.LatLng(dest.lat, dest.lng));
        });
        map.fitBounds(bounds);
        // Adjust zoom after fitBounds if it's too zoomed in for a single marker
        if (newMarkers.length === 1) {
            map.setZoom(6);
        } else if (newMarkers.length > 1) {
             const currentZoom = map.getZoom() || 2;
             if (currentZoom > 5) map.setZoom(currentZoom -1); // Prevent over-zooming
        }

      }
    }
     // Cleanup markers when component unmounts or map changes
    return () => {
        markers.forEach(marker => marker.setMap(null));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, popularDestinations]); // Re-run if map or popularDestinations changes


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
              <Card key={dest.name} className={cn(glassCardClasses, "overflow-hidden transform hover:scale-[1.03] transition-transform duration-300 ease-out shadow-lg hover:shadow-primary/30 cursor-pointer")}
                onClick={() => {
                  setSelectedDestination(dest);
                  setIsDialogOpen(true);
                  if(map) {
                    map.panTo({lat: dest.lat, lng: dest.lng});
                    map.setZoom(Math.max(map.getZoom() || 8, 8));
                  }
                }}
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
                     {/* Add more details here as needed, e.g., links to plan trip, things to do */}
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
