
/**
 * @fileOverview Types for the AI Hub Airport Suggestion flow.
 */
import { z } from 'genkit';

export const SuggestHubAirportsInputSchema = z.object({
  originCity: z.string().describe("The user's origin city, e.g., 'New York' or 'London'."),
});
export type SuggestHubAirportsInput = z.infer<typeof SuggestHubAirportsInputSchema>;

export const SuggestHubAirportsOutputSchema = z.object({
  hubs: z.array(z.string().length(3, "IATA codes must be 3 characters.").regex(/^[A-Z]{3}$/, "IATA codes must be uppercase letters."))
    .min(2)
    .max(5)
    .describe("An array of 2 to 5 suggested 3-letter IATA codes for major international airports that are popular destinations from the origin."),
});
export type SuggestHubAirportsOutput = z.infer<typeof SuggestHubAirportsOutputSchema>;
