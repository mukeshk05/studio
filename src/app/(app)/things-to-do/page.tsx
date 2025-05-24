
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Added Tabs imports
import { Alert, AlertTitle as ShadcnAlertTitle, AlertDescription as ShadcnAlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Search, Sparkles, Loader2, Map as LucideMap, Compass, DollarSign, Tag, ImageOff, Info, ExternalLink, X, MapPin, Star, Briefcase
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getThingsToDoAction } from '@/app/actions';
import type { ThingsToDoSearchInput, ThingsToDoOutput, ActivitySuggestion } from '@/ai/types/things-to-do-types';

const glassCardClasses = "glass-card bg-card/80 dark:bg-card/50 backdrop-blur-lg border-border/20";
const innerGlassEffectClasses = "bg-card/80 dark:bg-card/50 backdrop-blur-md border border-white/10 dark:border-[hsl(var(--primary)/0.1)] rounded-md";
const prominentButtonClasses = "text-lg py-3 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:from-accent hover:to-primary focus-visible:ring-4 focus-visible:ring-primary/40 transform transition-all duration-300 ease-out hover:scale-[1.02] active:scale-100";

interface ActivitySuggestionCardProps {
  activity: ActivitySuggestion;
  onClick: () => void;
}

function ActivitySuggestionCard({ activity, onClick }: ActivitySuggestionCardProps) {
  const [imageLoadError, setImageLoadError] = useState(false);
  const imageHint = activity.imageUri?.startsWith('https://placehold.co')
    ? (activity.imagePrompt || activity.name.toLowerCase().split(" ").slice(0, 2).join(" "))
    : undefined;

  const handleImageError = useCallback(() => {
    console.warn(`[ActivitySuggestionCard] Image load ERROR for: ${activity.name}, src: ${activity.imageUri}`);
    setImageLoadError(true);
  }, [activity.name, activity.imageUri]);

  const canDisplayImage = !imageLoadError && activity.imageUri;

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
            src={activity.imageUri!}
            alt={activity.name}
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
        <CardTitle className="text-md font-semibold text-card-foreground line-clamp-2" title={activity.name}>{activity.name}</CardTitle>
        <Badge variant="outline" className="text-xs w-fit mt-0.5 capitalize bg-accent/10 text-accent border-accent/30">{activity.category}</Badge>
      </CardHeader>
      <CardContent className="p-3 pt-1 text-xs text-muted-foreground flex-grow space-y-1">
        <p className="line-clamp-3">{activity.description}</p>
        <p className="font-medium text-primary">{activity.estimatedPrice}</p>
      </CardContent>
      <CardFooter className="p-3 pt-2">
        <Button
          size="sm"
          variant="outline"
          className="w-full text-sm py-2 glass-interactive text-primary hover:bg-primary/10"
          onClick={onClick}
        >
          <Info className="mr-2 h-4 w-4" /> View Details
        </Button>
      </CardFooter>
    </Card>
  );
}

interface ActivityDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  activity: ActivitySuggestion | null;
  searchLocation: string; 
}

