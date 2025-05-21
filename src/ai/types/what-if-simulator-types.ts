
/**
 * @fileOverview Type definitions and Zod schemas for the AI 'What If' Travel Simulator.
 */
import { z } from 'genkit';

export const DestinationAnalysisSchema = z.object({
  name: z.string().describe("The name of the destination."),
  suitabilityForInterest: z.string().describe("How well this destination suits the specified travel interest (1-2 sentences)."),
  generalVibe: z.string().describe("The overall atmosphere or feel of the destination (1-2 sentences)."),
  costExpectation: z.string().describe("A general cost expectation (e.g., 'Budget-Friendly', 'Mid-Range', 'Moderately Expensive', 'Luxury')."),
  keyHighlights: z.array(z.string()).min(2).max(4).describe("An array of 2-4 key highlights or attractions relevant to the travel interest."),
  imagePrompt: z.string().describe("A concise text prompt (4-7 words) for an image generation AI to create a visually appealing representation of this destination, reflecting the travel interest."),
  imageUri: z.string().optional().describe("The data URI of the AI-generated image for this destination. This is populated by the flow."),
});
export type DestinationAnalysis = z.infer<typeof DestinationAnalysisSchema>;

export const WhatIfSimulatorInputSchema = z.object({
  destination1: z.string().min(3, { message: "Destination 1 name must be at least 3 characters." })
    .describe('The name of the first destination to compare.'),
  destination2: z.string().min(3, { message: "Destination 2 name must be at least 3 characters." })
    .describe('The name of the second destination to compare.'),
  travelInterest: z.string().min(5, { message: "Travel interest must be at least 5 characters." })
    .describe('The primary travel interest or trip type for comparison (e.g., "romantic getaway", "adventure & hiking", "cultural immersion").'),
});
export type WhatIfSimulatorInput = z.infer<typeof WhatIfSimulatorInputSchema>;

export const WhatIfSimulatorOutputSchema = z.object({
  comparisonSummary: z.string().describe("A brief (2-3 sentences) overall summary comparing the two destinations for the given travel interest."),
  destination1Analysis: DestinationAnalysisSchema.describe("Detailed analysis for the first destination."),
  destination2Analysis: DestinationAnalysisSchema.describe("Detailed analysis for the second destination."),
  aiRecommendation: z.string().optional().describe("An optional AI recommendation on which destination might be a better fit, or advice on choosing."),
});
export type WhatIfSimulatorOutput = z.infer<typeof WhatIfSimulatorOutputSchema>;
