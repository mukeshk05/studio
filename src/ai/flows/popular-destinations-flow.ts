
'use server';
/**
 * @fileOverview An AI flow that suggests popular travel destinations,
 * potentially tailored to the user's location and interests. Includes conceptual flight/hotel ideas,
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
  latitudeString: z.string().optional().describe("Approximate latitude of the destination as a STRING (e.g., \"48.8566\" for Paris). This is critical for map display."),
  longitudeString: z.string().optional().describe("Approximate longitude of the destination as a STRING (e.g., \"2.3522\" for Paris). This is critical for map display."),
});


const generateDestinationImage = async (promptText: string | undefined, fallbackDataAiHint: string): Promise<string> => {
  const defaultPlaceholder = `https://placehold.co/600x400.png?text=${encodeURIComponent(fallbackDataAiHint.substring(0,20))}`;
  if (!promptText) {
    console.warn(`[AI Flow - generateDestinationImage] No prompt text provided for ${fallbackDataAiHint}, using placeholder.`);
    return defaultPlaceholder;
  }
  let imageUri = defaultPlaceholder;
  try {
    console.log(`[AI Flow - generateDestinationImage] Attempting to generate image for prompt: "${promptText}" for destination: ${fallbackDataAiHint}`);
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
      console.log(`[AI Flow - generateDestinationImage] Successfully generated image for: ${fallbackDataAiHint}. URI starts with: ${imageUri.substring(0,50)}...`);
    } else {
      console.warn(`[AI Flow - generateDestinationImage] Image generation for prompt "${promptText}" for ${fallbackDataAiHint} did NOT return a media URL. Using placeholder.`);
      imageUri = defaultPlaceholder; // Ensure placeholder is used
    }
  } catch (imageError: any) {
    console.error(`[AI Flow - generateDestinationImage] FAILED to generate image for prompt "${promptText}" for ${fallbackDataAiHint}:`, imageError.message || imageError);
    imageUri = defaultPlaceholder; // Ensure placeholder on error
  }
  return imageUri;
};

const popularDestinationsTextPrompt = ai.definePrompt({
  name: 'popularDestinationsTextPrompt',
  input: { schema: PopularDestinationsInputSchema },
  output: { schema: z.object({ destinations: z.array(AiDestinationSuggestionTextOnlySchema), contextualNote: z.string().optional() }) },
  prompt: `You are an expert travel inspiration AI. Your goal is to suggest 3-4 appealing travel destinations.

{{#if interest}}
The user is specifically interested in: {{{interest}}}.
Please suggest 3-4 destinations that are excellent for this interest.
{{#if userLatitude}}
User's approximate current location: Latitude {{{userLatitude}}}, Longitude {{{userLongitude}}}.
Prioritize destinations contextually relevant to their location if suitable for the interest. If direct relevance is hard, suggest globally appealing options for the interest.
Let the 'contextualNote' explain that suggestions are tailored to their interest and, if applicable, location.
{{else}}
Suggest 3-4 globally popular or interesting travel destinations suitable for the interest '{{{interest}}}'.
Let the 'contextualNote' explain that these are generally popular suggestions for '{{{interest}}}'.
{{/if}}
{{else}}
{{#if userLatitude}}
User's approximate current location: Latitude {{{userLatitude}}}, Longitude {{{userLongitude}}}.
Based on this location, suggest 3-4 popular or interesting travel destinations that are contextually relevant. These could be nearby cities for weekend trips, significant regional attractions, or well-connected hubs for longer travel. Include a mix if possible.
Let the 'contextualNote' explain that suggestions are location-aware.
{{else}}
Suggest 3-4 globally popular or generally interesting travel destinations suitable for various tastes.
Let the 'contextualNote' explain that these are generally popular suggestions.
{{/if}}
{{/if}}

For each destination, you MUST provide:
1.  'name': The common name of the destination (e.g., "Paris", "Kyoto", "Banff National Park").
2.  'country': The country where it's located (e.g., "France", "Japan", "Canada").
3.  'description': A captivating 2-3 sentence description highlighting its main appeal, especially regarding the user's interest if provided.
4.  'latitudeString': Approximate latitude of the destination as a STRING (e.g., "48.8566" for Paris). THIS IS CRITICAL.
5.  'longitudeString': Approximate longitude of the destination as a STRING (e.g., "2.3522" for Paris). THIS IS CRITICAL.
6.  'hotelIdea': A conceptual hotel suggestion including:
    *   'type': General type (e.g., "Charming Boutique Hotel", "Luxury Beachfront Resort", "Cozy Mountain Lodge", "Well-located Hostel").
    *   'priceRange': A typical price range per night (e.g., "$150-$300", "Under $75", "$400+").
7.  'flightIdea': A conceptual flight suggestion including:
    *   'description': General accessibility (e.g., "Major international airport, direct flights from North America & Europe", "Best reached by regional flight or scenic train").
    *   'priceRange': A typical roundtrip price range from major international hubs or relevant regional hubs (e.g., "$500-$900 from USA", "$100-$250 from nearby countries").
8.  'imagePrompt': A concise text prompt (4-7 words) suitable for an image generation AI to create an iconic, high-quality, and visually appealing travel photograph of this destination, reflecting the interest if specified (e.g., "Eiffel Tower Paris romantic sunset", "Kyoto golden temple autumn serene", "Banff Moraine Lake turquoise hiking").

Ensure the output strictly follows the defined JSON schema.
Focus on variety and appeal. Provide realistic, common latitude/longitude for the main city/area of the destination.
If an interest is "Beaches", ensure suggestions are coastal or island destinations with good beaches.
If an interest is "Mountains", ensure suggestions are mountainous regions known for scenery or hiking.
If an interest is "Adventure", suggest places known for thrilling activities.
If an interest is "Culture", suggest places rich in history, art, or unique traditions.
If an interest is "Food", suggest places famous for their culinary scene.
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
            if (!isNaN(latNum) && latNum >= -90 && latNum <= 90) {
                 latitude = latNum;
            } else {
                 console.warn(`[AI Flow - popularDestinationsFlow] Could not parse latitudeString "${destText.latitudeString}" or it's out of range for ${destText.name}`);
            }
        }
        if (destText.longitudeString) {
            const lonNum = parseFloat(destText.longitudeString);
            if (!isNaN(lonNum) && lonNum >= -180 && lonNum <= 180) {
                longitude = lonNum;
            } else {
                console.warn(`[AI Flow - popularDestinationsFlow] Could not parse longitudeString "${destText.longitudeString}" or it's out of range for ${destText.name}`);
            }
        }
         if (latitude === undefined || longitude === undefined) {
            console.warn(`[AI Flow - popularDestinationsFlow] Missing or invalid coordinates for ${destText.name}. Lat: ${destText.latitudeString}, Lng: ${destText.longitudeString}. This destination will not appear on map.`);
        }

        return { 
            ...destText, 
            imageUri,
            latitude, // This might be undefined if parsing failed
            longitude, // This might be undefined if parsing failed
         };
      })
    );
    
    console.log(`[AI Flow - popularDestinationsFlow] Processed ${destinationsWithImages.length} destinations with images and coordinates (or fallbacks).`);
    return {
      destinations: destinationsWithImages,
      contextualNote: textOutput.contextualNote || (input.userLatitude ? (input.interest ? `AI suggestions for '${input.interest}' near your area.` : "AI-powered suggestions based on your area.") : (input.interest ? `General AI suggestions for '${input.interest}'.` : "General popular destination ideas."))
    };
  }
);

export async function getPopularDestinationsWithInput(input: PopularDestinationsInput): Promise<PopularDestinationsOutput> {
  return popularDestinationsFlow(input);
}

