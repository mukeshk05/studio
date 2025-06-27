
'use server';
/**
 * @fileOverview Provides an AI-generated fun fact about a destination.
 *
 * - getDestinationFact - A function to get a fun fact.
 * - DestinationFactInput - The input type for the getDestinationFact function.
 * - DestinationFactOutput - The return type for the getDestinationFact function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const DestinationFactInputSchema = z.object({
  destination: z.string().describe('The travel destination (e.g., "Paris, France", "Kyoto, Japan").')
});
export type DestinationFactInput = z.infer<typeof DestinationFactInputSchema>;

const DestinationFactOutputSchema = z.object({
  fact: z.string().describe('An interesting and concise fun fact about the destination.'),
});
export type DestinationFactOutput = z.infer<typeof DestinationFactOutputSchema>;

export async function getDestinationFact(input: DestinationFactInput): Promise<DestinationFactOutput> {
  return destinationFactFlow(input);
}

const prompt = ai.definePrompt({
  name: 'destinationFactPrompt',
  input: {schema: DestinationFactInputSchema},
  output: {schema: DestinationFactOutputSchema},
  prompt: `You are a travel enthusiast AI with a knack for finding obscure and interesting details.
Provide one concise, little-known, and engaging fun fact about the following destination: {{{destination}}}.
The fact should be 1-2 sentences long and genuinely interesting or surprising.
Avoid overly common or generic facts.

Destination: {{{destination}}}

Generate the fun fact.
Example for "Rome": "While the Colosseum is Rome's most famous amphitheater, the Circus Maximus could hold over 150,000 spectators, making it the largest sports arena ever built."
Example for "Tokyo": "Tokyo's Shibuya Crossing is so busy that up to 2,500 people can cross at the same time during peak hours."
`,
});

const destinationFactFlow = ai.defineFlow(
  {
    name: 'destinationFactFlow',
    inputSchema: DestinationFactInputSchema,
    outputSchema: DestinationFactOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
