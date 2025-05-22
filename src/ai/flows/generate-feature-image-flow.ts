
/**
 * @fileOverview A Genkit flow to generate an image for a feature card based on a prompt.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export const FeatureImageInputSchema = z.object({
  prompt: z.string().describe('The descriptive prompt for the image, derived from the feature data-ai-hint.'),
});
export type FeatureImageInput = z.infer<typeof FeatureImageInputSchema>;

export const FeatureImageOutputSchema = z.object({
  imageUri: z.string().url().nullable().describe('The data URI of the generated image, or null if generation failed.'),
});
export type FeatureImageOutput = z.infer<typeof FeatureImageOutputSchema>;

export const generateFeatureImageFlow = ai.defineFlow(
  {
    name: 'generateFeatureImageFlow',
    inputSchema: FeatureImageInputSchema,
    outputSchema: FeatureImageOutputSchema,
  },
  async (input: FeatureImageInput): Promise<FeatureImageOutput> => {
    console.log('[AI Flow - generateFeatureImageFlow] Received input:', input);
    try {
      const { media } = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp',
        prompt: `Generate a high-quality, visually appealing image suitable for a website feature card, representing the concept: "${input.prompt}". Style: modern, tech-forward, travel-related, slightly abstract or conceptual. Aspect ratio 16:9.`,
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
        console.log(`[AI Flow - generateFeatureImageFlow] Success for prompt "${input.prompt}". Image URI starts with: ${media.url.substring(0, 50)}...`);
        return { imageUri: media.url };
      } else {
        console.warn(`[AI Flow - generateFeatureImageFlow] Image generation for feature prompt "${input.prompt}" did not return a media URL.`);
        return { imageUri: null };
      }
    } catch (error) {
      console.error(`[AI Flow - generateFeatureImageFlow] Failed to generate image for feature prompt "${input.prompt}":`, error);
      return { imageUri: null };
    }
  }
);
