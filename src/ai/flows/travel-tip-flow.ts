
'use server';
/**
 * @fileOverview Provides a random travel tip.
 *
 * - getTravelTip - A function to get a travel tip.
 * - TravelTipInput - The input type for the getTravelTip function.
 * - TravelTipOutput - The return type for the getTravelTip function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TravelTipInputSchema = z.object({
  topic: z.string().optional().describe("Optional topic for the travel tip, e.g., 'packing', 'budget travel', 'solo travel', 'eco-friendly travel'.")
});
export type TravelTipInput = z.infer<typeof TravelTipInputSchema>;

const TravelTipOutputSchema = z.object({
  tip: z.string().describe('A concise and helpful travel tip.'),
});
export type TravelTipOutput = z.infer<typeof TravelTipOutputSchema>;

export async function getTravelTip(input?: TravelTipInput): Promise<TravelTipOutput> {
  return travelTipFlow(input || {});
}

const prompt = ai.definePrompt({
  name: 'travelTipPrompt',
  input: {schema: TravelTipInputSchema},
  output: {schema: TravelTipOutputSchema},
  prompt: `You are a helpful travel assistant. Provide a concise, actionable, and interesting travel tip.
If a topic is provided, tailor the tip to that topic. Otherwise, provide a general travel tip.
The tip should be a single sentence or two short sentences.

{{#if topic}}
Topic: {{{topic}}}
{{else}}
Topic: General Travel
{{/if}}

Generate a travel tip.
`,
});

const travelTipFlow = ai.defineFlow(
  {
    name: 'travelTipFlow',
    inputSchema: TravelTipInputSchema,
    outputSchema: TravelTipOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