function ActivityDetailDialog({ isOpen, onClose, activity: activityProp, searchLocation }: ActivityDetailDialogProps) {
  const [activity, setActivity] = useState(activityProp);
  const [imageLoadError, setImageLoadError] = useState(false);

  useEffect(() => {
    setActivity(activityProp);
    if (isOpen && activityProp) {
        setImageLoadError(false);
    }
  }, [isOpen, activityProp]);
  
  const handleImageError = useCallback(() => {
    if (activity) {
      console.warn(`[ActivityDetailDialog] Image load ERROR for: ${activity.name}, src: ${activity.imageUri}`);
      setImageLoadError(true);
    }
  }, [activity]); 

  if (!activity) return null;

  const imageHint = activity.imageUri?.startsWith('https://placehold.co')
    ? (activity.imagePrompt || activity.name.toLowerCase().split(" ").slice(0, 2).join(" "))
    : undefined;

  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapQuery = activity.latitude && activity.longitude 
    ? `${activity.latitude},${activity.longitude}` 
    : encodeURIComponent(`${activity.name}, ${searchLocation}`);
  
  const mapEmbedUrl = mapsApiKey
    ? `https://www.google.com/maps/embed/v1/place?key=${mapsApiKey}&q=${mapQuery}`
    : "";
  
  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(activity.name)}+in+${encodeURIComponent(searchLocation)}`;

  const canDisplayImage = !imageLoadError && activity.imageUri;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className={cn(glassCardClasses, "sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col p-0 border-primary/30")}>
        <DialogHeader className="p-4 sm:p-6 border-b border-border/30 sticky top-0 z-10 bg-card/80 dark:bg-card/50 backdrop-blur-sm">
          <div className="flex justify-between items-start">
            <div className="flex-grow min-w-0">
              <DialogTitle className="text-xl font-semibold text-foreground truncate flex items-center" title={activity.name}>
                <Briefcase className="w-6 h-6 mr-2 inline-block text-primary" />
                {activity.name}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Activity in {searchLocation} (AI Suggested)
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
          <div className="relative aspect-video w-full max-h-60 sm:max-h-72 border-b border-border/30">
            <Image
              src={activity.imageUri!}
              alt={`Image for ${activity.name}`}
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
            <TabsList className={cn("grid w-full grid-cols-2 mb-4 glass-pane p-1", "border border-border/50")}>
              <TabsTrigger value="details" className="flex items-center gap-2 data-[state=active]:bg-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                <Info className="w-4 h-4" /> Details
              </TabsTrigger>
              <TabsTrigger value="map" className="flex items-center gap-2 data-[state=active]:bg-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                <MapPin className="w-4 h-4" /> Map
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className={cn(glassCardClasses, "p-4 rounded-md")}>
              <h3 className="text-lg font-semibold text-card-foreground mb-2">{activity.name}</h3>
              <Badge variant="outline" className="text-sm mb-2 capitalize bg-accent/10 text-accent border-accent/30">{activity.category}</Badge>
              <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{activity.description}</p>
              <div className="flex items-center text-lg font-semibold text-primary">
                <DollarSign className="w-5 h-5 mr-1.5" />
                Price: {activity.estimatedPrice}
              </div>
            </TabsContent>

            <TabsContent value="map" className={cn(glassCardClasses, "p-4 rounded-md")}>
              <h3 className="text-lg font-semibold text-card-foreground mb-3">Location of {activity.name}</h3>
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
                    title={`Map of ${activity.name} in ${searchLocation}`}
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
                    <ExternalLink className="mr-2"/> More Info on Google
                </a>
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


export default function ThingsToDoPage() {
  const { toast } = useToast();
  const [locationInput, setLocationInput] = useState('');
  const [interestInput, setInterestInput] = useState(''); // Optional interest filter

  const [activitySuggestions, setActivitySuggestions] = useState<ActivitySuggestion[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [aiSearchSummary, setAiSearchSummary] = useState<string | null>(null);

  const [selectedActivity, setSelectedActivity] = useState<ActivitySuggestion | null>(null);
  const [isActivityDetailDialogOpen, setIsActivityDetailDialogOpen] = useState(false);

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapMarkersRef = useRef<google.maps.Marker[]>([]);
  const [isMapsScriptLoaded, setIsMapsScriptLoaded] = useState(false);
  const [mapsApiError, setMapsApiError] = useState<string | null>(null);
  const [isMapInitializing, setIsMapInitializing] = useState(true);
  
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Google Maps API Script Loader
  const initGoogleMapsApiThingsToDoPage = useCallback(() => {
    console.log("[ThingsToDoPage] Google Maps API script loaded callback executed.");
    setIsMapsScriptLoaded(true);
  }, []);

  useEffect(() => {
    console.log("[ThingsToDoPage] Maps API Script Loader Effect: API Key present?", !!apiKey);
    if (!apiKey) {
      setMapsApiError("Google Maps API key is missing. Map functionality is disabled.");
      setIsMapInitializing(false);
      return;
    }
    if (typeof window !== 'undefined' && window.google && window.google.maps) {
      if(!isMapsScriptLoaded) {
        console.log("[ThingsToDoPage] Google Maps already loaded, setting script loaded state.");
        setIsMapsScriptLoaded(true);
      }
      return;
    }
    const scriptId = 'google-maps-things-to-do-page-script';
    if (document.getElementById(scriptId)) {
       if (typeof window !== 'undefined' && window.google && window.google.maps && !isMapsScriptLoaded) {
            console.log("[ThingsToDoPage] Script element exists, Google Maps already loaded, setting script loaded state.");
            setIsMapsScriptLoaded(true);
       }
       return;
    }
    console.log("[ThingsToDoPage] Attempting to load Google Maps API script...");
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMapsApiThingsToDoPage&libraries=marker,places`;
    script.async = true; script.defer = true;
    script.onerror = () => {
      console.error("[ThingsToDoPage] Failed to load Google Maps API script.");
      setMapsApiError("Failed to load Google Maps script. Please check API key and network.");
      setIsMapsScriptLoaded(false); setIsMapInitializing(false);
    };
    (window as any).initGoogleMapsApiThingsToDoPage = initGoogleMapsApiThingsToDoPage;
    document.head.appendChild(script);
    return () => { if ((window as any).initGoogleMapsApiThingsToDoPage) delete (window as any).initGoogleMapsApiThingsToDoPage; };
  }, [apiKey, isMapsScriptLoaded, initGoogleMapsApiThingsToDoPage]);

  // Map Initialization
  const initializeMap = useCallback((center: google.maps.LatLngLiteral = { lat: 20, lng: 0 }, zoom: number = 2) => {
    if (!mapRef.current || !window.google || !window.google.maps) {
      console.warn("[ThingsToDoPage] Map ref not ready or Google Maps not loaded for initializeMap.");
      setIsMapInitializing(false); return;
    }
    console.log(`[ThingsToDoPage] Initializing map at center: ${JSON.stringify(center)} with zoom ${zoom}`);
    try {
      const newMap = new window.google.maps.Map(mapRef.current!, {
        center, zoom, styles: [{featureType:"all",elementType:"geometry",stylers:[{color:"#202c3e"}]},{featureType:"all",elementType:"labels.text.fill",stylers:[{gamma:0.01,lightness:20,weight:"1.39",color:"#ffffff"}]},{featureType:"all",elementType:"labels.text.stroke",stylers:[{weight:"0.96",saturation:9,gamma:0.01,lightness:16,color:"#1e232a"}]},{featureType:"all",elementType:"labels.icon",stylers:[{visibility:"off"}]},{featureType:"landscape",elementType:"geometry",stylers:[{lightness:30,saturation:"9%",gamma:"1",color:"#29323e"}]},{featureType:"poi",elementType:"geometry",stylers:[{saturation:20}]},{featureType:"poi.park",elementType:"geometry",stylers:[{lightness:20,saturation:-20}]},{featureType:"road",elementType:"geometry",stylers:[{lightness:10,saturation:-30}]},{featureType:"road",elementType:"geometry.stroke",stylers:[{saturation:-20,lightness:25}]},{featureType:"water",elementType:"all",stylers:[{lightness:-20}]}],
        mapTypeControl: true, mapTypeControlOptions: { style: window.google.maps.MapTypeControlStyle.HORIZONTAL_BAR, position: window.google.maps.ControlPosition.TOP_RIGHT },
        streetViewControl: false, fullscreenControl: true, zoomControl: true,
      });
      setMap(newMap);
      console.log("[ThingsToDoPage] Map initialized successfully.");
    } catch (error) { 
        console.error("[ThingsToDoPage] Error initializing map:", error);
        setMapsApiError("Error initializing map."); 
    }
    finally { setIsMapInitializing(false); }
  }, []);

  useEffect(() => {
    console.log(`[ThingsToDoPage] Map Init Effect: isMapsScriptLoaded=${isMapsScriptLoaded}, mapRef.current=${!!mapRef.current}, !map=${!map}, isMapInitializing=${isMapInitializing}`);
    if (isMapsScriptLoaded && mapRef.current && !map && isMapInitializing) { // Only init if script is loaded, ref exists, map not yet set, and we intend to init
        console.log("[ThingsToDoPage] Conditions met for map initialization with default view.");
        initializeMap(); // Initialize with default global view
    }
  }, [isMapsScriptLoaded, map, isMapInitializing, initializeMap]);

  // Plot Markers
  const plotActivityMarkers = useCallback((activities: ActivitySuggestion[]) => {
    if (!map || !window.google || !window.google.maps) {
        console.warn("[ThingsToDoPage] Map not ready for plotting markers. Activities to plot:", activities.length);
        return;
    }
    console.log(`[ThingsToDoPage] Plotting ${activities.length} activity markers.`);

    mapMarkersRef.current.forEach(marker => marker.setMap(null));
    mapMarkersRef.current = [];

    if (activities.length === 0) {
        console.log("[ThingsToDoPage] No activities to plot. Resetting map view if needed.");
        // Optionally reset map view to a default or user location if no activities
        // initializeMap(); // Or center on user location if available
        return;
    }

    const bounds = new window.google.maps.LatLngBounds();
    let validMarkersPlotted = 0;

    activities.forEach(activity => {
      if (activity.latitude != null && activity.longitude != null && typeof activity.latitude === 'number' && typeof activity.longitude === 'number') {
        console.log(`[ThingsToDoPage] Creating marker for ${activity.name} at ${activity.latitude}, ${activity.longitude}`);
        const position = { lat: activity.latitude, lng: activity.longitude };
        const marker = new window.google.maps.Marker({
          position,
          map,
          title: activity.name,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "hsl(var(--accent))",
            fillOpacity: 1,
            strokeColor: "hsl(var(--background))",
            strokeWeight: 2,
          }
        });
        marker.set('activityData', activity); 
        marker.addListener('click', () => {
          setSelectedActivity(activity);
          setIsActivityDetailDialogOpen(true);
          map.panTo(position);
          if(map.getZoom() && map.getZoom()! < 14) map.setZoom(14);
        });
        mapMarkersRef.current.push(marker);
        bounds.extend(position);
        validMarkersPlotted++;
      } else {
        console.warn(`[ThingsToDoPage] Activity "${activity.name}" missing valid coordinates. Lat: ${activity.latitude}, Lng: ${activity.longitude}. Skipping marker.`);
      }
    });

    console.log(`[ThingsToDoPage] Plotted ${validMarkersPlotted} valid markers out of ${activities.length} suggestions.`);
    if (validMarkersPlotted > 0 && !bounds.isEmpty()) {
      map.fitBounds(bounds, 100); 
      if (validMarkersPlotted === 1 && map.getZoom() && map.getZoom()! > 15) map.setZoom(15);
    } else {
      // Fallback if no valid markers, center globally or on user location if available
      initializeMap(); 
    }
  }, [map, initializeMap]);


  const handleSearchThingsToDo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!locationInput.trim()) {
      toast({ title: "Location Required", description: "Please enter a location to search for things to do.", variant: "destructive" });
      return;
    }
    setIsLoadingActivities(true);
    setActivitySuggestions([]);
    setActivitiesError(null);
    setAiSearchSummary(`Searching for things to do in ${locationInput}...`);

    try {
      const input: ThingsToDoSearchInput = {
        location: locationInput,
        interest: interestInput || undefined,
      };
      console.log("[ThingsToDoPage] Calling getThingsToDoAction with input:", JSON.stringify(input, null, 2));
      const result = await getThingsToDoAction(input);
      console.log("[ThingsToDoPage] AI Things To Do Result:", JSON.stringify(result, null, 2));
      setActivitySuggestions(result.activities || []);
      setAiSearchSummary(result.searchSummary || (result.activities?.length === 0 ? `No specific activities found by AI for ${locationInput}. Try a broader search!` : `Here are some AI-suggested activities for ${locationInput}!`));
      
      plotActivityMarkers(result.activities || []);
      
      if(result.activities && result.activities.length > 0 && result.activities[0].latitude && result.activities[0].longitude && map) {
        const firstActivityLocation = { lat: result.activities[0].latitude, lng: result.activities[0].longitude };
        console.log("[ThingsToDoPage] Panning map to first activity:", firstActivityLocation);
        map.panTo(firstActivityLocation);
        if(result.activities.length === 1) map.setZoom(14);
      } else if (result.activities && result.activities.length === 0) {
         toast({
            title: "No Activities Found",
            description: `Aura AI couldn't find specific activities for "${locationInput}". Try a different location.`,
            variant: "default",
         });
      } else if (result.activities && result.activities.length > 0 && (!result.activities[0].latitude || !result.activities[0].longitude) && map) {
        console.warn("[ThingsToDoPage] First activity has no coordinates, not panning map.");
      }

    } catch (error: any) {
      const errorMsg = `Failed to get AI suggestions for ${locationInput}: ${error.message || 'Unknown error'}`;
      console.error("[ThingsToDoPage] Error in handleSearchThingsToDo:", errorMsg, error);
      setActivitiesError(errorMsg);
      setAiSearchSummary(errorMsg);
      toast({ title: "AI Search Error", description: errorMsg, variant: "destructive" });
      plotActivityMarkers([]);
    } finally {
      setIsLoadingActivities(false);
    }
  };

  return (
    <>
    <div className="container mx-auto py-8 px-4 animate-fade-in-up space-y-10">
      <Card className={cn(glassCardClasses, "border-primary/30")}>
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tight text-foreground flex items-center">
            <Compass className="w-8 h-8 mr-3 text-primary" />
            Discover Things to Do
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Enter a location and let Aura AI find exciting activities and attractions for you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearchThingsToDo} className="space-y-5">
            <div>
              <Label htmlFor="things-location" className="text-card-foreground/90">Location *</Label>
              <Input 
                id="things-location"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                placeholder="e.g., Paris, France or Rome, Italy" 
                className="mt-1 bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50 h-11 text-base" 
              />
            </div>
            <Button type="submit" size="lg" className={cn("w-full gap-2", prominentButtonClasses)} disabled={isLoadingActivities || !locationInput.trim()}>
              {isLoadingActivities ? <Loader2 className="animate-spin" /> : <Search />}
              {isLoadingActivities ? 'AI Discovering Activities...' : 'Search Things to Do with AI'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Map Section */}
      <section className="animate-fade-in-up" style={{animationDelay: '0.2s'}}>
        <Card className={cn(glassCardClasses, "border-accent/30")}>
          <CardHeader>
            <CardTitle className="flex items-center text-xl text-card-foreground">
              <LucideMap className="w-7 h-7 mr-3 text-accent"/> Interactive Activity Map
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              AI-suggested activities will be plotted here. Click a marker for details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={cn("h-[450px] p-1 rounded-lg shadow-inner", innerGlassEffectClasses, "border-accent/20")}>
              {mapsApiError && <div className="w-full h-full flex flex-col items-center justify-center bg-destructive/10 text-destructive-foreground p-3 rounded-md"><MapPin className="w-10 h-10 mb-2"/><p className="font-semibold">Map Error</p><p className="text-xs text-center">{mapsApiError}</p></div>}
              {(!mapsApiError && isMapInitializing ) && <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground"><Loader2 className="w-8 h-8 animate-spin mb-2 text-accent"/><p className="text-xs">Initializing Map...</p></div>}
              <div ref={mapRef} className={cn("w-full h-full rounded-md", (mapsApiError || isMapInitializing) ? "hidden" : "")} />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Results Section */}
      {(isLoadingActivities || activitySuggestions.length > 0 || activitiesError || aiSearchSummary) && (
        <section className="animate-fade-in-up" style={{animationDelay: '0.1s'}}>
          <Separator className="my-8 border-border/40" />
           <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground flex items-center">
                <Sparkles className="w-7 h-7 mr-3 text-primary" />
                AI-Suggested Things to Do {locationInput ? `in ${locationInput}` : ''}
            </h2>
          </div>
          {aiSearchSummary && !isLoadingActivities && (
            <Alert variant={activitiesError ? "destructive" : "default"} className={cn("mb-4 text-sm", activitiesError ? "bg-destructive/10 border-destructive/20 text-destructive" : "bg-primary/10 border-primary/20 text-primary")}>
                <Info className="h-4 w-4" />
                <ShadcnAlertTitle className="font-semibold">AI Note</ShadcnAlertTitle>
                <ShadcnAlertDescription className={activitiesError ? "text-destructive/80" : "text-primary/80"}>
                {aiSearchSummary}
                </ShadcnAlertDescription>
            </Alert>
          )}
          {isLoadingActivities && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(3)].map((_, index) => (
                <Card key={`activity-skeleton-${index}`} className={cn(glassCardClasses, "overflow-hidden animate-pulse")}>
                  <div className="relative w-full aspect-video bg-muted/40"></div>
                  <CardHeader className="p-3 pb-1"><div className="h-4 w-3/4 bg-muted/40 rounded"></div><div className="h-3 w-1/2 bg-muted/40 rounded mt-1"></div></CardHeader>
                  <CardContent className="p-3 pt-1 space-y-1.5"><div className="h-3 w-full bg-muted/40 rounded"></div><div className="h-3 w-5/6 bg-muted/40 rounded"></div></CardContent>
                  <CardFooter className="p-3 pt-2"><div className="h-8 w-full bg-muted/40 rounded"></div></CardFooter>
                </Card>
              ))}
            </div>
          )}
          {!isLoadingActivities && activitySuggestions.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {activitySuggestions.map((activity, index) => (
                <ActivitySuggestionCard 
                  key={`activity-${activity.name}-${index}-${activity.latitude || index}`} 
                  activity={activity} 
                  onClick={() => { setSelectedActivity(activity); setIsActivityDetailDialogOpen(true); }} 
                />
              ))}
            </div>
          )}
           {!isLoadingActivities && activitySuggestions.length === 0 && aiSearchSummary && !aiSearchSummary.toLowerCase().includes("error") && !aiSearchSummary.toLowerCase().includes("searching") && (
            <Card className={cn(glassCardClasses, "p-6 text-center text-muted-foreground")}>
                <Compass className="w-12 h-12 mx-auto mb-2 opacity-70"/>
                <p>{aiSearchSummary}</p>
            </Card>
           )}
        </section>
      )}
    </div>
    
    <ActivityDetailDialog
        isOpen={isActivityDetailDialogOpen}
        onClose={() => setIsActivityDetailDialogOpen(false)}
        activity={selectedActivity}
        searchLocation={locationInput || selectedActivity?.name || "Selected Area"}
    />
    </>
  );
}

