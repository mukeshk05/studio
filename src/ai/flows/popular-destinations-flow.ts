
'use server';
/**
 * @fileOverview An AI flow that suggests popular travel destinations,
 * potentially tailored to the user's location. Includes conceptual flight/hotel ideas,
 * AI-generated images, and approximate coordinates for each destination.
 */

import { ai } from '@/ai/genkit';
import {
  PopularDestinationsInputSchema,
  type PopularDestinationsInput,
  PopularDestinationsOutputSchema,
  type PopularDestinationsOutput,
  AiDestinationSuggestionSchema,
} from '@/ai/types/popular-destinations-types';
import { z } from 'genkit';

// Schema for the AI's text-only output before image generation for each destination
const AiDestinationSuggestionTextOnlySchema = AiDestinationSuggestionSchema.omit({ imageUri: true });

const generateDestinationImage = async (promptText: string | undefined, fallbackDataAiHint: string): Promise<string> => {
  if (!promptText) return `https://placehold.co/600x400.png?text=${encodeURIComponent(fallbackDataAiHint.substring(0,20))}`;
  let imageUri = `https://placehold.co/600x400.png`;
  try {
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
    } else {
      console.warn(`Destination image generation for prompt "${promptText}" did not return a media URL. Using placeholder.`);
      imageUri = `https://placehold.co/600x400.png?text=${encodeURIComponent(fallbackDataAiHint.substring(0,20))}`;
    }
  } catch (imageError) {
    console.error(`Failed to generate destination image for prompt "${promptText}":`, imageError);
    imageUri = `https://placehold.co/600x400.png?text=${encodeURIComponent(fallbackDataAiHint.substring(0,20))}`;
  }
  return imageUri;
};

const popularDestinationsTextPrompt = ai.definePrompt({
  name: 'popularDestinationsTextPrompt',
  input: { schema: PopularDestinationsInputSchema },
  output: { schema: z.object({ destinations: z.array(AiDestinationSuggestionTextOnlySchema), contextualNote: z.string().optional() }) },
  prompt: `You are an expert travel inspiration AI. Your goal is to suggest 3-4 popular and appealing travel destinations.

{{#if userLatitude}}
User's approximate current location: Latitude {{{userLatitude}}}, Longitude {{{userLongitude}}}.
Based on this location, suggest 3-4 popular or interesting travel destinations that are contextually relevant. These could be nearby cities for weekend trips, significant regional attractions, or well-connected hubs for longer travel. Include a mix if possible.
Let the 'contextualNote' explain that suggestions are location-aware.
{{else}}
Suggest 3-4 globally popular or generally interesting travel destinations suitable for various tastes.
Let the 'contextualNote' explain that these are generally popular suggestions.
{{/if}}

For each destination, you MUST provide:
1.  'name': The common name of the destination (e.g., "Paris", "Kyoto", "Banff National Park").
2.  'country': The country where it's located (e.g., "France", "Japan", "Canada").
3.  'description': A captivating 2-3 sentence description highlighting its main appeal.
4.  'latitude': Approximate latitude of the destination (e.g., 48.8566 for Paris). Provide as a number.
5.  'longitude': Approximate longitude of the destination (e.g., 2.3522 for Paris). Provide as a number.
6.  'hotelIdea': A conceptual hotel suggestion including:
    *   'type': General type (e.g., "Charming Boutique Hotel", "Luxury Beachfront Resort", "Cozy Mountain Lodge", "Well-located Hostel").
    *   'priceRange': A typical price range per night (e.g., "$150-$300", "Under $75", "$400+").
7.  'flightIdea': A conceptual flight suggestion including:
    *   'description': General accessibility (e.g., "Major international airport, direct flights from North America & Europe", "Best reached by regional flight or scenic train").
    *   'priceRange': A typical roundtrip price range from major international hubs or relevant regional hubs (e.g., "$500-$900 from USA", "$100-$250 from nearby countries").
8.  'imagePrompt': A concise text prompt (4-7 words) suitable for an image generation AI to create an iconic, high-quality, and visually appealing travel photograph of this destination (e.g., "Eiffel Tower Paris sunset", "Kyoto golden temple autumn", "Banff Moraine Lake turquoise").

Ensure the output strictly follows the defined JSON schema.
Example for 'contextualNote' if location provided: "Suggestions are inspired by your current region."
Example for 'contextualNote' if no location: "Here are some globally popular destinations to inspire you."
Focus on variety and appeal. Provide realistic, common latitude/longitude if known, otherwise make a plausible estimate for a major city within the destination.
`,
});

export const popularDestinationsFlow = ai.defineFlow(
  {
    name: 'popularDestinationsFlow',
    inputSchema: PopularDestinationsInputSchema,
    outputSchema: PopularDestinationsOutputSchema,
  },
  async (input: PopularDestinationsInput): Promise<PopularDestinationsOutput> => {
    const { output: textOutput } = await popularDestinationsTextPrompt(input);

    if (!textOutput || !textOutput.destinations || textOutput.destinations.length === 0) {
      console.warn("Popular Destinations AI (text part) did not return valid suggestions. Returning empty array.");
      return { destinations: [], contextualNote: "Could not fetch destination ideas at this moment. Please try again later." };
    }

    const destinationsWithImages = await Promise.all(
      textOutput.destinations.map(async (dest) => {
        const fallbackHint = `${dest.name.substring(0,10)} ${dest.country.substring(0,5)}`;
        const imageUri = await generateDestinationImage(dest.imagePrompt, fallbackHint);
        return { ...dest, imageUri };
      })
    );

    return {
      destinations: destinationsWithImages,
      contextualNote: textOutput.contextualNote || "Here are some travel ideas to inspire you!"
    };
  }
);

export async function getPopularDestinations(input: PopularDestinationsInput): Promise<PopularDestinationsOutput> {
  return popularDestinationsFlow(input);
}

