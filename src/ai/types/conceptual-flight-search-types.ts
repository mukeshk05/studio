
/**
 * @fileOverview Type definitions and Zod schemas for the Conceptual Flight Search AI.
 */
import { z } from 'genkit';

export const ConceptualFlightSearchInputSchema = z.object({
  origin: z.string().describe('The origin city or airport code.'),
  destination: z.string().describe('The destination city or airport code.'),
  departureDate: z.string().describe('The desired departure date (e.g., "Next Monday", "2024-12-25").'),
  returnDate: z.string().optional().describe('The desired return date (for round trips).'),
  passengers: z.string().describe('Number and type of passengers (e.g., "1 adult", "2 adults, 1 child").'),
  cabinClass: z.string().describe('Preferred cabin class (e.g., "Economy", "Business").'),
  tripType: z.enum(["round-trip", "one-way", "multi-city"]).describe('The type of trip.'),
});
export type ConceptualFlightSearchInput = z.infer<typeof ConceptualFlightSearchInputSchema>;

export const ConceptualFlightOptionSchema = z.object({
  airlineName: z.string().describe("A plausible airline name (e.g., 'SkyLink Airways', 'BudgetFlyer')."),
  flightNumber: z.string().optional().describe("A conceptual flight number (e.g., 'SL 123')."),
  departureAirport: z.string().describe("Departure airport code or city name."),
  arrivalAirport: z.string().describe("Arrival airport code or city name."),
  departureTime: z.string().describe("Conceptual departure time (e.g., '10:30 AM')."),
  arrivalTime: z.string().describe("Conceptual arrival time (e.g., '01:15 PM Local Time')."),
  duration: z.string().describe("Conceptual flight duration (e.g., '4h 45m')."),
  stops: z.string().describe("Number of stops (e.g., 'Non-stop', '1 stop in Chicago', '2 stops')."),
  conceptualPrice: z.string().describe("A plausible conceptual price for this option (e.g., 'Around $350', '$280 - $420'). Include currency if not USD, but default to USD."),
  bookingHint: z.string().optional().describe("A brief AI-generated insight or hint about booking this option (e.g., 'Good availability', 'Prices might rise soon', 'Check for early bird discounts')."),
  extraDetails: z.string().optional().describe("Any other relevant conceptual details (e.g., 'Includes 1 checked bag', 'Known for good in-flight service', 'Often on time')."),
});
export type ConceptualFlightOption = z.infer<typeof ConceptualFlightOptionSchema>;

export const ConceptualFlightSearchOutputSchema = z.object({
  flights: z.array(ConceptualFlightOptionSchema).min(1).max(4).describe("An array of 2 to 4 conceptual flight options based on the user's query. Each option should be a structured object."),
  summaryMessage: z.string().optional().describe("An optional overall summary message from the AI, e.g., 'Found a few interesting options for your trip!' or notes about the search if applicable."),
});
export type ConceptualFlightSearchOutput = z.infer<typeof ConceptualFlightSearchOutputSchema>;
