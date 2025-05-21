
/**
 * @fileOverview Type definitions and Zod schemas for the AI Personalized Accessibility Scout.
 */
import { z } from 'genkit';

export const PersonalizedAccessibilityScoutInputSchema = z.object({
  destination: z.string().min(3, { message: "Destination must be at least 3 characters." })
    .describe('The travel destination (e.g., "Rome, Italy", "Yellowstone National Park").'),
  accessibilityNeeds: z.string().min(10, { message: "Please describe accessibility needs in at least 10 characters." })
    .describe('A detailed description of specific accessibility needs (e.g., "Wheelchair user needing step-free routes and accessible hotel rooms. Also requires quiet zones due to sensory sensitivity and clear signage for visual impairment. Gluten-free dining options essential.").'),
});
export type PersonalizedAccessibilityScoutInput = z.infer<typeof PersonalizedAccessibilityScoutInputSchema>;

export const PersonalizedAccessibilityScoutOutputSchema = z.object({
  overallAssessment: z.string().describe('A concise summary of how suitable the destination might be for the described accessibility needs, highlighting the general outlook.'),
  positiveAspects: z.array(z.string()).optional().describe('Potential positive points or aspects of the destination that might cater well to some of the stated needs.'),
  potentialChallenges: z.array(z.string()).optional().describe('Potential challenges or areas where the destination might fall short regarding the stated needs.'),
  specificSuggestions: z.array(z.string()).optional().describe('Actionable suggestions, specific areas to research further, or types of services/venues to look for.'),
  imagePrompt: z.string().describe('A concise text prompt (3-7 words) for generating a visually representative and inclusive image related to accessible travel at the destination.'),
  imageUri: z.string().optional().describe("A data URI of a generated image. Populated by the flow."),
  disclaimer: z.string().describe('A standard disclaimer that AI advice is a starting point and official/local resources should always be consulted for detailed and verified accessibility information.'),
});
export type PersonalizedAccessibilityScoutOutput = z.infer<typeof PersonalizedAccessibilityScoutOutputSchema>;
