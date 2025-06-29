'use server';

import { generateMultipleImagesFlow as generateMultipleImagesFlowOriginal, type MultipleImagesInput, type MultipleImagesOutput, type ImagePromptItem, type ImageResultItem } from '@/ai/flows/generate-multiple-images-flow';

// Helper to normalize parts of cache keys
const normalizeCacheKeyPart = (part?: string | number | null): string => {
  if (part === undefined || part === null) return 'na';
  let strPart = String(part).trim().toLowerCase();
  if (strPart === "") return 'empty';
  strPart = strPart.replace(/[^a-z0-9_\-]/g, '_').replace(/_+/g, '_');
  return strPart.substring(0, 50);
};

export interface ImageRequest {
  id: string;
  promptText: string;
  styleHint: 'hero' | 'featureCard' | 'destination' | 'general' | 'activity' | 'hotel' | 'hotelRoom';
}

export async function getLandingPageImagesWithFallback(
  requests: ImageRequest[]
): Promise<Record<string, string | null>> {
  console.log(`[Server Action - getLandingPageImagesWithFallback] Started. Total image requests: ${requests.length}`);
  const imageUris: Record<string, string | null> = {};
  requests.forEach(req => imageUris[req.id] = null);

  const itemsToGenerateAI: ImagePromptItem[] = requests.map(req => ({
    id: req.id || `fallback_${normalizeCacheKeyPart(req.promptText)}_${normalizeCacheKeyPart(req.styleHint)}`,
    prompt: req.promptText,
    styleHint: req.styleHint
  }));

  if (itemsToGenerateAI.length > 0) {
    try {
      console.log(`[LandingPageImages] Calling generateMultipleImagesFlowOriginal for ${itemsToGenerateAI.length} images. Caching is disabled.`);
      const aiResultsOutput: MultipleImagesOutput = await generateMultipleImagesFlowOriginal({ prompts: itemsToGenerateAI });
      const aiResults = aiResultsOutput.results || [];

      for (const aiResult of aiResults) {
        if (aiResult.imageUri) {
          imageUris[aiResult.id] = aiResult.imageUri;
        } else {
          console.warn(`[LandingPageImages] AI generation failed for ID ${aiResult.id}: ${aiResult.error}. Placeholder will be used by client.`);
        }
      }
    } catch (flowError: any) {
      console.error('[Server Action - Landing Img AI Error] Error calling generateMultipleImagesFlowOriginal for landing page. Error: ', flowError.message);
      itemsToGenerateAI.forEach(req => {
        if (imageUris[req.id] === null) imageUris[req.id] = null;
      });
    }
  }

  console.log(`[Server Action - getLandingPageImagesWithFallback] Completed. Returning URIs. Count: ${Object.keys(imageUris).length}`);
  return imageUris;
}


export async function generateMultipleImagesAction(input: MultipleImagesInput): Promise<MultipleImagesOutput> {
  try {
    console.log(`[Server Action - generateMultipleImagesAction] Starting generation for ${input.prompts.length} images (caching disabled).`);
    
    if (input.prompts.length === 0) {
      console.log("[Server Action - generateMultipleImagesAction] No prompts provided. Returning empty results.");
      return { results: [] };
    }
  
    const aiFlowResult = await generateMultipleImagesFlowOriginal(input);
    console.log(`[AI Image Gen] Success. Result count: ${aiFlowResult.results.length}`);
    return aiFlowResult;
  } catch (error: any) {
    console.error(`[AI Image Gen] FAILED to generate images:`, error.message, error);
    const errorResults: ImageResultItem[] = input.prompts.map(item => ({
      id: item.id,
      imageUri: null,
      error: error.message || 'Unknown error during image generation flow.'
    }));
    return { results: errorResults };
  }
}
