
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
import React, { useEffect } from "react"; 
import { Loader2Icon, MapPinIcon, CalendarDaysIcon, DollarSignIcon, SparklesIcon, LightbulbIcon, AlertTriangleIcon, CloudSunIcon } from "lucide-react";

// Local form schema, can include UI-specific refinements or omit fields if needed
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
  desiredMood: z.string().optional(),
  riskContext: z.string().optional(), 
  weatherContext: z.string().optional(), // Kept for direct weather input, though Guardian AI will infer too
});

type TripInputFormProps = {
  onItinerariesFetched: (itineraries: AITripPlannerOutput["itineraries"] | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  onSubmitProp?: (values: AITripPlannerInputTypeFromFlow) => Promise<void>; // Use type from flow
  initialValues?: Partial<AITripPlannerInputTypeFromFlow> | null; 
};

const suggestedPrompts = [
  "7-day romantic getaway to Paris for $2000",
  "Adventure trip to Costa Rican rainforests, 10 days, budget $3000",
  "Budget-friendly family vacation to US national parks in California for a week",
  "Cultural exploration of Kyoto, Japan for 5 days with $1500",
];

export function TripInputForm({ setIsLoading, onSubmitProp, initialValues }: TripInputFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
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
      destination: initialValues?.destination || "",
      travelDates: initialValues?.travelDates || "",
      budget: initialValues?.budget || 1000,
      desiredMood: initialValues?.desiredMood || "",
      riskContext: initialValues?.riskContext || "",
      weatherContext: initialValues?.weatherContext || "",
    });
  }, [initialValues, form]);


  async function handleSubmit(values: z.infer<typeof formSchema>) {
    if (onSubmitProp) {
      setIsLoading(true);
      const plannerInput: AITripPlannerInputTypeFromFlow = {
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
    const parts = promptText.split(" for ");
    let destinationAndDates = parts[0];
    let budgetStr = parts[1]?.split(" budget $")?.[1] || parts[1]?.split(" $")?.[1];
    let destination = destinationAndDates;
    let travelDates = "a week"; // Default travel dates if not parsed

    // Attempt to parse destination and travel dates
    const dateKeywords = [" week", " weeks", " day", " days", " getaway", " trip"];
    let parsedDate = "";
    for (const keyword of dateKeywords) {
        if (destinationAndDates.toLowerCase().includes(keyword)) {
            const splitPoint = destinationAndDates.toLowerCase().lastIndexOf(keyword);
            // Ensure "to" is not part of date keyword (e.g. "trip to Paris")
            if (destinationAndDates.toLowerCase().substring(0, splitPoint).trim().endsWith(" to")){
                 // "trip to Paris for ..." - date is likely in the original string or default
            } else {
                parsedDate = destinationAndDates.substring(0, splitPoint + keyword.length).trim();
                destination = destinationAndDates.substring(splitPoint + keyword.length).replace(/^to\s+/i, '').trim(); // Remove leading "to "
                break;
            }
        }
    }
    if (parsedDate) travelDates = parsedDate;
    else if (destinationAndDates.includes(",")) { // Fallback for "Kyoto, Japan for 5 days"
        const firstComma = destinationAndDates.indexOf(",");
        destination = destinationAndDates.substring(0, firstComma).trim();
        travelDates = destinationAndDates.substring(firstComma + 1).trim();
    }


    form.setValue("destination", destination.trim() || "Paris, France"); // Ensure destination has a fallback
    form.setValue("travelDates", travelDates.trim() || "a week");
    if (budgetStr) {
      form.setValue("budget", parseInt(budgetStr.replace(/,/g, ''), 10) || 1000);
    } else {
      form.setValue("budget", 1500); // Default budget if not parsed
    }
    
    // Clear mood and risk for general prompts
    form.setValue("desiredMood", ""); 
    form.setValue("riskContext", ""); 
    form.setValue("weatherContext", "");
  };

  return (
    <div className="w-full">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 py-4">
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
            <FormField
              control={form.control}
              name="desiredMood"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><LightbulbIcon className="w-4 h-4 mr-2" />Desired Mood/Vibe (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Relaxing, Adventurous, Romantic, Cultural" {...field} />
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
                  <FormLabel className="flex items-center"><AlertTriangleIcon className="w-4 h-4 mr-2" />Specific Concerns or Preferences (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Visa questions, prefer sunny weather, mobility concerns" {...field} />
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
                  <FormLabel className="flex items-center"><CloudSunIcon className="w-4 h-4 mr-2" />Specific Weather Context (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 'Expecting lots of sun', 'Might be rainy season'" {...field} />
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
              {initialValues ? "Update Plan" : "Get AI Trip Plan"}
            </Button>
          </form>
        </Form>
        <div className="mt-2 pt-4 border-t border-border">
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
    </div>
  );
}
