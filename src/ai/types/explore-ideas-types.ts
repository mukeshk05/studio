
/**
 * @fileOverview Type definitions and Zod schemas for the AI-powered "Ideas for You" on the Explore page,
 * based on user search history.
 */
import { z } from 'zod';
import { HotelIdeaSchema, FlightIdeaSchema } from '@/ai/types/popular-destinations-types'; // Reusing these

export const ExploreIdeasFromHistoryInputSchema = z.object({
  userId: z.string().describe("The unique identifier of the user whose search history will be used."),
});
export type ExploreIdeasFromHistoryInput = z.infer<typeof ExploreIdeasFromHistoryInputSchema>;

export const ExploreIdeaSuggestionSchema = z.object({
  id: z.string().describe("A unique identifier for the suggestion."),
  title: z.string().describe("A catchy title for the personalized trip idea (e.g., 'Revisit Your Rome Interest with a Tuscan Twist')."),
  destination: z.string().describe("The primary suggested destination (e.g., 'Tuscany, Italy')."),
  country: z.string().describe("The country of the suggested destination."),
  description: z.string().describe("A captivating 2-3 sentence description highlighting why this idea is suggested, possibly linking to past search interests."),
  hotelIdea: HotelIdeaSchema.optional().describe("Conceptual hotel idea for this destination."),
  flightIdea: FlightIdeaSchema.optional().describe("Conceptual flight idea for reaching this destination."),
  imagePrompt: z.string().describe("A concise text prompt suitable for generating an iconic image of this destination/idea."),
  imageUri: z.string().nullable().describe("Data URI of the AI-generated image for the destination/idea."),
  latitudeString: z.string().optional().describe("Approximate latitude of the destination as a STRING."),
  longitudeString: z.string().optional().describe("Approximate longitude of the destination as a STRING."),
  originalSearchHint: z.string().optional().describe("A brief note on which part of the user's search history inspired this suggestion (e.g., 'Inspired by your search for Rome')."),
});
export type ExploreIdeaSuggestion = z.infer<typeof ExploreIdeaSuggestionSchema>;

export const ExploreIdeasOutputSchema = z.object({
  suggestions: z.array(ExploreIdeaSuggestionSchema).describe("An array of 1-2 personalized trip ideas based on search history."),
  contextualNote: z.string().optional().describe("A note about how these suggestions were derived, or if no history was found."),
});
export type ExploreIdeasOutput = z.infer<typeof ExploreIdeasOutputSchema>;
