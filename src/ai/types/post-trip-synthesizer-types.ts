
/**
 * @fileOverview Type definitions and Zod schemas for the AI Post-Trip Synthesizer & Trajectory Mapper.
 */
import { z } from 'genkit';
import { AITripPlannerInputSchema } from '@/ai/types/trip-planner-types'; // For suggested next trip

export const PostTripFeedbackInputSchema = z.object({
  userId: z.string().optional().describe("The ID of the user, for potential future persona integration."),
  tripDestination: z.string().describe("The main destination of the trip being reviewed."),
  tripTravelDates: z.string().describe("The travel dates of the trip."),
  tripStyleOrSummary: z.string().optional().describe("A brief summary or style of the completed trip (e.g., 'Relaxing beach holiday', 'Action-packed city break')."),
  feedbackLovedMost: z.string().min(10, "Please describe what you loved most in at least 10 characters.").describe("User's feedback on what they loved most or highlights of the trip."),
  feedbackSurprises: z.string().optional().describe("User's feedback on what surprised them or was unexpected."),
  feedbackFeelings: z.string().optional().describe("User's overall feelings or reflections about the trip."),
  feedbackKeyTakeaways: z.string().optional().describe("User's key takeaways or new interests sparked by the trip."),
  uploadedPhotoName: z.string().optional().describe("Filename of an uploaded photo, if any (content not processed by AI in this version)."),
});
export type PostTripFeedbackInput = z.infer<typeof PostTripFeedbackInputSchema>;

export const FutureTrajectorySuggestionSchema = z.object({
  trajectoryName: z.string().describe("A catchy and descriptive name for the future travel trajectory (e.g., 'Urban Art & Culinary Trails', 'Serene Mountain Wellness Escapes')."),
  description: z.string().describe("A brief explanation of why this trajectory is suggested based on the user's feedback and past trip, and what it entails."),
  exampleDestinations: z.array(z.string()).min(1).max(3).describe("An array of 2-3 example destinations that fit this trajectory."),
  nextStepTripIdea: AITripPlannerInputSchema.optional().describe("An optional, concrete trip idea (destination, travelDates, budget) for one of the example destinations, usable by the AI Trip Planner."),
  imagePrompt: z.string().optional().describe("A concise text prompt suitable for generating a representative image for this trajectory theme.")
});
export type FutureTrajectorySuggestion = z.infer<typeof FutureTrajectorySuggestionSchema>;

export const PostTripAnalysisOutputSchema = z.object({
  refinedPersonaInsights: z.string().describe("AI-generated insights on how the completed trip might refine or add nuance to the user's travel persona/DNA. This should be a narrative text."),
  futureTrajectorySuggestions: z.array(FutureTrajectorySuggestionSchema).min(1).max(2).describe("An array of 1 to 2 suggested future travel trajectories based on the trip analysis."),
});
export type PostTripAnalysisOutput = z.infer<typeof PostTripAnalysisOutputSchema>;
