
/**
 * @fileOverview Type definitions and Zod schemas for the AI Conceptual Date Grid feature.
 */
import { z } from 'genkit';

export const ConceptualDateGridInputSchema = z.object({
  origin: z.string().min(3, "Origin must be at least 3 characters.").describe("The origin city or airport."),
  destination: z.string().min(3, "Destination must be at least 3 characters.").describe("The destination city or airport."),
  monthToExplore: z.string().min(3, "Month to explore must be specified.").describe("The month or period to get date grid insights for (e.g., 'Next Month', 'December 2024', 'Q1 2025')."),
});
export type ConceptualDateGridInput = z.infer<typeof ConceptualDateGridInputSchema>;

export const ExampleDealSchema = z.object({
  dateRange: z.string().describe("A specific example date range (e.g., 'Dec 10-15', 'First week of July')."),
  priceIdea: z.string().describe("A conceptual price idea for that date range (e.g., 'Around $300', 'Could be lower', 'Higher due to holiday')."),
});
export type ExampleDeal = z.infer<typeof ExampleDealSchema>;

export const ConceptualDateGridOutputSchema = z.object({
  gridSummary: z.string().describe("A textual summary from the AI describing likely cheaper or more expensive periods within the specified month for the given route."),
  exampleDeals: z.array(ExampleDealSchema).optional().describe("An array of 1-2 specific example date ranges with conceptual price ideas."),
});
export type ConceptualDateGridOutput = z.infer<typeof ConceptualDateGridOutputSchema>;
