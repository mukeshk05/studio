
/**
 * @fileOverview Type definitions and Zod schemas for the AI Serendipity Engine feature.
 */
import { z } from 'genkit';

export const SerendipitySuggestionSchema = z.object({
  name: z.string().describe("A catchy name for the serendipitous find (e.g., 'Hidden Rooftop Jazz Jam', 'Secret Waterfall Hike', 'Pop-Up Artisan Market')."),
  description: z.string().describe("A brief, enticing description of what it is and why it's special or unique."),
  reasoning: z.string().describe("Why this specific suggestion is a great, unexpected find that aligns with the user's stated mood/interest and the destination's character."),
  visualPrompt: z.string().optional().describe("A concise text prompt (3-7 words) suitable for an image generation AI to create a visually representative and perhaps slightly whimsical image for this suggestion (e.g., 'hidden jazz club Paris night', 'pop-up food stall Kyoto', 'secret garden poetry reading')."),
  imageUri: z.string().optional().describe("A data URI of a generated image representing this suggestion. Populated by the flow if image generation is included."),
});
export type SerendipitySuggestion = z.infer<typeof SerendipitySuggestionSchema>;


export const SerendipityInputSchema = z.object({
  destination: z.string().min(3, { message: "Destination must be at least 3 characters." })
    .describe('The current travel destination or city/area the user is in (e.g., "Shibuya, Tokyo", "Paris, France").'),
  currentMoodOrInterest: z.string().min(5, { message: "Please describe your mood or interest (at least 5 characters)." })
    .describe('A textual description of the user\'s current mood or specific interest (e.g., "Feeling adventurous", "Looking for unique street art", "Want to find a quiet cafe for reading").'),
});
export type SerendipityInput = z.infer<typeof SerendipityInputSchema>;

export const SerendipityOutputSchema = z.object({
  suggestions: z.array(SerendipitySuggestionSchema).min(0).max(3)
    .describe("An array of 0 to 3 unique, plausible, and seemingly spontaneous local events, hidden gems, or activities. Each suggestion should include a name, description, reasoning, and an optional visual prompt for image generation."),
});
export type SerendipityOutput = z.infer<typeof SerendipityOutputSchema>;

