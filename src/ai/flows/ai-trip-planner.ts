
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
  DailyPlanItemSchema, 
} from '@/ai/types/trip-planner-types';
import type { SerpApiFlightOption } from '@/ai/types/serpapi-flight-search-types';
import type { SerpApiHotelSuggestion } from '@/ai/types/serpapi-hotel-search-types';


export async function aiTripPlanner(input: AITripPlannerInput): Promise<AITripPlannerOutput> {
  return aiTripPlannerFlow(input);
}

const aiTripPlannerTextPrompt = ai.definePrompt({
  name: 'aiTripPlannerTextPrompt',
  input: {schema: AITripPlannerInputSchema},
  output: {schema: AITripPlannerTextOutputSchema },
  prompt: `You are a sophisticated AI Travel Concierge, BudgetRoam's "Aura AI". Your primary goal is to create 1 to 3 personalized and compelling trip itineraries. You will be provided with user preferences and, potentially, lists of real flight and hotel options.
  
**Your Task:**

1.  **Analyze User Input:**
    *   {{#if origin}}Origin: {{{origin}}}{{/if}}
    *   Destination: {{{destination}}}
    *   Travel Dates: {{{travelDates}}} (Interpret this flexibly, e.g., "next month for 7 days" to infer duration and approximate timing)
    *   Budget (USD): {{{budget}}}
    *   {{#if userPersona}}User Persona: {{{userPersona.name}}} - {{{userPersona.description}}}{{/if}}
    *   {{#if desiredMood}}Desired Mood/Vibe: {{{desiredMood}}}{{/if}}
    *   {{#if weatherContext}}Weather Context: {{{weatherContext}}}{{/if}}
    *   {{#if riskContext}}Risk/Accessibility Context: {{{riskContext}}}{{/if}}

2.  **Process Real-Time Options (CRITICAL):**
    *   **Real Flights (realFlightOptions):** You MAY receive an array of real flight options. Each option typically represents a full journey (e.g., a round trip) and might look like:
        \`\`\`json
        { // Example of ONE SerpApiFlightOption (simplified for prompt)
          "price": 550, "total_duration": 480, "airline": "Delta", "airline_logo": "https://logos.com/delta.png",
          "derived_departure_time": "10:00 AM", "derived_arrival_time": "06:00 PM",
          "derived_departure_airport_name": "New York (JFK)", "derived_arrival_airport_name": "Paris (CDG)",
          "derived_flight_numbers": "DL 123, DL 456", "derived_stops_description": "1 stop in AMS (2h 30m)",
          "link": "https://www.google.com/flights/...",
          "flights": [ // Array of flight legs
            { "departure_airport": {"name": "JFK", "time": "10:00 AM"}, "arrival_airport": {"name": "AMS", "time": "09:00 PM"}, "airline": "Delta", "flight_number": "DL 123", "departure_token": "some_token_value_if_present" },
            { "departure_airport": {"name": "AMS", "time": "11:30 PM"}, "arrival_airport": {"name": "CDG", "time": "01:00 AM"}, "airline": "Delta", "flight_number": "DL 456" }
            // ... potentially more legs including return journey legs ...
          ]
        }
        \`\`\`
        If realFlightOptions are available and suitable (considering budget, dates, and reasonable connections), select 1-2 options.
        Populate the 'flightOptions' array in your output. For each selected option:
            *   Ensure you capture the overall 'name' (e.g., airline + key flight numbers), a 'description' summarizing the full journey (outbound and return, key stops), 'price', 'airline_logo', 'total_duration', 'derived_stops_description', and the booking 'link' directly from the selected real flight option.
            *   Individual legs within the real option may contain a 'departure_token'. You do not need to use this token to search for new flights; focus on the complete journey options provided.
    *   **Real Hotels (realHotelOptions):** You MAY receive an array of real hotel options. Each option might look like:
        \`\`\`json
        { // Example of ONE SerpApiHotelSuggestion (simplified for prompt)
          "name": "The Grand Plaza", "price_per_night": 180, "rating": 4.5, "type": "4-star hotel",
          "amenities": ["Pool", "WiFi"], "coordinates": {"latitude": 48.8, "longitude": 2.2},
          "thumbnail": "https://images.com/hotel.jpg", "link": "https://www.booking.com/hotel/..."
        }
        \`\`\`
        If realHotelOptions are available and suitable, select 1-2 options.
        Populate the 'hotelOptions' array. For each selected hotel:
            *   Map 'name', 'rating', 'amenities', 'latitude', 'longitude', and 'link' directly from the real option.
            *   Calculate the total 'price' for the stay based on 'price_per_night' and the trip duration.
            *   **Crucially, write a compelling 'description' (2-3 sentences) for this hotel** based on its name, type, amenities, and overall fit for the user. This description will be used to generate a primary image for the hotel.
            *   Suggest 2-3 conceptual 'rooms' within this hotel, providing a 'name', optional 'description', 'features', and a **'roomImagePrompt'** for each room (e.g., "Modern hotel room king bed city view", "Cozy twin room with balcony").
        If real options are slightly over budget (e.g., total trip cost up to 20-25% over user's budget), you MAY select them but MUST note this in the 'tripSummary' (e.g., "Hotel choice slightly exceeds budget for premium location").

3.  **Fallback Strategy (VERY IMPORTANT):**
    *   If no realFlightOptions or realHotelOptions arrays are provided, OR if, after careful review, NONE of the provided real options are a reasonable fit for the user's request (e.g., all options are drastically over budget, wrong location type, or completely unavailable for the dates/destination), you MUST then create 1-2 *conceptual* itineraries.
    *   For conceptual itineraries:
        *   You MUST clearly state this in the 'tripSummary' (e.g., "No suitable real-time flights/hotels found within budget, so here are some conceptual ideas..." or "Using conceptual examples for flights and hotels for this creative itinerary...").
        *   Generate plausible, conceptual 'flightOptions' and 'hotelOptions' that align with the user's request and budget.
    *   **You MUST always aim to return 1 to 3 itineraries.** Do not return an empty 'itineraries' array unless the user's core request is impossible to fulfill (e.g. destination doesn't exist).

4.  **AI Guardian Instructions (Fuse these with all other preferences):**
    *   Incorporate weather context, risk/visa/accessibility reminders, and potential alternative destination suggestions if major risks are identified for the primary destination, as per your previous detailed instructions.
    *   Include conceptual sustainable travel considerations.

5.  **Itinerary Construction (For each of 1-3 itineraries):**
    *   \`origin\`: User's trip origin (if provided).
    *   \`destination\`, \`travelDates\`: From user input.
    *   \`estimatedCost\`: Sum of your selected flight and hotel prices (real or conceptual).
    *   \`tripSummary\`: Engaging summary, including any necessary risk/visa/accessibility reminders, sustainability notes, and clear indication if using real vs. conceptual options.
    *   **\`dailyPlan\` (MANDATORY AND CRITICAL):** For EACH itinerary, you MUST provide a detailed, engaging day-by-day plan of activities. This MUST be an array of objects, each with 'day' (e.g., "Day 1: Arrival & City Exploration") and 'activities' (string describing morning, afternoon, and evening plans for that day). Plan for the full inferred duration of the trip (e.g., if 'travelDates' suggests 7 days, provide 7 days of plans). Be specific and creative.
        *   Example for one day: \`{ "day": "Day 1: Arrival & Old Town Charm", "activities": "Morning: Arrive at {{{destination}}} airport, transfer to hotel, and check in. Settle in and take a brief rest.\\nAfternoon: Begin with a leisurely stroll through the historic Old Town. Visit the Main Square, admire the architecture of St. Mary's Basilica, and browse the stalls at the Cloth Hall.\\nEvening: Enjoy a traditional dinner at a local restaurant in the Old Town, savoring regional specialties. Consider a short evening walk to see the illuminated city." }\`
    *   \`flightOptions\`: Your selected (real or conceptual) flight(s).
    *   \`hotelOptions\`: Your selected (real or conceptual) hotel(s), with AI-written descriptions and room prompts.

6.  **Cultural Tip:** Provide one concise cultural tip for the main destination in the 'culturalTip' field.

Return the itineraries (1 to 3 options) and the culturalTip in JSON format according to the defined output schema. Ensure all mandatory fields are populated, especially the 'dailyPlan' for every itinerary.
Focus on seamlessly integrating the real-time data when available and clearly communicating your choices.
`,
});

