
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, useFormField } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Hotel,
  CalendarDays as CalendarLucideIcon,
  Users,
  Search,
  Sparkles,
  DollarSign,
  Star,
  BedDouble,
  Wifi,
  ParkingCircle,
  Utensils,
  Loader2,
  ImageOff,
  AlertTriangle,
  Info,
  ExternalLink,
  X,
  MapPin,
  CheckSquare,
  LocateFixed,
  Map as LucideMap,
  RefreshCw,
  Eye
} from 'lucide-react';
import { format, addDays, isValid } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { useToast } from '@/hooks/use-toast';
import { getAiHotelSuggestionsAction } from '@/app/actions';
import type { AiHotelSearchInput, AiHotelSearchOutput, AiHotelSuggestion } from '@/ai/types/ai-hotel-search-types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const glassCardClasses = "glass-card bg-card/80 dark:bg-card/50 backdrop-blur-lg border-border/20";
const innerGlassEffectClasses = "bg-card/80 dark:bg-card/50 backdrop-blur-md border border-white/10 dark:border-[hsl(var(--primary)/0.1)] rounded-md";
const prominentButtonClasses = "text-lg py-3 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:from-accent hover:to-primary focus-visible:ring-4 focus-visible:ring-primary/40 transform transition-all duration-300 ease-out hover:scale-[1.02] active:scale-100";

const hotelSearchFormSchema = z.object({
  destination: z.string().min(3, "Destination must be at least 3 characters."),
  dates: z.object({
    from: z.date().optional(),
    to: z.date().optional(),
  }).refine(data => data.from && data.to && data.to >= data.from, {
    message: "End date must be after start date.",
    path: ["to"],
  }).refine(data => data.from && data.to, {
    message: "Both check-in and check-out dates are required.",
    path: ["from"],
  }),
  guests: z.string().min(1, "Please specify number of guests."),
});

type HotelSearchFormValues = z.infer<typeof hotelSearchFormSchema>;

interface UserLocation { latitude: number; longitude: number; }

interface AiHotelCardProps {
  hotel: AiHotelSuggestion;
  onClick: () => void;
}

