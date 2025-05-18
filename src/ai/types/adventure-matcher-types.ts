
/**
 * @fileOverview Type definitions and Zod schemas for the Adventure Quiz and Matcher AI.
 */
import { z } from 'genkit';
import { AITripPlannerInputSchema } from '@/ai/types/trip-planner-types';

// Schema for the quiz answers, moved from AdventureQuizForm
export const AdventureQuizInputSchema = z.object({
  pace: z.enum(["relaxing", "balanced", "action-packed"], {
    required_error: "Please select your ideal vacation pace.",
  }).describe("The user's preferred vacation pace."),
  environment: z.enum(["beach", "mountains", "city", "countryside"], {
    required_error: "Please select your preferred environment.",
  }).describe("The user's preferred travel environment."),
  interest: z.enum(["culture-history", "food-drink", "adventure-outdoors", "wellness-relaxation"], {
    required_error: "Please select your primary travel interest.",
  }).describe("The user's primary travel interest."),
  style: z.enum(["budget", "mid-range", "luxury"], {
    required_error: "Please select your travel style.",
  }).describe("The user's preferred travel style regarding budget/comfort."),
  company: z.enum(["solo", "partner", "family", "friends"], {
    required_error: "Please select who you usually travel with.",
  }).describe("The user's typical travel companions."),
});
export type AdventureQuizInput = z.infer<typeof AdventureQuizInputSchema>;

// Schema for a single adventure suggestion
export const AdventureSuggestionSchema = z.object({
  name: z.string().describe("A catchy name for the suggested travel persona or adventure type (e.g., 'Cultural Explorer', 'Thrill-Seeking Naturalist', 'Urban Foodie')."),
  description: z.string().describe("A brief, engaging description of this travel persona or adventure type."),
  exampleDestinations: z.array(z.string()).min(1).max(3).describe("An array of 1-3 example destinations that fit this persona/adventure (e.g., ['Rome, Italy', 'Kyoto, Japan'])."),
  matchReasoning: z.string().describe("A short explanation (1-2 sentences) of why this suggestion aligns well with the user's quiz answers, highlighting key connections."),
  suggestedTripIdea: AITripPlannerInputSchema.optional().describe("An optional, concrete trip idea (destination, travelDates, budget) that the user can directly use to start planning. Be creative and ensure it's plausible for the persona."),
});
export type AdventureSuggestion = z.infer<typeof AdventureSuggestionSchema>;

// Schema for the overall output of the Adventure Matcher AI
export const AdventureMatcherOutputSchema = z.object({
  suggestions: z.array(AdventureSuggestionSchema).min(1).max(3).describe("An array of 1 to 3 personalized adventure suggestions based on the quiz answers."),
});
export type AdventureMatcherOutput = z.infer<typeof AdventureMatcherOutputSchema>;
