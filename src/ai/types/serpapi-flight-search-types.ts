
/**
 * @fileOverview Type definitions and Zod schemas for SerpApi Flight Search.
 */
import { z } from 'genkit';

// Individual flight leg details
export const SerpApiFlightLegSchema = z.object({
  departure_airport: z.object({ name: z.string(), id: z.string().optional(), time: z.string().optional() }).optional(),
  arrival_airport: z.object({ name: z.string(), id: z.string().optional(), time: z.string().optional() }).optional(),
  duration: z.number().optional().describe("Duration in minutes"),
  airline: z.string().optional(),
  airline_logo: z.string().url().optional(),
  flight_number: z.string().optional(),
  airplane: z.string().optional(),
  travel_class: z.string().optional(),
  extensions: z.array(z.string()).optional(),
  departure_token: z.string().optional().describe("Token for fetching related flights, e.g., return flights for this leg."),
});
export type SerpApiFlightLeg = z.infer<typeof SerpApiFlightLegSchema>;

// Layover details
export const SerpApiLayoverSchema = z.object({
  duration: z.number().optional().describe("Duration in minutes"),
  name: z.string().optional(),
  id: z.string().optional(), // Airport code
});
export type SerpApiLayover = z.infer<typeof SerpApiLayoverSchema>;

// Represents a single flight option (which could have multiple legs)
export const SerpApiFlightOptionSchema = z.object({
  flights: z.array(SerpApiFlightLegSchema).optional(),
  layovers: z.array(SerpApiLayoverSchema).optional(),
  total_duration: z.number().optional().describe("Total duration in minutes"),
  price: z.number().optional(),
  type: z.string().optional().describe("e.g., 'Round trip', 'One way'"),
  airline: z.string().optional().describe("Primary airline for the option"), // SerpApi might provide this at top level
  airline_logo: z.string().url().optional(), // Overall logo for the option
  link: z.string().url().optional().describe("Direct link to Google Flights or booking page"),
  carbon_emissions: z.object({
      this_flight: z.number().optional(),
      typical_for_this_route: z.number().optional(),
      difference_percent: z.number().optional(),
  }).optional(),
  // Derived properties for easier display (to be populated in the action)
  derived_departure_time: z.string().optional(),
  derived_arrival_time: z.string().optional(),
  derived_departure_airport_name: z.string().optional(),
  derived_arrival_airport_name: z.string().optional(),
  derived_flight_numbers: z.string().optional(), // e.g., "UA123, BA456"
  derived_stops_description: z.string().optional(), // e.g., "Non-stop" or "1 stop in ORD (2h 30m)"
});
export type SerpApiFlightOption = z.infer<typeof SerpApiFlightOptionSchema>;

// Input schema for the SerpApi flight search action
export const SerpApiFlightSearchInputSchema = z.object({
  origin: z.string().describe('The origin city or airport code.'),
  destination: z.string().describe('The destination city or airport code.'),
  departureDate: z.string().describe('The desired departure date (YYYY-MM-DD).'),
  returnDate: z.string().optional().describe('The desired return date (YYYY-MM-DD for round trips).'),
  tripType: z.enum(["round-trip", "one-way"]).optional().default("round-trip"), // Simplified for now
  // passengers: z.string().optional().describe('Number and type of passengers (e.g., "1 adult"). SerpApi uses `adults`, `children` etc.'),
  // cabinClass: z.string().optional().describe('Preferred cabin class. SerpApi uses `travel_class`'),
  currency: z.string().optional().default("USD"),
  hl: z.string().optional().default("en"), // language
});
export type SerpApiFlightSearchInput = z.infer<typeof SerpApiFlightSearchInputSchema>;

// Output schema for the SerpApi flight search action
export const SerpApiFlightSearchOutputSchema = z.object({
  search_summary: z.string().optional().describe("Summary of the search, e.g., number of flights found, or errors."),
  best_flights: z.array(SerpApiFlightOptionSchema).optional(),
  other_flights: z.array(SerpApiFlightOptionSchema).optional(),
  price_insights: z.any().optional().describe("Price insights object from SerpApi (can be complex)."), // Using z.any() for simplicity
  error: z.string().optional().describe("Error message if the search failed."),
});
export type SerpApiFlightSearchOutput = z.infer<typeof SerpApiFlightSearchOutputSchema>;
