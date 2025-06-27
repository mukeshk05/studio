
/**
 * @fileOverview Type definitions and Zod schemas for SerpApi Hotel Search.
 */
import { z } from 'zod';

// Represents a single hotel suggestion from SerpApi
export const SerpApiHotelSuggestionSchema = z.object({
  name: z.string().optional(),
  type: z.string().optional(),
  description: z.string().optional(),
  price_per_night: z.number().optional(),
  total_price: z.number().optional(),
  price_details: z.string().optional().describe("Often a string like '$123' or 'Price: $123'"),
  rating: z.number().optional(),
  reviews: z.number().optional(),
  amenities: z.array(z.string()).optional(),
  link: z.string().url().optional(),
  thumbnail: z.string().url().optional(),
  images: z.array(z.object({
    thumbnail: z.string().url().optional(),
    original_image: z.string().url().optional(),
  })).optional(),
  coordinates: z.object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }).optional(),
  check_in_time: z.string().optional(),
  check_out_time: z.string().optional(),
});
export type SerpApiHotelSuggestion = z.infer<typeof SerpApiHotelSuggestionSchema>;

// Input schema for the SerpApi hotel search action
export const SerpApiHotelSearchInputSchema = z.object({
  destination: z.string().describe('The city or area to search for hotels.'),
  checkInDate: z.string().describe('The desired check-in date (YYYY-MM-DD).'),
  checkOutDate: z.string().describe('The desired check-out date (YYYY-MM-DD).'),
  guests: z.string().optional().default("2").describe('Number of guests (e.g., "2" for 2 adults).'),
  currency: z.string().optional().default("USD"),
  hl: z.string().optional().default("en"), // language
});
export type SerpApiHotelSearchInput = z.infer<typeof SerpApiHotelSearchInputSchema>;

// Output schema for the SerpApi hotel search action
export const SerpApiHotelSearchOutputSchema = z.object({
  hotels: z.array(SerpApiHotelSuggestionSchema).optional(),
  search_summary: z.string().optional().describe("Summary of the search, e.g., number of hotels found, or errors."),
  error: z.string().optional().describe("Error message if the search failed."),
});
export type SerpApiHotelSearchOutput = z.infer<typeof SerpApiHotelSearchOutputSchema>;
