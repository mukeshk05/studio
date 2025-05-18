
'use server';
/**
 * @fileOverview Provides AI-driven advice for price-tracked items.
 *
 * - getPriceAdvice - A function to get AI advice on a tracked flight or hotel.
 * - PriceAdvisorInput - The input type for the getPriceAdvice function.
 * - PriceAdvisorOutput - The return type for the getPriceAdvice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PriceAdvisorInputSchema = z.object({
  itemType: z.enum(['flight', 'hotel']).describe('The type of item: flight or hotel.'),
  itemName: z.string().describe('The name or identifier of the item (e.g., "Flight UA123 to Paris for December", "Grand Hyatt Hotel New York for Christmas week"). This provides context for the AI.'),
  targetPrice: z.number().describe('The user desired target price in USD.'),
  currentPrice: z.number().describe('The current market price in USD.'),
});
export type PriceAdvisorInput = z.infer<typeof PriceAdvisorInputSchema>;

const PriceAdvisorOutputSchema = z.object({
  advice: z.string().describe('Concise, actionable advice regarding the price and booking outlook for the item.'),
});
export type PriceAdvisorOutput = z.infer<typeof PriceAdvisorOutputSchema>;

export async function getPriceAdvice(input: PriceAdvisorInput): Promise<PriceAdvisorOutput> {
  return priceAdvisorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'priceAdvisorPrompt',
  input: {schema: PriceAdvisorInputSchema},
  output: {schema: PriceAdvisorOutputSchema},
  prompt: `You are an AI travel price advisor.
Based on the item type, item name (which may include destination and time of year), the user's target price, and the current market price, provide brief, actionable advice.
Your advice should be 1-2 sentences.
Consider if the target price is realistic, if it's a good time to buy, or general price trends for similar items based on the context from the item name.

Item Type: {{{itemType}}}
Item Name: {{{itemName}}}
Target Price (USD): {{{targetPrice}}}
Current Price (USD): {{{currentPrice}}}

Provide your advice. For example: "Flights to popular European destinations in December are in high demand. Your target price of $${"{{targetPrice}}"} is competitive. Monitor closely and consider booking if it drops further." or "Hotel prices in New York during Christmas week are typically high. $${"{{targetPrice}}"} is an ambitious target. You might need to be flexible with dates or consider alternative locations for a better deal."
`,
});

const priceAdvisorFlow = ai.defineFlow(
  {
    name: 'priceAdvisorFlow',
    inputSchema: PriceAdvisorInputSchema,
    outputSchema: PriceAdvisorOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
