
/**
 * @fileOverview Type definitions and Zod schemas for the AI Price Forecast feature.
 */
import { z } from 'genkit';

export const PriceForecastInputSchema = z.object({
  itemType: z.enum(['flight', 'hotel']).describe('The type of item: flight or hotel.'),
  itemName: z.string().describe('The name or identifier of the item (e.g., "Flight UA123 to Paris", "Grand Hyatt Hotel"). This provides specific context for the AI.'),
  originCity: z.string().optional().describe("The origin city, if itemType is 'flight'."),
  destination: z.string().optional().describe("The destination city/area for the flight or hotel, for broader market context."),
  currentPrice: z.number().describe('The current market price in USD.'),
  travelDates: z.string().describe('The travel dates, crucial for inferring seasonality and demand (e.g., "December 10-17", "Mid-July for 2 weeks").')
});
export type PriceForecastInput = z.infer<typeof PriceForecastInputSchema>;

export const PriceForecastOutputSchema = z.object({
  forecast: z.string().describe('A concise prediction about the future price trend of the item (e.g., "Prices are likely to increase as the travel dates approach.", "This price is competitive for the season; consider booking soon.").'),
  confidence: z.enum(['low', 'medium', 'high']).optional().describe('The AI\'s confidence level in this forecast (low, medium, or high).')
});
export type PriceForecastOutput = z.infer<typeof PriceForecastOutputSchema>;

