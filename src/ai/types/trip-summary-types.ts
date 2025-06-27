
/**
 * @fileOverview Zod schemas and type definitions for the AI Trip Summary feature.
 */
import { z } from 'zod';

export const TripSummaryInputSchema = z.object({
  destination: z.string().describe('The main destination of the trip.'),
  travelDates: z.string().describe('The travel dates, used to infer duration (e.g., "July 10-17, 2024", "Next month for 1 week").'),
  budget: z.number().describe('The approximate total budget for the trip in USD.'),
  dailyActivitiesText: z.string().describe('A concatenated string summarizing the daily activities planned for the trip. Used to infer key themes.'),
});
export type TripSummaryInput = z.infer<typeof TripSummaryInputSchema>;

export const TripSummaryOutputSchema = z.object({
  summary: z.string().describe('A concise, engaging 1-2 sentence summary of the trip.'),
});
export type TripSummaryOutput = z.infer<typeof TripSummaryOutputSchema>;
