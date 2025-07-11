
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { AITripPlannerInput as AITripPlannerInputTypeFromFlow, AITripPlannerOutput } from "@/ai/types/trip-planner-types";
import React, { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, CalendarDays, DollarSign, Sparkles, Lightbulb, AlertTriangle, CloudSun, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  origin: z.string().min(2, {
    message: "Origin must be at least 2 characters.",
  }).optional(),
  destination: z.string().min(2, {
    message: "Destination must be at least 2 characters.",
  }),
  travelDates: z.string().min(5, {
    message: "Please provide travel dates.",
  }).describe('The desired travel dates (e.g., MM/DD/YYYY-MM/DD/YYYY or "Next weekend").'),
  budget: z.coerce.number().positive({
    message: "Budget must be a positive number.",
  }),
  desiredMood: z.string().optional(),
  riskContext: z.string().optional(),
  weatherContext: z.string().optional(),
});

type TripInputFormProps = {
  onItinerariesFetched: (itineraries: AITripPlannerOutput["itineraries"] | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  onSubmitProp?: (values: AITripPlannerInputTypeFromFlow) => Promise<void>;
  initialValues?: Partial<AITripPlannerInputTypeFromFlow> | null;
  isMapsScriptLoaded?: boolean; 
};

const suggestedPrompts = [
  "7-day romantic getaway to Paris for $2000, with a focus on art museums.",
  "Adventure trip to Costa Rican rainforests, 10 days, budget $3000, focus on wildlife and nature sounds, prefer eco-lodges.",
  "Budget-friendly family vacation to US national parks in California for a week, need step-free trails for a stroller, sunny weather preferred.",
  "Cultural exploration of Kyoto, Japan for 5 days with $1500, interested in quiet temples and traditional tea ceremonies, also want to experience vibrant local markets.",
];

export function TripInputForm({ setIsLoading, onSubmitProp, initialValues, isMapsScriptLoaded }: TripInputFormProps) {
  const originInputRef = useRef<HTMLInputElement>(null);
  const destinationInputRef = useRef<HTMLInputElement>(null);
  const [isFetchingGeo, setIsFetchingGeo] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      origin: initialValues?.origin || "",
      destination: initialValues?.destination || "",
      travelDates: initialValues?.travelDates || "",
      budget: initialValues?.budget || 1000,
      desiredMood: initialValues?.desiredMood || "",
      riskContext: initialValues?.riskContext || "",
      weatherContext: initialValues?.weatherContext || "",
    },
  });

  useEffect(() => {
    form.reset({
      origin: initialValues?.origin || form.getValues("origin") || "", // Preserve current form value if initial is undefined
      destination: initialValues?.destination || "",
      travelDates: initialValues?.travelDates || "",
      budget: initialValues?.budget || 1000,
      desiredMood: initialValues?.desiredMood || "",
      riskContext: initialValues?.riskContext || "",
      weatherContext: initialValues?.weatherContext || "",
    });
  }, [initialValues, form]);

  const initializeAutocomplete = (inputRef: React.RefObject<HTMLInputElement>, fieldName: 'origin' | 'destination') => {
    if (isMapsScriptLoaded && window.google && window.google.maps && window.google.maps.places && inputRef.current) {
      const autocomplete = new window.google.maps.places.Autocomplete(
        inputRef.current,
        { types: ['geocode', 'establishment'] } // Suggest cities, airports, points of interest
      );
      autocomplete.setFields(['formatted_address', 'name']);
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        const address = place.formatted_address || place.name || "";
        form.setValue(fieldName, address, { shouldValidate: true });
      });
    }
  };

  useEffect(() => {
    initializeAutocomplete(originInputRef, 'origin');
    initializeAutocomplete(destinationInputRef, 'destination');
  }, [isMapsScriptLoaded, form]);

  const setDefaultOriginToCurrentLocation = () => {
    if (navigator.geolocation && isMapsScriptLoaded && window.google && window.google.maps.Geocoder) {
      setIsFetchingGeo(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const geocoder = new window.google.maps.Geocoder();
          const latlng = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          geocoder.geocode({ location: latlng }, (results, status) => {
            setIsFetchingGeo(false);
            if (status === "OK") {
              if (results && results[0]) {
                // Find a result that is a locality or administrative area for a good default
                const cityResult = results.find(r => r.types.includes('locality') || r.types.includes('administrative_area_level_1'));
                form.setValue("origin", cityResult?.formatted_address || results[0].formatted_address || "", { shouldValidate: true });
              } else {
                form.setValue("origin", `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`, { shouldValidate: true }); // Fallback to coords
              }
            } else {
              console.warn("Geocoder failed due to: " + status);
              // Keep field empty or allow manual input
            }
          });
        },
        (error) => {
          setIsFetchingGeo(false);
          console.warn("Error getting current location:", error.message);
          // User might have denied permission or location service failed
        },
        { timeout: 5000 }
      );
    }
  };
  
  // Attempt to set default origin on mount if maps are ready and no origin is set
  useEffect(() => {
    if (isMapsScriptLoaded && !form.getValues("origin") && !initialValues?.origin) {
        setDefaultOriginToCurrentLocation();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMapsScriptLoaded, initialValues?.origin, form.getValues("origin")]);


  async function handleSubmit(values: z.infer<typeof formSchema>) {
    if (onSubmitProp) {
      setIsLoading(true);
      const plannerInput: AITripPlannerInputTypeFromFlow = {
        origin: values.origin || undefined, // Ensure it's undefined if empty, not null
        destination: values.destination,
        travelDates: values.travelDates,
        budget: values.budget,
        desiredMood: values.desiredMood || undefined,
        riskContext: values.riskContext || undefined,
        weatherContext: values.weatherContext || undefined,
        userPersona: initialValues?.userPersona,
      };
      await onSubmitProp(plannerInput);
      setIsLoading(false);
    }
  }

  const handleSuggestionClick = (promptText: string) => {
    let origin = form.getValues("origin") || ""; // Preserve current origin if user set one
    let destination = "";
    let travelDates = "";
    let budget = 1000;
    let desiredMood = "";
    let riskContext = "";
    let weatherContext = "";

    if (promptText.toLowerCase().includes("paris")) {
        destination = "Paris, France";
        travelDates = "7 days";
        budget = 2000;
        desiredMood = "romantic, art museums";
    } else if (promptText.toLowerCase().includes("costa rican rainforests")) {
        destination = "Costa Rican rainforests";
        travelDates = "10 days";
        budget = 3000;
        desiredMood = "adventure, wildlife, nature sounds";
        riskContext = "prefer eco-lodges"; 
    } else if (promptText.toLowerCase().includes("us national parks in california")) {
        destination = "California National Parks (e.g., Yosemite, Joshua Tree)";
        travelDates = "a week";
        budget = 1800;
        desiredMood = "family vacation";
        riskContext = "step-free trails for a stroller"; 
        weatherContext = "sunny weather preferred";
    } else if (promptText.toLowerCase().includes("kyoto, japan")) {
        destination = "Kyoto, Japan";
        travelDates = "5 days";
        budget = 1500;
        desiredMood = "cultural exploration, quiet temples, traditional tea ceremonies, vibrant local markets";
    }

    form.reset({
        origin: origin,
        destination: destination,
        travelDates: travelDates,
        budget: budget,
        desiredMood: desiredMood,
        riskContext: riskContext,
        weatherContext: weatherContext,
    });
  };

  const primaryButtonClasses = "w-full text-lg py-3 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:from-accent hover:to-primary focus-visible:ring-4 focus-visible:ring-primary/40 transform transition-all duration-300 ease-out hover:scale-[1.02] active:scale-100";

  return (
    <div className="w-full">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="origin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center text-foreground/90">
                    <Navigation className="w-4 h-4 mr-2" />Origin (City or Airport)
                  </FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Input 
                        ref={originInputRef}
                        placeholder="e.g., Your Current Location, NYC" 
                        {...field} 
                        className="bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50 flex-grow" 
                      />
                    </FormControl>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon" 
                      onClick={setDefaultOriginToCurrentLocation} 
                      disabled={isFetchingGeo || !isMapsScriptLoaded}
                      className="shrink-0 glass-interactive"
                      title="Use current location"
                    >
                      {isFetchingGeo ? <Loader2 className="w-4 h-4 animate-spin"/> : <MapPin className="w-4 h-4"/>}
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="destination"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center text-foreground/90"><MapPin className="w-4 h-4 mr-2" />Destination *</FormLabel>
                  <FormControl>
                    <Input 
                      ref={destinationInputRef}
                      placeholder="e.g., Paris, France or JFK Airport" 
                      {...field} 
                      className="bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="travelDates"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center text-foreground/90"><CalendarDays className="w-4 h-4 mr-2" />Travel Dates *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 12/25/2024 - 01/02/2025 or Next month for 7 days" {...field} className="bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="budget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center text-foreground/90"><DollarSign className="w-4 h-4 mr-2" />Budget (USD) *</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 1500" {...field} className="bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="desiredMood"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center text-foreground/90"><Lightbulb className="w-4 h-4 mr-2" />Desired Mood/Vibe/Sensory Palette (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Relaxing, Adventurous, Vibrant street food, Quiet nature" {...field} className="bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="riskContext"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center text-foreground/90"><AlertTriangle className="w-4 h-4 mr-2" />Specific Concerns or Preferences (e.g., visa, accessibility)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Visa questions, prefer sunny weather, mobility/accessibility needs" {...field} className="bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="weatherContext"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center text-foreground/90"><CloudSun className="w-4 h-4 mr-2" />Specific Weather Context (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 'Expecting lots of sun', 'Might be rainy season'" {...field} className="bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className={cn(primaryButtonClasses)} size="lg" disabled={form.formState.isSubmitting || !isMapsScriptLoaded || isFetchingGeo}>
              {form.formState.isSubmitting ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-5 w-5" />
              )}
              {initialValues?.destination || initialValues?.origin ? "Update Plan" : "Get AI Trip Plan"}
            </Button>
             {(!isMapsScriptLoaded || isFetchingGeo) && (
                <p className="text-xs text-center text-muted-foreground">
                    {isFetchingGeo ? <Loader2 className="inline w-3 h-3 mr-1 animate-spin"/> : ""}
                    {isFetchingGeo ? "Getting current location..." : "Loading location services..."}
                </p>
            )}
          </form>
        </Form>
        <div className="mt-2 pt-4 border-t border-border/30">
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center">
            <Lightbulb className="w-4 h-4 mr-2 text-yellow-400"/>
            Need inspiration? Try prompts like:
          </h3>
          <div className="space-y-2">
            {suggestedPrompts.map((prompt, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="w-full text-left justify-start text-muted-foreground hover:text-primary hover:border-primary/50 glass-interactive"
                onClick={() => handleSuggestionClick(prompt)}
              >
                {prompt}
              </Button>
            ))}
          </div>
        </div>
    </div>
  );
}
