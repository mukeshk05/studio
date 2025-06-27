
/**
 * @fileOverview Type definitions and Zod schemas for the AI Local Insider Tips feature.
 */
import { z } from 'zod';

export const LocalInsiderTipsInputSchema = z.object({
  destination: z.string().describe('The city or area for which insider tips are requested.'),
  desiredMood: z.string().optional().describe('The user\'s current desired mood or vibe (e.g., "adventurous", "foodie", "relaxed").'),
  weatherContext: z.string().optional().describe('A brief description of the current or expected weather (e.g., "sunny and warm", "chilly evening", "light rain").'),
});
export type LocalInsiderTipsInput = z.infer<typeof LocalInsiderTipsInputSchema>;

export const TipItemSchema = z.object({
  name: z.string().describe('The name of the spot, gem, or activity.'),
  description: z.string().describe('A brief description of it.'),
  reason: z.string().describe('Why this is a good pick based on the context (mood, weather, trends).'),
});
export type TipItem = z.infer<typeof TipItemSchema>;

export const LocalInsiderTipsOutputSchema = z.object({
  trendingSpotsSummary: z.string().describe('A summary of 2-3 popular or trending food/drink spots, as if derived from local trends.'),
  hiddenGemPick: TipItemSchema.describe('A specific "hidden gem" (lesser-known place) suggestion tailored to the user\'s mood and context.'),
  dailyActivityPick: TipItemSchema.describe('A specific activity suggestion for the day, suitable for the weather and mood.'),
  availabilityNotes: z.string().describe('A general, plausible note on typical restaurant/activity availability or crowd levels.'),
});
export type LocalInsiderTipsOutput = z.infer<typeof LocalInsiderTipsOutputSchema>;
