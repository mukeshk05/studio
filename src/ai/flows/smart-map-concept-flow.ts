
'use server';
/**
 * @fileOverview An AI flow that generates conceptual ideas for an interactive smart map.
 *
 * - generateSmartMapConcept - A function that takes a destination and optional persona
 *   and returns textual concepts for an AI-powered interactive smart map.
 */

import { ai } from '@/ai/genkit';
import { SmartMapConceptInputSchema, type SmartMapConceptInput, SmartMapConceptOutputSchema, type SmartMapConceptOutput } from '@/ai/types/smart-map-concept-types';

export async function generateSmartMapConcept(input: SmartMapConceptInput): Promise<SmartMapConceptOutput> {
  return smartMapConceptFlow(input);
}

const smartMapConceptPrompt = ai.definePrompt({
  name: 'smartMapConceptPrompt',
  input: { schema: SmartMapConceptInputSchema },
  output: { schema: SmartMapConceptOutputSchema },
  prompt: `You are Aura, BudgetRoam's visionary AI Cartographer.
Your task is to generate creative and inspiring textual concepts for an AI-powered interactive smart map for a given destination, tailored to a user's persona.

Destination: {{{destination}}}
User Persona/Interests: {{#if userPersonaDescription}}{{{userPersonaDescription}}}{{else}}A general curious explorer.{{/if}}

Based on this, describe:
1.  'mapConceptDescription': A 2-3 sentence narrative. What is the overall vision for this smart map? How would it uniquely help a traveler like this explore {{{destination}}}? Focus on personalization and intelligence.
2.  'suggestedLayers': An array of 2-4 distinct, creative, and personalized map layers that would be particularly useful or interesting for this persona in {{{destination}}}. (e.g., "Hidden Alleyway Art Trail", "Local Artisan Workshops Layer", "Sunset Photography Spots", "Quiet Parks & Reading Nooks").
3.  'examplePois': An array of 2-4 specific, intriguing, and somewhat unique points of interest (POIs) that would be highlighted on such a map for this traveler. These should be more than just the top tourist spots, if possible.
4.  'imagePrompt': A concise text prompt (4-7 words) for an image generation AI to create a visually appealing conceptual representation of this smart map idea (e.g., "futuristic map interface Paris cafes", "glowing POIs Kyoto night", "interactive travel map ancient ruins").

Example Output for Destination: "Kyoto, Japan", Persona: "Loves serene temples, traditional crafts, and authentic tea experiences":
{
  "mapConceptDescription": "Imagine a smart map of Kyoto that filters out the usual tourist noise, guiding you to tranquil temples just as they open, highlighting hidden artisan workshops based on real-time crowd data, and suggesting the perfect serene garden for a matcha break aligned with your 'Zen Seeker' persona. It's your personal guide to Kyoto's peaceful soul.",
  "suggestedLayers": ["Tranquil Temple Paths (Morning Hours)", "Artisan Craft Studio Locator", "Authentic Tea House Guide", "Seasonal Blossom Viewing Hotspots"],
  "examplePois": ["Otagi Nenbutsu-ji Temple (quirky statues, fewer crowds)", "Ichizawa Shinzaburo Hanpu (canvas bag workshop)", "Kaikado Tea Caddy Shop (historic craftsmanship)", "Gion Corner (evening cultural performances)"],
  "imagePrompt": "serene Kyoto map temples crafts"
}

Ensure your output strictly adheres to the defined JSON schema for SmartMapConceptOutputSchema. Be creative and practical.
`,
});

export const smartMapConceptFlow = ai.defineFlow(
  {
    name: 'smartMapConceptFlow',
    inputSchema: SmartMapConceptInputSchema,
    outputSchema: SmartMapConceptOutputSchema,
  },
  async (input: SmartMapConceptInput): Promise<SmartMapConceptOutput> => {
    const { output } = await smartMapConceptPrompt(input);

    if (!output || !output.mapConceptDescription) {
      console.warn("AI Smart Map Concept prompt did not return valid output. Returning a default.");
      return {
        mapConceptDescription: `Could not generate a smart map concept for ${input.destination} at this time. A smart map would generally aim to provide personalized points of interest and dynamic information layers.`,
        suggestedLayers: ["Points of Interest", "Food & Drink"],
        examplePois: [`Main attraction in ${input.destination}`, `Popular restaurant in ${input.destination}`],
        imagePrompt: `generic map ${input.destination.substring(0,10)}`,
      };
    }
    return output;
  }
);
