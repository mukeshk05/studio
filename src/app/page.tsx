
"use client";

import Link from 'next/link';
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { AppLogo } from '@/components/layout/app-logo';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { HomePagePackageCard } from '@/components/landing/HomePagePackageCard';
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  Search, Plane, Hotel, Compass, Briefcase, LogIn, UserPlus, User, LogOut, Sparkles, MapPin, Loader2, AlertTriangle, Info, ListChecks, LocateFixed, ExternalLink, X, Building, Route, ArrowRight, Layers, Languages, ShieldCheck, ShieldAlert, BrainCircuit, MessageSquareHeart
} from 'lucide-react';
import { LandingMapItemDialog } from "@/components/landing/LandingMapItemDialog";
import { TrendingDealDetailsDialog } from "@/components/landing/TrendingDealDetailsDialog"; // New Dialog
import { TrendingFlightDealCard } from "@/components/landing/TrendingFlightDealCard"; // New Card
import { TrendingHotelDealCard } from "@/components/landing/TrendingHotelDealCard";   // New Card
import { getPopularDestinations, generateSmartBundles as generateSmartBundlesAction } from '@/app/actions';
import type { PopularDestinationsOutput, AiDestinationSuggestion, PopularDestinationsInput } from '@/ai/types/popular-destinations-types';
import type { SmartBundleOutput, BundleSuggestion, SmartBundleInput } from '@/ai/types/smart-bundle-types';
import type { AITripPlannerInput } from '@/ai/types/trip-planner-types';
import type { SerpApiFlightOption, SerpApiHotelSuggestion } from '@/ai/types/serpapi-flight-search-types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertTitle as ShadcnAlertTitle, AlertDescription as ShadcnAlertDescription} from '@/components/ui/alert';
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
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';

const glassPaneClasses = "bg-background/60 dark:bg-background/50 backdrop-blur-xl";
const glassCardClasses = "glass-card hover:border-primary/40 bg-card/80 dark:bg-card/50 backdrop-blur-lg";

const exploreCategories = [
  { name: "Flights", icon: <Plane className="w-5 h-5" />, href: "/flights" },
  { name: "Hotels", icon: <Hotel className="w-5 h-5" />, href: "/hotels" },
  { name: "Things to do", icon: <Compass className="w-5 h-5" />, href: "/things-to-do" }, // Corrected href
  { name: "Packages", icon: <Briefcase className="w-5 h-5" />, href: "/explore" }, // Assuming packages might still be under explore or need their own page
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
  onPlanTrip: (data: AITripPlannerInput) => void;
}

