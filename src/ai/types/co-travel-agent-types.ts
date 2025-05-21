
/**
 * @fileOverview Type definitions and Zod schemas for the AI Co-Travel Agent.
 */
import { z } from 'genkit';

export const CoTravelAgentInputSchema = z.object({
  destination: z.string().min(3, { message: "Destination must be at least 3 characters." })
    .describe('The travel destination the user is asking about (e.g., "Tokyo, Japan", "Paris, France").'),
  question: z.string().min(10, { message: "Question must be at least 10 characters." })
    .describe('The user\'s specific travel-related question (e.g., "What is the tipping etiquette in restaurants?", "How do I get from Narita airport to Shinjuku?").'),
});
export type CoTravelAgentInput = z.infer<typeof CoTravelAgentInputSchema>;

export const CoTravelAgentOutputSchema = z.object({
  answer: z.string().describe('A direct, concise, and helpful answer to the user\'s question, tailored to the specified destination.'),
  relevantTips: z.array(z.string()).optional()
    .describe('Optional: 1-2 very short, highly relevant additional tips related to the question or destination if deemed useful by the AI.'),
});
export type CoTravelAgentOutput = z.infer<typeof CoTravelAgentOutputSchema>;

