
'use server';

import { firestore } from '@/lib/firebase';
import { generateMultipleImagesFlow, type ImagePromptItem, type MultipleImagesInput, type ImageResultItem } from '@/ai/flows/generate-multiple-images-flow';
import { collection, doc, getDocs, query, where, writeBatch, documentId, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import type { PopularDestinationsOutput, PopularDestinationsInput } from '@/ai/types/popular-destinations-types';
import { popularDestinationsFlow } from '@/ai/flows/popular-destinations-flow';
import { getExploreIdeasFromHistory, type ExploreIdeasOutput } from '@/ai/flows/explore-ideas-from-history-flow'; // New Import
import type { ExploreIdeasFromHistoryInput } from '@/ai/types/explore-ideas-types'; // New Import

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
      imageUri: imageUri,
      promptUsed: promptText,
      styleHint: styleHint,
      lastUpdated: serverTimestamp(),
    }, { merge: true });
    console.log(`[DB Save Internal] Image for ID ${id} SAVED/UPDATED successfully in Firestore.`);
  } catch (error: any) {
    console.error(`[DB Save Internal Error] Failed to save image for ID ${id} to Firestore:`, error.message, error.stack);
  }
}


export async function getLandingPageImagesWithFallback(
  requests: ImageRequest[]
): Promise<Record<string, string | null>> {
  console.log(`[Server Action - getLandingPageImagesWithFallback] Started. Total requests: ${requests.length}`);
  const imageUris: Record<string, string | null> = {};
  requests.forEach(req => imageUris[req.id] = null); // Initialize all with null

  const requestIds = requests.map(req => req.id);
  const aiGenerationQueue: ImagePromptItem[] = [];
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
              console.log(`[DB Check] Found existing image in Firestore for ID ${docSnap.id}. URI starts with: ${data.imageUri.substring(0,30)}...`);
            } else {
              console.log(`[DB Check] Document for ID ${docSnap.id} found but no imageUri field. Will attempt AI gen.`);
            }
          } else {
             console.log(`[DB Check] No document found in Firestore for ID ${docSnap.id}. Will attempt AI gen.`);
          }
        });
      }
    } else {
      console.log("[DB Check] No request IDs provided, skipping Firestore query.");
    }

    // 2. Identify images that need AI generation
    requests.forEach(req => {
      if (imageUris[req.id] === null) { // Only queue if not found in DB
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
        console.log(`[Server Action] AI Results received: ${aiResults.results.length} items. Example:`, aiResults.results.length > 0 ? aiResults.results[0] : "No results");

        aiResults.results.forEach(aiResult => {
          const originalRequest = requests.find(r => r.id === aiResult.id);
          if (aiResult.imageUri) {
            imageUris[aiResult.id] = aiResult.imageUri;
            console.log(`[Server Action] Updated imageUris with AI result for ID ${aiResult.id}. URI starts with: ${aiResult.imageUri.substring(0, 50)}...`);
            
            if (originalRequest) {
              // Asynchronously save to DB - do not await this
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
            console.warn(`[Server Action] AI generation failed or returned null URI for ID ${aiResult.id}. Error: ${aiResult.error || 'Unknown AI error'}`);
            // imageUris[aiResult.id] remains null as initialized
          }
        });
      } catch (flowError: any) {
        console.error('[Server Action] CRITICAL ERROR calling generateMultipleImagesFlow:', flowError.message, flowError.stack);
        aiGenerationQueue.forEach(req => { // Ensure items queued for AI but failed due to flow error are marked null
            if (imageUris[req.id] === undefined) imageUris[req.id] = null;
        });
      }
    }
    
    console.log(`[Server Action - getLandingPageImagesWithFallback] RETURNING imageUris:`, Object.fromEntries(Object.entries(imageUris).map(([k,v]) => [k, v ? v.substring(0,50) + "..." : null])));
    return imageUris;

  } catch (error: any) {
    console.error('[Server Action - getLandingPageImagesWithFallback] TOP LEVEL CRITICAL ERROR:', error.message, error.stack);
    // Fallback: return an object where all requested image IDs map to null
    const fallbackUris: Record<string, string | null> = {};
    requests.forEach(req => fallbackUris[req.id] = null);
    return fallbackUris;
  }
}

// Server action for popular destinations (from travel page)
export async function getPopularDestinations(
  input: PopularDestinationsInput
): Promise<PopularDestinationsOutput> {
  console.log(`[Server Action - getPopularDestinations] Input:`, input);
  try {
    const result = await popularDestinationsFlow(input);
    console.log(`[Server Action - getPopularDestinations] AI Flow Result (destinations count):`, result.destinations.length);
    result.destinations.forEach(d => {
      console.log(`[Server Action - getPopularDestinations] Dest: ${d.name}, ImageURI provided: ${!!d.imageUri}, Coords: Lat ${d.latitudeString}, Lng ${d.longitudeString}`);
    });
    return result;
  } catch (error: any) {
    console.error('[Server Action - getPopularDestinations] ERROR fetching popular destinations:', error.message, error.stack);
    let note = "Sorry, we encountered an error while fetching destination ideas. Please try again later.";
    if (input.interest) {
        note = `Sorry, we encountered an error fetching ideas for '${input.interest}'. Please try again later.`;
    } else if (input.userLatitude) {
        note = "Sorry, we encountered an error fetching ideas near your location. Please try again later.";
    }
    return { destinations: [], contextualNote: note };
  }
}

// New Server Action for Explore Page "Ideas for You"
export async function getExploreIdeasAction(input: ExploreIdeasFromHistoryInput): Promise<ExploreIdeasOutput> {
  console.log(`[Server Action - getExploreIdeasAction] Input userId: ${input.userId}`);
  try {
    const result = await getExploreIdeasFromHistory(input); // Calls the new flow
    console.log(`[Server Action - getExploreIdeasAction] AI Flow Result (suggestions count):`, result.suggestions.length);
    return result;
  } catch (error: any) {
    console.error('[Server Action - getExploreIdeasAction] ERROR fetching explore ideas:', error.message, error.stack);
    return { 
      suggestions: [], 
      contextualNote: "Sorry, we encountered an error while generating personalized ideas. Please try again later." 
    };
  }
}
