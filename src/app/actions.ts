
'use server';

import { firestore } from '@/lib/firebase';
import { generateMultipleImagesFlow, type ImagePromptItem } from '@/ai/flows/generate-multiple-images-flow';
import { collection, doc, getDocs, query, where, writeBatch, documentId, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import type { PopularDestinationsOutput, PopularDestinationsInput } from '@/ai/types/popular-destinations-types';


export interface ImageRequest {
  id: string;
  promptText: string;
  styleHint: 'hero' | 'featureCard';
}

// Internal helper, not exported as a server action itself but used by one
async function saveImageUriToDbInternal({
  id,
  imageUri,
  promptText,
  styleHint
}: {
  id: string;
  imageUri: string;
  promptText: string;
  styleHint: 'hero' | 'featureCard';
}) {
  try {
    console.log(`[DB Save Internal] Attempting to save image to Firestore for ID: ${id}. URI starts with: ${imageUri.substring(0, 50)}...`);
    const imageDocRef = doc(firestore, 'landingPageImages', id);
    await setDoc(imageDocRef, {
      imageUri: imageUri,
      promptUsed: promptText,
      styleHint: styleHint,
      lastUpdated: serverTimestamp(),
    }, { merge: true });
    console.log(`[DB Save Internal] Image for ID ${id} SAVED/UPDATED successfully in Firestore.`);
  } catch (error) {
    console.error(`[DB Save Internal Error] Failed to save image for ID ${id} to Firestore:`, error);
    // Optionally, implement a retry mechanism or dead-letter queue for critical saves
  }
}


export async function getLandingPageImagesWithFallback(
  requests: ImageRequest[]
): Promise<Record<string, string | null>> {
  console.log(`[Server Action - getLandingPageImagesWithFallback] Started. Requests received: ${requests.length}`);
  const imageUris: Record<string, string | null> = {};
  requests.forEach(req => imageUris[req.id] = null); // Initialize all with null

  const aiGenerationQueue: ImagePromptItem[] = [];
  const requestIds = requests.map(req => req.id);
  const MAX_FIRESTORE_IN_QUERY = 30;

  try {
    if (requestIds.length > 0) {
      for (let i = 0; i < requestIds.length; i += MAX_FIRESTORE_IN_QUERY) {
        const chunk = requestIds.slice(i, i + MAX_FIRESTORE_IN_QUERY);
        if (chunk.length === 0) {
          console.log("[DB Check] Empty chunk, skipping Firestore query for this chunk.");
          continue;
        }
        console.log(`[DB Check] Querying Firestore for IDs: ${chunk.join(', ')} (Chunk ${Math.floor(i / MAX_FIRESTORE_IN_QUERY) + 1})`);
        const imageDocsQuery = query(collection(firestore, 'landingPageImages'), where(documentId(), 'in', chunk));
        const imageDocsSnap = await getDocs(imageDocsQuery);

        imageDocsSnap.forEach(docSnap => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.imageUri) {
              imageUris[docSnap.id] = data.imageUri;
              console.log(`[DB Check] Found existing image in Firestore for ID ${docSnap.id}.`);
            } else {
              console.log(`[DB Check] Document for ID ${docSnap.id} found but no imageUri field.`);
            }
          }
        });
      }
    }

    requests.forEach(req => {
      if (imageUris[req.id] === null) { // Check if it's still null (not found in DB)
        console.log(`[Server Action] Image for ID ${req.id} not in DB, adding to AI queue.`);
        aiGenerationQueue.push({ id: req.id, prompt: req.promptText, styleHint: req.styleHint });
      }
    });

    console.log(`[Server Action] Found ${Object.values(imageUris).filter(uri => uri !== null).length} images in DB. Sending ${aiGenerationQueue.length} to AI for generation.`);

    if (aiGenerationQueue.length > 0) {
      console.log(`[Server Action] Calling generateMultipleImagesFlow for ${aiGenerationQueue.length} images with prompts:`, aiGenerationQueue.map(p => p.prompt));
      const aiResults = await generateMultipleImagesFlow({ prompts: aiGenerationQueue });
      console.log(`[Server Action] AI Results received: ${aiResults.results.length} items.`, aiResults.results);

      aiResults.results.forEach(aiResult => {
        if (aiResult.imageUri) {
          imageUris[aiResult.id] = aiResult.imageUri;
          console.log(`[Server Action] Updated imageUris with AI result for ID ${aiResult.id}. URI starts with: ${aiResult.imageUri.substring(0, 50)}...`);
          const originalRequest = requests.find(r => r.id === aiResult.id);
          if (originalRequest) {
            // Call saveImageUriToDbInternal without awaiting it
            saveImageUriToDbInternal({
              id: aiResult.id,
              imageUri: aiResult.imageUri,
              promptText: originalRequest.promptText,
              styleHint: originalRequest.styleHint,
            }).catch(saveError => {
              console.error(`[Server Action - Background DB Save Error] Failed to save image for ID ${aiResult.id} to DB:`, saveError);
            });
          }
        } else {
          console.warn(`[Server Action] AI generation failed or returned null URI for ID ${aiResult.id}. Error: ${aiResult.error}`);
          imageUris[aiResult.id] = null; // Ensure it's explicitly null if AI fails
        }
      });
    }
    console.log(`[Server Action - getLandingPageImagesWithFallback] RETURNING imageUris:`, imageUris);
    return imageUris;

  } catch (error: any) {
    console.error('[Server Action - getLandingPageImagesWithFallback] CRITICAL ERROR:', error.message, error.stack);
    // Ensure a valid object is returned even in case of a top-level error
    const fallbackUris: Record<string, string | null> = {};
    requests.forEach(req => fallbackUris[req.id] = null);
    console.log(`[Server Action - getLandingPageImagesWithFallback] Returning fallbackUris due to critical error:`, fallbackUris);
    return fallbackUris;
  }
}


// Original Server Action for a single feature image (can be deprecated or kept for other uses)
export async function getAiImageForFeatureServerAction(promptText: string): Promise<string | null> {
  console.log(`[Server Action - getAiImageForFeature] Received prompt: "${promptText}"`);
  // 'use server'; // This was the problematic line, it should be at the top of the file.
  try {
    const results = await generateMultipleImagesFlow({ prompts: [{ id: 'single-feature', prompt: promptText, styleHint: 'featureCard' }] });
    const imageUri = results.results[0]?.imageUri || null;
    console.log(`[Server Action - getAiImageForFeature] Resulting URI for "${promptText}": ${imageUri ? imageUri.substring(0,50)+'...' : 'null'}`);
    return imageUri;
  } catch (error) {
    console.error(`[Server Action - getAiImageForFeature] Error generating image for prompt "${promptText}":`, error);
    return null;
  }
}

// Server action for popular destinations (from travel page)
export async function getPopularDestinations(
  input: PopularDestinationsInput
): Promise<PopularDestinationsOutput> {
  console.log(`[Server Action - getPopularDestinations] Input:`, input);
  try {
    const { popularDestinationsFlow } = await import('@/ai/flows/popular-destinations-flow');
    const result = await popularDestinationsFlow(input);
    console.log(`[Server Action - getPopularDestinations] AI Flow Result (destinations):`, result.destinations.map(d => ({name: d.name, imageUriProvided: !!d.imageUri, coords: {lat: d.latitude, lng: d.longitude} })));
    return result;
  } catch (error: any) {
    console.error('[Server Action - getPopularDestinations] ERROR fetching popular destinations:', error.message, error.stack);
    return { destinations: [], contextualNote: "Sorry, we encountered an error while fetching destination ideas." };
  }
}
