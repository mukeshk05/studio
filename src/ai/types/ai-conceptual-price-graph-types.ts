
/**
 * @fileOverview Type definitions and Zod schemas for the AI Conceptual Price Graph feature.
 */
import { z } from 'zod';

export const ConceptualPriceGraphInputSchema = z.object({
  origin: z.string().min(3, "Origin must be at least 3 characters.").describe("The origin city or airport."),
  destination: z.string().min(3, "Destination must be at least 3 characters.").describe("The destination city or airport."),
  travelDatesHint: z.string().min(3, "Travel dates hint must be specified.").describe("A hint for the travel period to analyze price trends for (e.g., 'next 3 months', 'around Christmas holidays', 'Summer 2025')."),
});
export type ConceptualPriceGraphInput = z.infer<typeof ConceptualPriceGraphInputSchema>;

export const ConceptualDataPointSchema = z.object({
  timeframe: z.string().describe("A label for the time period (e.g., '-4 Weeks', 'Current Week', '+2 Weeks', 'Peak Season Start')."),
  relativePriceIndicator: z.enum(["Very Low", "Low", "Average", "Slightly High", "High", "Peak", "Very High"]).describe("An indicator of the conceptual relative price level for that timeframe."),
});
export type ConceptualDataPoint = z.infer<typeof ConceptualDataPointSchema>;

export const ConceptualPriceGraphOutputSchema = z.object({
  trendDescription: z.string().describe("A textual summary from the AI describing the expected price trend for the given route and travel dates hint (e.g., 'Prices are expected to rise closer to the travel dates, with a peak during mid-December.')."),
  conceptualDataPoints: z.array(ConceptualDataPointSchema).optional().describe("An array of 3-4 conceptual data points illustrating the price trend over time."),
});
export type ConceptualPriceGraphOutput = z.infer<typeof ConceptualPriceGraphOutputSchema>;
