
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
// import { Textarea } from "@/components/ui/textarea"; // Not used currently
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { aiTripPlanner, type AITripPlannerOutput } from "@/ai/flows/ai-trip-planner";
import React from "react";
import { Loader2Icon, MapPinIcon, CalendarDaysIcon, DollarSignIcon, SparklesIcon, LightbulbIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  destination: z.string().min(2, {
    message: "Destination must be at least 2 characters.",
  }),
  travelDates: z.string().min(5, { 
    message: "Please provide travel dates.",
  }).describe('The desired travel dates (e.g., MM/DD/YYYY-MM/DD/YYYY or "Next weekend").'),
  budget: z.coerce.number().positive({
    message: "Budget must be a positive number.",
  }),
});

type TripInputFormProps = {
  onItinerariesFetched: (itineraries: AITripPlannerOutput["itineraries"] | null) => void;
  setIsLoading: (isLoading: boolean) => void;
};

const suggestedPrompts = [
  "7-day romantic getaway to Paris for $2000",
  "Adventure trip to Costa Rican rainforests, 10 days, budget $3000",
  "Budget-friendly family vacation to US national parks in California for a week",
  "Cultural exploration of Kyoto, Japan for 5 days with $1500",
];

export function TripInputForm({ onItinerariesFetched, setIsLoading }: TripInputFormProps) {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      destination: "",
      travelDates: "",
      budget: 1000,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    onItinerariesFetched(null); 
    try {
      const result = await aiTripPlanner(values);
      onItinerariesFetched(result.itineraries);
      if (result.itineraries && result.itineraries.length > 0) {
        toast({
          title: "Trip Options Generated!",
          description: "Explore the itineraries below.",
        });
      } else {
        toast({
          title: "No Itineraries Found",
          description: "Try adjusting your criteria or broaden your search.",
          variant: "default" 
        });
      }
    } catch (error) {
      console.error("Error planning trip:", error);
      onItinerariesFetched(null);
      toast({
        title: "Error Generating Trips",
        description: "Could not generate trip options at this time. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleSuggestionClick = (promptText: string) => {
    // Basic parsing for demonstration. A more robust solution might be needed.
    const parts = promptText.split(" for ");
    let destinationAndDates = parts[0];
    let budgetStr = parts[1]?.split(" budget $")?.[1] || parts[1]?.split(" $")?.[1];

    // Attempt to parse destination and dates
    // This is a very naive parsing, works for "Destination for Dates" structure
    let destination = destinationAndDates;
    let travelDates = "a week"; // Default if not easily parsed

    // A more specific parsing attempt (example)
    if (destinationAndDates.toLowerCase().includes(" to ")) {
        const destParts = destinationAndDates.split(" to ");
        if (destParts.length > 1) { // "7-day romantic getaway to Paris"
            travelDates = destParts[0].trim(); // "7-day romantic getaway"
            destination = destParts.slice(1).join(" to ").trim(); // "Paris"
             // refine travelDates
            if (travelDates.toLowerCase().includes(" days")) travelDates = travelDates.split(" days")[0] + " days";
            else if (travelDates.toLowerCase().includes(" day")) travelDates = travelDates.split(" day")[0] + " day";
            else if (travelDates.toLowerCase().includes(" week")) travelDates = "a week";


        }
    } else if (destinationAndDates.includes(",")) { // "Kyoto, Japan for 5 days"
        const firstComma = destinationAndDates.indexOf(",");
        destination = destinationAndDates.substring(0, firstComma).trim();
        travelDates = destinationAndDates.substring(firstComma + 1).trim();
         if (travelDates.toLowerCase().includes(" days")) travelDates = travelDates.split(" days")[0] + " days";
         else if (travelDates.toLowerCase().includes(" day")) travelDates = travelDates.split(" day")[0] + " day";
    }


    form.setValue("destination", destination.trim());
    form.setValue("travelDates", travelDates.trim());
    if (budgetStr) {
      form.setValue("budget", parseInt(budgetStr.replace(/,/g, ''), 10) || 1000);
    }
  };


  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl animate-fade-in-up">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl">
          <SparklesIcon className="w-7 h-7 mr-2 text-accent" />
          Plan Your Next Adventure
        </CardTitle>
        <CardDescription>Tell us about your dream trip, and our AI will craft budget-friendly options for you!</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="destination"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><MapPinIcon className="w-4 h-4 mr-2" />Destination</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Paris, France or Tokyo, Japan" {...field} />
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
                  <FormLabel className="flex items-center"><CalendarDaysIcon className="w-4 h-4 mr-2" />Travel Dates</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 12/25/2024 - 01/02/2025 or Next month" {...field} />
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
                  <FormLabel className="flex items-center"><DollarSignIcon className="w-4 h-4 mr-2" />Budget (USD)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 1500" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full text-lg py-6" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <Loader2Icon className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <SparklesIcon className="mr-2 h-5 w-5" />
              )}
              Plan My Trip
            </Button>
          </form>
        </Form>
        <div className="mt-8 pt-6 border-t border-border">
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center">
            <LightbulbIcon className="w-4 h-4 mr-2 text-yellow-400"/>
            Need inspiration? Try prompts like:
          </h3>
          <div className="space-y-2">
            {suggestedPrompts.map((prompt, index) => (
              <Button 
                key={index}
                variant="outline" 
                size="sm" 
                className="w-full text-left justify-start text-muted-foreground hover:text-primary hover:border-primary/50"
                onClick={() => handleSuggestionClick(prompt)}
              >
                {prompt}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

    