'use server';
/**
 * @fileOverview An AI trip planner agent.
 *
 * - aiTripPlanner - A function that handles the trip planning process.
 * - AITripPlannerInput - The input type for the aiTripPlanner function.
 * - AITripPlannerOutput - The return type for the aiTripPlanner function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AITripPlannerInputSchema = z.object({
  travelDates: z.string().describe('The desired travel dates (e.g., MM/DD/YYYY-MM/DD/YYYY).'),
  destination: z.string().describe('The destination for the trip.'),
  budget: z.number().describe('The budget for the trip in USD.'),
});
export type AITripPlannerInput = z.infer<typeof AITripPlannerInputSchema>;

const AITripPlannerOutputSchema = z.object({
  itineraries: z.array(
    z.object({
      destination: z.string().describe('The destination for this itinerary.'),
      travelDates: z.string().describe('The travel dates for this itinerary.'),
      estimatedCost: z.number().describe('The estimated cost for this itinerary in USD.'),
      description: z.string().describe('A description of the itinerary including activities, accommodations, and transportation.'),
    })
  ).describe('A list of possible itineraries based on the input.'),
});
export type AITripPlannerOutput = z.infer<typeof AITripPlannerOutputSchema>;

export async function aiTripPlanner(input: AITripPlannerInput): Promise<AITripPlannerOutput> {
  return aiTripPlannerFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiTripPlannerPrompt',
  input: {schema: AITripPlannerInputSchema},
  output: {schema: AITripPlannerOutputSchema},
  prompt: `You are a travel agent specializing in budget travel.

You will generate a range of possible itineraries based on the user's budget, destination and travel dates.

Consider a variety of options for flights, accommodations, and activities that would fit within the budget.
Provide multiple itineraries with varying levels of luxury and activity so the user has multiple choices.

Travel Dates: {{{travelDates}}}
Destination: {{{destination}}}
Budget: {{{budget}}}

Return the itineraries in JSON format.
`,
});

const aiTripPlannerFlow = ai.defineFlow(
  {
    name: 'aiTripPlannerFlow',
    inputSchema: AITripPlannerInputSchema,
    outputSchema: AITripPlannerOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

