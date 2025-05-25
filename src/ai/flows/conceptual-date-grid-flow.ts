
'use server';
/**
 * @fileOverview An AI flow that generates conceptual date grid insights for flight prices.
 */
import { ai } from '@/ai/genkit';
import {
  ConceptualDateGridInputSchema,
  type ConceptualDateGridInput,
  ConceptualDateGridOutputSchema,
  type ConceptualDateGridOutput,
} from '@/ai/types/ai-conceptual-date-grid-types';

export async function conceptualDateGridFlow(input: ConceptualDateGridInput): Promise<ConceptualDateGridOutput> {
  console.log('[AI Flow - conceptualDateGridFlow] Received input:', input);

  const prompt = ai.definePrompt({
    name: 'conceptualDateGridPrompt',
    input: { schema: ConceptualDateGridInputSchema },
    output: { schema: ConceptualDateGridOutputSchema },
    prompt: `You are an AI Travel Price Analyst. For flights from '{{{origin}}}' to '{{{destination}}}' for the period around '{{{monthToExplore}}}', provide the following:
1.  'gridSummary': A textual summary (2-3 sentences) describing likely cheaper or more expensive periods (e.g., "Flights mid-week are often cheaper. Expect higher prices towards the end of the month due to a local festival.").
2.  'exampleDeals': An array of 1 to 2 specific example 'deal' objects. Each object must have:
    *   'dateRange': A string representing a specific date range (e.g., "Dec 10-15", "First week of July", "Any 3 days mid-month").
    *   'priceIdea': A string representing a conceptual price idea for that date range (e.g., "Around $300", "Could be as low as $250", "Higher, around $450 due to holiday").

Focus on plausible, conceptual information. This is for illustrative purposes.
Ensure the output strictly follows the defined JSON schema for ConceptualDateGridOutputSchema.
`,
  });

  try {
    const { output } = await prompt(input);
    if (!output || !output.gridSummary) {
      console.warn("[AI Flow - conceptualDateGridFlow] AI did not return a valid grid summary. Output:", output);
      return {
        gridSummary: `AI could not generate specific date grid insights for ${input.origin} to ${input.destination} for ${input.monthToExplore} at this moment. Generally, booking in advance and being flexible with dates can help find better prices.`,
        exampleDeals: [],
      };
    }
    console.log('[AI Flow - conceptualDateGridFlow] Successfully generated date grid insights.');
    return output;
  } catch (error) {
    console.error("[AI Flow - conceptualDateGridFlow] Error during AI prompt:", error);
    return {
      gridSummary: `An error occurred while trying to generate date grid insights for ${input.origin} to ${input.destination}. Please try again later.`,
      exampleDeals: [],
    };
  }
}
