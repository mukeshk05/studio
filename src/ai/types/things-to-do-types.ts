
/**
 * @fileOverview Type definitions and Zod schemas for the AI-powered "Things to Do" feature.
 */
import { z } from 'zod';

export const ThingsToDoSearchInputSchema = z.object({
  location: z.string().min(3, { message: "Location must be at least 3 characters." })
    .describe('The city, region, or general area to search for things to do.'),
  interest: z.string().optional()
    .describe('Optional: A specific interest to filter activities (e.g., "history", "food", "outdoors").'),
});
export type ThingsToDoSearchInput = z.infer<typeof ThingsToDoSearchInputSchema>;

export const ActivitySuggestionSchema = z.object({
  name: z.string().describe("The name of the activity, attraction, or experience."),
  description: z.string().describe("A brief, engaging description (1-2 sentences)."),
  category: z.string().describe("A category for the activity (e.g., Museum, Park, Landmark, Tour, Food Experience, Shopping, Nightlife, Event)."),
  estimatedPrice: z.string().describe("A conceptual price indication (e.g., 'Free', '$10-20', 'Approx $50 per person', 'Varies')."),
  latitudeString: z.string().optional().describe("Approximate latitude as a STRING (e.g., \"48.8584\"). AI should provide this."),
  longitudeString: z.string().optional().describe("Approximate longitude as a STRING (e.g., \"2.2945\"). AI should provide this."),
  imagePrompt: z.string().describe("A concise text prompt suitable for generating an attractive photo representing this activity."),
  imageUri: z.string().optional().describe("Data URI of the AI-generated image. Populated by the flow."),
  latitude: z.number().optional().describe("Parsed latitude. Populated by the flow."),
  longitude: z.number().optional().describe("Parsed longitude. Populated by the flow."),
});
export type ActivitySuggestion = z.infer<typeof ActivitySuggestionSchema>;

export const ThingsToDoOutputSchema = z.object({
  activities: z.array(ActivitySuggestionSchema)
    .describe("An array of 4-6 AI-suggested things to do or attractions."),
  searchSummary: z.string().optional()
    .describe("An optional overall summary message from the AI related to the search, e.g., 'Here are some exciting things to do in Paris!'."),
});
export type ThingsToDoOutput = z.infer<typeof ThingsToDoOutputSchema>;
