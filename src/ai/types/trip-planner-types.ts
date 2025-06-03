
import { z } from 'genkit';
// Corrected imports: Zod schemas are runtime values, not just types.
import { SerpApiFlightOptionSchema } from './serpapi-flight-search-types'; // For real flight options input
import { SerpApiHotelSuggestionSchema } from './serpapi-hotel-search-types'; // For real hotel options input
import { ActivitySuggestionSchema as ThingsToDoActivitySuggestionSchema } from './things-to-do-types'; // For available activities

// Schema for User Persona, if passed into the planner
export const UserPersonaSchema = z.object({
  name: z.string().describe("The name of the user's travel persona (e.g., 'Cultural Explorer')."),
  description: z.string().describe("A brief description of the user's travel persona.")
}).optional();

export const AITripPlannerInputSchema = z.object({
  origin: z.string().optional().describe("The origin of the trip (e.g., city or airport)."),
  travelDates: z.string().describe('The desired travel dates (e.g., MM/DD/YYYY-MM/DD/YYYY, or descriptive like "next summer for 2 weeks").'),
  destination: z.string().describe('The destination for the trip.'),
  budget: z.number().describe('The budget for the trip in USD.'),
  userPersona: UserPersonaSchema.describe("Optional: The user's travel persona to help tailor the trip plan."),
  desiredMood: z.string().optional().describe("Optional: The desired mood or vibe for the trip (e.g., 'relaxing', 'adventurous', 'romantic', 'vibrant street food')."),
  weatherContext: z.string().optional().describe("Optional: General weather context or forecast summary for the destination and dates. If not provided, AI should infer based on typical conditions."),
  riskContext: z.string().optional().describe("Optional: User-provided specific concerns, questions (e.g., about visas), or preferences (e.g., weather, accessibility, safety) for the trip."),
  realFlightOptions: z.array(SerpApiFlightOptionSchema).optional().describe("Optional: Array of real flight options fetched from SerpApi."),
  realHotelOptions: z.array(SerpApiHotelSuggestionSchema).optional().describe("Optional: Array of real hotel options fetched from SerpApi."),
  availableActivities: z.array(ThingsToDoActivitySuggestionSchema).optional().describe("Optional: Array of AI-suggested activities for the destination, which the planner can incorporate."),
  userId: z.string().optional().describe("User ID for context, if available"), // Added userId
});
export type AITripPlannerInput = z.infer<typeof AITripPlannerInputSchema>;

export const FlightOptionSchema = z.object({
  name: z.string().describe('Flight carrier and flight numbers (e.g., "United UA123, UA456"). AI should derive this from selected real options or create conceptually.'),
  description: z.string().describe('Details about the flight (e.g., "Departs JFK 10:00 AM, Arrives CDG 11:00 PM, 1 stop in LHR (2h 30m)"). AI to summarize from real option or create conceptually, including return journey if applicable.'),
  price: z.number().describe('Estimated price of the flight in USD. From selected real option or AI conceptual price.'),
  airline_logo: z.string().url().optional().describe("URL of the airline logo, if available from real option."),
  total_duration: z.number().optional().describe("Total flight duration in minutes, if available from real option."),
  derived_stops_description: z.string().optional().describe("Description of stops, e.g., 'Non-stop' or '1 stop in ORD'. From real option or AI conceptual."),
  link: z.string().url().optional().describe("Direct booking link (e.g., Google Flights), if available from real option.")
});
export type FlightOption = z.infer<typeof FlightOptionSchema>;

export const RoomSchema = z.object({
  name: z.string().describe("Name of the room type (e.g., 'Deluxe King Room', 'Standard Twin Room with City View')."),
  description: z.string().optional().describe("A brief description of the room type."),
  features: z.array(z.string()).optional().describe("Key features of the room (e.g., ['Ocean view', 'Balcony', 'Sleeps 2', 'Mini-fridge'])."),
  pricePerNight: z.number().optional().describe("Estimated price per night for this room type in USD, if available. This is optional."),
  roomImagePrompt: z.string().optional().describe("A concise text prompt suitable for generating a representative image of this room type (e.g., 'Modern hotel room king bed city view', 'Cozy twin room with balcony')."),
  roomImageUri: z.string().optional().describe("A data URI of a generated image representing this room type. Expected format: 'data:image/png;base64,<encoded_data>'. This will be populated by the flow."),
});
export type Room = z.infer<typeof RoomSchema>;

