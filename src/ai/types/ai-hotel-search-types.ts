
/**
 * @fileOverview Type definitions and Zod schemas for the AI Hotel Search feature.
 */
import { z } from 'genkit';

export const AiHotelSearchInputSchema = z.object({
  destination: z.string().min(3, { message: "Destination must be at least 3 characters." })
    .describe('The city or area where the user wants to find a hotel, or a contextual query like "Hotels near latitude X, longitude Y".'),
  checkInDate: z.string().describe('The desired check-in date (e.g., "YYYY-MM-DD").'),
  checkOutDate: z.string().describe('The desired check-out date (e.g., "YYYY-MM-DD").'),
  guests: z.string().min(1, { message: "Guest information is required." })
    .describe('Number and type of guests (e.g., "2 adults", "2 adults, 1 child").'),
});
export type AiHotelSearchInput = z.infer<typeof AiHotelSearchInputSchema>;

export const AiHotelSuggestionSchema = z.object({
  name: z.string().describe("The name of the suggested hotel."),
  conceptualPriceRange: z.string().describe("A conceptual price range per night (e.g., '$150 - $250 / night', 'Around $180 per night')."),
  rating: z.number().min(0).max(5).optional().describe("A conceptual guest rating for the hotel (e.g., 4.5 out of 5)."),
  description: z.string().describe("A short, appealing description of the hotel (2-3 sentences)."),
  amenities: z.array(z.string()).min(2).max(7).describe("A list of 3-5 key amenities (e.g., ['Pool', 'Free WiFi', 'Parking', 'Restaurant', 'Gym'])."),
  imagePrompt: z.string().describe("A concise text prompt suitable for generating an attractive photo of the hotel (e.g., 'luxury hotel lobby paris', 'boutique hotel room ocean view', 'hotel exterior modern design sunny')."),
  imageUri: z.string().optional().describe("Data URI of the AI-generated image for the hotel. Populated by the flow."),
  latitude: z.number().optional().describe("Approximate latitude of the hotel. Critical for map display."),
  longitude: z.number().optional().describe("Approximate longitude of the hotel. Critical for map display."),
});
export type AiHotelSuggestion = z.infer<typeof AiHotelSuggestionSchema>;

export const AiHotelSearchOutputSchema = z.object({
  hotels: z.array(AiHotelSuggestionSchema).describe("An array of 3-4 AI-suggested hotel options based on the user's query."),
  searchSummary: z.string().optional().describe("An optional overall summary message from the AI, e.g., 'Found some great options for your stay in Paris!' or notes if suggestions are broad."),
});
export type AiHotelSearchOutput = z.infer<typeof AiHotelSearchOutputSchema>;

