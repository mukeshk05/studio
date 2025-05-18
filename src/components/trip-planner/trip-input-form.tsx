
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
import type { AITripPlannerInput, AITripPlannerOutput } from "@/ai/flows/ai-trip-planner";
import React, { useEffect } from "react"; // Added useEffect
import { Loader2Icon, MapPinIcon, CalendarDaysIcon, DollarSignIcon, SparklesIcon, LightbulbIcon } from "lucide-react";

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
  onSubmitProp?: (values: AITripPlannerInput) => Promise<void>;
  initialValues?: Partial<AITripPlannerInput> | null; // Added prop
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
    },
  });

  useEffect(() => {
    // Reset the form when initialValues change
    form.reset({
      destination: initialValues?.destination || "",
      travelDates: initialValues?.travelDates || "",
      budget: initialValues?.budget || 1000,
    });
  }, [initialValues, form]);


  async function handleSubmit(values: z.infer<typeof formSchema>) {
    if (onSubmitProp) {
      setIsLoading(true);
      await onSubmitProp(values);
      setIsLoading(false);
    }
  }

  const handleSuggestionClick = (promptText: string) => {
    const parts = promptText.split(" for ");
    let destinationAndDates = parts[0];
    let budgetStr = parts[1]?.split(" budget $")?.[1] || parts[1]?.split(" $")?.[1];
    let destination = destinationAndDates;
    let travelDates = "a week";

    if (destinationAndDates.toLowerCase().includes(" to ")) {
        const destParts = destinationAndDates.split(" to ");
        if (destParts.length > 1) {
            travelDates = destParts[0].trim();
            destination = destParts.slice(1).join(" to ").trim();
            if (travelDates.toLowerCase().includes(" days")) travelDates = travelDates.split(" days")[0] + " days";
            else if (travelDates.toLowerCase().includes(" day")) travelDates = travelDates.split(" day")[0] + " day";
            else if (travelDates.toLowerCase().includes(" week")) travelDates = "a week";
        }
    } else if (destinationAndDates.includes(",")) {
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
