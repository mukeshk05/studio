
/**
 * @fileOverview Type definitions and Zod schemas for the AI Authenticity Verifier feature.
 */
import { z } from 'zod';

export const AuthenticityVerifierInputSchema = z.object({
  itemNameOrDescription: z.string().min(5, { message: "Please provide a description of at least 5 characters." })
    .describe('A description of the item to be "verified" (e.g., "Antique wooden mask from Bali", "Handwoven silk scarf from Thailand").'),
  imageDataUri: z.string().optional()
    .describe("Optional: A user-uploaded photo of the item as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'. For this conceptual demo, AI primarily uses the description."),
});
export type AuthenticityVerifierInput = z.infer<typeof AuthenticityVerifierInputSchema>;

export const AuthenticityVerifierOutputSchema = z.object({
  verificationSummary: z.string().describe('A brief summary from the AI about the item based on its description, touching on potential origin or type.'),
  authenticityFactors: z.array(z.string()).describe('A list of 2-4 common factors or characteristics to look for when assessing the authenticity of this type of item.'),
  confidenceNote: z.string().describe('A qualitative statement from the AI about the likelihood of authenticity based on the description, emphasizing this is not definitive proof.'),
  generatedImagePrompt: z.string().describe("A concise text prompt suitable for generating an image representing the *type* of item described."),
  generatedImageUri: z.string().optional().describe("A data URI of an AI-generated image representing the item type. Expected format: 'data:image/png;base64,<encoded_data>'."),
});
export type AuthenticityVerifierOutput = z.infer<typeof AuthenticityVerifierOutputSchema>;
