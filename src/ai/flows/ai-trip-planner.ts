
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
  description: z.string().describe('Details about the hotel (e.g., amenities, location rating, type).'),
  price: z.number().describe('Estimated price for the hotel for the duration of the stay in USD.')
});

const ItineraryItemSchema = z.object({
  destination: z.string().describe('The destination for this itinerary.'),
  travelDates: z.string().describe('The travel dates for this itinerary.'),
  estimatedCost: z.number().describe('The total estimated cost for this itinerary in USD, summing a representative flight and hotel option.'),
  description: z.string().describe('A general description of the trip including potential activities and the overall experience. Specific flight and hotel details will be in their respective sections.'),
  flightOptions: z.array(FlightOptionSchema).describe('A list of flight options for this itinerary. Aim for 2-3 distinct options.'),
  hotelOptions: z.array(HotelOptionSchema).describe('A list of hotel options for this itinerary. Aim for 2-3 distinct options.'),
  destinationImageUri: z.string().describe("A data URI of a generated image representing the destination. Expected format: 'data:image/png;base64,<encoded_data>'."),
});

const AITripPlannerOutputSchema = z.object({
  itineraries: z.array(ItineraryItemSchema).describe('A list of possible itineraries based on the input, including a generated image for each destination.'),
});
export type AITripPlannerOutput = z.infer<typeof AITripPlannerOutputSchema>;

export async function aiTripPlanner(input: AITripPlannerInput): Promise<AITripPlannerOutput> {
  return aiTripPlannerFlow(input);
}

const aiTripPlannerTextPrompt = ai.definePrompt({
  name: 'aiTripPlannerTextPrompt',
  input: {schema: AITripPlannerInputSchema},
  // Output schema here is for the text part only, before image generation
  output: {schema: z.object({ itineraries: z.array(ItineraryItemSchema.omit({ destinationImageUri: true })) }) },
  prompt: `You are a travel agent specializing in budget travel.

You will generate a range of possible itineraries based on the user's budget, destination and travel dates.
For each itinerary, provide a general description of the trip, potential activities, and the overall experience.
Crucially, for each itinerary, detail 2-3 distinct flight options and 2-3 distinct hotel options.

Each flight option must include:
- name: Flight carrier and number, or a general description (e.g., "Budget Airline Option 1", "Premium Economy Choice").
- description: Details about the flight (e.g., layovers, direct, departure/arrival times, airline if not in name).
- price: Estimated price of the flight in USD.

Each hotel option must include:
- name: Name of the hotel or accommodation type (e.g., "City Center Hotel", "Riverside Boutique Guesthouse", "Hostel Pods").
- description: Details about the hotel (e.g., key amenities like free breakfast or pool, general location, star rating if applicable, room type).
- price: Estimated price for the hotel for the entire duration of the stay in USD.

The 'estimatedCost' for the overall itinerary should be a sum of a representative flight option and a representative hotel option (e.g., the cheapest combination, or a balanced recommendation).
The main 'description' of the itinerary should focus on the overall trip, activities, and atmosphere, not repeating the specific flight/hotel details as those are itemized separately.

Consider a variety of options for flights, accommodations, and activities that would fit within the budget.
Provide multiple itineraries with varying levels of luxury and activity so the user has multiple choices.

Travel Dates: {{{travelDates}}}
Destination: {{{destination}}}
Budget: {{{budget}}}

Return the itineraries in JSON format according to the defined output schema. Ensure all fields are populated.
`,
});

const aiTripPlannerFlow = ai.defineFlow(
  {
    name: 'aiTripPlannerFlow',
    inputSchema: AITripPlannerInputSchema,
    outputSchema: AITripPlannerOutputSchema,
  },
  async (input: AITripPlannerInput) => {
    const { output: textPromptOutput } = await aiTripPlannerTextPrompt(input);

    if (!textPromptOutput || !textPromptOutput.itineraries) {
      return { itineraries: [] };
    }

    const itinerariesWithImages = await Promise.all(
      textPromptOutput.itineraries.map(async (itinerary) => {
        let imageUri = `https://placehold.co/600x400.png`; // Default placeholder
        
        try {
          const imagePromptText = `A vibrant, high-quality travel photograph representing ${itinerary.destination}. Focus on its most iconic visual elements or overall atmosphere. Style: photorealistic. Aspect ratio: 16:9.`;
          
          const { media } = await ai.generate({
            model: 'googleai/gemini-2.0-flash-exp',
            prompt: imagePromptText,
            config: {
              responseModalities: ['TEXT', 'IMAGE'],
              safetySettings: [ 
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
              ],
            },
            // @ts-ignore // Experimental API might have type issues with some TS configs.
            experimentalDoNotSelectOutputTool: true, 
          });

          if (media?.url) {
            imageUri = media.url;
          } else {
            console.warn(`Image generation for ${itinerary.destination} did not return a media URL. Using placeholder.`);
            imageUri = `https://placehold.co/600x400.png`;
          }
        } catch (imageError) {
          console.error(`Failed to generate image for ${itinerary.destination}:`, imageError);
          imageUri = `https://placehold.co/600x400.png`;
        }
        
        return {
          ...itinerary,
          destinationImageUri: imageUri,
        };
      })
    );
    return { itineraries: itinerariesWithImages };
  }
);

