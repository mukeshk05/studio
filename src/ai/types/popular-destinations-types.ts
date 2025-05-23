
/**
 * @fileOverview Type definitions and Zod schemas for the AI Popular Destinations feature.
 */
import { z } from 'genkit';

export const PopularDestinationsInputSchema = z.object({
  userLatitude: z.number().optional().describe("User's current latitude for location-aware suggestions."),
  userLongitude: z.number().optional().describe("User's current longitude for location-aware suggestions."),
  interest: z.string().optional().describe("A specific travel interest category, e.g., 'Beaches', 'Adventure', 'Cultural Sites'."),
});
export type PopularDestinationsInput = z.infer<typeof PopularDestinationsInputSchema>;

export const HotelIdeaSchema = z.object({
  type: z.string().describe("General type of hotel suggested (e.g., 'Boutique Hotel', 'Luxury Resort', 'Budget Hostel')."),
  priceRange: z.string().describe("Conceptual price range per night (e.g., '$150-$250', 'Under $100')."),
});
export type HotelIdea = z.infer<typeof HotelIdeaSchema>;

export const FlightIdeaSchema = z.object({
  description: z.string().describe("General description of flight accessibility or typical routes (e.g., 'Well-connected from major European cities', 'Direct flights available from West Coast US')."),
  priceRange: z.string().describe("Conceptual roundtrip price range from major hubs (e.g., '$300-$600', '$800+ for international')."),
});
export type FlightIdea = z.infer<typeof FlightIdeaSchema>;

export const AiDestinationSuggestionSchema = z.object({
  name: z.string().describe("Name of the suggested destination."),
  country: z.string().describe("Country where the destination is located."),
  description: z.string().describe("A short, captivating description of the destination (2-3 sentences)."),
  latitude: z.number().optional().describe("Approximate latitude of the destination."),
  longitude: z.number().optional().describe("Approximate longitude of the destination."),
  imagePrompt: z.string().describe("A concise text prompt suitable for generating an iconic image of this destination."),
  imageUri: z.string().optional().describe("Data URI of the AI-generated image for the destination."),
  hotelIdea: HotelIdeaSchema.optional().describe("Conceptual hotel idea for this destination."),
  flightIdea: FlightIdeaSchema.optional().describe("Conceptual flight idea for reaching this destination."),
});
export type AiDestinationSuggestion = z.infer<typeof AiDestinationSuggestionSchema>;

export const PopularDestinationsOutputSchema = z.object({
  destinations: z.array(AiDestinationSuggestionSchema).describe("An array of AI-suggested popular travel destinations, potentially with coordinates."),
  contextualNote: z.string().optional().describe("A note about how the suggestions were derived, e.g., based on location or general popularity.")
});
export type PopularDestinationsOutput = z.infer<typeof PopularDestinationsOutputSchema>;

