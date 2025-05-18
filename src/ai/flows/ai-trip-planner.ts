
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

const RoomSchema = z.object({
  name: z.string().describe("Name of the room type (e.g., 'Deluxe King Room', 'Standard Twin Room with City View')."),
  description: z.string().optional().describe("A brief description of the room type."),
  features: z.array(z.string()).optional().describe("Key features of the room (e.g., ['Ocean view', 'Balcony', 'Sleeps 2', 'Mini-fridge'])."),
  pricePerNight: z.number().optional().describe("Estimated price per night for this room type in USD, if available. This is optional."),
  roomImagePrompt: z.string().optional().describe("A concise text prompt suitable for generating a representative image of this room type (e.g., 'Modern hotel room king bed city view', 'Cozy twin room with balcony')."),
  roomImageUri: z.string().optional().describe("A data URI of a generated image representing this room type. Expected format: 'data:image/png;base64,<encoded_data>'. This will be populated by the flow."),
});

const HotelOptionSchema = z.object({
  name: z.string().describe('Name of the hotel or accommodation type (e.g., "City Center Hotel", "Boutique Guesthouse").'),
  description: z.string().describe('Details about the hotel (e.g., amenities, location rating, type). This description will be used to generate a representative image.'),
  price: z.number().describe('Estimated price for the hotel for the duration of the stay in USD.'),
  hotelImageUri: z.string().describe("A data URI of a generated image representing the hotel. Expected format: 'data:image/png;base64,<encoded_data>'."),
  rating: z.number().min(0).max(5).optional().describe("Overall guest rating out of 5 (e.g., 4.5)."),
  amenities: z.array(z.string()).optional().describe("List of key amenities (e.g., ['Free WiFi', 'Pool', 'Restaurant', 'Pet-friendly', 'Gym', 'Spa', 'Parking']). Provide 3-7 important amenities."),
  rooms: z.array(RoomSchema).optional().describe("A list of 2-3 available room types with their details. For each room, include name, description, features, and a 'roomImagePrompt' for image generation."),
});

const DailyPlanItemSchema = z.object({
  day: z.string().describe('The day number or label (e.g., "Day 1", "Arrival Day").'),
  activities: z.string().describe('A detailed description of activities planned for this day, including potential morning, afternoon, and evening segments if applicable. Be descriptive and engaging.'),
});

const ItineraryItemSchema = z.object({
  destination: z.string().describe('The destination for this itinerary.'),
  travelDates: z.string().describe('The travel dates for this itinerary.'),
  estimatedCost: z.number().describe('The total estimated cost for this itinerary in USD, summing a representative flight and hotel option.'),
  tripSummary: z.string().describe('A concise and engaging summary of the overall trip, highlighting its theme or key attractions. This summary should NOT include the detailed day-by-day plan or specific flight/hotel details.'),
  dailyPlan: z.array(DailyPlanItemSchema).describe('A detailed day-by-day plan of potential activities. Each item should clearly state the day and the activities for that day.'),
  flightOptions: z.array(FlightOptionSchema).describe('A list of flight options for this itinerary. Aim for 2-3 distinct options.'),
  hotelOptions: z.array(HotelOptionSchema).describe('A list of hotel options for this itinerary, each including a generated image for the hotel and its rooms. Aim for 2-3 distinct options.'),
  destinationImageUri: z.string().describe("A data URI of a generated image representing the destination. Expected format: 'data:image/png;base64,<encoded_data>'."),
});

const AITripPlannerOutputSchema = z.object({
  itineraries: z.array(ItineraryItemSchema).describe('A list of possible itineraries based on the input, including generated images for destination, hotels, and hotel rooms, and a structured daily plan.'),
});
export type AITripPlannerOutput = z.infer<typeof AITripPlannerOutputSchema>;

export async function aiTripPlanner(input: AITripPlannerInput): Promise<AITripPlannerOutput> {
  return aiTripPlannerFlow(input);
}

// Schema for the text-only part of the itinerary, before images are generated
const HotelOptionTextOnlySchema = HotelOptionSchema.omit({ hotelImageUri: true }).extend({
  rooms: z.array(RoomSchema.omit({ roomImageUri: true })).optional(),
});

const ItineraryTextOnlySchema = ItineraryItemSchema.omit({ destinationImageUri: true }).extend({
  hotelOptions: z.array(HotelOptionTextOnlySchema),
});


