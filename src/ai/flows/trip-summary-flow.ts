
'use server';
/**
 * @fileOverview Generates a concise AI summary for a given trip itinerary.
 *
 * - generateTripSummary - A function to get an AI-generated trip summary.
 * - TripSummaryInputSchema - The input type for the generateTripSummary function.
 * - TripSummaryOutputSchema - The return type for the generateTripSummary function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export const TripSummaryInputSchema = z.object({
  destination: z.string().describe('The main destination of the trip.'),
  travelDates: z.string().describe('The travel dates, used to infer duration (e.g., "July 10-17, 2024", "Next month for 1 week").'),
  budget: z.number().describe('The approximate total budget for the trip in USD.'),
  dailyActivitiesText: z.string().describe('A concatenated string summarizing the daily activities planned for the trip. Used to infer key themes.'),
});
export type TripSummaryInput = z.infer<typeof TripSummaryInputSchema>;

export const TripSummaryOutputSchema = z.object({
  summary: z.string().describe('A concise, engaging 1-2 sentence summary of the trip.'),
});
export type TripSummaryOutput = z.infer<typeof TripSummaryOutputSchema>;

export async function generateTripSummary(input: TripSummaryInput): Promise<TripSummaryOutput> {
  return tripSummaryFlow(input);
}

const tripSummaryPrompt = ai.definePrompt({
  name: 'tripSummaryPrompt',
  input: { schema: TripSummaryInputSchema },
  output: { schema: TripSummaryOutputSchema },
  prompt: `You are an expert travel summarizer. Based on the following trip details:
- Destination: {{{destination}}}
- Travel Dates: {{{travelDates}}} (Use this to infer approximate duration)
- Budget (USD): {{{budget}}}
- Summary of Daily Activities: "{{{dailyActivitiesText}}}"

Generate a concise, engaging 1-2 sentence summary of the trip.
The summary should mention the approximate duration (e.g., "week-long", "10-day"), the main destination, key themes or types of activities evident from the daily plan (e.g., "cultural exploration", "beach relaxation", "adventure", "culinary journey"), and the overall budget.

Example Output 1: "Your week-long journey to Paris blends cultural exploration with culinary delights, all within a budget of approximately $2500."
Example Output 2: "This 5-day adventure in the Swiss Alps focuses on hiking and scenic views, with a budget around $1800."
Example Output 3: "A 10-day Bali escape offering beach relaxation and yoga, budgeted at about $2200."

Ensure the summary is natural and enticing.
`,
});

const tripSummaryFlow = ai.defineFlow(
  {
    name: 'tripSummaryFlow',
    inputSchema: TripSummaryInputSchema,
    outputSchema: TripSummaryOutputSchema,
  },
  async (input) => {
    const { output } = await tripSummaryPrompt(input);
    if (!output || !output.summary) {
      console.warn("Trip Summary AI did not return a valid summary. Returning a default.");
      return {
        summary: `A trip to ${input.destination} with a budget of $${input.budget.toLocaleString()}. Enjoy your travels!`,
      };
    }
    return output;
  }
);
