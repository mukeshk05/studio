
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SendIcon, SparklesIcon } from "lucide-react";
import React from "react";

const quizSchema = z.object({
  pace: z.enum(["relaxing", "balanced", "action-packed"], {
    required_error: "Please select your ideal vacation pace.",
  }),
  environment: z.enum(["beach", "mountains", "city", "countryside"], {
    required_error: "Please select your preferred environment.",
  }),
  interest: z.enum(["culture-history", "food-drink", "adventure-outdoors", "wellness-relaxation"], {
    required_error: "Please select your primary travel interest.",
  }),
  style: z.enum(["budget", "mid-range", "luxury"], {
    required_error: "Please select your travel style.",
  }),
  company: z.enum(["solo", "partner", "family", "friends"], {
    required_error: "Please select who you usually travel with.",
  }),
});

type QuizFormValues = z.infer<typeof quizSchema>;

interface AdventureQuizFormProps {
  onSubmit: (data: QuizFormValues) => void;
}

const quizQuestions = [
  {
    name: "pace" as keyof QuizFormValues,
    label: "What's your ideal vacation pace?",
    options: [
      { value: "relaxing", label: "Relaxing (Chilling out, leisurely activities)" },
      { value: "balanced", label: "Balanced (A mix of activities and downtime)" },
      { value: "action-packed", label: "Action-packed (Always on the go, exploring)" },
    ],
  },
  {
    name: "environment" as keyof QuizFormValues,
    label: "Which environment recharges you the most?",
    options: [
      { value: "beach", label: "Sandy Beaches & Ocean Breezes" },
      { value: "mountains", label: "Majestic Mountains & Fresh Air" },
      { value: "city", label: "Vibrant Cities & Urban Exploration" },
      { value: "countryside", label: "Quiet Countryside & Nature Escapes" },
    ],
  },
  {
    name: "interest" as keyof QuizFormValues,
    label: "What's your primary travel interest?",
    options: [
      { value: "culture-history", label: "Culture & History (Museums, ancient sites)" },
      { value: "food-drink", label: "Food & Drink (Culinary experiences, local markets)" },
      { value: "adventure-outdoors", label: "Adventure & Outdoors (Hiking, water sports)" },
      { value: "wellness-relaxation", label: "Wellness & Relaxation (Spas, yoga retreats)" },
    ],
  },
  {
    name: "style" as keyof QuizFormValues,
    label: "How would you describe your travel style?",
    options: [
      { value: "budget", label: "Budget-friendly (Hostels, local eateries)" },
      { value: "mid-range", label: "Mid-range Comfort (Boutique hotels, varied dining)" },
      { value: "luxury", label: "Luxury (High-end resorts, fine dining)" },
    ],
  },
  {
    name: "company" as keyof QuizFormValues,
    label: "Who do you usually travel with?",
    options: [
      { value: "solo", label: "Solo Adventure" },
      { value: "partner", label: "With my Partner" },
      { value: "family", label: "Family Fun" },
      { value: "friends", label: "With Friends" },
    ],
  },
];

export function AdventureQuizForm({ onSubmit }: AdventureQuizFormProps) {
  const form = useForm<QuizFormValues>({
    resolver: zodResolver(quizSchema),
  });

  function handleFormSubmit(data: QuizFormValues) {
    onSubmit(data);
    // form.reset(); // Optionally reset form after submission
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
        <Button type="submit" className="w-full text-lg py-6 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? (
            <SparklesIcon className="mr-2 h-5 w-5 animate-pulse" />
          ) : (
            <SendIcon className="mr-2 h-5 w-5" />
          )}
          Find My Adventure Style
        </Button>
      </form>
    </Form>
  );
}
