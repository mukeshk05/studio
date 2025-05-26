
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
  prompt: `You are a sophisticated AI Travel Concierge, BudgetRoam's "Aura AI". Your primary goal is to create 1-2 personalized and compelling trip itineraries. You will be provided with user preferences and, crucially, lists of **real flight and hotel options** (if available from our live search).

**Your Task:**

1.  **Analyze User Input:**
    *   Destination: {{{destination}}}
    *   Travel Dates: {{{travelDates}}} (Interpret this flexibly, e.g., "next month for 7 days")
    *   Budget (USD): {{{budget}}}
    *   {{#if userPersona}}User Persona: {{{userPersona.name}}} - {{{userPersona.description}}}{{/if}}
    *   {{#if desiredMood}}Desired Mood/Vibe: {{{desiredMood}}}{{/if}}
    *   {{#if weatherContext}}Weather Context: {{{weatherContext}}}{{/if}}
    *   {{#if riskContext}}Risk/Accessibility Context: {{{riskContext}}}{{/if}}

2.  **Process Real-Time Options (CRITICAL):**
    *   **Real Flights (realFlightOptions):** You will receive an array of real flight options. Each option might look like:
        \`\`\`json
        { // Example of ONE SerpApiFlightOption (simplified for prompt)
          "price": 550,
          "total_duration": 480, // in minutes
          "airline": "Delta",
          "airline_logo": "https://logos.clearbit.com/delta.com",
          "derived_departure_time": "10:00 AM",
          "derived_arrival_time": "06:00 PM",
          "derived_departure_airport_name": "New York (JFK)",
          "derived_arrival_airport_name": "Paris (CDG)",
          "derived_flight_numbers": "DL 123, DL 456",
          "derived_stops_description": "1 stop in AMS (2h 30m)",
          "link": "https://www.google.com/flights/..."
        }
        \`\`\`
        Your task is to select 1-2 of these real flights that best fit the user's budget and travel dates/destination. If multiple fit, choose options that offer good value (e.g., balance of price and duration/stops).
        **Output these selected flights in the 'flightOptions' array of your itinerary.** Ensure you map the data correctly to the 'FlightOptionSchema' (name, description, price, airline_logo, total_duration, derived_stops_description, link).

    *   **Real Hotels (realHotelOptions):** You will receive an array of real hotel options. Each option might look like:
        \`\`\`json
        { // Example of ONE SerpApiHotelSuggestion (simplified for prompt)
          "name": "The Grand Plaza Hotel",
          "price_per_night": 180, // Note: AI might need to calculate total price
          "rating": 4.5,
          "type": "4-star hotel",
          "amenities": ["Pool", "Free WiFi", "Restaurant"],
          "coordinates": { "latitude": 48.8584, "longitude": 2.2945 },
          "thumbnail": "https://example.com/hotel.jpg", // SerpApi might provide a direct image
          "link": "https://www.booking.com/hotel/..."
        }
        \`\`\`
        Your task is to select 1-2 of these real hotels that best fit the user's budget, destination, and persona.
        **Output these selected hotels in the 'hotelOptions' array.** For each selected hotel:
            *   Map 'name', 'rating', 'amenities', 'latitude', 'longitude', and 'link' directly from the real option.
            *   Calculate the total 'price' for the stay based on the 'price_per_night' and the trip duration implied by 'travelDates'.
            *   **Crucially, write a compelling 'description' (2-3 sentences) for this hotel** based on its name, type, amenities, and overall fit for the user. This description will be used to generate a primary image for the hotel.
            *   Suggest 2-3 conceptual 'rooms' within this hotel, providing a 'name', optional 'description', 'features', and a **'roomImagePrompt'** for each room (e.g., "Modern hotel room king bed city view", "Cozy twin room with balcony").

3.  **Fallback Strategy:**
    *   If no realFlightOptions or realHotelOptions are provided, OR if the provided real options are unsuitable (e.g., all drastically over budget, wrong location type):
        *   You MUST clearly state this in the 'tripSummary' (e.g., "No suitable real-time flights/hotels found within budget, so here are some conceptual ideas...").
        *   In this case, generate *conceptual* flight and hotel options as you did previously, ensuring they fit the user's criteria.

4.  **AI Guardian Instructions (Fuse these with all other preferences):**
    *   Incorporate weather context, risk/visa/accessibility reminders, and potential alternative destination suggestions if major risks are identified for the primary destination, as per your previous detailed instructions.
    *   Include conceptual sustainable travel considerations.

5.  **Itinerary Construction (For each of 1-2 itineraries):**
    *   \`destination\`, \`travelDates\`: From user input.
    *   \`estimatedCost\`: Sum of your selected flight and hotel prices.
    *   \`tripSummary\`: Engaging summary, including any necessary risk/visa/accessibility reminders, sustainability notes, and clear indication if using real vs. conceptual options.
    *   \`dailyPlan\`: Detailed, engaging day-by-day activities.
    *   \`flightOptions\`: Your selected (real or conceptual) flight(s).
    *   \`hotelOptions\`: Your selected (real or conceptual) hotel(s), with AI-written descriptions and room prompts.

6.  **Cultural Tip:** Provide one concise cultural tip for the main destination in the 'culturalTip' field.

Return the itineraries and the culturalTip in JSON format according to the defined output schema. Ensure all fields are populated.
Focus on seamlessly integrating the real-time data when available and clearly communicating your choices.
`,
});

