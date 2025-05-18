
import { z } from 'genkit';

// Schema for User Persona, if passed into the planner
export const UserPersonaSchema = z.object({
  name: z.string().describe("The name of the user's travel persona (e.g., 'Cultural Explorer')."),
  description: z.string().describe("A brief description of the user's travel persona.")
}).optional();

export const AITripPlannerInputSchema = z.object({
  travelDates: z.string().describe('The desired travel dates (e.g., MM/DD/YYYY-MM/DD/YYYY).'),
  destination: z.string().describe('The destination for the trip.'),
  budget: z.number().describe('The budget for the trip in USD.'),
  userPersona: UserPersonaSchema.describe("Optional: The user's travel persona to help tailor the trip plan."),
  desiredMood: z.string().optional().describe("Optional: The desired mood or vibe for the trip (e.g., 'relaxing', 'adventurous', 'romantic')."),
  weatherContext: z.string().optional().describe("Optional: General weather context or forecast summary for the destination and dates. If not provided, AI should infer based on typical conditions."),
  riskContext: z.string().optional().describe("Optional: User-provided specific concerns, questions (e.g., about visas), or preferences (e.g., weather, accessibility, safety) for the trip."),
});
export type AITripPlannerInput = z.infer<typeof AITripPlannerInputSchema>;

export const FlightOptionSchema = z.object({
  name: z.string().describe('Flight carrier and number, or general description (e.g., "Budget Airline Option 1").'),
  description: z.string().describe('Details about the flight (e.g., layovers, departure/arrival times, airline).'),
  price: z.number().describe('Estimated price of the flight in USD.')
});

export const RoomSchema = z.object({
  name: z.string().describe("Name of the room type (e.g., 'Deluxe King Room', 'Standard Twin Room with City View')."),
  description: z.string().optional().describe("A brief description of the room type."),
  features: z.array(z.string()).optional().describe("Key features of the room (e.g., ['Ocean view', 'Balcony', 'Sleeps 2', 'Mini-fridge'])."),
  pricePerNight: z.number().optional().describe("Estimated price per night for this room type in USD, if available. This is optional."),
  roomImagePrompt: z.string().optional().describe("A concise text prompt suitable for generating a representative image of this room type (e.g., 'Modern hotel room king bed city view', 'Cozy twin room with balcony')."),
  roomImageUri: z.string().optional().describe("A data URI of a generated image representing this room type. Expected format: 'data:image/png;base64,<encoded_data>'. This will be populated by the flow."),
});

export const HotelOptionSchema = z.object({
  name: z.string().describe('Name of the hotel or accommodation type (e.g., "City Center Hotel", "Boutique Guesthouse").'),
  description: z.string().describe('Details about the hotel (e.g., amenities, location rating, type). This description will be used to generate a representative image.'),
  price: z.number().describe('Estimated price for the hotel for the duration of the stay in USD.'),
  hotelImageUri: z.string().describe("A data URI of a generated image representing the hotel. Expected format: 'data:image/png;base64,<encoded_data>'."),
  rating: z.number().min(0).max(5).optional().describe("Overall guest rating out of 5 (e.g., 4.5)."),
  amenities: z.array(z.string()).optional().describe("List of key amenities (e.g., ['Free WiFi', 'Pool', 'Restaurant', 'Pet-friendly', 'Gym', 'Spa', 'Parking']). Provide 3-7 important amenities."),
  rooms: z.array(RoomSchema).optional().describe("A list of 2-3 available room types with their details. For each room, include name, description, features, and a 'roomImagePrompt' for image generation."),
});

export const DailyPlanItemSchema = z.object({
  day: z.string().describe('The day number or label (e.g., "Day 1", "Arrival Day").'),
  activities: z.string().describe('A detailed description of activities planned for this day, including potential morning, afternoon, and evening segments if applicable. Be descriptive and engaging.'),
});

export const ItineraryItemSchema = z.object({
  destination: z.string().describe('The destination for this itinerary.'),
  travelDates: z.string().describe('The travel dates for this itinerary.'),
  estimatedCost: z.number().describe('The total estimated cost for this itinerary in USD, summing a representative flight and hotel option.'),
  tripSummary: z.string().describe('A concise and engaging summary of the overall trip, highlighting its theme or key attractions. This summary should NOT include the detailed day-by-day plan or specific flight/hotel details.'),
  dailyPlan: z.array(DailyPlanItemSchema).describe('A detailed day-by-day plan of potential activities. Each item should clearly state the day and the activities for that day.'),
  flightOptions: z.array(FlightOptionSchema).describe('A list of flight options for this itinerary. Aim for 2-3 distinct options.'),
  hotelOptions: z.array(HotelOptionSchema).describe('A list of hotel options for this itinerary, each including a generated image for the hotel and its rooms. Aim for 2-3 distinct options.'),
  destinationImageUri: z.string().describe("A data URI of a generated image representing the destination. Expected format: 'data:image/png;base64,<encoded_data>'."),
  culturalTip: z.string().optional().describe("A single, concise cultural tip relevant to the destination."),
});

export const AITripPlannerOutputSchema = z.object({
  itineraries: z.array(ItineraryItemSchema).describe('A list of possible itineraries based on the input, including generated images for destination, hotels, and hotel rooms, and a structured daily plan.'),
  personalizationNote: z.string().optional().describe("A note indicating if and how the results were personalized based on the user's travel persona, desired mood, or other factors.")
});
export type AITripPlannerOutput = z.infer<typeof AITripPlannerOutputSchema>;


// Schema for the text-only part of the itinerary, before images are generated
export const HotelOptionTextOnlySchema = HotelOptionSchema.omit({ hotelImageUri: true }).extend({
  rooms: z.array(RoomSchema.omit({ roomImageUri: true })).optional(),
});

export const ItineraryTextOnlySchema = ItineraryItemSchema.omit({ destinationImageUri: true, culturalTip: true }).extend({ // Exclude culturalTip from text-only for now
  hotelOptions: z.array(HotelOptionTextOnlySchema),
});

// Schema for the text-only output of the AI, used before image generation
export const AITripPlannerTextOutputSchema = z.object({
 itineraries: z.array(ItineraryTextOnlySchema).describe("Text-only itinerary details before image generation."),
 culturalTip: z.string().optional().describe("A single, concise cultural tip relevant to the destination, generated alongside text itineraries.")
});

// New type for the output of the text prompt to make it easier to handle
export type TextPlannerOutput = z.infer<typeof AITripPlannerTextOutputSchema>;
