
'use server';
/**
 * @fileOverview An AI flow that suggests conceptual hotel options based on user criteria,
 * including coordinates for map plotting.
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
// This now includes latitude and longitude as strings, which will be parsed to numbers later.
const AiHotelSuggestionTextOnlySchema = AiHotelSuggestionSchema.omit({ imageUri: true, latitude: true, longitude: true }).extend({
  latitudeString: z.string().optional().describe("Approximate latitude of the hotel as a STRING (e.g., \"48.8584\"). THIS IS CRITICAL. If suggesting a hotel, this must be provided."),
  longitudeString: z.string().optional().describe("Approximate longitude of the hotel as a STRING (e.g., \"2.2945\"). THIS IS CRITICAL. If suggesting a hotel, this must be provided."),
});

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
A user is looking for hotels. Critically analyze the 'Destination/Context' field:
- If 'Destination/Context' includes the phrase 'near latitude' and 'longitude', this is a specific request for hotels in THAT GEOGRAPHICAL AREA. Prioritize finding conceptual hotels close to those coordinates.
- Otherwise, treat 'Destination/Context' as a city, region, or general landmark name.

User's Criteria:
- Destination/Context: {{{destination}}}
- Check-in Date: {{{checkInDate}}}
- Check-out Date: {{{checkOutDate}}}
- Guests: {{{guests}}}

Suggest 3 to 4 plausible, conceptual hotel options.
For EACH hotel, you MUST provide a JSON object with ALL of the following fields:
-   'name': A plausible hotel name (e.g., "The Grand Plaza Hotel", "Seaside Boutique Inn", "Urban Comfort Suites").
-   'conceptualPriceRange': A realistic but conceptual price range per night in USD (e.g., "$120 - $180 / night", "Around $200 per night", "Est. $90 - $130 / night").
-   'rating': A conceptual guest rating out of 5 (e.g., 4.2, 3.8, 4.7).
-   'description': A short, appealing description of the hotel (2-3 sentences), highlighting its vibe or key selling points.
-   'amenities': An array of 3 to 5 key amenities (e.g., ["Pool", "Free WiFi", "Parking", "Restaurant", "Gym", "Pet-friendly"]).
-   'latitudeString': Approximate latitude of the hotel as a STRING (e.g., "48.8584" for a Paris hotel). THIS IS ABSOLUTELY CRITICAL for map display. Be as accurate as conceptually possible for the hotel's location. If suggesting a hotel, this must be provided.
-   'longitudeString': Approximate longitude of the hotel as a STRING (e.g., "2.2945" for a Paris hotel). THIS IS ABSOLUTELY CRITICAL for map display. Be as accurate as conceptually possible. If suggesting a hotel, this must be provided.
-   'imagePrompt': A concise text prompt (5-10 words) suitable for an image generation AI to create an attractive photo of this type of hotel (e.g., "modern hotel exterior sunny day city", "cozy boutique hotel room fireplace", "luxury resort pool sunset view").

Example of a single hotel option object for Paris:
{
  "name": "The Parisian Charm Hotel",
  "conceptualPriceRange": "$180 - $250 / night",
  "rating": 4.4,
  "description": "Experience classic Parisian elegance in this centrally located boutique hotel. Offers beautifully decorated rooms and a delightful courtyard.",
  "amenities": ["Free WiFi", "Concierge", "Bar", "Air Conditioning", "Daily Housekeeping"],
  "latitudeString": "48.866",
  "longitudeString": "2.333",
  "imagePrompt": "charming parisian boutique hotel facade flowers"
}

Example for "Hotels near latitude 40.7128, longitude -74.0060" (New York City):
{
  "name": "Downtown Manhattan View Hotel",
  "conceptualPriceRange": "$250 - $400 / night",
  "rating": 4.1,
  "description": "A modern hotel in Lower Manhattan offering stunning city views and easy access to financial district landmarks.",
  "amenities": ["Rooftop Bar", "Gym", "Business Center", "Free WiFi"],
  "latitudeString": "40.7095",
  "longitudeString": "-74.0085",
  "imagePrompt": "manhattan hotel modern skyline view"
}


Return a JSON object with a key "hotels" containing an array of these hotel option objects, and an optional "searchSummary" string (e.g., "Here are a few hotel ideas for your stay in {{{destination}}}!").
Ensure the output is valid JSON. These are illustrative examples, not real-time bookable hotels.
Focus on variety in hotel types and price points if possible.
MAKE SURE to include 'latitudeString' and 'longitudeString' for EVERY hotel suggestion. If the specific hotel idea is very conceptual and an exact location is impossible, provide coordinates for the general city/area requested for {{{destination}}}.
`,
});

export const aiHotelSearchFlow = ai.defineFlow(
  {
    name: 'aiHotelSearchFlow',
    inputSchema: AiHotelSearchInputSchema,
    outputSchema: AiHotelSearchOutputSchema,
  },
  async (input: AiHotelSearchInput): Promise<AiHotelSearchOutput> => {
    console.log('[AI Flow - aiHotelSearchFlow] Received input:', JSON.stringify(input, null, 2));
    const { output: textOutput } = await hotelSearchTextPrompt(input);

    if (!textOutput || !textOutput.hotels || textOutput.hotels.length === 0) {
      console.warn("[AI Flow - aiHotelSearchFlow] Text prompt did not return valid hotel suggestions. Input was:", JSON.stringify(input, null, 2), "Output was:", JSON.stringify(textOutput, null, 2));
      return {
        hotels: [],
        searchSummary: textOutput?.searchSummary || `AI couldn't find conceptual hotel ideas for ${input.destination} for the specified dates. Please try different criteria.`,
      };
    }
    console.log(`[AI Flow - aiHotelSearchFlow] Text-only hotel suggestions received: ${textOutput.hotels.length}`);
    textOutput.hotels.forEach((hotel, index) => {
      console.log(`[AI Flow - aiHotelSearchFlow] Hotel ${index} text data: Name: ${hotel.name}, LatStr: ${hotel.latitudeString}, LngStr: ${hotel.longitudeString}, ImagePrompt: ${hotel.imagePrompt}`);
    });

    const hotelsWithImagesAndCoords = await Promise.all(
      textOutput.hotels.map(async (hotelText) => {
        const fallbackHint = `${hotelText.name ? hotelText.name.substring(0, 15) : 'Hotel'} ${input.destination ? input.destination.substring(0, 10) : 'Location'}`;
        const imageUri = await generateHotelImage(hotelText.imagePrompt, fallbackHint);
        
        let latitude: number | undefined = undefined;
        let longitude: number | undefined = undefined;

        if (hotelText.latitudeString) {
            const latNum = parseFloat(hotelText.latitudeString);
            if (!isNaN(latNum) && latNum >= -90 && latNum <= 90) {
                 latitude = latNum;
            } else {
                 console.warn(`[AI Flow - aiHotelSearchFlow] Could not parse latitudeString "${hotelText.latitudeString}" or it's out of range for ${hotelText.name}. Parsed: ${latNum}.`);
            }
        } else {
            console.warn(`[AI Flow - aiHotelSearchFlow] Missing latitudeString for ${hotelText.name}.`);
        }
        if (hotelText.longitudeString) {
            const lonNum = parseFloat(hotelText.longitudeString);
            if (!isNaN(lonNum) && lonNum >= -180 && lonNum <= 180) {
                longitude = lonNum;
            } else {
                console.warn(`[AI Flow - aiHotelSearchFlow] Could not parse longitudeString "${hotelText.longitudeString}" or it's out of range for ${hotelText.name}. Parsed: ${lonNum}.`);
            }
        } else {
            console.warn(`[AI Flow - aiHotelSearchFlow] Missing longitudeString for ${hotelText.name}.`);
        }

        // Ensure all fields from AiHotelSuggestionSchema are present, even if some are undefined from parsing
        return {
          name: hotelText.name,
          conceptualPriceRange: hotelText.conceptualPriceRange,
          rating: hotelText.rating,
          description: hotelText.description,
          amenities: hotelText.amenities,
          imagePrompt: hotelText.imagePrompt,
          imageUri,
          latitude, 
          longitude,
        };
      })
    );
    
    hotelsWithImagesAndCoords.forEach((hotel, index) => {
        console.log(`[AI Flow - aiHotelSearchFlow] Hotel ${index} processed data: Name: ${hotel.name}, Lat: ${hotel.latitude}, Lng: ${hotel.longitude}, ImageURI present: ${!!hotel.imageUri}`);
    });

    console.log(`[AI Flow - aiHotelSearchFlow] Processed ${hotelsWithImagesAndCoords.length} hotel suggestions with images and coordinates.`);
    return {
      hotels: hotelsWithImagesAndCoords,
      searchSummary: textOutput.searchSummary || `Here are some conceptual hotel ideas for ${input.destination}.`
    };
  }
);

        