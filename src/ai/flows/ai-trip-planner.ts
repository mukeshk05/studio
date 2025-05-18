
'use server';
/**
 * @fileOverview An AI trip planner agent.
 *
 * - aiTripPlanner - A function that handles the trip planning process.
 */

import {ai} from '@/ai/genkit';
import {
  AITripPlannerInputSchema,
  type AITripPlannerInput,
  AITripPlannerOutputSchema,
  type AITripPlannerOutput,
  AITripPlannerTextOutputSchema,
} from '@/ai/types/trip-planner-types';


export async function aiTripPlanner(input: AITripPlannerInput): Promise<AITripPlannerOutput> {
  return aiTripPlannerFlow(input);
}

const aiTripPlannerTextPrompt = ai.definePrompt({
  name: 'aiTripPlannerTextPrompt',
  input: {schema: AITripPlannerInputSchema},
  output: {schema: AITripPlannerTextOutputSchema },
  prompt: `You are a travel agent specializing in budget travel.
{{#if userPersona}}
The user you are planning for has the following travel persona:
- Name: {{{userPersona.name}}}
- Description: {{{userPersona.description}}}
Please prioritize suggestions, activities, and accommodation styles that align strongly with this persona.
If the persona suggests luxury, try to find high-value luxury. If it suggests adventure, focus on relevant activities.
The overall tone and suggestions should reflect their travel DNA.
The first itinerary suggested should be the best match for their persona.
{{/if}}

{{#if desiredMood}}
The user is looking for a trip with a specific mood: {{{desiredMood}}}.
Please ensure the suggested activities, the tone of the trip summary, and the daily plan strongly reflect this.
For example, if the mood is 'romantic', suggest activities like sunset views, fine dining. If 'adventurous', suggest hiking or unique local experiences.
{{/if}}

{{#if weatherContext}}
The user has provided the following weather context for their trip: {{{weatherContext}}}.
Use this information to tailor activities. For example, if rain is expected, suggest more indoor activities or alternatives. If sunny, emphasize outdoor options.
{{else}}
When planning activities, assume you have access to a general weather forecast for the destination and travel dates. 
If rain is likely for typically outdoor activities, suggest indoor alternatives or note this possibility. If the weather is expected to be pleasant, emphasize outdoor activities.
This consideration should be subtly woven into the daily plan.
{{/if}}

{{#if riskContext}}
The user has provided the following risk context or concerns: {{{riskContext}}}.
Please explicitly consider this information when suggesting activities and accommodations. If necessary, add brief warnings, suggest alternatives, or note precautions in the daily plan or trip summary related to these risks.
{{else}}
When planning, also generally consider common travel advisories or potential risks for the destination and travel dates (e.g., peak tourist season causing crowds, common weather issues for that time of year, general safety tips for the area). If significant, subtly mention relevant considerations, alternatives, or precautions in the daily plan or trip summary.
{{/if}}

You will generate a range of possible itineraries (usually 2-3) based on the user's budget, destination and travel dates.
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
Among these itineraries, try to include at least one that could serve as a distinct 'backup plan' or 'alternative approach' to the trip. This might focus on different core activities, have a different pacing, or be more resilient to potential disruptions (e.g., weather, crowds) for the given destination and dates. Its 'tripSummary' could reflect this resilient nature.

Travel Dates: {{{travelDates}}}
Destination: {{{destination}}}
Budget: {{{budget}}}

Return the itineraries in JSON format according to the defined output schema. Ensure all fields are populated.
`,
});

// New Backup Prompt
const backupAiTripPlannerTextPrompt = ai.definePrompt({
  name: 'backupAiTripPlannerTextPrompt',
  input: {schema: AITripPlannerInputSchema},
  output: {schema: AITripPlannerTextOutputSchema },
  prompt: `You are a helpful backup travel assistant. The primary planner might have encountered an issue.
Please generate 1 or 2 robust and appealing itineraries for the user based on the following details.
Focus on common attractions and adaptable activities. Keep suggestions somewhat general if specific preferences like persona or mood are complex.

Travel Dates: {{{travelDates}}}
Destination: {{{destination}}}
Budget: {{{budget}}}
{{#if userPersona~}}
User Persona: {{userPersona.name}} - {{userPersona.description}} (Consider this if possible, but prioritize generating a valid plan)
{{/if~}}
{{#if desiredMood~}}
Desired Mood: {{desiredMood}} (Consider this if possible)
{{/if~}}

For each itinerary:
1.  Provide a 'tripSummary': A concise summary of the trip.
2.  Provide a 'dailyPlan': An array with 'day' and 'activities' for each day.
3.  Detail 1-2 flight options (name, description, price).
4.  Detail 1-2 hotel options (name, description, price, rating, amenities, 1-2 rooms with name, features, roomImagePrompt).
5.  Provide an 'estimatedCost'.

Return in the specified JSON format.
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
    let wasBackupPlannerUsed = false;
    let textPromptOutput: AITripPlannerTextOutputSchema | undefined;

    // Try primary prompt first
    try {
        const { output } = await aiTripPlannerTextPrompt(input);
        textPromptOutput = output;
    } catch (primaryError) {
        console.warn("Primary AI Trip Planner text prompt failed:", primaryError);
        textPromptOutput = undefined; // Ensure it's undefined so backup is tried
    }


    if (!textPromptOutput || !textPromptOutput.itineraries || textPromptOutput.itineraries.length === 0) {
      console.warn("Primary AI Trip Planner did not return itineraries or failed. Attempting backup planner.");
      wasBackupPlannerUsed = true;
      try {
        const { output: backupOutput } = await backupAiTripPlannerTextPrompt(input);
        textPromptOutput = backupOutput;
      } catch (backupError) {
        console.error("Backup AI Trip Planner also failed:", backupError);
        // If backup also fails, return empty or a default error structure
         return { itineraries: [], personalizationNote: "Sorry, we encountered an issue generating trip plans, even with our backup planner. Please try again later or adjust your query." };
      }
    }
    
    if (!textPromptOutput || !textPromptOutput.itineraries) {
      console.warn("AI Trip Planner (primary or backup) did not return itineraries.");
      return { itineraries: [], personalizationNote: wasBackupPlannerUsed ? "Our backup planner couldn't generate suggestions for this request. Please try again." : "No itineraries could be generated for your request. Please try different criteria." };
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

    let personalizationNoteParts: string[] = [];
    if (wasBackupPlannerUsed) {
        personalizationNoteParts.push("These suggestions were provided by our backup planner to ensure you received some ideas.");
    }
    if (input.userPersona?.name) {
      personalizationNoteParts.push(`Tailored for the '${input.userPersona.name}' travel style.`);
    }
    if (input.desiredMood) {
        personalizationNoteParts.push(`Focused on a '${input.desiredMood}' vibe.`);
    }
    
    if (input.weatherContext) {
        personalizationNoteParts.push("Specific weather context considered.");
    } else {
        personalizationNoteParts.push("General weather patterns considered in planning.");
    }

    if (input.riskContext) {
        personalizationNoteParts.push("Specific risk context considered.");
    } else {
        personalizationNoteParts.push("General risk factors considered in planning.");
    }
    
    const personalizationNote = personalizationNoteParts.length > 0 ? personalizationNoteParts.join(' ') : undefined;


    return { 
      itineraries: itinerariesWithImages,
      personalizationNote: personalizationNote
    };
  }
);

