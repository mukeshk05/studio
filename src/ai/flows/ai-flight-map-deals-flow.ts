
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

// Schema for the text-only output from the LLM, expecting a single suggestion
const AiFlightMapDealTextSuggestionSchema = AiFlightMapDealSuggestionSchema.omit({ imageUri: true });
const AiFlightMapDealTextOutputSchema = z.object({
  suggestion: AiFlightMapDealTextSuggestionSchema.optional().describe("The AI's conceptual deal suggestion for the target destination."),
  contextualNote: z.string().optional().describe("A note about the suggestion or if no specific deal could be conceptualized."),
});


const flightMapDealsTextPrompt = ai.definePrompt({
  name: 'flightMapDealsTextPrompt',
  input: { schema: AiFlightMapDealInputSchema },
  output: { schema: AiFlightMapDealTextOutputSchema },
  prompt: `You are an AI flight deal scout.
The user's origin is described as: '{{{originDescription}}}'.
The user is specifically interested in conceptual flight deal insights for a trip to the destination: '{{{targetDestinationCity}}}'.

For the '{{{targetDestinationCity}}}', you MUST provide:
1.  'destinationCity': The common name of the {{{targetDestinationCity}}}.
2.  'country': The country where {{{targetDestinationCity}}} is located.
3.  'latitude': Approximate latitude of {{{targetDestinationCity}}} as a NUMBER (e.g., 48.8566 for Paris). THIS IS CRITICAL for map plotting.
4.  'longitude': Approximate longitude of {{{targetDestinationCity}}} as a NUMBER (e.g., 2.3522 for Paris). THIS IS CRITICAL for map plotting.
5.  'conceptualPriceRange': A plausible, conceptual roundtrip price range for a good flight deal from '{{{originDescription}}}' to '{{{targetDestinationCity}}}' (e.g., "$200 - $350", "Around $400", "Under $300").
6.  'dealReason': A brief, plausible reason why this might be a good deal or an interesting option for this route (e.g., "Known budget airline hub", "Often has shoulder season deals", "Direct route with competitive pricing", "Unique cultural experience").
7.  'imagePrompt': A concise text prompt (4-7 words) suitable for an image generation AI to create an iconic, high-quality, and visually appealing travel photograph of {{{targetDestinationCity}}}.

Example for targetDestinationCity "Lisbon, Portugal" and originDescription "User's current location (approx. Lat 40.7, Lon -74.0)":
{
  "suggestion": {
    "destinationCity": "Lisbon",
    "country": "Portugal",
    "latitude": 38.7223,
    "longitude": -9.1393,
    "conceptualPriceRange": "$450 - $600 from NYC area",
    "dealReason": "Great value for a European capital, especially during spring/fall from the East Coast.",
    "imagePrompt": "Lisbon colorful tram Alfama district"
  },
  "contextualNote": "Here's a conceptual deal idea for your trip to Lisbon from your current area."
}

If you cannot find specific plausible deal information for '{{{targetDestinationCity}}}' from '{{{originDescription}}}', provide a 'contextualNote' explaining this and do not include the 'suggestion' field.
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

    if (!textOutput || !textOutput.suggestion) {
      console.warn("[AI Flow - aiFlightMapDealsFlow] Text prompt did not return a valid destination suggestion.");
      return {
        suggestions: [],
        contextualNote: textOutput?.contextualNote || `AI couldn't conceptualize specific flight deal ideas for ${input.targetDestinationCity} from ${input.originDescription} at this moment.`,
      };
    }
    console.log('[AI Flow - aiFlightMapDealsFlow] Text-only deal suggestion received:', textOutput.suggestion);

    const dealText = textOutput.suggestion;
    const fallbackHint = `${dealText.destinationCity.substring(0, 10)} ${dealText.country.substring(0, 5)}`;
    const imageUri = await generateDealImage(dealText.imagePrompt, fallbackHint);
    
    const suggestionWithImage = {
      ...dealText,
      imageUri,
    };

    console.log(`[AI Flow - aiFlightMapDealsFlow] Processed 1 deal suggestion with image.`);
    return {
      suggestions: [suggestionWithImage],
      contextualNote: textOutput.contextualNote,
    };
  }
);
