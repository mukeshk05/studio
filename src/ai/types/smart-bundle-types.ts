
/**
 * @fileOverview Type definitions and Zod schemas for the Smart Bundle Generator.
 */
import { z } from 'genkit';
import { AITripPlannerInputSchema } from '@/ai/types/trip-planner-types';

// Input Schema
export const SmartBundleInputSchema = z.object({
  userId: z.string().describe("The ID of the user requesting the bundle."),
  upcomingAvailability: z.string().optional().describe("User-provided text about their upcoming availability (e.g., 'Long weekend next month', 'Free in July')."),
  travelInterests: z.string().optional().describe("User-provided text about their general travel interests (e.g., 'History and food', 'Adventure travel, beaches')."),
});
export type SmartBundleInput = z.infer<typeof SmartBundleInputSchema>;

// Output Schema
export const BundleSuggestionSchema = z.object({
  bundleName: z.string().describe("A creative and descriptive name for the suggested trip bundle (e.g., 'Historical European Capitals Tour', 'Relaxing Beach Getaway for July')."),
  reasoning: z.string().describe("A brief explanation of why this bundle is suggested, based on the user's history, availability, and interests."),
  tripIdea: AITripPlannerInputSchema.describe("A concrete trip idea that can be directly used as input for the AI Trip Planner, including destination, travelDates, and budget."),
});
export type BundleSuggestion = z.infer<typeof BundleSuggestionSchema>;

export const SmartBundleOutputSchema = z.object({
  suggestions: z.array(BundleSuggestionSchema).min(1).max(2).describe("An array of 1 to 2 suggested trip bundles."),
});
export type SmartBundleOutput = z.infer<typeof SmartBundleOutputSchema>;
