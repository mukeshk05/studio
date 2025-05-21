
'use server';
/**
 * @fileOverview An AI flow that simulates an Authenticity Verifier,
 * providing textual insights and generating a visual based on item description.
 */

import { ai } from '@/ai/genkit';
import { AuthenticityVerifierInputSchema, type AuthenticityVerifierInput, AuthenticityVerifierOutputSchema, type AuthenticityVerifierOutput } from '@/ai/types/authenticity-verifier-types';
import { z } from 'zod';

// Schema for the text-only part of the AI's response, before image generation
const AuthenticityTextOutputSchema = AuthenticityVerifierOutputSchema.omit({ generatedImageUri: true });

const generateItemImage = async (promptText: string, fallbackDataAiHint: string): Promise<string> => {
  if (!promptText) return `https://placehold.co/600x400.png?text=${encodeURIComponent(fallbackDataAiHint.substring(0, 20))}`;
  let imageUri = `https://placehold.co/600x400.png`;
  try {
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp',
      prompt: `Generate a clear, appealing image of: ${promptText}. Style: well-lit, focused on the item. Aspect ratio 16:9.`,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
        safetySettings: [
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ],
      },
      // @ts-ignore
      experimentalDoNotSelectOutputTool: true,
    });

    if (media?.url) {
      imageUri = media.url;
    } else {
      console.warn(`Authenticity Verifier image generation for prompt "${promptText}" did not return a media URL. Using placeholder.`);
      imageUri = `https://placehold.co/600x400.png?text=${encodeURIComponent(fallbackDataAiHint.substring(0, 20))}`;
    }
  } catch (imageError) {
    console.error(`Failed to generate Authenticity Verifier image for prompt "${promptText}":`, imageError);
    imageUri = `https://placehold.co/600x400.png?text=${encodeURIComponent(fallbackDataAiHint.substring(0, 20))}`;
  }
  return imageUri;
};

const authenticityVerifierTextPrompt = ai.definePrompt({
  name: 'authenticityVerifierTextPrompt',
  input: { schema: AuthenticityVerifierInputSchema },
  output: { schema: AuthenticityTextOutputSchema },
  prompt: `You are "Aura Verify," an AI Authenticity Advisor for travelers.
Your task is to analyze the provided item description (and acknowledge if an image was conceptually provided) and generate insights. This is a conceptual verification.

Item Description: {{{itemNameOrDescription}}}
{{#if imageDataUri}}User has provided an image for context (content of image is not analyzed in this simulation, but acknowledge its presence if you wish).{{/if}}

Generate the following:
1.  'verificationSummary': A brief (1-2 sentences) summary about the item based on its description. What might it be? Where could it be from?
2.  'authenticityFactors': An array of 2-4 common factors or characteristics to look for when assessing the authenticity of THIS TYPE of item (e.g., for a 'handwoven Peruvian textile': "Look for natural dyes," "Examine the weave tightness," "Inquire about traditional patterns.").
3.  'confidenceNote': A qualitative statement (1-2 sentences) about the likelihood of authenticity based *only* on the description. Emphasize this is NOT definitive proof and real verification needs expertise/physical inspection. (e.g., "Based on your description of 'aged wood and intricate carvings,' this sounds like it could be a genuine tribal mask. However, expert appraisal is needed for confirmation." or "Describing it as 'mass-produced plastic' suggests it's likely a souvenir replica. Look for artisan signatures for more authentic pieces.").
4.  'generatedImagePrompt': A concise, descriptive prompt (4-7 words) for an image generation AI to create a visually appealing representation of the *type* of item described (e.g., "Peruvian handwoven textile vibrant", "antique brass pocket watch detailed", "Balinese wooden tribal mask").

Example for Item Description: "A colorful, hand-painted ceramic bowl I saw at a market in Oaxaca, Mexico. It had intricate floral patterns."
{
  "verificationSummary": "This sounds like a traditional Oaxacan hand-painted ceramic, known as 'barro pintado'. These are often vibrant and feature detailed local motifs.",
  "authenticityFactors": ["Look for imperfections indicating hand-painting vs. printed designs.", "Ask if it's made from local clay ('barro').", "Inquire if the paints are lead-free if intended for food use.", "See if the artisan's name or workshop is identifiable."],
  "confidenceNote": "Based on your description, it aligns well with authentic Oaxacan ceramics. However, variations in quality and tourist-grade items exist, so closer inspection for craftsmanship is advised.",
  "generatedImagePrompt": "Oaxacan ceramic bowl floral hand-painted"
}

Ensure your output strictly follows the AuthenticityTextOutputSchema.
Focus on providing helpful, general advice for the *type* of item described.
`,
});

export const verifyAuthenticityFlow = ai.defineFlow(
  {
    name: 'verifyAuthenticityFlow',
    inputSchema: AuthenticityVerifierInputSchema,
    outputSchema: AuthenticityVerifierOutputSchema,
  },
  async (input: AuthenticityVerifierInput): Promise<AuthenticityVerifierOutput> => {
    const { output: textOutput } = await authenticityVerifierTextPrompt(input);

    if (!textOutput) {
      console.warn("AI Authenticity Verifier text prompt did not return output. Returning a default.");
      const fallbackImage = await generateItemImage(`generic item ${input.itemNameOrDescription.substring(0,20)}`, "item verification");
      return {
        verificationSummary: `Could not generate authenticity insights for "${input.itemNameOrDescription}". Please try again.`,
        authenticityFactors: ["Always research common characteristics of authentic items from the region.", "Ask sellers about the item's origin and materials."],
        confidenceNote: "AI could not provide a specific confidence assessment at this time. Thorough personal research is always recommended.",
        generatedImagePrompt: `generic item ${input.itemNameOrDescription.substring(0,20)}`,
        generatedImageUri: fallbackImage,
      };
    }

    const fallbackImageHint = textOutput.generatedImagePrompt ? textOutput.generatedImagePrompt.substring(0, 20) : input.itemNameOrDescription.substring(0,20);
    const generatedImageUri = await generateItemImage(textOutput.generatedImagePrompt, fallbackImageHint);
    
    return {
      ...textOutput,
      generatedImageUri,
    };
  }
);

export async function getAuthenticityVerification(input: AuthenticityVerifierInput): Promise<AuthenticityVerifierOutput> {
  return verifyAuthenticityFlow(input);
}
