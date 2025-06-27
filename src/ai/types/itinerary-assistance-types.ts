
/**
 * @fileOverview Type definitions and Zod schemas for the AI Itinerary Assistance feature.
 */
import { z } from 'zod';

export const SuggestedAdditionSchema = z.object({
  type: z.enum(["activity", "tour", "restaurant", "experience", "hidden_gem"]).describe("The type of suggestion (e.g., activity, restaurant)."),
  name: z.string().describe("The name of the suggested item (e.g., 'Louvre Museum Visit', 'Local Food Tour', 'Le Jules Verne Restaurant')."),
  description: z.string().describe("A brief, engaging description of the suggestion."),
  estimatedCost: z.number().optional().describe("Estimated cost in USD, if applicable (e.g., ticket price, average meal cost). Omit if free or highly variable."),
  relevanceReasoning: z.string().describe("A short explanation of why this suggestion is a good fit for the user's trip and persona."),
  bookingLink: z.string().optional().describe("A placeholder for a potential booking or information link."),
  imagePrompt: z.string().optional().describe("A concise text prompt suitable for generating a representative image for this suggestion."),
  imageUri: z.string().optional().describe("A data URI of a generated image representing this suggestion. Populated by the flow if image generation is included."),
});
export type SuggestedAddition = z.infer<typeof SuggestedAdditionSchema>;

export const ItineraryAssistanceInputSchema = z.object({
  userId: z.string().optional().describe("The ID of the user, for fetching persona."),
  destination: z.string().describe("The primary destination of the trip."),
  travelDates: z.string().describe("The travel dates for the trip."),
  budget: z.number().optional().describe("The overall budget for the trip in USD (if known)."),
  existingActivities: z.string().optional().describe("A summary of activities already planned or key interests for the trip (e.g., 'Visiting Eiffel Tower, interested in art museums')."),
  hotelStyle: z.string().optional().describe("The style of accommodation if known (e.g., 'luxury', 'boutique', 'budget')."),
  userPersonaName: z.string().optional().describe("The name of the user's travel persona."),
  userPersonaDescription: z.string().optional().describe("The description of the user's travel persona."),
});
export type ItineraryAssistanceInput = z.infer<typeof ItineraryAssistanceInputSchema>;

export const ItineraryAssistanceOutputSchema = z.object({
  suggestedAdditions: z.array(SuggestedAdditionSchema).min(1).max(5).describe("An array of 2 to 4 suggested additions to enrich the itinerary."),
  assistanceSummary: z.string().optional().describe("A brief overall summary or tip from the AI assistant related to the suggestions."),
});
export type ItineraryAssistanceOutput = z.infer<typeof ItineraryAssistanceOutputSchema>;
