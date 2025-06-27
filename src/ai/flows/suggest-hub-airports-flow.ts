
'use server';
/**
 * @fileOverview An AI flow to suggest popular destination hubs from an origin city.
 */

import { ai } from '@/ai/genkit';
import { SuggestHubAirportsInputSchema, SuggestHubAirportsOutputSchema } from '@/ai/types/suggest-hub-airports-types';

const suggestHubAirportsPrompt = ai.definePrompt({
  name: 'suggestHubAirportsPrompt',
  input: { schema: SuggestHubAirportsInputSchema },
  output: { schema: SuggestHubAirportsOutputSchema },
  prompt: `You are an expert air travel route analyst.
Given an origin city: {{{originCity}}}.
Suggest 3 to 4 major international airport hubs that are popular and well-connected flight destinations from that origin.
Only provide the 3-letter IATA codes for these hubs.
Ensure the output strictly follows the JSON schema, with the IATA codes in the 'hubs' array.

Example for origin 'Chicago':
{
  "hubs": ["LHR", "CUN", "LAX", "CDG"]
}
Example for origin 'Singapore':
{
  "hubs": ["NRT", "SYD", "LHR", "DXB"]
}
`,
});

export const suggestHubAirportsFlow = ai.defineFlow(
  {
    name: 'suggestHubAirportsFlow',
    inputSchema: SuggestHubAirportsInputSchema,
    outputSchema: SuggestHubAirportsOutputSchema,
  },
  async (input) => {
    console.log('[AI Flow - suggestHubAirportsFlow] Received input:', input);
    const { output } = await suggestHubAirportsPrompt(input);
    if (!output || !output.hubs || output.hubs.length === 0) {
      console.warn("[AI Flow - suggestHubAirportsFlow] Did not return valid hubs. Using fallback.");
      // Fallback hubs if AI fails
      return { hubs: ["LHR", "CDG", "NRT", "DXB"] };
    }
    console.log('[AI Flow - suggestHubAirportsFlow] Suggested hubs:', output.hubs);
    return output;
  }
);
