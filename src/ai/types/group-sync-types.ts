
/**
 * @fileOverview Type definitions and Zod schemas for the AI Group Sync feature.
 */
import { z } from 'genkit';

export const CompanionPreferenceSchema = z.object({
  id: z.string().describe("A unique ID for the companion input field, client-side only."),
  name: z.string().min(1, "Companion name cannot be empty.").describe("Name of the travel companion."),
  preferences: z.string().min(5, "Preferences must be at least 5 characters.").describe("A textual description of the companion's travel preferences, interests, or dislikes."),
});
export type CompanionPreference = z.infer<typeof CompanionPreferenceSchema>;

export const GroupSyncInputSchema = z.object({
  tripDestination: z.string().describe("The main destination of the trip."),
  tripTravelDates: z.string().describe("The travel dates for the trip."),
  tripSummary: z.string().optional().describe("The existing summary of the trip."),
  tripDailyPlanActivities: z.string().optional().describe("A summarized string of the daily activities planned for the trip."),
  plannerPersonaName: z.string().optional().describe("The name of the original trip planner's travel persona, if available."),
  companions: z.array(z.object({
    name: z.string().describe("Companion's name."),
    preferences: z.string().describe("Companion's preferences."),
  })).min(1, "At least one companion's preferences must be provided.").describe("An array of travel companions and their preferences."),
});
export type GroupSyncInput = z.infer<typeof GroupSyncInputSchema>;

export const GroupSyncOutputSchema = z.object({
  compatibilityReport: z.string().describe("A comprehensive report detailing trip compatibility for the group, including an overview and specific suggestions for adjustments. Should be formatted for readability (e.g., using markdown-like structure)."),
});
export type GroupSyncOutput = z.infer<typeof GroupSyncOutputSchema>;

