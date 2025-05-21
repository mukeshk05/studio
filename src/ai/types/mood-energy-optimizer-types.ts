
/**
 * @fileOverview Type definitions and Zod schemas for the AI Mood & Energy Optimizer.
 */
import { z } from 'genkit';

export const MoodEnergyOptimizerInputSchema = z.object({
  currentDayPlanDescription: z.string().min(20, { message: "Please describe the current day's plan in at least 20 characters." })
    .describe("A description of the activities currently planned for a specific day."),
  desiredEnergyLevel: z.enum(["low", "medium", "high"], {
    required_error: "Please select your desired energy level for the day.",
  }).describe("The user's desired energy level for the day (e.g., 'low' for relaxing, 'high' for action-packed)."),
  userPersonaName: z.string().optional().describe("The name of the user's travel persona, if available."),
  userPersonaDescription: z.string().optional().describe("The description of the user's travel persona, if available."),
});
export type MoodEnergyOptimizerInput = z.infer<typeof MoodEnergyOptimizerInputSchema>;

export const SuggestedAdjustmentSchema = z.object({
  adjustmentType: z.string().describe("Type of adjustment (e.g., 'Modify Activity', 'Replace Activity', 'Add Break', 'New Suggestion')."),
  originalActivityContext: z.string().optional().describe("The part of the original plan this adjustment relates to, if applicable."),
  suggestionDetails: z.string().describe("The specific AI recommendation for adjusting or adding an activity."),
  reasoning: z.string().describe("Why this suggestion aligns with the desired energy level and persona."),
  energyImpact: z.string().describe("How this adjustment impacts the day's energy demand (e.g., 'Lowers Energy Demand', 'Maintains Pace', 'Adds Gentle Activity')."),
  visualPrompt: z.string().describe("A concise text prompt for generating an illustrative image for this adjustment."),
  imageUri: z.string().optional().describe("Data URI of the generated image for this adjustment."),
});
export type SuggestedAdjustment = z.infer<typeof SuggestedAdjustmentSchema>;

export const MoodEnergyOptimizerOutputSchema = z.object({
  optimizationSummary: z.string().describe("A brief narrative from the AI summarizing its approach to optimizing the day's plan based on the desired energy level."),
  suggestedAdjustments: z.array(SuggestedAdjustmentSchema).min(1).describe("An array of 1 to 3 suggested adjustments to the day's plan."),
});
export type MoodEnergyOptimizerOutput = z.infer<typeof MoodEnergyOptimizerOutputSchema>;
