
'use server';
/**
 * @fileOverview An AI flow that suggests conceptual hotel options based on user criteria.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import {
  AiHotelSearchInputSchema,
  type AiHotelSearchInput,
  AiHotelSearchOutputSchema,
  type AiHotelSearchOutput,
  AiHotelSuggestionSchema,
} from '@/ai/types/ai-hotel-search-types';

// Define a schema for the text-only part of the hotel suggestion from the LLM
const AiHotelSuggestionTextOnlySchema = AiHotelSuggestionSchema.omit({ imageUri: true });
const AiHotelSearchTextOutputSchema = z.object({
  hotels: z.array(AiHotelSuggestionTextOnlySchema),
  searchSummary: z.string().optional(),
});


// Helper to generate an image for a single hotel suggestion
async function generateHotelImage(promptText: string | undefined, fallbackHint: string): Promise<string> {
  const defaultPlaceholder = `https://placehold.co/600x400.png?text=${encodeURIComponent(fallbackHint.substring(0, 20))}`;
  if (!promptText) {
    console.warn(`[AI Flow - generateHotelImage] No prompt text provided for ${fallbackHint}, using placeholder.`);
    return defaultPlaceholder;
  }
  let imageUri = defaultPlaceholder;
  try {
    console.log(`[AI Flow - generateHotelImage] Attempting to generate image for hotel prompt: "${promptText}" (for ${fallbackHint})`);
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp',
      prompt: `Generate an attractive, high-quality photograph of a hotel based on this description: ${promptText}. Focus on appealing visuals, good lighting, and a sense of place. Aspect ratio 16:9.`,
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
      console.log(`[AI Flow - generateHotelImage] Successfully generated image for: ${fallbackHint}. URI starts with: ${imageUri.substring(0, 50)}...`);
    } else {
      console.warn(`[AI Flow - generateHotelImage] Image generation for prompt "${promptText}" for ${fallbackHint} did NOT return a media URL. Using placeholder.`);
    }
  } catch (imageError: any) {
    console.error(`[AI Flow - generateHotelImage] FAILED to generate image for hotel prompt "${promptText}" for ${fallbackHint}:`, imageError.message || imageError);
  }
  return imageUri;
}

const hotelSearchTextPrompt = ai.definePrompt({
  name: 'hotelSearchTextPrompt',
  input: { schema: AiHotelSearchInputSchema },
  output: { schema: AiHotelSearchTextOutputSchema },
  prompt: `You are an AI Hotel Search assistant for BudgetRoam.
A user is looking for hotels with the following criteria:
- Destination: {{{destination}}}
- Check-in Date: {{{checkInDate}}}
- Check-out Date: {{{checkOutDate}}}
- Guests: {{{guests}}}

Based on these criteria, suggest 3 to 4 plausible, conceptual hotel options.
For each hotel, you MUST provide a JSON object with the following fields (ensure the entire response is a single JSON object with a "hotels" array and an optional "searchSummary" string):
-   'name': A plausible hotel name (e.g., "The Grand Plaza Hotel", "Seaside Boutique Inn", "Urban Comfort Suites").
-   'conceptualPriceRange': A realistic but conceptual price range per night in USD (e.g., "$120 - $180 / night", "Around $200 per night", "Est. $90 - $130 / night").
-   'rating': A conceptual guest rating out of 5 (e.g., 4.2, 3.8, 4.7).
-   'description': A short, appealing description of the hotel (2-3 sentences), highlighting its vibe or key selling points.
-   'amenities': An array of 3 to 5 key amenities (e.g., ["Pool", "Free WiFi", "Parking", "Restaurant", "Gym", "Pet-friendly"]).
-   'imagePrompt': A concise text prompt (5-10 words) suitable for an image generation AI to create an attractive photo of this type of hotel (e.g., "modern hotel exterior sunny day city", "cozy boutique hotel room fireplace", "luxury resort pool sunset view").

Example of a single hotel option object:
{
  "name": "The Parisian Charm Hotel",
  "conceptualPriceRange": "$180 - $250 / night",
  "rating": 4.4,
  "description": "Experience classic Parisian elegance in this centrally located boutique hotel. Offers beautifully decorated rooms and a delightful courtyard.",
  "amenities": ["Free WiFi", "Concierge", "Bar", "Air Conditioning", "Daily Housekeeping"],
  "imagePrompt": "charming parisian boutique hotel facade flowers"
}

Return a JSON object with a key "hotels" containing an array of these hotel option objects, and an optional "searchSummary" string (e.g., "Here are a few hotel ideas for your stay in {{{destination}}}!").
Ensure the output is valid JSON. These are illustrative examples, not real-time bookable hotels.
Focus on variety in hotel types and price points if possible.
`,
});

export const aiHotelSearchFlow = ai.defineFlow(
  {
    name: 'aiHotelSearchFlow',
    inputSchema: AiHotelSearchInputSchema,
    outputSchema: AiHotelSearchOutputSchema,
  },
  async (input: AiHotelSearchInput): Promise<AiHotelSearchOutput> => {
    console.log('[AI Flow - aiHotelSearchFlow] Received input:', input);
    const { output: textOutput } = await hotelSearchTextPrompt(input);

    if (!textOutput || !textOutput.hotels || textOutput.hotels.length === 0) {
      console.warn("[AI Flow - aiHotelSearchFlow] Text prompt did not return valid hotel suggestions.");
      return {
        hotels: [],
        searchSummary: textOutput?.searchSummary || `AI couldn't find conceptual hotel ideas for ${input.destination} for the specified dates. Please try different criteria.`,
      };
    }
    console.log(`[AI Flow - aiHotelSearchFlow] Text-only hotel suggestions received: ${textOutput.hotels.length}`);

    const hotelsWithImages = await Promise.all(
      textOutput.hotels.map(async (hotelText) => {
        const fallbackHint = `${hotelText.name.substring(0, 15)} ${input.destination.substring(0, 10)}`;
        const imageUri = await generateHotelImage(hotelText.imagePrompt, fallbackHint);
        return {
          ...hotelText,
          imageUri,
        };
      })
    );

    console.log(`[AI Flow - aiHotelSearchFlow] Processed ${hotelsWithImages.length} hotel suggestions with images.`);
    return {
      hotels: hotelsWithImages,
      searchSummary: textOutput.searchSummary || `Here are some conceptual hotel ideas for ${input.destination}.`
    };
  }
);
