
"use client";

import React, 'use useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
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
  ImageIcon,
  MapPin,
  CheckSquare,
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
  searchDestination: string; // Original destination searched by the user
}

function HotelDetailDialog({ isOpen, onClose, hotel, searchDestination }: HotelDetailDialogProps) {
  if (!hotel) return null;

  const [imageLoadError, setImageLoadError] = useState(false);
  const imageHint = hotel.imageUri?.startsWith('https://placehold.co')
    ? (hotel.imagePrompt || hotel.name.toLowerCase().split(" ").slice(0, 2).join(" "))
    : undefined;

  const handleImageError = useCallback(() => {
    console.warn(`[HotelDetailDialog] Image load ERROR for: ${hotel.name}, src: ${hotel.imageUri}`);
    setImageLoadError(true);
  }, [hotel.name, hotel.imageUri]);

  const canDisplayImage = !imageLoadError && hotel.imageUri;

  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapQuery = encodeURIComponent(`${hotel.name}, ${searchDestination}`);
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
                Conceptual details for your stay in {searchDestination}.
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-accent/20 hover:text-accent-foreground shrink-0">
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        {canDisplayImage && (
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
        )}
        {!canDisplayImage && (
            <div className={cn("h-40 bg-muted/30 flex items-center justify-center text-muted-foreground border-b border-border/30", innerGlassEffectClasses, "rounded-none")}>
                <ImageOff className="w-12 h-12"/>
            </div>
        )}

        <div className="flex-grow overflow-y-auto p-4 sm:p-6">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className={cn("grid w-full grid-cols-3 mb-4 glass-pane p-1", "border border-border/50")}>
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
                 <div className="flex items-center text-md font-medium text-amber-400">
                    {[...Array(5)].map((_, i) => (
                        <Star key={i} className={cn("w-4 h-4", i < Math.round(hotel.rating!) ? "fill-amber-400 text-amber-400" : "fill-muted-foreground/40 text-muted-foreground/40")} />
                    ))}
                    <span className="ml-2 text-sm text-muted-foreground">({hotel.rating.toFixed(1)} / 5.0)</span>
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
    defaultValues: {
      destination: '',
      dates: { from: undefined, to: undefined }, // Initialize as undefined
      guests: '2 adults',
    },
  });

  const [isLoadingAiHotels, setIsLoadingAiHotels] = useState(false);
  const [aiHotelSuggestions, setAiHotelSuggestions] = useState<AiHotelSuggestion[]>([]);
  const [aiHotelSearchError, setAiHotelSearchError] = useState<string | null>(null);
  const [aiSearchSummary, setAiSearchSummary] = useState<string | null>(null);

  const [selectedHotelForDetails, setSelectedHotelForDetails] = useState<AiHotelSuggestion | null>(null);
  const [isHotelDetailDialogOpen, setIsHotelDetailDialogOpen] = useState(false);

  const handleOpenHotelDetails = (hotel: AiHotelSuggestion) => {
    setSelectedHotelForDetails(hotel);
    setIsHotelDetailDialogOpen(true);
  };

  const handleHotelSearch = async (values: HotelSearchFormValues) => {
    if (!values.dates.from || !values.dates.to) {
        toast({ title: "Dates Required", description: "Please select check-in and check-out dates.", variant: "destructive"});
        return;
    }
    setIsLoadingAiHotels(true);
    setAiHotelSuggestions([]);
    setAiHotelSearchError(null);
    setAiSearchSummary(null);

    const input: AiHotelSearchInput = {
      destination: values.destination,
      checkInDate: format(values.dates.from, "yyyy-MM-dd"),
      checkOutDate: format(values.dates.to, "yyyy-MM-dd"),
      guests: values.guests,
    };

    console.log("[HotelsPage] Calling AI Hotel Search with input:", input);

    try {
      const result: AiHotelSearchOutput = await getAiHotelSuggestionsAction(input);
      console.log("[HotelsPage] AI Hotel Search result:", result);
      setAiHotelSuggestions(result.hotels || []);
      setAiSearchSummary(result.searchSummary || null);
      if (!result.hotels || result.hotels.length === 0) {
        toast({
          title: "No Conceptual Hotels Found",
          description: result.searchSummary || `Aura AI couldn't generate conceptual hotel options for ${values.destination}. Try different parameters.`,
          variant: "default"
        });
      } else {
         toast({
          title: "AI Conceptual Hotels Generated!",
          description: result.searchSummary || "Scroll down to see Aura AI's conceptual hotel suggestions.",
        });
      }
    } catch (error: any) {
      console.error("[HotelsPage] Error calling AI Hotel Search:", error);
      setAiHotelSearchError(`Failed to get conceptual hotel ideas: ${error.message || 'Unknown error'}. Please try again.`);
      toast({
        title: "AI Search Error",
        description: `Failed to get conceptual hotel ideas: ${error.message || 'Unknown error'}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsLoadingAiHotels(false);
    }
  };
  
  const dates = form.watch("dates");

  useEffect(() => {
    if (!form.getValues("dates.from")) {
        form.setValue("dates", { from: new Date(), to: addDays(new Date(), 3) });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

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
            <form onSubmit={form.handleSubmit(handleHotelSearch)} className="space-y-5">
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
              <Button type="submit" size="lg" className={cn("w-full gap-2", prominentButtonClasses)} disabled={isLoadingAiHotels}>
                {isLoadingAiHotels ? <Loader2 className="animate-spin" /> : <Search />}
                {isLoadingAiHotels ? 'AI Finding Hotels...' : 'Search Hotels with AI'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {isLoadingAiHotels && (
        <div className="text-center py-12 text-muted-foreground">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg">Aura AI is searching for conceptual hotel options in {form.getValues("destination")}...</p>
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
        <div className="mt-8 animate-fade-in-up">
          <Separator className="my-6 border-border/40" />
           <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-2 flex items-center">
            <Sparkles className="w-7 h-7 mr-2 text-accent" />
            AI-Generated Conceptual Hotel Ideas
          </h2>
          {aiSearchSummary && (
             <p className="text-sm text-muted-foreground italic mb-4 text-center sm:text-left">{aiSearchSummary}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {aiHotelSuggestions.map((hotel, index) => (
              <AiHotelCard key={`${hotel.name}-${index}`} hotel={hotel} onClick={() => handleOpenHotelDetails(hotel)} />
            ))}
          </div>
        </div>
      )}
      {!isLoadingAiHotels && !aiHotelSearchError && aiHotelSuggestions.length === 0 && form.formState.isSubmitted && (
         <div className={cn(glassCardClasses, "mt-8 p-6 text-center text-muted-foreground")}>
            <Info className="w-10 h-10 mx-auto mb-2 opacity-70"/>
            {aiSearchSummary || `Aura AI couldn't find conceptual hotel suggestions for "${form.getValues("destination")}" with the current criteria. Try adjusting your search.`}
          </div>
      )}
    </div>
    
    <HotelDetailDialog 
        isOpen={isHotelDetailDialogOpen}
        onClose={() => setIsHotelDetailDialogOpen(false)}
        hotel={selectedHotelForDetails}
        searchDestination={form.getValues("destination")}
    />
    </>
  );
}

