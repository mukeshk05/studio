
'use server';

import { firestore } from '@/lib/firebase';
import { generateMultipleImagesFlow, type ImagePromptItem, type ImageResultItem } from '@/ai/flows/generate-multiple-images-flow';
import { collection, doc, getDocs, query, where, writeBatch, documentId, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import type { PopularDestinationsOutput, PopularDestinationsInput } from '@/ai/types/popular-destinations-types';


export interface ImageRequest {
  id: string;
  promptText: string;
  styleHint: 'hero' | 'featureCard';
}

// Internal helper, NOT exported as a server action itself, but called by one.
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
    console.log(`[DB Save Internal] Attempting to save image to Firestore for ID: ${id}. URI starts with: ${imageUri ? imageUri.substring(0, 50) + '...' : 'null'}`);
    const imageDocRef = doc(firestore, 'landingPageImages', id);
    await setDoc(imageDocRef, {
      imageUri: imageUri, // This could be a data URI or a placeholder URL
      promptUsed: promptText,
      styleHint: styleHint,
      lastUpdated: serverTimestamp(),
    }, { merge: true });
    console.log(`[DB Save Internal] Image for ID ${id} SAVED/UPDATED successfully in Firestore.`);
  } catch (error) {
    console.error(`[DB Save Internal Error] Failed to save image for ID ${id} to Firestore:`, error);
  }
}


export async function getLandingPageImagesWithFallback(
  requests: ImageRequest[]
): Promise<Record<string, string | null>> {
  console.log(`[Server Action - getLandingPageImagesWithFallback] Started. Requests received: ${requests.length}`);
  const imageUris: Record<string, string | null> = {};
  requests.forEach(req => imageUris[req.id] = null); // Initialize all with null for consistent return structure

  const aiGenerationQueue: ImagePromptItem[] = [];
  const requestIds = requests.map(req => req.id);
  const MAX_FIRESTORE_IN_QUERY = 30; // Firestore 'in' query limit

  try {
    // 1. Fetch existing images from Firestore in chunks
    if (requestIds.length > 0) {
      for (let i = 0; i < requestIds.length; i += MAX_FIRESTORE_IN_QUERY) {
        const chunkOfIds = requestIds.slice(i, i + MAX_FIRESTORE_IN_QUERY);
        if (chunkOfIds.length === 0) {
          console.log("[DB Check] Empty ID chunk, skipping Firestore query for this batch.");
          continue;
        }
        console.log(`[DB Check] Querying Firestore for IDs: ${chunkOfIds.join(', ')} (Chunk ${Math.floor(i / MAX_FIRESTORE_IN_QUERY) + 1})`);
        const imageDocsQuery = query(collection(firestore, 'landingPageImages'), where(documentId(), 'in', chunkOfIds));
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

    // 2. Identify images that need AI generation
    requests.forEach(req => {
      if (imageUris[req.id] === null) { // Check if it's still null (not found in DB)
        console.log(`[Server Action] Image for ID ${req.id} (Prompt: "${req.promptText}") not in DB, adding to AI queue.`);
        aiGenerationQueue.push({ id: req.id, prompt: req.promptText, styleHint: req.styleHint });
      }
    });

    console.log(`[Server Action] Found ${Object.values(imageUris).filter(uri => uri !== null).length} images in DB. Sending ${aiGenerationQueue.length} to AI for generation.`);

    // 3. Generate images with AI if needed
    if (aiGenerationQueue.length > 0) {
      console.log(`[Server Action] Calling generateMultipleImagesFlow for ${aiGenerationQueue.length} images.`);
      try {
        const aiResults = await generateMultipleImagesFlow({ prompts: aiGenerationQueue });
        console.log(`[Server Action] AI Results received: ${aiResults.results.length} items.`);

        aiResults.results.forEach(aiResult => {
          const originalRequest = requests.find(r => r.id === aiResult.id);
          if (aiResult.imageUri) {
            imageUris[aiResult.id] = aiResult.imageUri; // Update the main response object
            console.log(`[Server Action] Updated imageUris with AI result for ID ${aiResult.id}. URI starts with: ${aiResult.imageUri.substring(0, 50)}...`);
            
            // Asynchronously save to DB - do not await this
            if (originalRequest) {
              saveImageUriToDbInternal({
                id: aiResult.id,
                imageUri: aiResult.imageUri,
                promptText: originalRequest.promptText,
                styleHint: originalRequest.styleHint,
              }).catch(saveError => { // Catch errors from the async save, but don't let them block
                console.error(`[Server Action - Background DB Save Error] Failed to save image for ID ${aiResult.id} to DB:`, saveError);
              });
            }
          } else {
            // If AI generation specifically failed for this item, ensure it remains null
            // imageUris[aiResult.id] is already null by initialization
            console.warn(`[Server Action] AI generation failed or returned null URI for ID ${aiResult.id}. Error: ${aiResult.error || 'Unknown AI error'}`);
          }
        });
      } catch (flowError) {
        console.error('[Server Action] CRITICAL ERROR calling generateMultipleImagesFlow:', flowError);
        // In case the flow itself errors, ensure all items queued for AI remain null
        aiGenerationQueue.forEach(req => {
            if (imageUris[req.id] === undefined) imageUris[req.id] = null; // Should already be null
        });
      }
    }
    
    console.log(`[Server Action - getLandingPageImagesWithFallback] RETURNING imageUris:`, imageUris);
    return imageUris;

  } catch (error: any) {
    console.error('[Server Action - getLandingPageImagesWithFallback] TOP LEVEL CRITICAL ERROR:', error.message, error.stack);
    // Ensure a valid object structure is returned even in case of a top-level error
    const fallbackUris: Record<string, string | null> = {};
    requests.forEach(req => fallbackUris[req.id] = null); // Initialize all to null
    console.log(`[Server Action - getLandingPageImagesWithFallback] Returning fallbackUris due to critical error:`, fallbackUris);
    return fallbackUris;
  }
}


// Original Server Action for a single feature image (can be deprecated or kept for other uses)
// 'use server'; // This was moved to the top of the file
export async function getAiImageForFeatureServerAction(promptText: string): Promise<string | null> {
  console.log(`[Server Action - getAiImageForFeature] Received prompt: "${promptText}"`);
  try {
    // Assuming generateMultipleImagesFlow can handle a single item array for consistency,
    // or you can call a specific single image generation flow if you create one.
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
    // Ensure the flow is imported correctly if it's not already at the top
    const { popularDestinationsFlow } = await import('@/ai/flows/popular-destinations-flow');
    const result = await popularDestinationsFlow(input);
    console.log(`[Server Action - getPopularDestinations] AI Flow Result (destinations count):`, result.destinations.length);
    result.destinations.forEach(d => {
      console.log(`[Server Action - getPopularDestinations] Dest: ${d.name}, ImageURI provided: ${!!d.imageUri}, Coords: Lat ${d.latitude}, Lng ${d.longitude}`);
    });
    return result;
  } catch (error: any) {
    console.error('[Server Action - getPopularDestinations] ERROR fetching popular destinations:', error.message, error.stack);
    // Return a structured error response or a default valid output
    return { destinations: [], contextualNote: "Sorry, we encountered an error while fetching destination ideas. Please try again later." };
  }
}

    