
/**
 * @fileOverview Type definitions for AI Flight Map Deals feature.
 */
import { z } from 'genkit';

export const AiFlightMapDealInputSchema = z.object({
  originCity: z.string().min(3, { message: "Origin city must be at least 3 characters." })
    .describe("The city from which the user wants to see conceptual flight deals."),
});
export type AiFlightMapDealInput = z.infer<typeof AiFlightMapDealInputSchema>;

export const AiFlightMapDealSuggestionSchema = z.object({
  destinationCity: z.string().describe("The suggested destination city."),
  country: z.string().describe("The country of the destination city."),
  latitude: z.number().describe("Approximate latitude of the destination city."),
  longitude: z.number().describe("Approximate longitude of the destination city."),
  conceptualPriceRange: z.string().describe("A conceptual price range for a good flight deal (e.g., '$200 - $350')."),
  dealReason: z.string().describe("A brief, plausible reason why this might be a good deal (e.g., 'Known budget airline route', 'Shoulder season travel')."),
  imagePrompt: z.string().describe("A concise 4-6 word image prompt for an iconic, appealing travel photo of this destination."),
  imageUri: z.string().optional().describe("Data URI of the AI-generated image for the destination. Populated by the flow."),
});
export type AiFlightMapDealSuggestion = z.infer<typeof AiFlightMapDealSuggestionSchema>;

export const AiFlightMapDealOutputSchema = z.object({
  suggestions: z.array(AiFlightMapDealSuggestionSchema)
    .describe("An array of 3-5 AI-suggested flight deal destinations from the origin city."),
  contextualNote: z.string().optional().describe("A note about how the suggestions were derived or if no specific deals could be conceptualized."),
});
export type AiFlightMapDealOutput = z.infer<typeof AiFlightMapDealOutputSchema>;

