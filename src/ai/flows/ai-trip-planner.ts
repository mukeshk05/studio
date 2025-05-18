
'use server';
/**
 * @fileOverview An AI trip planner agent.
 *
 * - aiTripPlanner - A function that handles the trip planning process.
 * - AITripPlannerInput - The input type for the aiTripPlanner function.
 * - AITripPlannerOutput - The return type for the aiTripPlanner function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AITripPlannerInputSchema = z.object({
  travelDates: z.string().describe('The desired travel dates (e.g., MM/DD/YYYY-MM/DD/YYYY).'),
  destination: z.string().describe('The destination for the trip.'),
  budget: z.number().describe('The budget for the trip in USD.'),
});
export type AITripPlannerInput = z.infer<typeof AITripPlannerInputSchema>;

const FlightOptionSchema = z.object({
  name: z.string().describe('Flight carrier and number, or general description (e.g., "Budget Airline Option 1").'),
  description: z.string().describe('Details about the flight (e.g., layovers, departure/arrival times, airline).'),
  price: z.number().describe('Estimated price of the flight in USD.')
});

const HotelOptionSchema = z.object({
  name: z.string().describe('Name of the hotel or accommodation type (e.g., "City Center Hotel", "Boutique Guesthouse").'),
  description: z.string().describe('Details about the hotel (e.g., amenities, location rating, type). This description will be used to generate a representative image.'),
  price: z.number().describe('Estimated price for the hotel for the duration of the stay in USD.'),
  hotelImageUri: z.string().describe("A data URI of a generated image representing the hotel. Expected format: 'data:image/png;base64,<encoded_data>'."),
});

const ItineraryItemSchema = z.object({
  destination: z.string().describe('The destination for this itinerary.'),
  travelDates: z.string().describe('The travel dates for this itinerary.'),
  estimatedCost: z.number().describe('The total estimated cost for this itinerary in USD, summing a representative flight and hotel option.'),
  description: z.string().describe('A general description of the trip. Crucially, this MUST include a detailed day-by-day plan of potential activities. Format this clearly, e.g., "Day 1: Morning - Activity A, Afternoon - Activity B. Day 2: ...". Specific flight and hotel details will be in their respective sections.'),
  flightOptions: z.array(FlightOptionSchema).describe('A list of flight options for this itinerary. Aim for 2-3 distinct options.'),
  hotelOptions: z.array(HotelOptionSchema).describe('A list of hotel options for this itinerary, each including a generated image. Aim for 2-3 distinct options.'),
  destinationImageUri: z.string().describe("A data URI of a generated image representing the destination. Expected format: 'data:image/png;base64,<encoded_data>'."),
});

const AITripPlannerOutputSchema = z.object({
  itineraries: z.array(ItineraryItemSchema).describe('A list of possible itineraries based on the input, including a generated image for each destination and each hotel option.'),
});
export type AITripPlannerOutput = z.infer<typeof AITripPlannerOutputSchema>;

export async function aiTripPlanner(input: AITripPlannerInput): Promise<AITripPlannerOutput> {
  return aiTripPlannerFlow(input);
}

// Schema for the text-only part of the itinerary, before hotel images are generated
const ItineraryTextOnlySchema = ItineraryItemSchema.omit({ destinationImageUri: true }).extend({
  hotelOptions: z.array(HotelOptionSchema.omit({ hotelImageUri: true })),
});


const aiTripPlannerTextPrompt = ai.definePrompt({
  name: 'aiTripPlannerTextPrompt',
  input: {schema: AITripPlannerInputSchema},
  output: {schema: z.object({ itineraries: z.array(ItineraryTextOnlySchema) }) },
  prompt: `You are a travel agent specializing in budget travel.

You will generate a range of possible itineraries based on the user's budget, destination and travel dates.
For each itinerary:
1.  Provide a 'description' that includes a detailed day-by-day plan of potential activities. Format this clearly (e.g., "Day 1: Morning - Activity A, Afternoon - Activity B. Day 2: ..."). This description should also give an overall feel for the trip.
2.  Detail 2-3 distinct flight options.
3.  Detail 2-3 distinct hotel options. An image will be generated for each hotel based on its description, so make hotel descriptions evocative (e.g., "Charming boutique hotel with a rooftop terrace", "Modern business hotel near the convention center").

Each flight option must include:
- name: Flight carrier and number, or a general description (e.g., "Budget Airline Option 1", "Premium Economy Choice").
- description: Details about the flight (e.g., layovers, direct, departure/arrival times, airline if not in name).
- price: Estimated price of the flight in USD.

Each hotel option must include:
- name: Name of the hotel or accommodation type (e.g., "City Center Hotel", "Riverside Boutique Guesthouse", "Hostel Pods").
- description: Details about the hotel (e.g., key amenities like free breakfast or pool, general location, star rating if applicable, room type). This description should be suitable for image generation.
- price: Estimated price for the hotel for the entire duration of the stay in USD.

The 'estimatedCost' for the overall itinerary should be a sum of a representative flight option and a representative hotel option (e.g., the cheapest combination, or a balanced recommendation).
The main 'description' of the itinerary should contain the day-by-day plan and overall trip atmosphere.

Consider a variety of options for flights, accommodations, and activities that would fit within the budget.
Provide multiple itineraries with varying levels of luxury and activity so the user has multiple choices.

Travel Dates: {{{travelDates}}}
Destination: {{{destination}}}
Budget: {{{budget}}}

Return the itineraries in JSON format according to the defined output schema. Ensure all fields are populated.
`,
});

const generateImage = async (promptText: string, fallbackDataAiHint: string): Promise<string> => {
  let imageUri = `https://placehold.co/600x400.png`; 
  try {
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp',
      prompt: promptText,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
        safetySettings: [ 
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
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
      console.warn(`Image generation for prompt "${promptText}" did not return a media URL. Using placeholder.`);
      imageUri = `https://placehold.co/600x400.png?text=${encodeURIComponent(fallbackDataAiHint)}`;
    }
  } catch (imageError) {
    console.error(`Failed to generate image for prompt "${promptText}":`, imageError);
    imageUri = `https://placehold.co/600x400.png?text=${encodeURIComponent(fallbackDataAiHint)}`;
  }
  return imageUri;
};

const aiTripPlannerFlow = ai.defineFlow(
  {
    name: 'aiTripPlannerFlow',
    inputSchema: AITripPlannerInputSchema,
    outputSchema: AITripPlannerOutputSchema,
  },
  async (input: AITripPlannerInput): Promise<AITripPlannerOutput> => {
    const { output: textPromptOutput } = await aiTripPlannerTextPrompt(input);

    if (!textPromptOutput || !textPromptOutput.itineraries) {
      return { itineraries: [] };
    }

    const itinerariesWithImages = await Promise.all(
      textPromptOutput.itineraries.map(async (itinerary) => {
        const destinationImagePrompt = `A vibrant, high-quality travel photograph representing ${itinerary.destination}. Focus on its most iconic visual elements or overall atmosphere. Style: photorealistic. Aspect ratio: 16:9.`;
        const destinationImageUri = await generateImage(destinationImagePrompt, itinerary.destination);

        const hotelOptionsWithImages = await Promise.all(
          itinerary.hotelOptions.map(async (hotel) => {
            const hotelImagePrompt = `Photorealistic image of a ${hotel.description}, hotel name: ${hotel.name}, in ${itinerary.destination}. Aspect ratio: 16:9.`;
            // Use hotel name and type for fallback hint if description is too generic
            const fallbackHotelHint = `${hotel.name.substring(0,15)} ${hotel.description.split(' ')[0].substring(0,10)}`
            const hotelImageUri = await generateImage(hotelImagePrompt, fallbackHotelHint);
            return { ...hotel, hotelImageUri };
          })
        );

        return {
          ...itinerary,
          destinationImageUri,
          hotelOptions: hotelOptionsWithImages,
        };
      })
    );
    return { itineraries: itinerariesWithImages };
  }
);