function AiHotelCard({ hotel, onClick }: AiHotelCardProps) {
  const [imageLoadError, setImageLoadError] = useState(false);
  
  const imageHint = hotel.imageUri?.startsWith('https://placehold.co')
    ? (hotel.imagePrompt || hotel.name.toLowerCase().split(" ").slice(0, 2).join(" "))
    : undefined;

  const handleImageError = useCallback(() => {
    console.warn(`[AiHotelCard] Image load ERROR for: ${hotel.name}, src: ${hotel.imageUri}`);
    setImageLoadError(true);
  }, [hotel.name, hotel.imageUri]);

  const canDisplayImage = !imageLoadError && hotel.imageUri;

  return (
    <Card 
        className={cn(glassCardClasses, "overflow-hidden transform hover:scale-[1.02] transition-transform duration-300 ease-out shadow-lg hover:shadow-primary/30 flex flex-col cursor-pointer")}
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
    >
      <div className="relative w-full aspect-video bg-muted/30 group">
        {canDisplayImage ? (
          <Image
            src={hotel.imageUri!}
            alt={hotel.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            data-ai-hint={imageHint}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            onError={handleImageError}
          />
        ) : (
          <div className="w-full h-full bg-muted/30 flex items-center justify-center">
            <ImageOff className="w-10 h-10 text-muted-foreground" />
          </div>
        )}
      </div>
      <CardHeader className="p-3 pb-1">
        <CardTitle className="text-md font-semibold text-card-foreground line-clamp-2">{hotel.name}</CardTitle>
        {hotel.rating !== undefined && hotel.rating !== null && (
          <div className="flex items-center text-xs text-amber-400 mt-0.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className={cn("w-3 h-3", i < Math.round(hotel.rating!) ? "fill-amber-400" : "fill-muted-foreground/50")} />
            ))}
            <span className="ml-1 text-muted-foreground">({hotel.rating.toFixed(1)})</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-3 pt-1 text-xs text-muted-foreground flex-grow space-y-1.5">
        <p className="font-medium text-primary">{hotel.conceptualPriceRange}</p>
        <p className="line-clamp-3 text-xs">{hotel.description}</p>
        {hotel.amenities && hotel.amenities.length > 0 && (
          <div className="pt-1">
            <h4 className="text-xs font-semibold text-card-foreground mb-0.5">Key Amenities:</h4>
            <div className="flex flex-wrap gap-1">
              {hotel.amenities.slice(0, 3).map(amenity => ( 
                <Badge key={amenity} variant="secondary" className="text-[0.65rem] px-1.5 py-0.5 bg-primary/10 text-primary border-primary/20">
                  {amenity}
                </Badge>
              ))}
              {hotel.amenities.length > 3 && <Badge variant="secondary" className="text-[0.65rem] px-1.5 py-0.5 bg-primary/10 text-primary border-primary/20">+{hotel.amenities.length - 3} more</Badge>}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="p-3 pt-2">
        <Button
          size="sm"
          variant="outline"
          className={cn("w-full text-sm py-2 glass-interactive text-primary hover:bg-primary/10")}
        >
          <Eye className="mr-2 h-4 w-4" /> View Details
        </Button>
      </CardFooter>
    </Card>
  );
}

interface HotelDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  hotel: AiHotelSuggestion | null;
  searchDestination: string; 
}

function HotelDetailDialog({ isOpen, onClose, hotel: hotelProp, searchDestination }: HotelDetailDialogProps) {
  const [hotel, setHotel] = useState(hotelProp); // Local state to manage hotel prop
  const [imageLoadError, setImageLoadError] = useState(false);

  useEffect(() => {
    setHotel(hotelProp); // Update local state when prop changes
    if (isOpen && hotelProp) {
        setImageLoadError(false); 
    }
  }, [isOpen, hotelProp]);

  const handleImageError = useCallback(() => {
    if (hotel) { // Use local state hotel
      console.warn(`[HotelDetailDialog] Image load ERROR for: ${hotel.name}, src: ${hotel.imageUri}`);
      setImageLoadError(true);
    }
  }, [hotel]); 

  if (!hotel) { // Use local state hotel for conditional rendering
    return null; 
  }

  const imageHint = hotel.imageUri?.startsWith('https://placehold.co')
    ? (hotel.imagePrompt || hotel.name.toLowerCase().split(" ").slice(0, 2).join(" "))
    : undefined;

  const canDisplayImage = !imageLoadError && hotel.imageUri;

  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  // Prioritize lat/lng from hotel object for map query if available
  const mapQuery = hotel.latitude && hotel.longitude 
    ? `${hotel.latitude},${hotel.longitude}` 
    : encodeURIComponent(`${hotel.name}, ${searchDestination}`);
  
  const mapEmbedUrl = mapsApiKey
    ? `https://www.google.com/maps/embed/v1/place?key=${mapsApiKey}&q=${mapQuery}`
    : "";
  
  const googleSearchUrl = `https://www.google.com/search?q=hotel+${encodeURIComponent(hotel.name)}+in+${encodeURIComponent(searchDestination)}`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className={cn(glassCardClasses, "sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col p-0 border-primary/30")}>
        <DialogHeader className="p-4 sm:p-6 border-b border-border/30 sticky top-0 z-10 bg-card/80 dark:bg-card/50 backdrop-blur-sm">
          <div className="flex justify-between items-start">
            <div className="flex-grow min-w-0">
              <DialogTitle className="text-xl font-semibold text-foreground truncate flex items-center" title={hotel.name}>
                <Hotel className="w-6 h-6 mr-2 inline-block text-primary" />
                {hotel.name}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                in {searchDestination} (Conceptual AI Suggestion)
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-accent/20 hover:text-accent-foreground shrink-0">
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        {canDisplayImage ? (
          <div className="relative aspect-[16/7] w-full max-h-60 sm:max-h-72 border-b border-border/30">
            <Image
              src={hotel.imageUri!}
              alt={`Image of ${hotel.name}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 1000px"
              priority
              data-ai-hint={imageHint}
              onError={handleImageError}
            />
          </div>
        ) : (
            <div className={cn("h-40 bg-muted/30 flex items-center justify-center text-muted-foreground border-b border-border/30", innerGlassEffectClasses, "rounded-none")}>
                <ImageOff className="w-12 h-12"/>
            </div>
        )}

        <div className="flex-grow overflow-y-auto p-4 sm:p-6">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className={cn("grid w-full grid-cols-2 sm:grid-cols-3 mb-4 glass-pane p-1", "border border-border/50")}>
              <TabsTrigger value="details" className="flex items-center gap-2 data-[state=active]:bg-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                <Info className="w-4 h-4" /> Details
              </TabsTrigger>
              <TabsTrigger value="amenities" className="flex items-center gap-2 data-[state=active]:bg-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-md" disabled={!hotel.amenities || hotel.amenities.length === 0}>
                <CheckSquare className="w-4 h-4" /> Amenities
              </TabsTrigger>
              <TabsTrigger value="map" className="flex items-center gap-2 data-[state=active]:bg-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                <MapPin className="w-4 h-4" /> Map
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className={cn(glassCardClasses, "p-4 rounded-md")}>
              <h3 className="text-lg font-semibold text-card-foreground mb-2">About {hotel.name}</h3>
              <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{hotel.description}</p>
              <div className="flex items-center text-lg font-semibold text-primary mb-2">
                <DollarSign className="w-5 h-5 mr-1.5" />
                Price: {hotel.conceptualPriceRange}
              </div>
               {hotel.rating !== undefined && hotel.rating !== null && (
                 <div className="mt-3 flex items-center text-md font-medium text-amber-400">
                    <Star className="w-5 h-5 mr-1.5 fill-amber-400 text-amber-400" />
                    Rating: {hotel.rating.toFixed(1)} / 5.0
                 </div>
                )}
            </TabsContent>

            <TabsContent value="amenities" className={cn(glassCardClasses, "p-4 rounded-md")}>
                <h3 className="text-lg font-semibold text-card-foreground mb-3">Key Amenities</h3>
                {hotel.amenities && hotel.amenities.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {hotel.amenities.map((amenity, idx) => (
                        <Badge key={idx} variant="outline" className="text-sm py-1 px-2 border-primary/40 text-primary/90 bg-primary/5 flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-accent" />
                            {amenity}
                        </Badge>
                    ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">Amenity information not available.</p>
                )}
            </TabsContent>

            <TabsContent value="map" className={cn(glassCardClasses, "p-4 rounded-md")}>
              <h3 className="text-lg font-semibold text-card-foreground mb-3">Location of {hotel.name}</h3>
              {mapsApiKey ? (
                <div className="aspect-video w-full rounded-lg overflow-hidden border border-border/50 shadow-lg">
                  <iframe
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    src={mapEmbedUrl}
                    title={`Map of ${hotel.name} in ${searchDestination}`}
                  ></iframe>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground bg-muted/30 dark:bg-muted/10 p-4 rounded-md">
                  <p>Google Maps API Key is missing.</p>
                  <p className="text-xs">Please configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable map features.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
        <DialogFooter className={cn("p-4 sm:p-6 border-t border-border/30", "glass-pane")}>
            <Button asChild size="lg" className={cn(prominentButtonClasses, "w-full")}>
                <a href={googleSearchUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2"/> Search Hotel on Google
                </a>
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


export default function HotelsPage() {
  const { toast } = useToast();
  const form = useForm<HotelSearchFormValues>({
    resolver: zodResolver(hotelSearchFormSchema),
    // Default values will be set in useEffect to avoid hydration issues
  });

  // Form default values set in useEffect
  useEffect(() => {
    form.reset({
      destination: '',
      dates: { from: new Date(), to: addDays(new Date(), 3) },
      guests: '2 adults',
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount


  const [isLoadingAiHotels, setIsLoadingAiHotels] = useState(false);
  const [aiHotelSuggestions, setAiHotelSuggestions] = useState<AiHotelSuggestion[]>([]);
  const [aiHotelSearchError, setAiHotelSearchError] = useState<string | null>(null);
  const [aiSearchSummary, setAiSearchSummary] = useState<string | null>(null);

  const [selectedHotelForDetails, setSelectedHotelForDetails] = useState<AiHotelSuggestion | null>(null);
  const [isHotelDetailDialogOpen, setIsHotelDetailDialogOpen] = useState(false);
  
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [geolocationError, setGeolocationError] = useState<string | null>(null);
  const [currentSearchContext, setCurrentSearchContext] = useState<string>("No search yet.");
  const [lastFormSearchDestination, setLastFormSearchDestination] = useState<string>("");


  const [map, setMap] = useState<google.maps.Map | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapMarkersRef = useRef<google.maps.Marker[]>([]);
  const [isMapsScriptLoaded, setIsMapsScriptLoaded] = useState(false);
  const [mapsApiError, setMapsApiError] = useState<string | null>(null);
  const [isMapInitializing, setIsMapInitializing] = useState(true);
  
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const initGoogleMapsApiHotelsPage = useCallback(() => {
    console.log("[HotelsPage] Google Maps API script loaded callback executed.");
    setIsMapsScriptLoaded(true);
  }, []);

  useEffect(() => {
    if (!apiKey) {
      console.error("[HotelsPage] Google Maps API key is missing.");
      setMapsApiError("Google Maps API key is missing. Map functionality is disabled.");
      setIsMapInitializing(false);
      return;
    }
    if (typeof window !== 'undefined' && window.google && window.google.maps) {
      if(!isMapsScriptLoaded) setIsMapsScriptLoaded(true);
      return;
    }
    const scriptId = 'google-maps-hotels-page-script';
    if (document.getElementById(scriptId)) {
       if (typeof window !== 'undefined' && window.google && window.google.maps && !isMapsScriptLoaded) setIsMapsScriptLoaded(true);
      return;
    }
    console.log("[HotelsPage] Attempting to load Google Maps API script...");
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMapsApiHotelsPage&libraries=marker,places`;
    script.async = true; script.defer = true;
    script.onerror = () => {
      console.error("[HotelsPage] Failed to load Google Maps API script.");
      setMapsApiError("Failed to load Google Maps. Please check API key and network.");
      setIsMapsScriptLoaded(false); setIsMapInitializing(false);
    };
    (window as any).initGoogleMapsApiHotelsPage = initGoogleMapsApiHotelsPage;
    document.head.appendChild(script);
    return () => { if ((window as any).initGoogleMapsApiHotelsPage) delete (window as any).initGoogleMapsApiHotelsPage; };
  }, [apiKey, isMapsScriptLoaded, initGoogleMapsApiHotelsPage]);

  const initializeMap = useCallback((center: google.maps.LatLngLiteral, zoom: number) => {
    if (!mapRef.current || !window.google || !window.google.maps) {
      console.warn("[HotelsPage] Map ref not ready or Google Maps not loaded for initializeMap.");
      setIsMapInitializing(false); return;
    }
    try {
      console.log(`[HotelsPage] Initializing map at center: ${JSON.stringify(center)} with zoom ${zoom}`);
      const newMap = new window.google.maps.Map(mapRef.current!, {
        center, zoom, styles: [{featureType:"all",elementType:"geometry",stylers:[{color:"#202c3e"}]},{featureType:"all",elementType:"labels.text.fill",stylers:[{gamma:0.01,lightness:20,weight:"1.39",color:"#ffffff"}]},{featureType:"all",elementType:"labels.text.stroke",stylers:[{weight:"0.96",saturation:9,gamma:0.01,lightness:16,color:"#1e232a"}]},{featureType:"all",elementType:"labels.icon",stylers:[{visibility:"off"}]},{featureType:"landscape",elementType:"geometry",stylers:[{lightness:30,saturation:"9%",gamma:"1",color:"#29323e"}]},{featureType:"poi",elementType:"geometry",stylers:[{saturation:20}]},{featureType:"poi.park",elementType:"geometry",stylers:[{lightness:20,saturation:-20}]},{featureType:"road",elementType:"geometry",stylers:[{lightness:10,saturation:-30}]},{featureType:"road",elementType:"geometry.stroke",stylers:[{saturation:-20,lightness:25}]},{featureType:"water",elementType:"all",stylers:[{lightness:-20}]}],
        mapTypeControl: true, mapTypeControlOptions: { style: window.google.maps.MapTypeControlStyle.HORIZONTAL_BAR, position: window.google.maps.ControlPosition.TOP_RIGHT },
        streetViewControl: false, fullscreenControl: true, zoomControl: true,
      });
      setMap(newMap);
      console.log("[HotelsPage] Map initialized successfully.");
    } catch (error) { console.error("[HotelsPage] Error initializing map:", error); setMapsApiError("Error initializing map."); }
    finally { setIsMapInitializing(false); }
  }, []);
  
  const handleOpenHotelDetails = useCallback((hotel: AiHotelSuggestion) => {
    console.log("[HotelsPage] Opening details for hotel:", hotel.name, "Coords:", hotel.latitude, hotel.longitude);
    setSelectedHotelForDetails(hotel);
    setIsHotelDetailDialogOpen(true);
    if (map && hotel.latitude != null && hotel.longitude != null && typeof hotel.latitude === 'number' && typeof hotel.longitude === 'number') {
      map.panTo({ lat: hotel.latitude, lng: hotel.longitude });
      map.setZoom(15);
    } else if (map) {
      console.warn("[HotelsPage] Hotel coordinates missing or invalid for map pan/zoom. Hotel:", hotel.name);
      // Optionally, try to geocode based on hotel name + destination if coords are missing.
      // For now, just log it.
    }
  }, [map]);


  const plotHotelMarkers = useCallback((hotelsToPlot: AiHotelSuggestion[]) => {
    if (!map || !window.google || !window.google.maps) {
      console.warn("[HotelsPage] Map not ready for plotting markers. Hotels to plot:", hotelsToPlot.length);
      return;
    }
    console.log(`[HotelsPage] Plotting ${hotelsToPlot.length} hotel markers.`);

    mapMarkersRef.current.forEach(marker => marker.setMap(null));
    mapMarkersRef.current = [];

    if (hotelsToPlot.length === 0) {
        console.log("[HotelsPage] No hotels to plot. If user location known, centering there.");
        if (userLocation) map.panTo({ lat: userLocation.latitude, lng: userLocation.longitude});
        return;
    }

    const bounds = new window.google.maps.LatLngBounds();
    let validMarkersPlotted = 0;
    hotelsToPlot.forEach(hotel => {
      if (hotel.latitude != null && hotel.longitude != null && typeof hotel.latitude === 'number' && typeof hotel.longitude === 'number') {
        console.log(`[HotelsPage] Creating marker for ${hotel.name} at ${hotel.latitude}, ${hotel.longitude}`);
        const position = { lat: hotel.latitude, lng: hotel.longitude };
        const marker = new window.google.maps.Marker({
          position,
          map,
          title: hotel.name,
          // icon: // Add custom icon here if desired
        });
        marker.set('hotelData', hotel); // Store hotel data with marker
        marker.addListener('click', () => handleOpenHotelDetails(hotel));
        mapMarkersRef.current.push(marker);
        bounds.extend(position);
        validMarkersPlotted++;
      } else {
        console.warn(`[HotelsPage] Hotel "${hotel.name}" missing valid coordinates. Lat: ${hotel.latitude}, Lng: ${hotel.longitude}. Skipping marker.`);
      }
    });

    console.log(`[HotelsPage] Plotted ${validMarkersPlotted} valid markers.`);
    if (validMarkersPlotted > 0 && !bounds.isEmpty()) {
      map.fitBounds(bounds, 100); // 100px padding
      if (validMarkersPlotted === 1 && map.getZoom() && map.getZoom()! > 15) map.setZoom(15);
    } else if (userLocation) {
      console.log("[HotelsPage] No valid markers plotted, but user location known. Centering map on user location.");
      map.setCenter({ lat: userLocation.latitude, lng: userLocation.longitude });
      map.setZoom(12);
    } else {
      console.log("[HotelsPage] No valid markers and no user location. Map center unchanged or default.");
    }
  }, [map, userLocation, handleOpenHotelDetails]); 

  const fetchAndDisplayHotels = useCallback(async (params: { location?: UserLocation; searchCriteria?: HotelSearchFormValues; context: string }) => {
    setIsLoadingAiHotels(true);
    setAiHotelSearchError(null);
    setAiHotelSuggestions([]);
    setCurrentSearchContext(params.context);
    console.log(`[HotelsPage] Fetching hotels for context: ${params.context}. Location:`, params.location, "Criteria:", params.searchCriteria);


    let searchInput: AiHotelSearchInput;
    let effectiveDestinationName = "Selected Area"; // Default for dialog if needed

    if (params.location) {
      searchInput = {
        destination: `Hotels near latitude ${params.location.latitude.toFixed(4)}, longitude ${params.location.longitude.toFixed(4)}`,
        checkInDate: format(addDays(new Date(), 7), "yyyy-MM-dd"),
        checkOutDate: format(addDays(new Date(), 10), "yyyy-MM-dd"),
        guests: "2 adults",
      };
      setAiSearchSummary(`Showing conceptual hotel ideas near your current location...`);
      effectiveDestinationName = "your current vicinity";
    } else if (params.searchCriteria) {
      searchInput = {
        destination: params.searchCriteria.destination,
        checkInDate: format(params.searchCriteria.dates.from!, "yyyy-MM-dd"),
        checkOutDate: format(params.searchCriteria.dates.to!, "yyyy-MM-dd"),
        guests: params.searchCriteria.guests,
      };
      setAiSearchSummary(`Showing conceptual hotel ideas for ${params.searchCriteria.destination}...`);
      effectiveDestinationName = params.searchCriteria.destination;
    } else { // Initial popular / fallback
      searchInput = {
        destination: "Popular tourist destinations globally",
        checkInDate: format(addDays(new Date(), 30), "yyyy-MM-dd"),
        checkOutDate: format(addDays(new Date(), 37), "yyyy-MM-dd"),
        guests: "2 adults",
      };
      setAiSearchSummary("Showing general popular hotel ideas...");
      effectiveDestinationName = "Popular Destinations";
    }
    setLastFormSearchDestination(effectiveDestinationName);
    
    console.log("[HotelsPage] Calling AI Hotel Search with input:", JSON.stringify(searchInput, null, 2));

    try {
      const result = await getAiHotelSuggestionsAction(searchInput);
      console.log("[HotelsPage] AI Hotel Search result raw:", JSON.stringify(result, null, 2));
      const validHotels = (result.hotels || []).filter(h => h.name && h.conceptualPriceRange && h.description && h.amenities);
      console.log(`[HotelsPage] Filtered to ${validHotels.length} valid hotels with essential text data.`);
      setAiHotelSuggestions(validHotels);
      setAiSearchSummary(result.searchSummary || (validHotels.length === 0 ? "No specific conceptual hotel ideas found by AI." : "Here are some AI-conceptualized hotel ideas!"));
      
      if (map) { // Ensure map is ready before plotting
        plotHotelMarkers(validHotels);
      } else {
        console.warn("[HotelsPage] Map not ready when trying to plot markers after AI fetch.");
      }

    } catch (error: any) {
      console.error("[HotelsPage] Error fetching AI hotel suggestions:", error);
      setAiHotelSearchError(`Failed to get AI hotel ideas: ${error.message || 'Unknown error'}`);
      toast({ title: "AI Search Error", description: `Failed to fetch hotel suggestions: ${error.message || 'Unknown error'}`, variant: "destructive" });
      if(map) plotHotelMarkers([]);
    } finally {
      setIsLoadingAiHotels(false);
    }
  }, [plotHotelMarkers, toast, map]); // Added map dependency

  const handleInitialLocationAndFetch = useCallback(() => {
     if (!isMapsScriptLoaded) {
       console.log("[HotelsPage] handleInitialLocationAndFetch: Maps script not loaded yet.");
       return;
     }
    console.log("[HotelsPage] handleInitialLocationAndFetch: Attempting to get user location for initial map center and nearby hotels.");
    setIsMapInitializing(true);
    setIsFetchingLocation(true);
    setGeolocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log("[HotelsPage] User location fetched:", position.coords);
        const userCoords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        setUserLocation(userCoords);
        setGeolocationError(null);
        if (!map) { // Initialize map only if not already initialized
            initializeMap({ lat: userCoords.latitude, lng: userCoords.longitude }, 12);
        } else {
            map.setCenter({ lat: userCoords.latitude, lng: userCoords.longitude });
            map.setZoom(12);
            setIsMapInitializing(false); // Map already exists, just updated center
        }
        fetchAndDisplayHotels({ location: userCoords, context: "nearby" });
        setIsFetchingLocation(false);
      },
      (error) => {
        console.warn("[HotelsPage] Geolocation error:", error);
        setGeolocationError(`Geolocation Error: ${error.message}. Showing popular ideas.`);
        setUserLocation(null);
        if (!map) {
            initializeMap({ lat: 20, lng: 0 }, 2);
        } else {
             setIsMapInitializing(false); // Map exists, but geo failed
        }
        fetchAndDisplayHotels({ context: "initial_popular" });
        setIsFetchingLocation(false);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  }, [isMapsScriptLoaded, initializeMap, fetchAndDisplayHotels, map]);


  useEffect(() => {
    if (isMapsScriptLoaded && !map && !isMapInitializing && !userLocation && !geolocationError) {
      console.log("[HotelsPage] Effect: Maps script loaded, map not init, no user loc yet. Triggering initial location fetch.");
      handleInitialLocationAndFetch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMapsScriptLoaded, map, isMapInitializing, userLocation, geolocationError]); 

  // Re-plot markers if aiHotelSuggestions change AND map is available
  useEffect(() => {
    if (map && aiHotelSuggestions.length > 0) {
      console.log("[HotelsPage] Effect: aiHotelSuggestions changed and map available. Re-plotting markers.");
      plotHotelMarkers(aiHotelSuggestions);
    } else if (map && aiHotelSuggestions.length === 0 && currentSearchContext !== "No search yet.") {
      // If suggestions are cleared after a search, clear markers too
      console.log("[HotelsPage] Effect: aiHotelSuggestions empty after a search. Clearing markers.");
      plotHotelMarkers([]);
    }
  }, [aiHotelSuggestions, map, plotHotelMarkers, currentSearchContext]);


  const handleHotelSearchSubmit = async (values: HotelSearchFormValues) => {
    console.log("[HotelsPage] Form submitted with values:", values);
    fetchAndDisplayHotels({ searchCriteria: values, context: "form_search" });
  };

  return (
    <>
    <div className="container mx-auto py-8 px-4 animate-fade-in-up space-y-10">
      <Card className={cn(glassCardClasses, "border-primary/30")}>
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tight text-foreground flex items-center">
            <Hotel className="w-8 h-8 mr-3 text-primary" />
            Find your perfect stay
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Enter your destination, dates, and guest count. Aura AI will find conceptual hotel options for you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleHotelSearchSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="destination"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-card-foreground/90">Where to?</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Paris, France or Tokyo, Japan" {...field} className="bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50 h-11 text-base" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <FormField
                  control={form.control}
                  name="dates"
                  render={({ field }) => (
                    <FormItem className="flex flex-col md:col-span-2">
                      <FormLabel className="text-card-foreground/90">Dates</FormLabel>
                       <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            id="date"
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal h-11 text-base glass-interactive",
                              !field.value?.from && "text-muted-foreground"
                            )}
                          >
                            <CalendarLucideIcon className="mr-2 h-4 w-4" />
                            {field.value?.from ? (
                              field.value.to ? (
                                <>
                                  {format(field.value.from, "LLL dd, y")} -{" "}
                                  {format(field.value.to, "LLL dd, y")}
                                </>
                              ) : (
                                format(field.value.from, "LLL dd, y")
                              )
                            ) : (
                              <span>Pick check-in & check-out dates</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className={cn("w-auto p-0", glassCardClasses)} align="start">
                          <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={field.value?.from}
                            selected={field.value}
                            onSelect={field.onChange}
                            numberOfMonths={2}
                            disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() - 1))} 
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="guests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-card-foreground/90">Guests</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11 text-base bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50 glass-interactive">
                            <SelectValue placeholder="Select guests" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className={glassCardClasses}>
                          <SelectItem value="1 adult">1 adult</SelectItem>
                          <SelectItem value="2 adults">2 adults</SelectItem>
                          <SelectItem value="1 adult, 1 child">1 adult, 1 child</SelectItem>
                          <SelectItem value="2 adults, 1 child">2 adults, 1 child</SelectItem>
                          <SelectItem value="2 adults, 2 children">2 adults, 2 children</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" size="lg" className={cn("w-full gap-2", prominentButtonClasses)} disabled={isLoadingAiHotels || form.formState.isSubmitting}>
                {isLoadingAiHotels || form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : <Search />}
                {isLoadingAiHotels || form.formState.isSubmitting ? 'AI Searching Hotels...' : 'Search Hotels with AI'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Separator className="my-8 border-border/40" />

      <section className="animate-fade-in-up" style={{animationDelay: '0.2s'}}>
        <Card className={cn(glassCardClasses, "border-accent/30")}>
          <CardHeader>
            <CardTitle className="flex items-center text-xl text-card-foreground">
              <LucideMap className="w-7 h-7 mr-3 text-accent"/> Interactive Hotel Map
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Hotels from your current search or nearby suggestions are plotted here. Click a marker for details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={cn("h-[450px] p-1 rounded-lg shadow-inner", innerGlassEffectClasses, "border-accent/20")}>
              {mapsApiError && <div className="w-full h-full flex flex-col items-center justify-center bg-destructive/10 text-destructive-foreground p-3 rounded-md"><AlertTriangle className="w-10 h-10 mb-2"/><p className="font-semibold">Map Error</p><p className="text-xs text-center">{mapsApiError}</p></div>}
              {(!mapsApiError && (isMapInitializing || (isFetchingLocation && !map)) ) && <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground"><Loader2 className="w-8 h-8 animate-spin mb-2 text-accent"/><p className="text-xs">{isFetchingLocation ? "Getting your location..." : "Initializing Map..."}</p></div>}
              <div ref={mapRef} className={cn("w-full h-full rounded-md", (mapsApiError || isMapInitializing || (isFetchingLocation && !map)) ? "hidden" : "")} />
            </div>
            {geolocationError && <p className="text-xs text-center text-amber-500 mt-1"><Info className="inline w-3 h-3 mr-1"/>{geolocationError}</p>}
          </CardContent>
        </Card>
      </section>

      <Separator className="my-8 border-border/40" />
      
      <section className="animate-fade-in-up" style={{animationDelay: '0.4s'}}>
         <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground flex items-center">
                <Sparkles className="w-7 h-7 mr-3 text-primary" />
                {currentSearchContext === "nearby" && userLocation ? "Conceptual Hotel Ideas Near You" : currentSearchContext === "form_search" ? `Conceptual Hotel Ideas for ${lastFormSearchDestination}` : "Popular Conceptual Hotel Ideas"}
            </h2>
            {currentSearchContext === "nearby" && (
                 <Button onClick={() => userLocation ? fetchAndDisplayHotels({ location: userLocation, context: "nearby" }) : handleInitialLocationAndFetch()} disabled={isLoadingAiHotels || isFetchingLocation} className={cn(prominentButtonClasses, "text-base py-2 px-4 w-full sm:w-auto")}>
                    {isLoadingAiHotels || isFetchingLocation ? <Loader2 className="animate-spin" /> : <RefreshCw />} {isLoadingAiHotels || isFetchingLocation ? "Refreshing..." : "Refresh Nearby Hotels"}
                </Button>
            )}
         </div>

        {aiSearchSummary && !isLoadingAiHotels && (
          <p className="text-sm text-muted-foreground italic mb-4 text-center sm:text-left">{aiSearchSummary}</p>
        )}

        {isLoadingAiHotels && aiHotelSuggestions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-lg">Aura AI is searching for conceptual hotel options...</p>
          </div>
        )}

        {!isLoadingAiHotels && aiHotelSearchError && (
            <Card className={cn(glassCardClasses, "border-destructive/50")}>
                <CardContent className="p-6 text-center text-destructive">
                    <AlertTriangle className="w-10 h-10 mx-auto mb-2"/>
                    <p className="font-semibold">Search Error</p>
                    <p className="text-sm">{aiHotelSearchError}</p>
                </CardContent>
            </Card>
        )}
        
        {!isLoadingAiHotels && aiHotelSuggestions.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {aiHotelSuggestions.map((hotel, index) => (
              <AiHotelCard key={`${hotel.name}-${index}-${hotel.latitude || 'noLat'}`} hotel={hotel} onClick={() => handleOpenHotelDetails(hotel)} />
            ))}
          </div>
        )}

        {!isLoadingAiHotels && !aiHotelSearchError && aiHotelSuggestions.length === 0 && currentSearchContext !== "No search yet." && (
         <div className={cn(glassCardClasses, "mt-8 p-6 text-center text-muted-foreground")}>
            <Info className="w-10 h-10 mx-auto mb-2 opacity-70"/>
            {aiSearchSummary || `Aura AI couldn't find conceptual hotel suggestions. Try adjusting your search.`}
          </div>
        )}
      </section>
    </div>
    
    <HotelDetailDialog 
        isOpen={isHotelDetailDialogOpen}
        onClose={() => setIsHotelDetailDialogOpen(false)}
        hotel={selectedHotelForDetails}
        searchDestination={selectedHotelForDetails?.name ? lastFormSearchDestination : (userLocation ? "your current area" : "selected area")}
    />
    </>
  );
}
