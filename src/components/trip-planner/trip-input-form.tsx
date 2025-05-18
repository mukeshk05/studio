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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { aiTripPlanner, type AITripPlannerOutput } from "@/ai/flows/ai-trip-planner";
import React, { useState } from "react";
import { Loader2Icon, MapPinIcon, CalendarDaysIcon, DollarSignIcon, SparklesIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  destination: z.string().min(2, {
    message: "Destination must be at least 2 characters.",
  }),
  travelDates: z.string().min(5, { // e.g., "12/25 - 12/30" or "Next week"
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
    onItinerariesFetched(null); // Clear previous results
    try {
      const result = await aiTripPlanner(values);
      onItinerariesFetched(result.itineraries);
      toast({
        title: "Trip Options Generated!",
        description: "Explore the itineraries below.",
      });
    } catch (error) {
      console.error("Error planning trip:", error);
      onItinerariesFetched(null);
      toast({
        title: "Error",
        description: "Could not generate trip options. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
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
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <SparklesIcon className="mr-2 h-4 w-4" />
              )}
              Plan My Trip
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
