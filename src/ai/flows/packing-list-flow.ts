
'use server';
/**
 * @fileOverview Provides AI-generated packing list suggestions.
 *
 * - getPackingList - A function to get an AI-generated packing list.
 * - PackingListInput - The input type for the getPackingList function.
 * - PackingListOutput - The return type for the getPackingList function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const PackingListInputSchema = z.object({
  destination: z.string().describe('The travel destination (e.g., "Paris, France", "Costa Rican rainforests").'),
  travelDates: z.string().describe('The travel dates, used to infer season and weather (e.g., "December 10-17", "Mid-July for 2 weeks").'),
  tripDuration: z.string().describe('The duration of the trip (e.g., "7 days", "approximately 2 weeks").'),
  tripType: z.string().optional().describe('Optional: The type of trip (e.g., "beach vacation", "business trip", "hiking adventure", "city exploration"). This helps tailor the list.'),
  weatherContext: z.string().optional().describe("Optional: Brief description of expected weather, e.g., 'Sunny and hot', 'Rainy season, humid', 'Cold with chances of snow'. If not provided, AI will infer based on destination and dates.")
});
export type PackingListInput = z.infer<typeof PackingListInputSchema>;

const PackingListOutputSchema = z.object({
  packingList: z.array(z.string()).describe('A list of suggested items to pack. Each item is a string.'),
});
export type PackingListOutput = z.infer<typeof PackingListOutputSchema>;

export async function getPackingList(input: PackingListInput): Promise<PackingListOutput> {
  return packingListFlow(input);
}

const prompt = ai.definePrompt({
  name: 'packingListPrompt',
  input: {schema: PackingListInputSchema},
  output: {schema: PackingListOutputSchema},
  prompt: `You are an expert travel assistant specializing in creating packing lists.
Based on the destination, travel dates (which imply season and typical weather), trip duration, and optionally the trip type and weather context, generate a concise and practical packing list.
Focus on essential items and consider the likely activities.
If specific 'weatherContext' is provided (e.g., 'rainy and warm', 'cold and snowy'), prioritize items suitable for that.
If no 'weatherContext' is given, infer typical weather from destination and travel dates. For example, suggest warmer clothes for a winter trip to a cold climate, or rain gear if it's a tropical rainy season.

Destination: {{{destination}}}
Travel Dates: {{{travelDates}}}
Trip Duration: {{{tripDuration}}}
{{#if tripType}}
Trip Type: {{{tripType}}}
{{/if}}
{{#if weatherContext}}
Weather Context: {{{weatherContext}}}
{{/if}}

Generate the packing list. For example, for a 7-day beach trip to Bali in July, you might suggest: ["Swimsuits (2-3)", "Sunscreen (SPF 30+)", "Sunglasses", "Beach towel", "Flip-flops", "Lightweight cover-up", "Casual shorts & t-shirts", "Evening outfit", "Hat", "Reusable water bottle", "Basic toiletries", "Medications"].
Provide between 10 to 20 essential items.
`,
});

const packingListFlow = ai.defineFlow(
  {
    name: 'packingListFlow',
    inputSchema: PackingListInputSchema,
    outputSchema: PackingListOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