export const HotelOptionSchema = z.object({
  name: z.string().describe('Name of the hotel. From selected real option or AI conceptual name.'),
  description: z.string().describe('AI-generated details about the hotel (e.g., amenities, location rating, type), informed by real option if available. This description will be used to generate a representative image.'),
  price: z.number().describe('Estimated total price for the hotel for the entire duration of the stay in USD. From selected real option or AI conceptual price.'),
  hotelImageUri: z.string().describe("A data URI of an AI-generated image representing the hotel. Expected format: 'data:image/png;base64,<encoded_data>'."),
  rating: z.number().min(0).max(5).optional().describe("Overall guest rating out of 5 (e.g., 4.5). From selected real option or AI conceptual rating."),
  amenities: z.array(z.string()).optional().describe("List of key amenities. From selected real option or AI conceptual list."),
  rooms: z.array(RoomSchema).optional().describe("A list of 2-3 available conceptual room types with their details. For each room, include name, description, features, and a 'roomImagePrompt' for image generation."),
  latitude: z.number().optional().describe("Latitude of the hotel, if available from real option."),
  longitude: z.number().optional().describe("Longitude of the hotel, if available from real option."),
  link: z.string().url().optional().describe("Direct booking link for the hotel, if available from real option.")
});
export type HotelOption = z.infer<typeof HotelOptionSchema>;


export const DailyPlanItemSchema = z.object({
  day: z.string().describe('The day number or label (e.g., "Day 1", "Arrival Day").'),
  activities: z.string().describe('A detailed description of activities planned for this day, including potential morning, afternoon, and evening segments if applicable. Be descriptive and engaging.'),
});
export type DailyPlanItem = z.infer<typeof DailyPlanItemSchema>;

export const ItineraryItemSchema = z.object({
  origin: z.string().optional().describe("The origin of the trip (e.g., city or airport)."),
  destination: z.string().describe('The destination for this itinerary.'),
  travelDates: z.string().describe('The travel dates for this itinerary.'),
  estimatedCost: z.number().describe('The total estimated cost for this itinerary in USD, summing a representative flight and hotel option.'),
  tripSummary: z.string().optional().describe('A concise and engaging summary of the overall trip, highlighting its theme or key attractions. This summary should NOT include the detailed day-by-day plan or specific flight/hotel details.'),
  dailyPlan: z.array(DailyPlanItemSchema).optional().describe("A detailed day-by-day plan of potential activities. Each item should clearly state the day and the activities for that day. This is a MANDATORY field if an itinerary is generated."),
  flightOptions: z.array(FlightOptionSchema).optional().describe('A list of flight options for this itinerary. Aim for 1-2 distinct options, prioritizing real options if provided and suitable.'),
  hotelOptions: z.array(HotelOptionSchema).optional().describe('A list of hotel options for this itinerary, each including a generated image for the hotel and its rooms. Aim for 1-2 distinct options, prioritizing real options if provided and suitable.'),
  destinationImageUri: z.string().describe("A data URI of a generated image representing the destination. Expected format: 'data:image/png;base64,<encoded_data>'."),
  culturalTip: z.string().optional().describe("A single, concise cultural tip relevant to the destination."),
  isAlternative: z.boolean().optional().describe("True if this itinerary is an alternative suggestion due to issues with the primary request."),
  alternativeReason: z.string().optional().describe("Reason why this alternative is suggested (e.g., 'Due to hurricane warning for original destination...')."),
  destinationLatitude: z.number().optional().describe("Approximate latitude of the destination for map display, if available."),
  destinationLongitude: z.number().optional().describe("Approximate longitude of the destination for map display, if available."),
});
export type ItineraryItem = z.infer<typeof ItineraryItemSchema>;


export const AITripPlannerOutputSchema = z.object({
  itineraries: z.array(ItineraryItemSchema).min(0).max(3).describe('A list of 0 to 3 possible itineraries based on the input, including generated images for destination, hotels, and hotel rooms, and a structured daily plan.'),
  personalizationNote: z.string().optional().describe("A note indicating if and how the results were personalized based on the user's travel persona, desired mood, or other factors.")
});
export type AITripPlannerOutput = z.infer<typeof AITripPlannerOutputSchema>;

export const HotelOptionTextOnlySchema = HotelOptionSchema.omit({ hotelImageUri: true }).extend({
  rooms: z.array(RoomSchema.omit({ roomImageUri: true })).optional(),
});

export const ItineraryTextOnlySchema = ItineraryItemSchema.omit({ destinationImageUri: true, culturalTip: true }).extend({
  hotelOptions: z.array(HotelOptionTextOnlySchema).optional(), 
  flightOptions: z.array(FlightOptionSchema).optional(), 
  dailyPlan: z.array(DailyPlanItemSchema).optional(), 
});

export const AITripPlannerTextOutputSchema = z.object({
 itineraries: z.array(ItineraryTextOnlySchema).describe("Text-only itinerary details before image generation."),
 culturalTip: z.string().optional().describe("A single, concise cultural tip relevant to the destination, generated alongside text itineraries.")
});

export type TextPlannerOutput = z.infer<typeof AITripPlannerTextOutputSchema>;

