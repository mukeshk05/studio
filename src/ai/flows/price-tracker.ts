// src/ai/flows/price-tracker.ts
'use server';
/**
 * @fileOverview Implements AI-powered price tracking for flights and hotels, alerting users to price drops.
 *
 * - trackPrice - The main function to initiate price tracking for a given item.
 * - PriceTrackerInput - The input type for the trackPrice function.
 * - PriceTrackerOutput - The return type for the trackPrice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PriceTrackerInputSchema = z.object({
  itemType: z.enum(['flight', 'hotel']).describe('The type of item to track: flight or hotel.'),
  itemName: z.string().describe('The name or identifier of the item to track (e.g., flight number, hotel name).'),
  targetPrice: z.number().describe('The price threshold below which an alert should be triggered.'),
  currentPrice: z.number().describe('The current price of the item.'),
});
export type PriceTrackerInput = z.infer<typeof PriceTrackerInputSchema>;

const PriceTrackerOutputSchema = z.object({
  shouldAlert: z.boolean().describe('Whether an alert should be triggered based on the price drop.'),
  alertMessage: z.string().describe('A message describing the price drop and suggesting action.'),
});
export type PriceTrackerOutput = z.infer<typeof PriceTrackerOutputSchema>;

export async function trackPrice(input: PriceTrackerInput): Promise<PriceTrackerOutput> {
  return trackPriceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'priceTrackerPrompt',
  input: {schema: PriceTrackerInputSchema},
  output: {schema: PriceTrackerOutputSchema},
  prompt: `You are an AI price tracker that helps users find the best deals on flights and hotels.

You will receive the item type (flight or hotel), the item name, the target price, and the current price.
Your goal is to determine if the current price is below the target price. If it is, you should set the shouldAlert field to true and provide an informative alert message suggesting the user book the item.

Item Type: {{{itemType}}}
Item Name: {{{itemName}}}
Target Price: {{{targetPrice}}}
Current Price: {{{currentPrice}}}

Consider these examples:

Example 1:
Item Type: flight
Item Name: UA123
Target Price: 300
Current Price: 250
Output: { shouldAlert: true, alertMessage: "Price for UA123 has dropped below your target! Book now!" }

Example 2:
Item Type: hotel
Item Name: The Grand Hotel
Target Price: 150
Current Price: 160
Output: { shouldAlert: false, alertMessage: "Price for The Grand Hotel is still above your target price." }

Based on the information provided, determine whether an alert should be triggered.
`,
});

const trackPriceFlow = ai.defineFlow(
  {
    name: 'trackPriceFlow',
    inputSchema: PriceTrackerInputSchema,
    outputSchema: PriceTrackerOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
