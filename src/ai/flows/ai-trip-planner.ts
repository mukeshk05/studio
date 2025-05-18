
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
  type TextPlannerOutput,
} from '@/ai/types/trip-planner-types';


export async function aiTripPlanner(input: AITripPlannerInput): Promise<AITripPlannerOutput> {
  return aiTripPlannerFlow(input);
}

const aiTripPlannerTextPrompt = ai.definePrompt({
  name: 'aiTripPlannerTextPrompt',
  input: {schema: AITripPlannerInputSchema},
  output: {schema: AITripPlannerTextOutputSchema },
  prompt: `You are a travel agent specializing in budget travel. Act as an AI Guardian for the user.
Your response must be a JSON object matching the AITripPlannerTextOutputSchema.

Consider the following inputs to personalize the trip:
- Destination: {{{destination}}}
- Travel Dates: {{{travelDates}}}
- Budget: {{{budget}}}

{{#if userPersona}}
The user you are planning for has the following travel persona:
- Name: {{{userPersona.name}}}
- Description: {{{userPersona.description}}}
Please prioritize suggestions, activities, and accommodation styles that fuse seamlessly with this persona.
The overall tone and suggestions should reflect their travel DNA. The first itinerary suggested should be the best match.
Make sure the trip summary and daily plan reflect how this persona was fused with the current request.
{{/if}}

{{#if desiredMood}}
The user is looking for a trip with a specific mood or sensory experience: {{{desiredMood}}}.
Please ensure the suggested activities, the tone of the trip summary, and the daily plan strongly reflect this.
Fuse this mood/sensory preference with the user's persona (if available) and the core trip request.
For example, if the mood is 'romantic', suggest adventurous yet romantic activities. If it's 'vibrant street food scene', highlight relevant culinary experiences. If it's 'quiet nature escape', focus on serene outdoor settings.
{{/if}}

**AI Guardian Instructions (Fuse these with all other preferences):**
1.  **Weather:**
    {{#if weatherContext}}
    The user has provided specific weather context: {{{weatherContext}}}.
    Use this information to tailor activities. For example, if rain is expected, suggest more indoor activities or alternatives. If sunny, emphasize outdoor options.
    {{else}}
    Assume you have access to a general weather forecast for the destination and travel dates.
    If rain is likely for typically outdoor activities, suggest indoor alternatives or note this possibility. If the weather is expected to be pleasant, emphasize outdoor activities. This consideration should be subtly woven into the daily plan.
    {{/if}}
2.  **Risks, Visa & Accessibility (Journey Sentinel Mode):**
    {{#if riskContext}}
    The user has provided the following specific concerns or requests: {{{riskContext}}}.
    Please explicitly consider this information:
    - If it mentions safety concerns, suggest appropriate precautions or safer alternatives directly in the daily plan or trip summary.
    - If it mentions visa questions, add a reminder in the trip summary to check official visa requirements for {{{destination}}} for their nationality. Do NOT provide definitive visa advice.
    - If it mentions accessibility needs (e.g., 'step-free access', 'quiet areas for sensory sensitivity'), try to suggest suitable activities and note if some attractions might be challenging in the daily plan. Also, mention in the trip summary if accessibility needs were a key consideration in the plan.
    - If it mentions weather preferences (e.g., "prefer sunny activities"), try to align the plan accordingly.
    {{else}}
    Proactively act as a "Journey Sentinel":
    - Based on the destination: {{{destination}}} and travel dates: {{{travelDates}}}, identify 1-2 common, general risks or advisories (e.g., pickpocketing in crowded tourist spots, local customs to be aware of, seasonal insect activity, common tourist scams if applicable, transport reliability if generally known).
    - If such general risks are identified, subtly integrate brief, actionable advice or precautions directly into the relevant 'activities' of the 'dailyPlan' or within the 'tripSummary'.
    - Always include a general reminder in the 'tripSummary': "For a smooth journey, remember to check current travel advisories and verify visa requirements for {{{destination}}} well before your trip."
    {{/if}}
    If you've included proactive risk advice or made adjustments based on general advisories (not directly requested by the user), or if you've addressed specific accessibility needs, briefly mention this in the 'tripSummary' as part of your comprehensive planning.
3.  **Sustainable Travel Considerations (Conceptual):**
    When planning, and if appropriate for the destination and trip style, subtly weave in considerations for sustainable travel. This could involve suggesting public transport where efficient, mentioning eco-friendly tours if known, or highlighting locally-owned businesses or experiences. If you incorporate such suggestions, briefly mention this aspect in the trip summary.

**Cultural Tip:**
Generate one concise (1-2 sentences) and helpful cultural tip relevant to the destination: {{{destination}}}. This should be practical or insightful for a first-time visitor. Place this in the 'culturalTip' field of the output.

You will generate a range of possible itineraries (usually 2-3) based on the user's budget, destination and travel dates.
For each itinerary:
1.  Provide a 'tripSummary' which is a concise and engaging summary of the overall trip, highlighting its theme or key attractions. This summary should NOT include the detailed day-by-day plan or specific flight/hotel details, but should incorporate any necessary risk/visa/accessibility reminders and reflect how preferences (including Journey Sentinel and Sustainability considerations) were fused.
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
    - roomImagePrompt: A concise text prompt suitable for generating a representative image of THIS SPECIFIC ROOM TYPE.

The 'estimatedCost' for the overall itinerary should be a sum of a representative flight option and a representative hotel option.
Consider a variety of options for flights, accommodations, and activities that would fit within the budget.
Provide multiple itineraries with varying levels of luxury and activity so the user has multiple choices.
Among these itineraries, try to include at least one that could serve as a distinct 'backup plan' or 'alternative approach' to the trip.

Return the itineraries and the single culturalTip in JSON format according to the defined output schema. Ensure all fields are populated.
`,
});

