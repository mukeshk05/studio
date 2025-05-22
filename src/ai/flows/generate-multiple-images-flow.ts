
// src/ai/flows/generate-multiple-images-flow.ts
/**
 * @fileOverview A Genkit flow to generate multiple images based on an array of prompts.
 * For each prompt, it can also take a style hint to tailor the image generation.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export const ImagePromptItemSchema = z.object({
  id: z.string().describe("A unique identifier for this specific image request, used to map results."),
  prompt: z.string().describe('The descriptive prompt for the image.'),
  styleHint: z.enum(['hero', 'featureCard', 'destination', 'general']).optional().describe("A hint to guide the image style (e.g., 'hero' for cinematic, 'featureCard' for modern tech)."),
});
export type ImagePromptItem = z.infer<typeof ImagePromptItemSchema>;

export const MultipleImagesInputSchema = z.object({
  prompts: z.array(ImagePromptItemSchema).min(1).describe('An array of prompt items for image generation.'),
});
export type MultipleImagesInput = z.infer<typeof MultipleImagesInputSchema>;

export const ImageResultItemSchema = z.object({
  id: z.string().describe("The unique identifier for this image result, matching the input ID."),
  imageUri: z.string().url().nullable().describe('The data URI of the generated image, or null if generation failed for this item.'),
  error: z.string().optional().describe('Error message if generation failed for this item.'),
});
export type ImageResultItem = z.infer<typeof ImageResultItemSchema>;

export const MultipleImagesOutputSchema = z.object({
  results: z.array(ImageResultItemSchema).describe('An array of image generation results, corresponding to the input prompts.'),
});
export type MultipleImagesOutput = z.infer<typeof MultipleImagesOutputSchema>;


export const generateMultipleImagesFlow = ai.defineFlow(
  {
    name: 'generateMultipleImagesFlow',
    inputSchema: MultipleImagesInputSchema,
    outputSchema: MultipleImagesOutputSchema,
  },
  async (input: MultipleImagesInput): Promise<MultipleImagesOutput> => {
    console.log(`[AI Flow - generateMultipleImagesFlow] Starting generation for ${input.prompts.length} images.`);
    const results: ImageResultItem[] = [];
    const batchSize = 5; // Process in batches to avoid overwhelming the API or local resources

    for (let i = 0; i < input.prompts.length; i += batchSize) {
        const batch = input.prompts.slice(i, i + batchSize);
        console.log(`[AI Flow - generateMultipleImagesFlow] Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(input.prompts.length / batchSize)} (size: ${batch.length})`);

        const batchPromises = batch.map(async (item): Promise<ImageResultItem> => {
            let fullPrompt = item.prompt;
            if (item.styleHint === 'hero') {
                fullPrompt = `Generate a captivating, high-resolution hero image for a travel website, representing: "${item.prompt}". Style: cinematic, inspiring, travel-focused. Aspect ratio 1:1 for carousel.`;
            } else if (item.styleHint === 'featureCard') {
                fullPrompt = `Generate a high-quality, visually appealing image suitable for a website feature card, representing the concept: "${item.prompt}". Style: modern, tech-forward, travel-related, slightly abstract or conceptual. Aspect ratio 16:9.`;
            } else if (item.styleHint === 'destination') {
                 fullPrompt = `Generate an iconic, vibrant, and high-quality travel photograph representing: ${item.prompt}. Aspect ratio 16:9. Focus on its most recognizable visual elements or overall atmosphere.`;
            }
             // else: use item.prompt as is for 'general' or undefined styleHint

            try {
                console.log(`[AI Flow - generateMultipleImagesFlow] Generating image for ID: ${item.id}, Prompt: "${fullPrompt}" (Original hint: "${item.prompt}")`);
                const { media } = await ai.generate({
                    model: 'googleai/gemini-2.0-flash-exp',
                    prompt: fullPrompt,
                    config: {
                        responseModalities: ['TEXT', 'IMAGE'],
                        safetySettings: [ // Moderate safety settings
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
                    console.log(`[AI Flow - generateMultipleImagesFlow] Success for ID: ${item.id}. Image URI starts with: ${media.url.substring(0, 50)}...`);
                    return { id: item.id, imageUri: media.url };
                } else {
                    console.warn(`[AI Flow - generateMultipleImagesFlow] Image generation for ID: ${item.id}, prompt "${item.prompt}" did NOT return a media URL.`);
                    return { id: item.id, imageUri: null, error: 'No media URL returned by AI.' };
                }
            } catch (error: any) {
                console.error(`[AI Flow - generateMultipleImagesFlow] FAILED to generate image for ID: ${item.id}, prompt "${item.prompt}":`, error.message || error);
                return { id: item.id, imageUri: null, error: error.message || 'Unknown error during image generation.' };
            }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
    }
    
    console.log(`[AI Flow - generateMultipleImagesFlow] Finished generation. Total results: ${results.length}`);
    return { results };
  }
);
