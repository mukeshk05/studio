
/**
 * @fileOverview Type definitions and Zod schemas for the Price Advisor AI Flow.
 */
import { z } from 'genkit';

export const PriceAdvisorInputSchema = z.object({
  itemType: z.enum(['flight', 'hotel']).describe('The type of item: flight or hotel.'),
  itemName: z.string().describe('The name or identifier of the item (e.g., "Flight UA123 to Paris", "Grand Hyatt Hotel"). This provides specific context for the AI.'),
  originCity: z.string().optional().describe("The origin city, if itemType is 'flight'."),
  destination: z.string().optional().describe("The destination city/area for the flight or hotel, for broader market context."),
  targetPrice: z.number().describe('The user desired target price in USD.'),
  currentPrice: z.number().describe('The current market price in USD.'),
});
export type PriceAdvisorInput = z.infer<typeof PriceAdvisorInputSchema>;

export const PriceAdvisorOutputSchema = z.object({
  advice: z.string().describe('Concise, actionable advice regarding the price and booking outlook for the item.'),
});
export type PriceAdvisorOutput = z.infer<typeof PriceAdvisorOutputSchema>;
