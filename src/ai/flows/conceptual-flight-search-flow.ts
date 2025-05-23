
'use server';
/**
 * @fileOverview AI flow to generate conceptual flight options based on user query.
 */
import { ai } from '@/ai/genkit';
import {
  ConceptualFlightSearchInputSchema,
  type ConceptualFlightSearchInput,
  ConceptualFlightSearchOutputSchema,
  type ConceptualFlightSearchOutput,
} from '@/ai/types/conceptual-flight-search-types';

export async function conceptualFlightSearch(input: ConceptualFlightSearchInput): Promise<ConceptualFlightSearchOutput> {
  console.log("[AI Flow - conceptualFlightSearch] Received input:", input);

  const prompt = ai.definePrompt({
    name: 'conceptualFlightSearchPrompt',
    input: { schema: ConceptualFlightSearchInputSchema },
    output: { schema: ConceptualFlightSearchOutputSchema },
    prompt: `You are a helpful AI travel assistant specializing in conceptual flight planning for BudgetRoam.
A user is searching for flights with the following criteria:
- Trip Type: {{{tripType}}}
- Origin: {{{origin}}}
- Destination: {{{destination}}}
- Departure Date: {{{departureDate}}}
{{#if returnDate}}- Return Date: {{{returnDate}}}{{/if}}
- Passengers: {{{passengers}}}
- Cabin Class: {{{cabinClass}}}

Based on these criteria, generate 2 to 3 distinct, plausible, and conceptual flight options.
For each flight option, you MUST provide a JSON object with the following fields (ensure the entire response is a single JSON object with a "flights" array and an optional "summaryMessage" string):
-   'airlineName': A plausible airline name (e.g., "SkyLink Airways", "BudgetFlyer", "TransContinental").
-   'flightNumber': A conceptual flight number (e.g., "SA 201", "BF 88").
-   'departureAirport': The origin airport code or city.
-   'arrivalAirport': The destination airport code or city.
-   'departureTime': A plausible departure time (e.g., "08:45 AM").
-   'arrivalTime': A plausible arrival time, considering potential time zone changes (e.g., "11:30 AM Local Time").
-   'duration': The estimated flight duration (e.g., "4h 45m direct", "7h 15m including 1 stop").
-   'stops': A description of stops (e.g., "Non-stop", "1 stop in ORD", "2 stops").
-   'conceptualPrice': A realistic but conceptual price range for this option in USD (e.g., "Around $350", "$280 - $420", "Est. $550").
-   'bookingHint' (optional): A brief, helpful insight about booking this conceptual option (e.g., "Good availability usually", "Prices may vary closer to date", "Consider booking if price is below $300").
-   'extraDetails' (optional): Any other notable conceptual detail (e.g., "Includes 1 checked bag", "Newer aircraft type", "Popular budget choice").

Example of a single flight option object:
{
  "airlineName": "SkyLink Airways",
  "flightNumber": "SL 456",
  "departureAirport": "{{{origin}}}",
  "arrivalAirport": "{{{destination}}}",
  "departureTime": "09:00 AM",
  "arrivalTime": "12:30 PM Local Time",
  "duration": "5h 30m (incl. 1 stop)",
  "stops": "1 stop in Denver (DEN)",
  "conceptualPrice": "Around $420",
  "bookingHint": "Often has good deals if booked 2-4 weeks in advance.",
  "extraDetails": "In-flight WiFi available for purchase."
}

Return a JSON object with a key "flights" containing an array of these flight option objects, and an optional "summaryMessage" string (e.g., "Here are a few conceptual flight ideas for your trip to {{{destination}}}!").
Ensure the output is valid JSON. These are illustrative examples, not real-time bookable flights.
`,
  });

  try {
    const { output } = await prompt(input);
    if (!output || !output.flights || output.flights.length === 0) {
      console.warn("[AI Flow - conceptualFlightSearch] AI did not return valid structured flight options. Output:", output);
      return { 
        flights: [{
          airlineName: "Error",
          departureAirport: input.origin,
          arrivalAirport: input.destination,
          departureTime: "N/A",
          arrivalTime: "N/A",
          duration: "N/A",
          stops: "N/A",
          conceptualPrice: "N/A",
          bookingHint: "AI could not generate conceptual options. Please try rephrasing your search or check again later.",
        }],
        summaryMessage: "Sorry, Aura AI couldn't generate conceptual flight options for this search. Please try adjusting your criteria."
      };
    }
    console.log("[AI Flow - conceptualFlightSearch] Successfully generated conceptual flight options:", output.flights.length);
    return output;
  } catch (error) {
    console.error("[AI Flow - conceptualFlightSearch] Error during AI prompt:", error);
    return { 
        flights: [{
          airlineName: "Error",
          departureAirport: input.origin,
          arrivalAirport: input.destination,
          departureTime: "N/A",
          arrivalTime: "N/A",
          duration: "N/A",
          stops: "N/A",
          conceptualPrice: "N/A",
          bookingHint: "An error occurred while trying to generate flight ideas.",
        }],
        summaryMessage: "An error occurred while Aura AI was searching for conceptual flight options."
    };
  }
}

export const conceptualFlightSearchFlow = ai.defineFlow(
  {
    name: 'conceptualFlightSearchFlow',
    inputSchema: ConceptualFlightSearchInputSchema,
    outputSchema: ConceptualFlightSearchOutputSchema,
  },
  conceptualFlightSearch
);