const aiTripPlannerTextPrompt = ai.definePrompt({
  name: 'aiTripPlannerTextPrompt',
  input: {schema: AITripPlannerInputSchema},
  output: {schema: z.object({ itineraries: z.array(ItineraryTextOnlySchema) }) },
  prompt: `You are a travel agent specializing in budget travel.

You will generate a range of possible itineraries based on the user's budget, destination and travel dates.
For each itinerary:
1.  Provide a 'tripSummary' which is a concise and engaging summary of the overall trip, highlighting its theme or key attractions. This summary should NOT include the detailed day-by-day plan or specific flight/hotel details.
2.  Provide a 'dailyPlan' as an array of objects. Each object in the array should represent one day and have two fields:
    - 'day': A string for the day's label (e.g., "Day 1", "Arrival Day").
    - 'activities': A string describing the activities for that day in detail. Be engaging and descriptive. You can suggest morning, afternoon, and evening activities. Ensure this is a comprehensive plan.
3.  Detail 2-3 distinct flight options.
4.  Detail 2-3 distinct hotel options.

Each flight option must include:
- name: Flight carrier and number, or a general description.
- description: Details about the flight.
- price: Estimated price of the flight in USD.

Each hotel option must include:
- name: Name of the hotel or accommodation type.
- description: Details about the hotel (e.g., general location, type, overall vibe). This description should be suitable for generating a main hotel image.
- price: Estimated total price for the hotel for the entire duration of the stay in USD.
- rating: Overall guest rating out of 5 (e.g., 4.2).
- amenities: An array of 3-7 key amenities (e.g., ["Free WiFi", "Pool", "Gym"]).
- rooms: An array of 2-3 available room types. For each room:
    - name: Name of the room type (e.g., "Deluxe King Room").
    - description: A brief description of the room.
    - features: An array of key features (e.g., ["Ocean view", "Sleeps 2"]).
    - pricePerNight: (Optional) Estimated price per night for this room type in USD.
    - roomImagePrompt: A concise text prompt suitable for generating a representative image of THIS SPECIFIC ROOM TYPE (e.g., "Modern hotel room king bed large window city view", "Cozy twin room with balcony and garden view").

The 'estimatedCost' for the overall itinerary should be a sum of a representative flight option and a representative hotel option.
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
      imageUri = `https://placehold.co/600x400.png?text=${encodeURIComponent(fallbackDataAiHint.substring(0,20))}`;
    }
  } catch (imageError) {
    console.error(`Failed to generate image for prompt "${promptText}":`, imageError);
    imageUri = `https://placehold.co/600x400.png?text=${encodeURIComponent(fallbackDataAiHint.substring(0,20))}`;
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
      console.warn("AI Trip Planner text prompt did not return itineraries.");
      return { itineraries: [] };
    }
    
    if (textPromptOutput.itineraries.some(it => !it.dailyPlan || it.dailyPlan.length === 0)) {
      console.warn("Some itineraries are missing daily plans. Check AI prompt and output structure.", textPromptOutput.itineraries);
    }

    const itinerariesWithImages = await Promise.all(
      textPromptOutput.itineraries.map(async (itinerary) => {
        const destinationImagePrompt = `A vibrant, high-quality travel photograph representing ${itinerary.destination}. Focus on its most iconic visual elements or overall atmosphere. Style: photorealistic. Aspect ratio: 16:9.`;
        const destinationImageUri = await generateImage(destinationImagePrompt, itinerary.destination);

        const hotelOptionsWithImages = await Promise.all(
          (itinerary.hotelOptions || []).map(async (hotel) => {
            const hotelImagePrompt = `Photorealistic image of a ${hotel.description}, hotel name: ${hotel.name}, in ${itinerary.destination}. Aspect ratio: 16:9.`;
            const fallbackHotelHint = `${hotel.name.substring(0,15)} ${hotel.description.split(' ')[0].substring(0,10)}`
            const hotelImageUri = await generateImage(hotelImagePrompt, fallbackHotelHint);
            
            const roomsWithImages = hotel.rooms ? await Promise.all(
              hotel.rooms.map(async (room) => {
                if (room.roomImagePrompt) {
                  const fallbackRoomHint = `${room.name.substring(0,15)} room`
                  const roomImageUri = await generateImage(room.roomImagePrompt, fallbackRoomHint);
                  return { ...room, roomImageUri };
                }
                return { ...room, roomImageUri: `https://placehold.co/300x200.png?text=${encodeURIComponent(room.name.substring(0,10))}` };
              })
            ) : [];

            return { ...hotel, hotelImageUri, rooms: roomsWithImages };
          })
        );
        
        const dailyPlan = itinerary.dailyPlan || [];

        return {
          ...itinerary,
          destinationImageUri,
          hotelOptions: hotelOptionsWithImages,
          dailyPlan: dailyPlan, 
        };
      })
    );
    return { itineraries: itinerariesWithImages };
  }
);

