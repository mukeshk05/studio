
'use server';

import { generateFeatureImageFlow } from '@/ai/flows/generate-feature-image-flow';

export async function getAiImageForFeatureServerAction(promptText: string): Promise<string | null> {
  try {
    const result = await generateFeatureImageFlow({ prompt: promptText });
    return result.imageUri;
  } catch (error) {
    console.error("Error in server action getAiImageForFeature:", error);
    return null;
  }
}
