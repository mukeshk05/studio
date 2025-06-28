
/**
 * @fileOverview Type definitions and Zod schemas for the AI Conceptual Date Grid feature.
 */
import { z } from 'zod';

export const ConceptualDateGridInputSchema = z.object({
  origin: z.string().min(3, "Origin must be at least 3 characters.").describe("The origin city or airport."),
  destination: z.string().min(3, "Destination must be at least 3 characters.").describe("The destination city or airport."),
  monthToExplore: z.string().min(3, "Month to explore must be specified.").describe("The month or period to get date grid insights for (e.g., 'Next Month', 'December 2024', 'Q1 2025')."),
});
export type ConceptualDateGridInput = z.infer<typeof ConceptualDateGridInputSchema>;

export const DatePricePointSchema = z.object({
  dayOfMonth: z.number().int().min(1).max(31).describe("The specific day of the month as a number (e.g., 10 for the 10th). THIS IS CRITICAL."),
  dateLabel: z.string().describe("A label for the specific date (e.g., 'Dec 10', 'First Friday')."),
  priceIndicator: z.string().describe("A conceptual price idea (e.g., 'Around $280', '$350 - $420') or a relative level ('Low', 'Avg', 'High')."),
  notes: z.string().optional().describe("Optional brief notes, e.g., 'Potential event', 'Mid-week dip'."),
});
export type DatePricePoint = z.infer<typeof DatePricePointSchema>;

export const ConceptualDateGridOutputSchema = z.object({
  gridSummary: z.string().describe("A textual summary from the AI describing likely cheaper or more expensive periods within the specified month for the given route."),
  datePricePoints: z.array(DatePricePointSchema).max(10).optional().describe("An array of up to 10 conceptual date price points, each with a day number, date label, price indicator, and optional notes."),
});
export type ConceptualDateGridOutput = z.infer<typeof ConceptualDateGridOutputSchema>;
