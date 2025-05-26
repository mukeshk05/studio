
'use server';
/**
 * @fileOverview Generates a concise AI summary for a given trip itinerary.
 *
 * - generateTripSummary - A function to get an AI-generated trip summary.
 */

import { ai } from '@/ai/genkit';
// Import schemas and types from the new types file
import {
  TripSummaryInputSchema, // Imported for use in ai.definePrompt
  type TripSummaryInput,   // Imported for type signature
  TripSummaryOutputSchema, // Imported for use in ai.definePrompt
  type TripSummaryOutput,  // Imported for type signature
} from '@/ai/types/trip-summary-types'; // Ensure this path is correct

// The actual Zod schema objects (TripSummaryInputSchema, TripSummaryOutputSchema)
// are NOT exported from this file. Only the function and types are.

export async function generateTripSummary(input: TripSummaryInput): Promise<TripSummaryOutput> {
  return tripSummaryFlow(input);
}

const tripSummaryPrompt = ai.definePrompt({
  name: 'tripSummaryPrompt',
  input: { schema: TripSummaryInputSchema }, // Uses the imported schema
  output: { schema: TripSummaryOutputSchema }, // Uses the imported schema
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
    inputSchema: TripSummaryInputSchema, // Uses the imported schema
    outputSchema: TripSummaryOutputSchema, // Uses the imported schema
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
