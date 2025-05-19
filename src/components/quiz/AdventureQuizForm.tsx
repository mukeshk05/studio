
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SparklesIcon, Loader2Icon } from "lucide-react";
import React from "react";
import { AdventureQuizInputSchema, type AdventureQuizInput } from "@/ai/types/adventure-matcher-types";

interface AdventureQuizFormProps {
  onSubmit: (data: AdventureQuizInput) => void;
  isSubmitting?: boolean;
}

const quizQuestions = [
  {
    name: "pace" as keyof AdventureQuizInput,
    label: "What's your ideal vacation pace?",
    options: [
      { value: "relaxing", label: "Relaxing (Chilling out, leisurely activities)" },
      { value: "balanced", label: "Balanced (A mix of activities and downtime)" },
      { value: "action-packed", label: "Action-packed (Always on the go, exploring)" },
    ],
  },
  {
    name: "environment" as keyof AdventureQuizInput,
    label: "Which environment recharges you the most?",
    options: [
      { value: "beach", label: "Sandy Beaches & Ocean Breezes" },
      { value: "mountains", label: "Majestic Mountains & Fresh Air" },
      { value: "city", label: "Vibrant Cities & Urban Exploration" },
      { value: "countryside", label: "Quiet Countryside & Nature Escapes" },
    ],
  },
  {
    name: "interest" as keyof AdventureQuizInput,
    label: "What's your primary travel interest?",
    options: [
      { value: "culture-history", label: "Culture & History (Museums, ancient sites)" },
      { value: "food-drink", label: "Food & Drink (Culinary experiences, local markets)" },
      { value: "adventure-outdoors", label: "Adventure & Outdoors (Hiking, water sports)" },
      { value: "wellness-relaxation", label: "Wellness & Relaxation (Spas, yoga retreats)" },
    ],
  },
  {
    name: "style" as keyof AdventureQuizInput,
    label: "How would you describe your travel style?",
    options: [
      { value: "budget", label: "Budget-friendly (Hostels, local eateries)" },
      { value: "mid-range", label: "Mid-range Comfort (Boutique hotels, varied dining)" },
      { value: "luxury", label: "Luxury (High-end resorts, fine dining)" },
    ],
  },
  {
    name: "company" as keyof AdventureQuizInput,
    label: "Who do you usually travel with?",
    options: [
      { value: "solo", label: "Solo Adventure" },
      { value: "partner", label: "With my Partner" },
      { value: "family", label: "Family Fun" },
      { value: "friends", label: "With Friends" },
    ],
  },
];

export function AdventureQuizForm({ onSubmit, isSubmitting }: AdventureQuizFormProps) {
  const form = useForm<AdventureQuizInput>({
    resolver: zodResolver(AdventureQuizInputSchema),
    defaultValues: {
        pace: undefined,
        environment: undefined,
        interest: undefined,
        style: undefined,
        company: undefined,
    }
  });

  function handleFormSubmit(data: AdventureQuizInput) {
    onSubmit(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
        {quizQuestions.map((question) => (
          <FormField
            key={question.name}
            control={form.control}
            name={question.name}
            render={({ field }) => (
              <FormItem className="space-y-3 p-4 rounded-lg border border-border/50 bg-card/40">
                <FormLabel className="text-md font-semibold text-card-foreground">
                  {question.label}
                </FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-2"
                  >
                    {question.options.map((option) => (
                      <FormItem
                        key={option.value}
                        className="flex items-center space-x-3 space-y-0 p-2 rounded-md hover:bg-primary/10 transition-colors cursor-pointer"
                      >
                        <FormControl>
                          <RadioGroupItem value={option.value} />
                        </FormControl>
                        <FormLabel className="font-normal text-sm text-card-foreground/90 cursor-pointer">
                          {option.label}
                        </FormLabel>
                      </FormItem>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
        <Button
          type="submit"
          size="lg"
          className="w-full text-lg py-3 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40"
          disabled={isSubmitting || form.formState.isSubmitting}
        >
          {isSubmitting || form.formState.isSubmitting ? (
            <Loader2Icon className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <SparklesIcon className="mr-2 h-5 w-5" />
          )}
          Find My Adventure Style
        </Button>
      </form>
    </Form>
  );
}
