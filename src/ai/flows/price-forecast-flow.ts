
'use server';
/**
 * @fileOverview Provides AI-driven price trend forecasts for flights and hotels.
 *
 * - getPriceForecast - A function to get an AI-generated price forecast.
 */

import { ai } from '@/ai/genkit';
import { PriceForecastInputSchema, type PriceForecastInput, PriceForecastOutputSchema, type PriceForecastOutput } from '@/ai/types/price-forecast-types';

export async function getPriceForecast(input: PriceForecastInput): Promise<PriceForecastOutput> {
  return priceForecastFlow(input);
}

const prompt = ai.definePrompt({
  name: 'priceForecastPrompt',
  input: { schema: PriceForecastInputSchema },
  output: { schema: PriceForecastOutputSchema },
  prompt: `You are an AI Travel Price Forecaster for BudgetRoam.
Your task is to analyze the provided travel item details and predict the likely future price trend.

Item Details:
- Type: {{{itemType}}}
- Name/Route: {{{itemName}}}
{{#if originCity}}- Origin City: {{{originCity}}} (for flights){{/if}}
{{#if destination}}- Destination/Location: {{{destination}}}{{/if}}
- Current Price (USD): {{{currentPrice}}}
- Travel Dates: {{{travelDates}}}

Based on this information, especially considering the travel dates for seasonality and potential demand shifts.
If '{{{itemType}}}' is 'flight', consider the route from '{{{originCity}}}' to '{{{destination}}}'.
If '{{{itemType}}}' is 'hotel', '{{{itemName}}}' is the hotel name, and '{{{destination}}}' is its city/location.
Use 'destination' for broader market trends, and 'originCity' with 'destination' for flight routes.

Provide a concise forecast (1-2 sentences).
Optionally, include a confidence level ('low', 'medium', 'high') for your forecast.

Example Forecasts:
- For a flight from '{{{originCity}}}' to a popular European city like '{{{destination}}}' in late December: "Flight prices for European destinations during the Christmas holidays tend to rise significantly. Booking well in advance is recommended. Confidence: high."
- For a hotel named '{{{itemName}}}' in a beach resort town '{{{destination}}}' during the shoulder season (e.g., April): "Hotel prices for {{{itemName}}} might see some fluctuations but are generally moderate during this period. You might find better deals closer to the date, but popular options could sell out. Confidence: medium."
- For a flight with very generic information or far-off dates: "It's too early to make a precise forecast for these dates. Monitor prices regularly. Confidence: low."

Generate the forecast.
`,
});

const priceForecastFlow = ai.defineFlow(
  {
    name: 'priceForecastFlow',
    inputSchema: PriceForecastInputSchema,
    outputSchema: PriceForecastOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
        // Fallback if AI doesn't return valid output
        console.warn("Price Forecast AI did not return valid output. Returning a default.");
        return {
            forecast: "Could not generate a specific forecast at this time. Please monitor prices.",
            confidence: "low"
        };
    }
    return output;
  }
);

