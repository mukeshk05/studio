
/**
 * @fileOverview Type definitions and Zod schemas for the Smart Bundle Generator.
 */
import { z } from 'genkit';
import { AITripPlannerInputSchema } from '@/ai/types/trip-planner-types';
// Import the updated FlightOption and HotelOption types that reflect SerpApi structure
import type { FlightOption, HotelOption } from '@/lib/types'; 
import { ActivitySuggestionSchema as ThingsToDoActivitySuggestionSchema } from './things-to-do-types';

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
  reasoning: z.string().describe("A brief explanation of why this bundle is suggested, based on the user's history, availability, and interests. Should also include 2-3 keywords or types of activities that fit the bundle theme."),
  tripIdea: AITripPlannerInputSchema.describe("A concrete trip idea that can be directly used as input for the AI Trip Planner, including destination, travelDates, and budget."),
  // New fields for real data augmentation
  realFlightExample: z.custom<FlightOption>().optional().describe("A sample real flight option based on SerpApi search for the trip idea."),
  realHotelExample: z.custom<HotelOption>().optional().describe("A sample real hotel option based on SerpApi search for the trip idea."),
  estimatedRealPriceRange: z.string().optional().describe("A price range string based on the sum of the real flight and hotel examples (e.g., '$1800 - $2500')."),
  priceFeasibilityNote: z.string().optional().describe("A note comparing AI's conceptual budget with findings from real-time checks."),
  suggestedActivities: z.array(ThingsToDoActivitySuggestionSchema).optional().describe("An array of AI-suggested activities relevant to this bundle. Populated by the server action after the AI flow."),
  bundleImagePrompt: z.string().optional().describe("A concise text prompt for an image generation AI to create an inspiring photo for this bundle's theme and destination."),
  bundleImageUri: z.string().optional().describe("Data URI of the AI-generated image for the bundle. Populated by the server action."),
  activityKeywords: z.array(z.string()).optional().describe("2-3 keywords or types of activities that would suit this bundle's theme and destination (e.g., 'historical sites', 'street food', 'hiking trails').")
});
export type BundleSuggestion = z.infer<typeof BundleSuggestionSchema>;

export const SmartBundleOutputSchema = z.object({
  suggestions: z.array(BundleSuggestionSchema).min(0).max(2).describe("An array of 0 to 2 suggested trip bundles, potentially augmented with real data and suggested activities."),
});
export type SmartBundleOutput = z.infer<typeof SmartBundleOutputSchema>;

