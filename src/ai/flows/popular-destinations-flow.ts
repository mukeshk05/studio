
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
const AiDestinationSuggestionTextOnlySchema = AiDestinationSuggestionSchema.omit({ imageUri: true, latitude: true, longitude: true }).extend({
  latitudeString: z.string().optional().describe("Approximate latitude as a string to ensure LLM provides it."),
  longitudeString: z.string().optional().describe("Approximate longitude as a string."),
});


const generateDestinationImage = async (promptText: string | undefined, fallbackDataAiHint: string): Promise<string> => {
  if (!promptText) {
    console.warn(`[AI Flow - generateDestinationImage] No prompt text provided for ${fallbackDataAiHint}, using placeholder.`);
    return `https://placehold.co/600x400.png?text=${encodeURIComponent(fallbackDataAiHint.substring(0,20))}`;
  }
  let imageUri = `https://placehold.co/600x400.png`; // Default placeholder
  try {
    console.log(`[AI Flow - generateDestinationImage] Attempting to generate image for prompt: "${promptText}" for destination: ${fallbackDataAiHint}`);
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp', // Ensure this model is available and configured for image generation
      prompt: `Generate an iconic, vibrant, and high-quality travel photograph representing: ${promptText}. Aspect ratio 16:9. Focus on its most recognizable visual elements or overall atmosphere.`,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
        safetySettings: [ // Moderate safety settings
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
      console.log(`[AI Flow - generateDestinationImage] Successfully generated image for: ${fallbackDataAiHint}. URI starts with: ${imageUri.substring(0,50)}...`);
    } else {
      console.warn(`[AI Flow - generateDestinationImage] Image generation for prompt "${promptText}" for ${fallbackDataAiHint} did NOT return a media URL. Using placeholder.`);
      imageUri = `https://placehold.co/600x400.png?text=${encodeURIComponent(fallbackDataAiHint.substring(0,20))}`;
    }
  } catch (imageError: any) {
    console.error(`[AI Flow - generateDestinationImage] FAILED to generate image for prompt "${promptText}" for ${fallbackDataAiHint}:`, imageError.message || imageError);
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
4.  'latitudeString': Approximate latitude of the destination as a STRING (e.g., "48.8566" for Paris).
5.  'longitudeString': Approximate longitude of the destination as a STRING (e.g., "2.3522" for Paris).
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
    console.log('[AI Flow - popularDestinationsFlow] Received input:', input);
    const { output: textOutput } = await popularDestinationsTextPrompt(input);

    if (!textOutput || !textOutput.destinations || textOutput.destinations.length === 0) {
      console.warn("[AI Flow - popularDestinationsFlow] Text prompt did not return valid destination suggestions.");
      return { destinations: [], contextualNote: "Could not fetch destination ideas at this moment. Please try again later." };
    }
    console.log('[AI Flow - popularDestinationsFlow] Text-only destinations received from LLM:', textOutput.destinations.length);

    const destinationsWithImages = await Promise.all(
      textOutput.destinations.map(async (destText) => {
        const fallbackHint = `${destText.name.substring(0,10)} ${destText.country.substring(0,5)}`;
        const imageUri = await generateDestinationImage(destText.imagePrompt, fallbackHint);
        
        let latitude: number | undefined = undefined;
        let longitude: number | undefined = undefined;
        if (destText.latitudeString) {
            const latNum = parseFloat(destText.latitudeString);
            if (!isNaN(latNum)) latitude = latNum;
            else console.warn(`[AI Flow - popularDestinationsFlow] Could not parse latitudeString "${destText.latitudeString}" for ${destText.name}`);
        }
        if (destText.longitudeString) {
            const lonNum = parseFloat(destText.longitudeString);
            if (!isNaN(lonNum)) longitude = lonNum;
            else console.warn(`[AI Flow - popularDestinationsFlow] Could not parse longitudeString "${destText.longitudeString}" for ${destText.name}`);
        }

        return { 
            ...destText, 
            imageUri,
            latitude,
            longitude,
         };
      })
    );
    
    console.log(`[AI Flow - popularDestinationsFlow] Processed ${destinationsWithImages.length} destinations with images (or fallbacks).`);
    return {
      destinations: destinationsWithImages,
      contextualNote: textOutput.contextualNote || (input.userLatitude ? "AI-powered suggestions based on your area." : "General popular destination ideas.")
    };
  }
);

export async function getPopularDestinations(input: PopularDestinationsInput): Promise<PopularDestinationsOutput> {
  return popularDestinationsFlow(input);
}
