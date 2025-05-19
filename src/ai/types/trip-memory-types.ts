
/**
 * @fileOverview Type definitions and Zod schemas for the AI Trip Memory Generator.
 */
import { z } from 'genkit';

export const GenerateTripMemoryInputSchema = z.object({
  destination: z.string().describe("The main destination of the trip."),
  travelDates: z.string().describe("The travel dates for the trip."),
  tripSummary: z.string().optional().describe("The existing summary of the trip."),
  dailyPlanActivities: z.string().optional().describe("A summarized string of the daily activities planned for the trip."),
});
export type GenerateTripMemoryInput = z.infer<typeof GenerateTripMemoryInputSchema>;

export const GenerateTripMemoryOutputSchema = z.object({
  memoryText: z.string().describe("A short, evocative memory or diary-style snippet about the trip, focusing on highlights and the overall feel."),
});
export type GenerateTripMemoryOutput = z.infer<typeof GenerateTripMemoryOutputSchema>;

