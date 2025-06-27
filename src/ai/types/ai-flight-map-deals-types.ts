
/**
 * @fileOverview Type definitions for AI Flight Map Deals feature.
 */
import { z } from 'zod';

export const AiFlightMapDealInputSchema = z.object({
  originDescription: z.string()
    .describe("A description of the origin, e.g., 'User's current location (approx. Lat X, Lon Y)' or a specific city name if location isn't available/used."),
  targetDestinationCity: z.string().min(3, { message: "Target destination city must be at least 3 characters." })
    .describe("The specific destination city the user wants to explore deals for."),
});
export type AiFlightMapDealInput = z.infer<typeof AiFlightMapDealInputSchema>;

export const DealVariationSchema = z.object({
  travelDatesHint: z.string().describe("A hint for alternative travel dates, e.g., 'Next month, mid-week', 'A long weekend in 3 weeks', 'Early December for 5 days'."),
  conceptualPriceVariation: z.string().describe("A conceptual price for this variation, e.g., 'Around $280', 'Slightly lower if flexible', 'About $350 during peak'."),
});
export type DealVariation = z.infer<typeof DealVariationSchema>;

export const AiFlightMapDealSuggestionSchema = z.object({
  destinationCity: z.string().describe("The suggested destination city."),
  country: z.string().describe("The country of the destination city."),
  latitude: z.number().describe("Approximate latitude of the destination city."),
  longitude: z.number().describe("Approximate longitude of the destination city."),
  conceptualPriceRange: z.string().describe("A conceptual price range for a good flight deal (e.g., '$200 - $350')."),
  dealReason: z.string().describe("A brief, plausible reason why this might be a good deal (e.g., 'Known budget airline route', 'Shoulder season travel')."),
  imagePrompt: z.string().describe("A concise 4-6 word image prompt for an iconic, appealing travel photo of this destination."),
  imageUri: z.string().optional().describe("Data URI of the AI-generated image for the destination. Populated by the flow."),
  dealVariations: z.array(DealVariationSchema).optional().describe("Alternative conceptual date hints and price variations for this destination."),
});
export type AiFlightMapDealSuggestion = z.infer<typeof AiFlightMapDealSuggestionSchema>;

export const AiFlightMapDealOutputSchema = z.object({
  suggestions: z.array(AiFlightMapDealSuggestionSchema)
    .describe("An array of AI-suggested flight deal destinations. Typically one when a specific target destination is provided."),
  contextualNote: z.string().optional().describe("A note about how the suggestions were derived or if no specific deals could be conceptualized."),
});
export type AiFlightMapDealOutput = z.infer<typeof AiFlightMapDealOutputSchema>;