const backupAiTripPlannerTextPrompt = ai.definePrompt({
  name: 'backupAiTripPlannerTextPrompt',
  input: {schema: AITripPlannerInputSchema}, // Still uses the full input schema
  output: {schema: AITripPlannerTextOutputSchema },
  prompt: `You are a helpful backup travel assistant. The primary planner might have encountered an issue.
Please generate 1 or 2 robust and appealing *conceptual* itineraries for the user based on the following details.
Focus on common attractions and adaptable activities. Keep suggestions somewhat general if specific preferences like persona, mood, or risk context are complex.
Briefly remind the user in the trip summary to check visa and current travel advisories for {{{destination}}}, and that sustainable travel choices are encouraged.
Also, provide one general cultural tip for {{{destination}}} in the 'culturalTip' field.

{{#if origin}}Origin: {{{origin}}}{{/if}}
Travel Dates: {{{travelDates}}}
Destination: {{{destination}}}
Budget: {{{budget}}}
{{#if userPersona~}}
User Persona: {{userPersona.name}} - {{userPersona.description}} (Consider this if possible)
{{#endif~}}
{{#if desiredMood~}}
Desired Mood/Sensory Palette: {{desiredMood}} (Consider this if possible)
{{#endif~}}
{{#if riskContext~}}
User Concerns (Risks/Accessibility): {{riskContext}} (Address briefly if straightforward)
{{#endif~}}

For each itinerary (aim for 1 to 3):
1.  Provide a 'tripSummary': A concise summary of the trip.
2.  **Provide a 'dailyPlan' (MANDATORY AND CRITICAL):** An array with 'day' and 'activities' for each day. Be descriptive and plan for the inferred duration.
    *   Example for one day: \`{ "day": "Day 1: Arrival & Local Market Visit", "activities": "Morning: Arrive and settle into your accommodation.\\nAfternoon: Explore a vibrant local market to soak in the sights and sounds. Sample some street food.\\nEvening: Enjoy a relaxed dinner at a nearby restaurant." }\`
3.  Detail 1-2 *conceptual* flight options (name, description, price, airline_logo, total_duration, derived_stops_description, link - create plausible examples).
4.  Detail 1-2 *conceptual* hotel options (name, description, price, rating, amenities, link, 1-2 rooms with name, features, roomImagePrompt - create plausible examples).
5.  Provide an 'estimatedCost'.
6.  Include the 'origin' field if provided in input.

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
    console.log("[AI Trip Planner Flow] Input received by flow (first 2000 chars):", JSON.stringify(input, null, 2).substring(0, 2000) + (JSON.stringify(input, null, 2).length > 2000 ? "..." : ""));


    try {
        const { output } = await aiTripPlannerTextPrompt(input);
        textOutput = output;
    } catch (primaryError) {
        console.warn("Primary AI Trip Planner text prompt failed:", primaryError);
        textOutput = undefined;
    }

    if (!textOutput || !textOutput.itineraries || textOutput.itineraries.length === 0 || textOutput.itineraries.some(it => !it.dailyPlan || it.dailyPlan.length === 0) ) {
      console.warn("Primary AI Trip Planner did not return valid itineraries with daily plans, or failed. Attempting backup planner.");
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
      console.warn("Some itineraries are still missing daily plans after prompt attempts. This indicates an issue with the AI's adherence to prompt instructions or schema output.", textItineraries);
       // If this happens, the UI will show "Daily plan not available."
       // For now, we don't inject a default daily plan here, as the AI should provide it.
    }

    const itinerariesWithImages = await Promise.all(
      textItineraries.slice(0, 3).map(async (itinerary) => { // Ensure only up to 3 itineraries are processed
        const destinationImagePrompt = `A vibrant, high-quality travel photograph representing ${itinerary.destination}. Focus on its most iconic visual elements or overall atmosphere. Style: photorealistic. Aspect ratio: 16:9.`;
        const destinationImageUri = await generateImage(destinationImagePrompt, itinerary.destination);

        const hotelOptionsWithImages = await Promise.all(
          (itinerary.hotelOptions || []).map(async (hotel) => {
            // Use a more specific prompt for hotel images if the AI generates a good description
            const hotelImageGenPrompt = hotel.description 
              ? `Photorealistic image of a hotel described as: "${hotel.description.substring(0, 150)}". Style: inviting, high-quality. Location: ${itinerary.destination}. Aspect ratio: 16:9.`
              : `Photorealistic image of a nice hotel in ${itinerary.destination}. Style: inviting, high-quality. Aspect ratio: 16:9.`;
            const fallbackHotelHint = `${hotel.name ? hotel.name.substring(0,15) : 'Hotel'} hotel`
            const hotelImageUri = await generateImage(hotelImageGenPrompt, fallbackHotelHint);

            const roomsWithImages = hotel.rooms ? await Promise.all(
              hotel.rooms.map(async (room) => {
                if (room.roomImagePrompt) {
                  const fallbackRoomHint = `${room.name ? room.name.substring(0,15) : 'Room'} room`
                  const roomImageUri = await generateImage(room.roomImagePrompt, fallbackRoomHint);
                  return { ...room, roomImageUri };
                }
                return { ...room, roomImageUri: `https://placehold.co/300x200.png?text=${encodeURIComponent(room.name ? room.name.substring(0,10) : 'Room')}` };
              })
            ) : [];

            return { ...hotel, hotelImageUri, rooms: roomsWithImages };
          })
        );

        const dailyPlan = itinerary.dailyPlan || []; // Ensure dailyPlan is an array

        return {
          ...itinerary, 
          destinationImageUri,
          hotelOptions: hotelOptionsWithImages,
          dailyPlan: dailyPlan, // Ensure it's passed through
          culturalTip, 
          isAlternative: itinerary.isAlternative || false,
          alternativeReason: itinerary.alternativeReason,
          destinationLatitude: itinerary.destinationLatitude,
          destinationLongitude: itinerary.destinationLongitude,
          origin: itinerary.origin || input.origin, 
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
    
    const realDataUsed = (input.realFlightOptions && input.realFlightOptions.length > 0) || (input.realHotelOptions && input.realHotelOptions.length > 0);
    if (realDataUsed && !wasBackupPlannerUsed) { // Only mention real data if primary planner used it
        fusionMessages.push("available real-time flight/hotel data");
    }
    
    let guardianConsiderations: string[] = [];
    if (input.riskContext) { 
        guardianConsiderations.push("your specific concerns/preferences (" + input.riskContext.substring(0, 30) + (input.riskContext.length > 30 ? "...)" : ")"));
    }
    if (input.weatherContext) {
        guardianConsiderations.push("the weather context you provided (" + input.weatherContext.substring(0,30) + (input.weatherContext.length > 30 ? "...)" : ")"));
    }
    
    if (guardianConsiderations.length > 0) {
        fusionMessages.push(guardianConsiderations.join(' and '));
    } else if (!realDataUsed && !wasBackupPlannerUsed) { // Add this condition
      fusionMessages.push("general travel factors (weather awareness, risk/visa/accessibility reminders, conceptual sustainability)");
    }


    if (fusionMessages.length > 0) {
        personalizationNoteParts.push(`Plans for ${input.destination} ${input.origin ? `from ${input.origin}` : ''} were crafted by fusing ${fusionMessages.join(', ')} with your core request.`);
    } else {
        personalizationNoteParts.push(`Plans for ${input.destination} ${input.origin ? `from ${input.origin}` : ''} were generated based on your core request, including conceptual sustainability considerations.`);
    }
    
    if (itinerariesWithImages.some(it => it.tripSummary && it.tripSummary.toLowerCase().includes("alternative suggestion:"))) {
        personalizationNoteParts.push("An alternative destination was suggested due to potential issues with your original choice.");
    }
    
    const personalizationNote = personalizationNoteParts.join(' ');

    return {
      itineraries: itinerariesWithImages,
      personalizationNote: personalizationNote
    };
  }
);

