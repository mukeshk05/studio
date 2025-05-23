
'use server'; // This directive MUST be at the very top of the file.

import { firestore } from '@/lib/firebase';
import {
  generateMultipleImagesFlow,
  type ImagePromptItem, // Ensure this is exported from the flow file
  // type MultipleImagesInput, // No longer directly used by client
  type ImageResultItem, // Ensure this is exported
} from '@/ai/flows/generate-multiple-images-flow';
import { collection, doc, getDocs, query, where, writeBatch, documentId, setDoc, serverTimestamp, getDoc, Timestamp } from 'firebase/firestore';
import type { PopularDestinationsOutput, PopularDestinationsInput } from '@/ai/types/popular-destinations-types';
import { popularDestinationsFlow } from '@/ai/flows/popular-destinations-flow';
import { getExploreIdeasFromHistory, type ExploreIdeasOutput } from '@/ai/flows/explore-ideas-from-history-flow';
import type { ExploreIdeasFromHistoryInput } from '@/ai/types/explore-ideas-types';
import {
  aiFlightMapDealsFlow,
} from '@/ai/flows/ai-flight-map-deals-flow';
import type {
    AiFlightMapDealInput,
    AiFlightMapDealOutput,
} from '@/ai/types/ai-flight-map-deals-types';


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
              console.log(`[DB Check] Document for ID ${docSnap.id} found but no imageUri. Will attempt AI gen.`);
            }
          } else {
             console.log(`[DB Check] No document found in Firestore for ID ${docSnap.id}. Will attempt AI gen.`);
          }
        });
      }
    } else {
      console.log("[DB Check] No request IDs provided, skipping Firestore query.");
    }

    requests.forEach(req => {
      if (imageUris[req.id] === null) { // If not found in DB or if DB entry had no URI
        console.log(`[Server Action] Image for ID ${req.id} (Prompt: "${req.promptText}") not in DB or missing URI, adding to AI queue.`);
        aiGenerationQueue.push({ id: req.id, prompt: req.promptText, styleHint: req.styleHint });
      }
    });

    console.log(`[Server Action] Found ${Object.values(imageUris).filter(uri => uri !== null).length} images in DB. Sending ${aiGenerationQueue.length} to AI for generation.`);

    if (aiGenerationQueue.length > 0) {
      try {
        console.log('[Server Action] Calling generateMultipleImagesFlow for prompts:', aiGenerationQueue.map(p=>p.prompt));
        const aiResults = await generateMultipleImagesFlow({ prompts: aiGenerationQueue });
        console.log(`[Server Action] AI Results received. Count: ${aiResults.results.length}.`);
        aiResults.results.forEach(aiResult => {
          const originalRequest = requests.find(r => r.id === aiResult.id);
          if (aiResult.imageUri) {
            imageUris[aiResult.id] = aiResult.imageUri;
            console.log(`[Server Action] Updated imageUris with AI result for ID ${aiResult.id}. URI starts with: ${aiResult.imageUri.substring(0, 50)}...`);
            if (originalRequest) {
              // Fire and forget DB save
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
            imageUris[aiResult.id] = null; // Explicitly ensure it's null
          }
        });
      } catch (flowError: any) {
        console.error('[Server Action] CRITICAL ERROR calling generateMultipleImagesFlow:', flowError.message, flowError.stack);
        // Ensure all items queued for AI are marked as null if the flow itself fails
        aiGenerationQueue.forEach(req => {
            imageUris[req.id] = null;
        });
      }
    }
    
    console.log(`[Server Action - getLandingPageImagesWithFallback] RETURNING imageUris:`, imageUris);
    return imageUris;

  } catch (error: any) {
    console.error('[Server Action - getLandingPageImagesWithFallback] TOP LEVEL CRITICAL ERROR:', error.message, error.stack);
    // Initialize all with null in case of catastrophic failure before imageUris is populated
    const fallbackUris: Record<string, string | null> = {};
    requests.forEach(req => fallbackUris[req.id] = null);
    console.error('[Server Action - getLandingPageImagesWithFallback] Returning fallbackUris due to error:', fallbackUris);
    return fallbackUris;
  }
}

// Server action for popular destinations
export async function getPopularDestinations(
  input: PopularDestinationsInput
): Promise<PopularDestinationsOutput> {
  console.log(`[Server Action - getPopularDestinations] Input:`, input);
  try {
    const result = await popularDestinationsFlow(input);
    console.log(`[Server Action - getPopularDestinations] AI Flow Result (destinations count): ${result.destinations.length}`);
    result.destinations.forEach(d => {
      console.log(`[Server Action - getPopularDestinations] Dest: ${d.name}, ImageURI provided: ${!!d.imageUri}, Coords: Lat ${d.latitude}, Lng ${d.longitude}`);
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

// Server Action for Explore Page "Ideas for You"
export async function getExploreIdeasAction(input: ExploreIdeasFromHistoryInput): Promise<ExploreIdeasOutput> {
  console.log(`[Server Action - getExploreIdeasAction] Input userId: ${input.userId}`);
  try {
    const result = await getExploreIdeasFromHistory(input);
    console.log(`[Server Action - getExploreIdeasAction] AI Flow Result (suggestions count): ${result.suggestions?.length || 0}`);
    return result;
  } catch (error: any) {
    console.error('[Server Action - getExploreIdeasAction] ERROR fetching explore ideas:', error.message, error.stack);
    // Ensure a specific error code/message that the client can check for more precise UI feedback
    return { 
      suggestions: [], 
      contextualNote: "Error GEIA1: The server action encountered an issue generating explore ideas. Please try again later." 
    };
  }
}

// Server action for AI Flight Map Deals
export async function getAiFlightMapDealsAction(
  input: AiFlightMapDealInput
): Promise<AiFlightMapDealOutput> {
  console.log(`[Server Action - getAiFlightMapDealsAction] Input:`, input);
  try {
    const result = await aiFlightMapDealsFlow(input);
    console.log(`[Server Action - getAiFlightMapDealsAction] AI Flow Result (suggestions count): ${result.suggestions.length}`);
    return result;
  } catch (error: any) {
    console.error('[Server Action - getAiFlightMapDealsAction] ERROR fetching flight map deals:', error.message, error.stack);
    return { 
        suggestions: [], 
        contextualNote: `Sorry, we encountered a server error while fetching flight deal ideas for ${input.targetDestinationCity} from ${input.originDescription}. Please try again.` 
    };
  }
}

// Commented out as it's replaced by getLandingPageImagesWithFallback and generateMultipleImagesFlow
/*
export async function getAiImageForFeatureServerAction(promptText: string): Promise<string | null> {
  console.log(`[Server Action - getAiImageForFeature] Received prompt: "${promptText}"`);
  'use server'; // This was misplaced; should be at top of file if this was the ONLY action.
  try {
    const result = await generateMultipleImagesFlow({ 
        prompts: [{ id: 'singleFeature', prompt: promptText, styleHint: 'featureCard' }]
    });
    if (result.results.length > 0 && result.results[0].imageUri) {
      return result.results[0].imageUri;
    }
    return null;
  } catch (error) {
    console.error(`[Server Action - getAiImageForFeature] Error generating image for prompt "${promptText}":`, error);
    return null;
  }
}
*/
