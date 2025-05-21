
/**
 * @fileOverview Type definitions and Zod schemas for the AI Local Legend & Folklore Narrator.
 */
import { z } from 'genkit';

export const LocalLegendNarratorInputSchema = z.object({
  destination: z.string().min(3, { message: "Destination must be at least 3 characters." })
    .describe('The primary travel destination (e.g., "Edinburgh, Scotland", "Kyoto, Japan").'),
  landmarkOrContext: z.string().optional()
    .describe('Optional: A specific landmark, area, or context within the destination (e.g., "Edinburgh Castle", "Gion district", "about its oldest bridge"). If not provided, a general legend for the destination will be sought.'),
});
export type LocalLegendNarratorInput = z.infer<typeof LocalLegendNarratorInputSchema>;

export const LocalLegendNarratorOutputSchema = z.object({
  legendTitle: z.string().describe('A catchy and appropriate title for the legend or story (e.g., "The Tale of the Greyfriars Bobby", "The Ghost of Himeji Castle").'),
  narrative: z.string().describe('The full narrative of the local legend, folklore, or historical anecdote. This should be engaging and atmospheric.'),
  relatedLandmarks: z.array(z.string()).optional()
    .describe('Optional: A list of 1-3 other specific landmarks or places related to this story within the destination.'),
  historicalContext: z.string().optional()
    .describe('Optional: A brief (1-2 sentences) historical or cultural context that helps understand the story better.'),
  visualPrompt: z.string().optional().describe('A concise text prompt (3-7 words) suitable for generating a visually representative image for this legend (e.g., "mysterious old scottish castle night", "samurai ghost ancient japan").'),
  imageUri: z.string().optional().describe("A data URI of a generated image representing this legend. Populated by the flow if image generation is included."),
});
export type LocalLegendNarratorOutput = z.infer<typeof LocalLegendNarratorOutputSchema>;