const backupAiTripPlannerTextPrompt = ai.definePrompt({
  name: 'backupAiTripPlannerTextPrompt',
  input: {schema: AITripPlannerInputSchema},
  output: {schema: AITripPlannerTextOutputSchema },
  prompt: `You are a helpful backup travel assistant. The primary planner might have encountered an issue.
Please generate 1 or 2 robust and appealing itineraries for the user based on the following details.
Focus on common attractions and adaptable activities. Keep suggestions somewhat general if specific preferences like persona, mood, or risk context are complex.
Briefly remind the user in the trip summary to check visa and current travel advisories for {{{destination}}}, and that sustainable travel choices are encouraged.
Also, provide one general cultural tip for {{{destination}}} in the 'culturalTip' field.

Travel Dates: {{{travelDates}}}
Destination: {{{destination}}}
Budget: {{{budget}}}
{{#if userPersona~}}
User Persona: {{userPersona.name}} - {{userPersona.description}} (Consider this if possible, but prioritize generating a valid plan)
{{/if~}}
{{#if desiredMood~}}
Desired Mood/Sensory Palette: {{desiredMood}} (Consider this if possible)
{{/if~}}
{{#if riskContext~}}
User Concerns (Risks/Accessibility): {{riskContext}} (Address briefly if straightforward, otherwise provide general advice regarding official sources)
{{/if~}}

For each itinerary:
1.  Provide a 'tripSummary': A concise summary of the trip, including a reminder to check advisories and to consider sustainable choices.
2.  Provide a 'dailyPlan': An array with 'day' and 'activities' for each day.
3.  Detail 1-2 flight options (name, description, price).
4.  Detail 1-2 hotel options (name, description, price, rating, amenities, 1-2 rooms with name, features, roomImagePrompt).
5.  Provide an 'estimatedCost'.

Return in the specified JSON format, including the 'culturalTip'.
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
    let textOutput: TextPlannerOutput | undefined;

    try {
        const { output } = await aiTripPlannerTextPrompt(input);
        textOutput = output;
    } catch (primaryError) {
        console.warn("Primary AI Trip Planner text prompt failed:", primaryError);
        textOutput = undefined;
    }

    if (!textOutput || !textOutput.itineraries || textOutput.itineraries.length === 0) {
      console.warn("Primary AI Trip Planner did not return itineraries or failed. Attempting backup planner.");
      wasBackupPlannerUsed = true;
      try {
        const { output: backupOutput } = await backupAiTripPlannerTextPrompt(input);
        textOutput = backupOutput;
      } catch (backupError) {
        console.error("Backup AI Trip Planner also failed:", backupError);
         return { itineraries: [], personalizationNote: "Sorry, we encountered an issue generating trip plans, even with our backup planner. Please try again later or adjust your query." };
      }
    }
    
    if (!textOutput || !textOutput.itineraries) {
      console.warn("AI Trip Planner (primary or backup) did not return itineraries.");
      return { itineraries: [], personalizationNote: wasBackupPlannerUsed ? "Our backup planner couldn't generate suggestions for this request. Please try again." : "No itineraries could be generated for your request. Please try different criteria." };
    }

    const { itineraries: textItineraries, culturalTip } = textOutput;

    if (textItineraries.some(it => !it.dailyPlan || it.dailyPlan.length === 0)) {
      console.warn("Some itineraries are missing daily plans. Check AI prompt and output structure.", textItineraries);
    }

    const itinerariesWithImages = await Promise.all(
      textItineraries.map(async (itinerary) => {
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
          culturalTip,
        };
      })
    );

    let personalizationNoteParts: string[] = [];
    if (wasBackupPlannerUsed) {
        personalizationNoteParts.push("Suggestions provided by our backup planner.");
    }
    
    let fusionMessages: string[] = [];
    if (input.userPersona?.name) {
      fusionMessages.push(`your '${input.userPersona.name}' persona`);
    }
    if (input.desiredMood) {
        fusionMessages.push(`your desire for a '${input.desiredMood}' vibe/sensory experience`);
    }
    
    let guardianConsiderations: string[] = [];
    if (input.riskContext) { // This now covers risks AND accessibility
        guardianConsiderations.push("your specific concerns/preferences (" + input.riskContext.substring(0, 30) + (input.riskContext.length > 30 ? "...)" : ")"));
    }
    if (input.weatherContext) {
        guardianConsiderations.push("the weather context you provided (" + input.weatherContext.substring(0,30) + (input.weatherContext.length > 30 ? "...)" : ")"));
    }
    
    if (guardianConsiderations.length > 0) {
        fusionMessages.push(guardianConsiderations.join(' and '));
    } else {
      fusionMessages.push("general travel factors (weather awareness, risk/visa/accessibility reminders, conceptual sustainability)");
    }

    if (fusionMessages.length > 0) {
        personalizationNoteParts.push(`Plans were crafted by fusing ${fusionMessages.join(', ')} with your core request for ${input.destination}.`);
    } else {
        personalizationNoteParts.push(`Plans for ${input.destination} were generated based on your core request, including conceptual sustainability considerations.`);
    }
    
    const personalizationNote = personalizationNoteParts.join(' ');

    return {
      itineraries: itinerariesWithImages,
      personalizationNote: personalizationNote
    };
  }
);
