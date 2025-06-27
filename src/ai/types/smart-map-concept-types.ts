
/**
 * @fileOverview Type definitions and Zod schemas for the AI Smart Map Concept Generator.
 */
import { z } from 'zod';

export const SmartMapConceptInputSchema = z.object({
  destination: z.string().min(3, { message: "Destination must be at least 3 characters." })
    .describe('The travel destination for which to generate a smart map concept.'),
  userPersonaDescription: z.string().optional()
    .describe('Optional: A brief description of the user\'s travel persona or interests to tailor the map concept (e.g., "Adventure seeker interested in hiking and local cuisine", "Art lover looking for hidden galleries and cozy cafes"). If not provided, a general explorer persona can be assumed by the AI.'),
});
export type SmartMapConceptInput = z.infer<typeof SmartMapConceptInputSchema>;

export const SmartMapConceptOutputSchema = z.object({
  mapConceptDescription: z.string().describe('A narrative description of the AI-powered interactive smart map concept for the given destination and persona. This should explain the overall vision for the map.'),
  suggestedLayers: z.array(z.string()).min(1).describe('An array of 2-4 suggested personalized map layers (e.g., "Hidden Cafes for Art Lovers", "Historical Walking Trails", "Best Street Food Spots").'),
  examplePois: z.array(z.string()).min(1).describe('An array of 2-4 examples of unique points of interest (POIs) that would be highlighted on such a map for the given persona/destination.'),
  imagePrompt: z.string().optional().describe('A concise text prompt (4-7 words) for an image generation AI to create a visually appealing conceptual representation of this smart map idea (e.g., "futuristic map interface Paris cafes", "glowing POIs Kyoto night").'),
});
export type SmartMapConceptOutput = z.infer<typeof SmartMapConceptOutputSchema>;
