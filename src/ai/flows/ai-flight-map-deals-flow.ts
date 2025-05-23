
// IMPORTANT: This file should NOT have 'use server'; at the top if it's exporting schemas/types.
// The 'use server'; directive belongs in the file that defines the top-level Server Action (e.g., actions.ts).
/**
 * @fileOverview An AI flow that suggests conceptual flight deals from an origin city for a map.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import {
  AiFlightMapDealInputSchema,
  type AiFlightMapDealInput,
  AiFlightMapDealOutputSchema,
  type AiFlightMapDealOutput,
  AiFlightMapDealSuggestionSchema,
} from '@/ai/types/ai-flight-map-deals-types';

// Helper to generate an image for a single suggestion
async function generateDealImage(promptText: string | undefined, fallbackHint: string): Promise<string> {
  const defaultPlaceholder = `https://placehold.co/600x400.png?text=${encodeURIComponent(fallbackHint.substring(0, 20))}`;
  if (!promptText) {
    console.warn(`[AI Flow - generateDealImage] No prompt text provided for ${fallbackHint}, using placeholder.`);
    return defaultPlaceholder;
  }
  let imageUri = defaultPlaceholder;
  try {
    console.log(`[AI Flow - generateDealImage] Attempting to generate image for prompt: "${promptText}" (for ${fallbackHint})`);
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp',
      prompt: `Generate an iconic, vibrant, and high-quality travel photograph representing: ${promptText}. Aspect ratio 16:9. Focus on its most recognizable visual elements or overall atmosphere.`,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
        safetySettings: [
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ],
      },
      // @ts-ignore
      experimentalDoNotSelectOutputTool: true,
    });

    if (media?.url) {
      imageUri = media.url;
      console.log(`[AI Flow - generateDealImage] Successfully generated image for: ${fallbackHint}. URI starts with: ${imageUri.substring(0, 50)}...`);
    } else {
      console.warn(`[AI Flow - generateDealImage] Image generation for prompt "${promptText}" for ${fallbackHint} did NOT return a media URL. Using placeholder.`);
    }
  } catch (imageError: any) {
    console.error(`[AI Flow - generateDealImage] FAILED to generate image for prompt "${promptText}" for ${fallbackHint}:`, imageError.message || imageError);
  }
  return imageUri;
}

const AiFlightMapDealsTextOutputSchema = z.object({
  suggestions: z.array(AiFlightMapDealSuggestionSchema.omit({ imageUri: true })),
  contextualNote: z.string().optional(),
});

const flightMapDealsTextPrompt = ai.definePrompt({
  name: 'flightMapDealsTextPrompt',
  input: { schema: AiFlightMapDealInputSchema },
  output: { schema: AiFlightMapDealsTextOutputSchema },
  prompt: `You are an AI flight deal scout.
From the origin city '{{{originCity}}}', suggest 3-5 diverse and interesting flight destinations that might offer good value for money for a leisure trip (e.g., a week-long vacation).
For each destination, you MUST provide:
1.  'destinationCity': The common name of the destination city.
2.  'country': The country where the destination city is located.
3.  'latitude': Approximate latitude of the destination city as a NUMBER (e.g., 48.8566 for Paris). THIS IS CRITICAL for map plotting.
4.  'longitude': Approximate longitude of the destination city as a NUMBER (e.g., 2.3522 for Paris). THIS IS CRITICAL for map plotting.
5.  'conceptualPriceRange': A plausible, conceptual roundtrip price range for a good flight deal from {{{originCity}}} (e.g., "$200 - $350", "Around $400", "Under $300").
6.  'dealReason': A brief, plausible reason why this might be a good deal or an interesting option from {{{originCity}}} (e.g., "Known budget airline hub", "Often has shoulder season deals", "Direct route with competitive pricing", "Unique cultural experience").
7.  'imagePrompt': A concise text prompt (4-7 words) suitable for an image generation AI to create an iconic, high-quality, and visually appealing travel photograph of this destination.

Example for one suggestion (ensure 'suggestions' is an array):
{
  "destinationCity": "Lisbon",
  "country": "Portugal",
  "latitude": 38.7223,
  "longitude": -9.1393,
  "conceptualPriceRange": "$450 - $600 from NYC",
  "dealReason": "Great value for a European capital, especially during spring/fall.",
  "imagePrompt": "Lisbon colorful tram Alfama district"
}

If you cannot find specific plausible deals or interesting varied destinations from {{{originCity}}}, provide a 'contextualNote' explaining this (e.g., "It's challenging to find diverse flight deal concepts from {{{originCity}}} without more specific user preferences or dates. Consider checking major hubs.").
Ensure your output strictly follows the defined JSON schema.
`,
});

export const aiFlightMapDealsFlow = ai.defineFlow(
  {
    name: 'aiFlightMapDealsFlow',
    inputSchema: AiFlightMapDealInputSchema,
    outputSchema: AiFlightMapDealOutputSchema,
  },
  async (input: AiFlightMapDealInput): Promise<AiFlightMapDealOutput> => {
    console.log('[AI Flow - aiFlightMapDealsFlow] Received input:', input);
    const { output: textOutput } = await flightMapDealsTextPrompt(input);

    if (!textOutput || !textOutput.suggestions || textOutput.suggestions.length === 0) {
      console.warn("[AI Flow - aiFlightMapDealsFlow] Text prompt did not return valid destination suggestions.");
      return {
        suggestions: [],
        contextualNote: textOutput?.contextualNote || `AI couldn't conceptualize specific flight deal ideas from ${input.originCity} at this moment. Try a different origin or check general exploration tools.`,
      };
    }
    console.log('[AI Flow - aiFlightMapDealsFlow] Text-only deal suggestions received:', textOutput.suggestions.length);

    const suggestionsWithImages = await Promise.all(
      textOutput.suggestions.map(async (dealText) => {
        const fallbackHint = `${dealText.destinationCity.substring(0, 10)} ${dealText.country.substring(0, 5)}`;
        const imageUri = await generateDealImage(dealText.imagePrompt, fallbackHint);
        return {
          ...dealText,
          imageUri,
        };
      })
    );

    console.log(`[AI Flow - aiFlightMapDealsFlow] Processed ${suggestionsWithImages.length} deal suggestions with images.`);
    return {
      suggestions: suggestionsWithImages,
      contextualNote: textOutput.contextualNote,
    };
  }
);
