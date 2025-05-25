
'use server';
/**
 * @fileOverview An AI flow that generates conceptual price trend descriptions and data points for flights.
 */
import { ai } from '@/ai/genkit';
import {
  ConceptualPriceGraphInputSchema,
  type ConceptualPriceGraphInput,
  ConceptualPriceGraphOutputSchema,
  type ConceptualPriceGraphOutput,
} from '@/ai/types/ai-conceptual-price-graph-types';

export async function conceptualPriceGraphFlow(input: ConceptualPriceGraphInput): Promise<ConceptualPriceGraphOutput> {
  console.log('[AI Flow - conceptualPriceGraphFlow] Received input:', input);

  const prompt = ai.definePrompt({
    name: 'conceptualPriceGraphPrompt',
    input: { schema: ConceptualPriceGraphInputSchema },
    output: { schema: ConceptualPriceGraphOutputSchema },
    prompt: `You are an AI Travel Price Trend Analyst. For flights from '{{{origin}}}' to '{{{destination}}}' for the travel period described as '{{{travelDatesHint}}}', provide the following:
1.  'trendDescription': A textual summary (2-3 sentences) describing the expected price trend (e.g., "Prices generally start low and gradually increase as the departure date approaches, with a significant spike during peak holiday seasons.").
2.  'conceptualDataPoints': An array of 3 to 4 conceptual data point objects. Each object must have:
    *   'timeframe': A string representing a point in time relative to now or the travel period (e.g., "-8 Weeks", "-4 Weeks", "Current", "+2 Weeks", "Departure Week", "Peak Holiday Period").
    *   'relativePriceIndicator': A string indicating the conceptual relative price level (choose from: "Very Low", "Low", "Average", "Slightly High", "High", "Peak", "Very High").

Focus on plausible, conceptual trend information. This is for illustrative purposes.
Ensure the output strictly follows the defined JSON schema for ConceptualPriceGraphOutputSchema.
`,
  });

  try {
    const { output } = await prompt(input);
    if (!output || !output.trendDescription) {
      console.warn("[AI Flow - conceptualPriceGraphFlow] AI did not return a valid trend description. Output:", output);
      return {
        trendDescription: `AI could not generate specific price trend insights for ${input.origin} to ${input.destination} for ${input.travelDatesHint} at this moment. Generally, prices tend to increase closer to popular travel dates.`,
        conceptualDataPoints: [],
      };
    }
    console.log('[AI Flow - conceptualPriceGraphFlow] Successfully generated price trend insights.');
    return output;
  } catch (error) {
    console.error("[AI Flow - conceptualPriceGraphFlow] Error during AI prompt:", error);
    return {
      trendDescription: `An error occurred while trying to generate price trend insights for ${input.origin} to ${input.destination}. Please try again later.`,
      conceptualDataPoints: [],
    };
  }
}