const backupAiTripPlannerTextPrompt = ai.definePrompt({
  name: 'backupAiTripPlannerTextPrompt',
  input: {schema: AITripPlannerInputSchema}, // Still uses the full input schema
  output: {schema: AITripPlannerTextOutputSchema },
  prompt: `You are a helpful backup travel assistant. The primary planner might have encountered an issue.
Please generate 1 or 2 robust and appealing itineraries for the user based on the following details.
If real flight/hotel options were provided in the input, try to use them if they seem reasonable. Otherwise, create conceptual options.
Focus on common attractions and adaptable activities. Keep suggestions somewhat general if specific preferences like persona, mood, or risk context are complex.
Briefly remind the user in the trip summary to check visa and current travel advisories for {{{destination}}}, and that sustainable travel choices are encouraged.
Also, provide one general cultural tip for {{{destination}}} in the 'culturalTip' field.

Travel Dates: {{{travelDates}}}
Destination: {{{destination}}}
Budget: {{{budget}}}
{{#if userPersona~}}
User Persona: {{userPersona.name}} - {{userPersona.description}} (Consider this if possible)
{{/if~}}
{{#if desiredMood~}}
Desired Mood/Sensory Palette: {{desiredMood}} (Consider this if possible)
{{/if~}}
{{#if riskContext~}}
User Concerns (Risks/Accessibility): {{riskContext}} (Address briefly if straightforward)
{{/if~}}
{{#if realFlightOptions}}
Available Real Flight Options (use if suitable):
{{#each realFlightOptions}}
- Price: \${{{this.price}}}, Airline: {{this.airline}}, Stops: {{this.derived_stops_description}}, Duration: {{this.total_duration}} mins, Link: {{this.link}}
{{/each}}
{{/if}}
{{#if realHotelOptions}}
Available Real Hotel Options (use if suitable):
{{#each realHotelOptions}}
- Name: {{this.name}}, Price/Night: \${{{this.price_per_night}}}, Rating: {{this.rating}}, Type: {{this.type}}, Link: {{this.link}}
{{/each}}
{{/if}}

For each itinerary:
1.  Provide a 'tripSummary': A concise summary of the trip.
2.  Provide a 'dailyPlan': An array with 'day' and 'activities' for each day.
3.  Detail 1-2 flight options (name, description, price, airline_logo, total_duration, derived_stops_description, link - try to use real data if available).
4.  Detail 1-2 hotel options (name, description, price, rating, amenities, link, 1-2 rooms with name, features, roomImagePrompt - try to use real data if available for main hotel details, generate description/rooms).
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
    console.log("[AI Trip Planner Flow] Input received:", JSON.stringify(input, null, 2));


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
            // The 'description' for hotelImageUri comes from the AI's output now.
            // It's crafted by the AI based on SerpApi data or conceptually.
            const hotelImagePrompt = `Photorealistic image of a ${hotel.description}. Style: inviting, high-quality. Location: ${itinerary.destination}. Aspect ratio: 16:9.`;
            const fallbackHotelHint = `${hotel.name.substring(0,15)} hotel`
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

        // Ensure all fields from ItineraryItemSchema are present in the final output
        // Some fields like lat/lon might come from the AI now if it's using real options.
        return {
          ...itinerary, // This includes name, description, price, etc. for flights and hotels from textOutput
          destinationImageUri,
          hotelOptions: hotelOptionsWithImages,
          dailyPlan: dailyPlan,
          culturalTip, // Add the culturalTip here for each itinerary
          // Ensure other potentially missing fields are explicitly set or handled if they are part of ItineraryItemSchema
          isAlternative: itinerary.isAlternative || false,
          alternativeReason: itinerary.alternativeReason,
          destinationLatitude: itinerary.destinationLatitude,
          destinationLongitude: itinerary.destinationLongitude,
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
    if (input.realFlightOptions && input.realFlightOptions.length > 0) {
        fusionMessages.push("available real-time flight data");
    }
    if (input.realHotelOptions && input.realHotelOptions.length > 0) {
        fusionMessages.push("available real-time hotel data");
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
    } else if (!input.realFlightOptions && !input.realHotelOptions) { // Only add general factors if no real data was primary
      fusionMessages.push("general travel factors (weather awareness, risk/visa/accessibility reminders, conceptual sustainability)");
    }

    if (fusionMessages.length > 0) {
        personalizationNoteParts.push(`Plans were crafted by fusing ${fusionMessages.join(', ')} with your core request for ${input.destination}.`);
    } else {
        personalizationNoteParts.push(`Plans for ${input.destination} were generated based on your core request, including conceptual sustainability considerations.`);
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