function AiDestinationCard({ destination, onSelect, onPlanTrip }: AiDestinationCardProps) {
  const [imageLoadError, setImageLoadError] = useState(false);

  const derivedImageHint = useMemo(() => {
    if (destination.imageUri && destination.imageUri.startsWith('https://placehold.co')) {
      return destination.imagePrompt || destination.name.toLowerCase().split(" ").slice(0, 2).join(" ");
    }
    return undefined;
  }, [destination.imageUri, destination.imagePrompt, destination.name]);

  const handleImageError = useCallback(() => {
    console.warn(`[AiDestinationCard - TravelPage] Image load ERROR for: ${destination.name}, src: ${destination.imageUri}`);
    setImageLoadError(true);
  }, [destination.name, destination.imageUri]);
  
  const currentImageSrc = !imageLoadError && destination.imageUri ? destination.imageUri : null;


  const handlePlanTripClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // Prevent card's onSelect from firing
    const plannerInput: AITripPlannerInput = {
        destination: destination.name + (destination.country ? `, ${destination.country}` : ''),
        travelDates: "Next month for 7 days", // Default sensible travel dates
        budget: parseInt(destination.hotelIdea?.priceRange?.match(/\$(\d+)/)?.[0].replace('$','') || destination.flightIdea?.priceRange?.match(/\$(\d+)/)?.[0].replace('$','') || '2000', 10) * (destination.hotelIdea?.priceRange ? 7 : 1),
    };
    onPlanTrip(plannerInput);
  };


  return (
    <Card
        className={cn(glassCardClasses, "overflow-hidden transform hover:scale-[1.03] transition-transform duration-300 ease-out shadow-lg hover:shadow-primary/30 flex flex-col cursor-pointer")}
        onClick={onSelect}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(); }}
    >
      <div className="relative w-full aspect-[16/10] bg-muted/30 group">
        {currentImageSrc ? (
          <Image
            src={currentImageSrc}
            alt={destination.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            data-ai-hint={derivedImageHint}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            onError={handleImageError}
            priority={false} // Lower priority for these dynamic images
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
            onClick={handlePlanTripClick}
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
    setDialogImageLoadError(false); 
  }, [destination?.imageUri]);

  if (!destination) return null;

  const derivedImageHint = useMemo(() => {
    if (destination.imageUri && destination.imageUri.startsWith('https://placehold.co')) {
      return destination.imagePrompt || destination.name.toLowerCase().split(" ").slice(0,2).join(" ");
    }
    return undefined;
  }, [destination.imageUri, destination.imagePrompt, destination.name]);

  const handleImageError = useCallback(() => {
    console.warn(`[DialogImageDisplay - TravelPage] Image load ERROR for: ${destination.name}, src: ${destination.imageUri}`);
    setDialogImageLoadError(true);
  },[destination.name, destination.imageUri]);

  const currentImageSrc = !imageLoadError && destination.imageUri ? destination.imageUri : null;

  return (
    <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-border/50 shadow-lg bg-muted/30">
      {currentImageSrc ? (
        <Image
          src={currentImageSrc}
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

interface SearchedLocation { name: string; lat: number; lng: number; }

type MapDisplayItem = AiDestinationSuggestion | BundleSuggestion;
type TrendingDealDisplayItem = SerpApiFlightOption | SerpApiHotelSuggestion;

export default function LandingPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const { currentUser, logout, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(true); 
  const [geolocationError, setGeolocationError] = useState<string | null>(null);
  const [searchedLocationDetails, setSearchedLocationDetails] = useState<SearchedLocation | null>(null);
  const [currentSearchedCity, setCurrentSearchedCity] = useState<string | null>(null);

  const [popularDestinations, setPopularDestinations] = useState<AiDestinationSuggestion[]>([]);
  const [isLoadingPopular, setIsLoadingPopular] = useState(false);
  const [popularError, setPopularError] = useState<string | null>(null);
  const [popularContextualNote, setPopularContextualNote] = useState<string | null>(null);

  const [smartBundles, setSmartBundles] = useState<BundleSuggestion[]>([]);
  const [isLoadingSmartBundles, setIsLoadingSmartBundles] = useState(false);
  const [smartBundlesError, setSmartBundlesError] = useState<string | null>(null);
  const [smartBundlesContextualNote, setSmartBundlesContextualNote] = useState<string | null>(null);

  const [trendingFlights, setTrendingFlights] = useState<SerpApiFlightOption[]>([]);
  const [isLoadingTrendingFlights, setIsLoadingTrendingFlights] = useState(false);
  const [trendingFlightsError, setTrendingFlightsError] = useState<string | null>(null);

  const [trendingHotels, setTrendingHotels] = useState<SerpApiHotelSuggestion[]>([]);
  const [isLoadingTrendingHotels, setIsLoadingTrendingHotels] = useState(false);
  const [trendingHotelsError, setTrendingHotelsError] = useState<string | null>(null);

  const [selectedTrendingDeal, setSelectedTrendingDeal] = useState<TrendingDealDisplayItem | null>(null);
  const [selectedTrendingDealType, setSelectedTrendingDealType] = useState<'flight' | 'hotel' | null>(null);
  const [isTrendingDealDialogOpen, setIsTrendingDealDialogOpen] = useState(false);


  const [map, setMap] = useState<google.maps.Map | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const markersRef = useRef<(google.maps.Marker | google.maps.OverlayView)[]>([]);
  const [selectedMapItem, setSelectedMapItem] = useState<MapDisplayItem | null>(null);
  const [isMapDialogOpen, setIsMapDialogOpen] = useState(false);
  const [isMapsApiLoaded, setIsMapsApiLoaded] = useState(false);
  const [mapApiError, setMapApiError] = useState<string | null>(null);
  const [isMapInitializing, setIsMapInitializing] = useState(true); 

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const initGoogleMapsApiLandingPage = useCallback(() => {
    console.log("[LandingPage] Google Maps API script loaded callback executed.");
    setIsMapsApiLoaded(true);
  }, []);

  useEffect(() => {
    if (!apiKey) {
      console.error("[LandingPage] Google Maps API key is missing.");
      setMapApiError("Google Maps API key is missing. Map functionality is disabled.");
      setIsMapInitializing(false); setIsFetchingLocation(false);
      return;
    }
    if (typeof window !== 'undefined' && window.google && window.google.maps && window.google.maps.places) {
      if (!isMapsApiLoaded) setIsMapsApiLoaded(true); return;
    }
    const scriptId = 'google-maps-landing-page-script';
    if (document.getElementById(scriptId)) {
      if (typeof window !== 'undefined' && window.google && window.google.maps && window.google.maps.places && !isMapsApiLoaded) setIsMapsApiLoaded(true);
      return;
    }
    console.log("[LandingPage] Attempting to load Google Maps API script...");
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMapsApiLandingPage&libraries=marker,places`;
    script.async = true; script.defer = true;
    script.onerror = () => {
      console.error("[LandingPage] Failed to load Google Maps API script.");
      setMapApiError("Failed to load Google Maps. Please check API key and network.");
      setIsMapsApiLoaded(false); setIsMapInitializing(false); setIsFetchingLocation(false);
    };
    (window as any).initGoogleMapsApiLandingPage = initGoogleMapsApiLandingPage;
    document.head.appendChild(script);
    return () => { if ((window as any).initGoogleMapsApiLandingPage) delete (window as any).initGoogleMapsApiLandingPage; };
  }, [apiKey, isMapsApiLoaded, initGoogleMapsApiLandingPage]);

  const initializeMap = useCallback((center: google.maps.LatLngLiteral, zoom: number) => {
    if (!mapRef.current || !window.google || !window.google.maps) {
      console.warn("[LandingPage] Map ref not ready or Google Maps not loaded for initializeMap.");
      setIsMapInitializing(false); return;
    }
    try {
      console.log(`[LandingPage] Initializing map at center: ${JSON.stringify(center)} with zoom ${zoom}`);
      const initialMap = new window.google.maps.Map(mapRef.current!, {
        center, zoom, styles: modernMapStyle,
        mapTypeControl: true, mapTypeControlOptions: { style: window.google.maps.MapTypeControlStyle.HORIZONTAL_BAR, position: window.google.maps.ControlPosition.TOP_RIGHT },
        streetViewControl: false, fullscreenControl: true, zoomControl: true,
      });
      setMap(initialMap);
      console.log("[LandingPage] Map initialized successfully.");
    } catch (error) { console.error("[LandingPage] Error initializing map:", error); setMapApiError("Error initializing map."); }
    finally { setIsMapInitializing(false); }
  }, []);
  
  const fetchAllData = useCallback(async (location?: UserLocation, searchedCity?: string) => {
    setIsLoadingPopular(true); setIsLoadingSmartBundles(true); 
    setPopularError(null); setSmartBundlesError(null); 
    setCurrentSearchedCity(searchedCity || null);

    const commonDestInput: PopularDestinationsInput = {};
    if (searchedCity) {
      // Logic for searched city (if needed for popular destinations)
    } else if (location) {
      commonDestInput.userLatitude = location.latitude;
      commonDestInput.userLongitude = location.longitude;
    }
    
    const smartBundleInterest = searchedCity ? `Trips related to ${searchedCity}` : undefined;
    
    await Promise.allSettled([
      getPopularDestinations(commonDestInput).then(result => {
        setPopularDestinations(result.destinations || []);
        setPopularContextualNote(result.contextualNote || null);
      }).catch(err => setPopularError(err.message || "Error")),
      
      currentUser ? generateSmartBundlesAction({ userId: currentUser.uid, travelInterests: smartBundleInterest }).then(result => {
        setSmartBundles(result.suggestions || []);
      }).catch(err => setSmartBundlesError(err.message || "Error")) : Promise.resolve().then(() => setSmartBundlesContextualNote("Log in for personalized trip ideas!")),
    ]);

    setIsLoadingPopular(false); setIsLoadingSmartBundles(false); 
  }, [currentUser]);


  useEffect(() => {
    if (isMapsApiLoaded && mapRef.current && !map && isMapInitializing) { 
      setIsFetchingLocation(true);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const loc = { latitude: position.coords.latitude, longitude: position.coords.longitude };
            setUserLocation(loc);
            initializeMap({ lat: loc.latitude, lng: loc.longitude }, 5);
            fetchAllData(loc);
            setIsFetchingLocation(false);
          },
          (error) => {
            console.warn("[LandingPage] Geolocation error:", error);
            setGeolocationError(`Could not get location. Showing global suggestions.`);
            setUserLocation(null);
            initializeMap({ lat: 20, lng: 0 }, 2);
            fetchAllData();
            setIsFetchingLocation(false);
          }, { timeout: 8000 }
        );
      } else {
        setGeolocationError("Geolocation is not supported. Showing global suggestions.");
        setUserLocation(null);
        initializeMap({ lat: 20, lng: 0 }, 2);
        fetchAllData();
        setIsFetchingLocation(false);
      }
    }
  }, [isMapsApiLoaded, map, isMapInitializing, initializeMap, fetchAllData]);
  
  useEffect(() => {
    if (isMapsApiLoaded && searchInputRef.current && !autocompleteRef.current && window.google?.maps?.places) {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(searchInputRef.current, {
        types: ['(cities)'],
        fields: ['name', 'formatted_address', 'geometry.location']
      });
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        if (place?.geometry?.location) {
          const newLat = place.geometry.location.lat();
          const newLng = place.geometry.location.lng();
          const placeName = place.name || place.formatted_address || "Selected Location";
          setSearchTerm(placeName);
          setSearchedLocationDetails({ name: placeName, lat: newLat, lng: newLng });
          if (map) { map.setCenter({ lat: newLat, lng: newLng }); map.setZoom(9); }
          fetchAllData(undefined, placeName); // Re-fetch all data based on new city
          toast({ title: "Location Updated", description: `Showing suggestions for ${placeName}.`});
        }
      });
    }
  }, [isMapsApiLoaded, map, fetchAllData, toast]);


  const handleMapItemSelect = useCallback((item: MapDisplayItem) => {
    setSelectedMapItem(item);
    setIsMapDialogOpen(true);
    if (map && window.google && window.google.maps) {
      const lat = 'destinationLatitude' in item ? item.destinationLatitude : item.latitude;
      const lng = 'destinationLongitude' in item ? item.destinationLongitude : item.longitude;
      if (lat != null && lng != null) {
        const targetLatLng = new window.google.maps.LatLng(lat, lng);
        map.panTo(targetLatLng);
        const listener = window.google.maps.event.addListenerOnce(map, 'idle', () => {
          map.setZoom(Math.max(map.getZoom() || 0, 10));
        });
        setTimeout(() => { 
          if (map && (map.getZoom() || 0) < 10) map.setZoom(10); 
          if (listener && (window as any).google?.maps?.event) window.google.maps.event.removeListener(listener);
        }, 800);
      }
    }
  }, [map]);

  useEffect(() => {
    if (!map || !isMapsApiLoaded || !(window.google && window.google.maps && window.google.maps.OverlayView)) {
      markersRef.current.forEach(marker => marker.setMap(null)); markersRef.current = []; return;
    }

    class CustomMapMarkerOverlay extends window.google.maps.OverlayView {
        private latlng: google.maps.LatLng; private div: HTMLDivElement | null = null; private itemData: MapDisplayItem;
        private clickHandler: () => void; private mapInstanceRef: google.maps.Map;
        constructor(props: { latlng: google.maps.LatLngLiteral; map: google.maps.Map; item: MapDisplayItem; onClick: () => void; }) {
            super(); this.latlng = new window.google.maps.LatLng(props.latlng.lat, props.latlng.lng);
            this.itemData = props.item; this.clickHandler = props.onClick; this.mapInstanceRef = props.map; this.setMap(props.map);
        }
        onAdd() {
            this.div = document.createElement('div'); this.div.className = 'custom-map-marker';
            this.div.title = 'bundleName' in this.itemData ? this.itemData.bundleName : this.itemData.name;
            const pulse = document.createElement('div'); pulse.className = 'custom-map-marker-pulse'; this.div.appendChild(pulse);
            this.div.addEventListener('click', this.clickHandler);
            const panes = this.getPanes();
            if (panes?.overlayMouseTarget) panes.overlayMouseTarget.appendChild(this.div); else this.mapInstanceRef.getDiv().appendChild(this.div);
        }
        draw() { const proj = this.getProjection(); if (!proj || !this.div) return; const p = proj.fromLatLngToDivPixel(this.latlng); if (p) { this.div.style.left = p.x + 'px'; this.div.style.top = p.y + 'px'; } }
        onRemove() { if (this.div) { this.div.removeEventListener('click', this.clickHandler); this.div.parentNode?.removeChild(this.div); this.div = null; } }
        getPosition() { return this.latlng; }
    }

    markersRef.current.forEach(marker => marker.setMap(null)); markersRef.current = [];
    
    const combinedItems: MapDisplayItem[] = [
        ...popularDestinations.filter(d => typeof d.latitude === 'number' && typeof d.longitude === 'number'),
        ...smartBundles.filter(b => typeof b.destinationLatitude === 'number' && typeof b.destinationLongitude === 'number')
    ];

    console.log(`[LandingPage Map] Updating markers. Total combined items with coords: ${combinedItems.length}`);

    const newMarkers: (google.maps.OverlayView)[] = [];
    combinedItems.forEach(item => {
      const lat = 'destinationLatitude' in item ? item.destinationLatitude : item.latitude;
      const lng = 'destinationLongitude' in item ? item.destinationLongitude : item.longitude;
      if (lat != null && lng != null) {
          newMarkers.push(new CustomMapMarkerOverlay({
              latlng: { lat, lng }, map: map, item: item, onClick: () => handleMapItemSelect(item)
          }));
      }
    });
    markersRef.current = newMarkers;

    if (newMarkers.length > 0 && window.google && window.google.maps) {
      const bounds = new window.google.maps.LatLngBounds();
      newMarkers.forEach(marker => { if (marker.getPosition) bounds.extend(marker.getPosition()!); });
      if (!bounds.isEmpty() && !searchedLocationDetails) { 
        map.fitBounds(bounds, 100); 
        const listenerId = window.google.maps.event.addListenerOnce(map, 'idle', () => {
            let currentZoom = map.getZoom() || 0;
            if (newMarkers.length === 1 && currentZoom > 10) map.setZoom(10);
            else if (currentZoom > 15) map.setZoom(15);
        });
      }
    } else if (userLocation && newMarkers.length === 0 && !searchedLocationDetails) {
        map.panTo({ lat: userLocation.latitude, lng: userLocation.longitude });
        map.setZoom(5);
    } else if (searchedLocationDetails) {
        map.setCenter({lat: searchedLocationDetails.lat, lng: searchedLocationDetails.lng});
        map.setZoom(9);
    }
  }, [map, isMapsApiLoaded, popularDestinations, smartBundles, handleMapItemSelect, userLocation, searchedLocationDetails]);
  
  const handlePlanTrip = (tripIdea: AITripPlannerInput) => {
    localStorage.setItem('tripBundleToPlan', JSON.stringify(tripIdea));
    window.dispatchEvent(new CustomEvent('localStorageUpdated_tripBundleToPlan')); 
    router.push('/planner');
  };

  const handleViewTrendingDealDetails = (deal: TrendingDealDisplayItem, type: 'flight' | 'hotel') => {
    setSelectedTrendingDeal(deal);
    setSelectedTrendingDealType(type);
    setIsTrendingDealDialogOpen(true);
  };
  
  const prominentButtonClasses = "text-lg py-3 group transform transition-all duration-300 ease-out shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:from-accent hover:to-primary focus-visible:ring-4 focus-visible:ring-primary/40";

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
            Let Aura AI guide your journey! Discover, plan, and book your next adventure with AI-powered insights and real-time data.
          </p>
          <div className={cn("max-w-xl mx-auto p-2 rounded-xl shadow-xl", glassCardClasses, "border-primary/20")}>
            <form onSubmit={(e) => { e.preventDefault(); if (searchInputRef.current) searchInputRef.current.blur(); }} className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
              <Input
                ref={searchInputRef}
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search for a destination (e.g., 'Paris', 'beaches in Thailand')"
                className="w-full pl-11 pr-4 py-2.5 h-12 text-base bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50 rounded-full shadow-inner focus:ring-2 focus:ring-primary/50"
              />
            </form>
          </div>
        </section>

        <section className="mb-12 animate-fade-in-up" style={{animationDelay: '0.1s'}}>
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

        <section className="mb-12 animate-fade-in-up" style={{animationDelay: '0.15s'}}>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-6 flex items-center">
                <Sparkles className="w-7 h-7 mr-2 text-amber-400 animate-pulse" /> Trending Now: Real-Time Deals {currentSearchedCity ? `for ${currentSearchedCity}` : (userLocation ? 'Near You' : '')}
            </h2>
            <div className={cn("p-4 rounded-lg", glassCardClasses, "border-amber-500/30")}>
                <div className="mb-6">
                    <h3 className="text-xl font-medium text-amber-500 mb-3 flex items-center"><Plane className="w-5 h-5 mr-2"/>Hot Flight Deals</h3>
                    {isLoadingTrendingFlights && <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[1,2].map(i => <Skeleton key={`tf-${i}`} className="h-72 rounded-lg bg-muted/40"/>)}</div>}
                    {trendingFlightsError && <Alert variant="destructive"><AlertTriangle className="h-4 w-4"/><ShadcnAlertTitle>Error</ShadcnAlertTitle><ShadcnAlertDescription>{trendingFlightsError}</ShadcnAlertDescription></Alert>}
                    {!isLoadingTrendingFlights && trendingFlights.length === 0 && !trendingFlightsError && <p className="text-sm text-muted-foreground">No trending flight deals available right now. Check back soon!</p>}
                    {!isLoadingTrendingFlights && trendingFlights.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {trendingFlights.map((deal, index) => (
                                <TrendingFlightDealCard key={`trending-flight-${index}`} deal={deal} onViewDetails={() => handleViewTrendingDealDetails(deal, 'flight')} travelDatesQuery="Next Month (7 days)" />
                            ))}
                        </div>
                    )}
                </div>
                <Separator className="my-6 border-amber-500/20"/>
                <div>
                    <h3 className="text-xl font-medium text-amber-500 mb-3 flex items-center"><Hotel className="w-5 h-5 mr-2"/>Top Hotel Offers</h3>
                    {isLoadingTrendingHotels && <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[1,2].map(i => <Skeleton key={`th-${i}`} className="h-72 rounded-lg bg-muted/40"/>)}</div>}
                    {trendingHotelsError && <Alert variant="destructive"><AlertTriangle className="h-4 w-4"/><ShadcnAlertTitle>Error</ShadcnAlertTitle><ShadcnAlertDescription>{trendingHotelsError}</ShadcnAlertDescription></Alert>}
                    {!isLoadingTrendingHotels && trendingHotels.length === 0 && !trendingHotelsError && <p className="text-sm text-muted-foreground">No trending hotel offers available right now. Check back soon!</p>}
                    {!isLoadingTrendingHotels && trendingHotels.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {trendingHotels.map((deal, index) => (
                                <TrendingHotelDealCard key={`trending-hotel-${index}`} deal={deal} onViewDetails={() => handleViewTrendingDealDetails(deal, 'hotel')} destinationQuery={currentSearchedCity || undefined} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </section>
        
        <Separator className="my-10 border-border/30" />
        
        <section className="mb-12 animate-fade-in-up" style={{animationDelay: '0.3s'}}>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-6 flex items-center">
            <LocateFixed className="w-7 h-7 mr-2 text-primary"/> Explore on the Map
          </h2>
          <Card className={cn(glassCardClasses, "h-[550px] p-2 border-primary/20")}>
             {mapApiError && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-destructive/10 text-destructive-foreground p-4 rounded-md">
                    <AlertTriangle className="w-12 h-12 mb-3"/> <p className="font-semibold text-lg">Map Error</p> <p className="text-sm text-center">{mapApiError}</p>
                </div>
            )}
            {(!mapApiError && (isMapInitializing || (isFetchingLocation && !map) )) && (
                 <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                    <Loader2 className="w-10 h-10 animate-spin mb-3 text-primary"/> <p className="text-sm">{isFetchingLocation ? "Getting your location..." : "Initializing Map..."}</p>
                </div>
            )}
            <div ref={mapRef} className={cn("w-full h-full rounded-md", (mapApiError || isMapInitializing || (isFetchingLocation && !map)) ? "hidden" : "")} />
          </Card>
           {geolocationError && <p className="text-xs text-center text-amber-500 mt-1"><Info className="inline w-3 h-3 mr-1"/>{geolocationError}</p>}
        </section>


        <Separator className="my-10 border-border/30" />

        <section className="mb-12 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground flex items-center">
              <MapPin className="w-7 h-7 mr-2 text-primary" /> 
              {searchedLocationDetails ? `Popular Destinations for ${searchedLocationDetails.name}` : popularContextualNote?.toLowerCase().includes("nearby") ? "Popular Destinations Near You" : "Popular Global Destinations"}
            </h2>
             <Button 
                onClick={() => fetchAllData(userLocation || undefined)} 
                disabled={isLoadingPopular || isFetchingLocation} 
                variant="outline" className="glass-interactive">
              {(isLoadingPopular || isFetchingLocation ) ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2" />}
              {(isLoadingPopular || isFetchingLocation ) ? "Updating..." : userLocation ? "Refresh Nearby" : "Refresh Global"}
            </Button>
          </div>
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
                <HomePagePackageCard 
                  key={dest.name + (dest.country || '')} 
                  item={dest} 
                  onPlanTrip={handlePlanTrip} 
                  onSelect={() => handleMapItemSelect(dest)}
                />
              ))}
            </div>
          )}
        </section>

        {currentUser && (
          <>
            <Separator className="my-10 border-border/30" />
            <section className="mb-12 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
              <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
                <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground flex items-center">
                  <Sparkles className="w-7 h-7 mr-2 text-accent" /> 
                  {searchedLocationDetails ? `Smart Trip Ideas For ${searchedLocationDetails.name}` : "Smart Trip Ideas For You"}
                </h2>
                 <Button 
                    onClick={() => fetchAllData(userLocation || undefined, searchedLocationDetails?.name)} 
                    disabled={isLoadingSmartBundles} variant="outline" className="glass-interactive">
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
                    <HomePagePackageCard 
                      key={bundle.bundleName} 
                      item={bundle} 
                      onPlanTrip={handlePlanTrip} 
                      onSelect={() => handleMapItemSelect(bundle)}
                    />
                  ))}
                </div>
              )}
              {!isLoadingSmartBundles && smartBundles.length === 0 && smartBundlesContextualNote && !smartBundlesError && (
                <Card className={cn(glassCardClasses, "p-6 text-center text-muted-foreground")}>
                  <p>{smartBundlesContextualNote}</p>
                  {!currentUser && <p className="mt-2">Log in to get personalized trip ideas based on your preferences!</p>}
                </Card>
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
      
      <LandingMapItemDialog
        isOpen={isMapDialogOpen}
        onClose={() => setIsMapDialogOpen(false)}
        item={selectedMapItem}
        onPlanTrip={handlePlanTrip}
      />
      <TrendingDealDetailsDialog
        isOpen={isTrendingDealDialogOpen}
        onClose={() => setIsTrendingDealDialogOpen(false)}
        deal={selectedTrendingDeal}
        dealType={selectedTrendingDealType}
      />
    </div>
  );
}
