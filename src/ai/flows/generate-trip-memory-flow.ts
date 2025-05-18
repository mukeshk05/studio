
'use server';
/**
 * @fileOverview AI flow for generating a trip memory snippet.
 *
 * - generateTripMemory - Creates a short, evocative memory of a trip.
 */

import { ai } from '@/ai/genkit';
import { GenerateTripMemoryInputSchema, type GenerateTripMemoryInput, GenerateTripMemoryOutputSchema, type GenerateTripMemoryOutput } from '@/ai/types/trip-memory-types';

export async function generateTripMemory(input: GenerateTripMemoryInput): Promise<GenerateTripMemoryOutput> {
  return generateTripMemoryFlow(input);
}

const generateTripMemoryPrompt = ai.definePrompt({
  name: 'generateTripMemoryPrompt',
  input: { schema: GenerateTripMemoryInputSchema },
  output: { schema: GenerateTripMemoryOutputSchema },
  prompt: `You are a nostalgic travel diary assistant.
Your task is to write a short (2-4 sentences), engaging, and evocative memory or diary entry snippet based on the provided trip details.
Focus on capturing the essence, potential highlights, or overall feeling of the trip.

Trip Details:
- Destination: {{{destination}}}
- Travel Dates: {{{travelDates}}}
{{#if tripSummary}}- Trip Summary: {{{tripSummary}}}{{/if}}
{{#if dailyPlanActivities}}- Daily Activities Summary: {{{dailyPlanActivities}}}{{/if}}

Generate the memory snippet. Be creative and make it sound like a personal reflection.
Example: "Remember that amazing week in {{{destination}}} around {{{travelDates}}}? {{{tripSummary (if available, otherwise a generic positive sentiment about the activities)}}}. It was truly unforgettable."
Another Example for a trip to Paris: "Paris in the spring... {{{travelDates}}} still feels like a dream. From wandering the charming streets to tasting those delicious pastries, every moment was picture-perfect. The city's magic truly captivated me."

Output only the 'memoryText'.
`,
});

const generateTripMemoryFlow = ai.defineFlow(
  {
    name: 'generateTripMemoryFlow',
    inputSchema: GenerateTripMemoryInputSchema,
    outputSchema: GenerateTripMemoryOutputSchema,
  },
  async (input) => {
    const { output } = await generateTripMemoryPrompt(input);
    if (!output || !output.memoryText) {
      console.warn("Trip Memory AI did not return valid text. Returning a default message.");
      return {
        memoryText: "Could not generate a memory snippet for this trip at this time. But I'm sure it was a wonderful experience!"
      };
    }
    return output;
  }
);
