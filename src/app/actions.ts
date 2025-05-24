
'use server'; 

import { firestore } from '@/lib/firebase';
import {
  generateMultipleImagesFlow,
  type MultipleImagesInput, 
  type ImagePromptItem, // Exported from generate-multiple-images-flow
  type ImageResultItem,  // Exported from generate-multiple-images-flow
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
import { conceptualFlightSearchFlow } from '@/ai/flows/conceptual-flight-search-flow';
import type { ConceptualFlightSearchInput, ConceptualFlightSearchOutput } from '@/ai/types/conceptual-flight-search-types';
import { aiHotelSearchFlow } from '@/ai/flows/ai-hotel-search-flow';
import type { AiHotelSearchInput, AiHotelSearchOutput, AiHotelSuggestion } from '@/ai/types/ai-hotel-search-types';
import { thingsToDoFlow } from '@/ai/flows/things-to-do-flow';
import type { ThingsToDoSearchInput, ThingsToDoOutput } from '@/ai/types/things-to-do-types';


export interface ImageRequest {
  id: string;
  promptText: string;
  styleHint: 'hero' | 'featureCard' | 'general' | 'destination' | 'hotel' | 'activity';
}

// Internal helper to save image URI to Firestore - NOT a Server Action itself
async function saveImageUriToDbInternal({
  id,
  imageUri,
  promptText,
  styleHint
}: {
  id: string;
  imageUri: string;
  promptText: string;
  styleHint: string;
}) {
  console.log(`[DB Save Internal] Attempting to save image to Firestore for ID: ${id}. URI starts with: ${imageUri ? imageUri.substring(0, 50) + '...' : 'null'}`);
  if (!firestore) {
    console.error(`[DB Save Internal Error] Firestore instance is undefined. Cannot save image for ID ${id}.`);
    return;
  }
  try {
    const imageDocRef = doc(firestore, 'landingPageImages', id);
    await setDoc(imageDocRef, {
      imageUri: imageUri,
      promptUsed: promptText,
      styleHint: styleHint,
      lastUpdated: serverTimestamp(),
    }, { merge: true });
    console.log(`[DB Save Internal] Image for ID ${id} SAVED/UPDATED successfully in Firestore.`);
  } catch (error: any) {
    console.error(`[DB Save Internal Error] Failed to save image for ID ${id} to Firestore. Error: ${error.message}`, error);
  }
}

export async function getLandingPageImagesWithFallback(
  requests: ImageRequest[]
): Promise<Record<string, string | null>> {
  console.log(`[Server Action - getLandingPageImagesWithFallback] Started. Total requests: ${requests.length}`);
  const imageUris: Record<string, string | null> = {};
  // Initialize all requested IDs with null
  requests.forEach(req => imageUris[req.id] = null);

  const requestIds = requests.map(req => req.id);
  const aiGenerationQueue: ImagePromptItem[] = []; // Corrected type to match generateMultipleImagesFlow input
  const MAX_FIRESTORE_IN_QUERY = 30; // Firestore 'in' query limit

  try {
    if (requestIds.length > 0 && firestore) {
      console.log(`[DB Check] Total IDs to check in Firestore: ${requestIds.length}`);
      for (let i = 0; i < requestIds.length; i += MAX_FIRESTORE_IN_QUERY) {
        const chunkOfIds = requestIds.slice(i, i + MAX_FIRESTORE_IN_QUERY);
        if (chunkOfIds.length === 0) {
          console.log("[DB Check] Empty ID chunk, skipping Firestore query for this batch.");
          continue;
        }
        console.log(`[DB Check] Querying Firestore for IDs chunk: ${chunkOfIds.join(', ')}`);
        try {
          const imageDocsQuery = query(collection(firestore, 'landingPageImages'), where(documentId(), 'in', chunkOfIds));
          const imageDocsSnap = await getDocs(imageDocsQuery);
          imageDocsSnap.forEach(docSnap => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (data.imageUri) {
                imageUris[docSnap.id] = data.imageUri;
                console.log(`[DB Check] Found existing image in Firestore for ID ${docSnap.id}. URI starts with: ${data.imageUri.substring(0, 50)}...`);
              } else {
                console.log(`[DB Check] Document for ID ${docSnap.id} found but no imageUri. Will queue for AI generation.`);
              }
            } else {
              console.log(`[DB Check] No document found for ID ${docSnap.id} in Firestore.`);
            }
          });
        } catch (dbError: any) {
          console.error(`[DB Check Error] Firestore query failed for chunk. Error: ${dbError.message}`, dbError);
          // Continue to next chunk or AI generation, errors here shouldn't stop the whole process
        }
      }
    } else if (!firestore) {
      console.warn("[DB Check] Firestore instance is undefined. Skipping DB check for all images.");
    }

    requests.forEach(req => {
      if (imageUris[req.id] === null) { // Only add to AI queue if not found in DB (or if DB value was explicitly null, though less likely)
        aiGenerationQueue.push({ id: req.id, prompt: req.promptText, styleHint: req.styleHint });
      }
    });

    console.log(`[Server Action] Found ${Object.values(imageUris).filter(uri => uri !== null).length} images in DB. Sending ${aiGenerationQueue.length} to AI for generation.`);

    if (aiGenerationQueue.length > 0) {
      try {
        console.log('[Server Action] Calling generateMultipleImagesFlow with prompts:', aiGenerationQueue.map(p=>p.prompt));
        const aiResultsOutput = await generateMultipleImagesFlow({ prompts: aiGenerationQueue });
        const aiResults = aiResultsOutput.results;
        console.log(`[Server Action] AI Results received. Count: ${aiResults.length}`, aiResults);
        
        aiResults.forEach(aiResult => {
          const originalRequest = requests.find(r => r.id === aiResult.id);
          if (aiResult.imageUri) {
            imageUris[aiResult.id] = aiResult.imageUri;
            console.log(`[Server Action] Updated imageUris with AI result for ID ${aiResult.id}. URI starts with: ${aiResult.imageUri.substring(0,50)}...`);
            if (originalRequest) {
              // Call save to DB asynchronously (don't await)
              saveImageUriToDbInternal({ 
                id: aiResult.id,
                imageUri: aiResult.imageUri,
                promptText: originalRequest.promptText, // Use original promptText from request
                styleHint: originalRequest.styleHint,   // Use original styleHint from request
              }).catch(dbSaveError => console.error(`[Server Action - Background Save Error] Firestore save failed for ${aiResult.id}:`, dbSaveError));
            }
          } else {
            console.warn(`[Server Action] AI generation failed or returned null URI for ID ${aiResult.id}. Error: ${aiResult.error || 'Unknown AI error'}. imageUris[${aiResult.id}] remains null.`);
          }
        });
      } catch (flowError: any) {
        console.error('[Server Action] CRITICAL ERROR calling generateMultipleImagesFlow. Error: ', flowError.message, flowError.stack, flowError);
        // Ensure items queued for AI that failed remain null
        aiGenerationQueue.forEach(req => { 
          if (imageUris[req.id] === undefined) imageUris[req.id] = null; 
        });
      }
    }
    console.log(`[Server Action - getLandingPageImagesWithFallback] RETURNING imageUris object:`, JSON.stringify(Object.fromEntries(Object.entries(imageUris).map(([k, v]) => [k, v ? v.substring(0, 30) + '...' : null])), null, 2));
    return imageUris;
  } catch (error: any) {
    console.error('[Server Action - getLandingPageImagesWithFallback] TOP LEVEL CRITICAL ERROR:', error.message, error.stack, error);
    // Fallback: return an object with nulls for all requested IDs
    const fallbackUris: Record<string, string | null> = {};
    requests.forEach(req => fallbackUris[req.id] = null);
    console.error('[Server Action - getLandingPageImagesWithFallback] Returning fallbackUris due to top-level error:', fallbackUris);
    return fallbackUris;
  }
}


export async function getPopularDestinations(
  input: PopularDestinationsInput
): Promise<PopularDestinationsOutput> {
  console.log(`[Server Action - getPopularDestinations] Input:`, input);
  try {
    const result = await popularDestinationsFlow(input);
    console.log(`[Server Action - getPopularDestinations] AI Flow Result (destinations count): ${result.destinations?.length || 0}. Contextual Note: ${result.contextualNote}`);
    console.log(`[Server Action - getPopularDestinations] AI Flow Result (destinations with images):`, result.destinations?.map(d => ({name: d.name, imageUriProvided: !!d.imageUri, coords: {lat: d.latitude, lng: d.longitude}})));
    return result;
  } catch (error: any) {
    console.error('[Server Action - getPopularDestinations] ERROR fetching popular destinations:', error.message, error.stack, error);
    return { destinations: [], contextualNote: `Sorry, we encountered an error: ${error.message}` };
  }
}

export async function getExploreIdeasAction(input: ExploreIdeasFromHistoryInput): Promise<ExploreIdeasOutput> {
  console.log(`[Server Action - getExploreIdeasAction] Input userId: ${input.userId}`);
  try {
    const result = await getExploreIdeasFromHistory(input);
    console.log(`[Server Action - getExploreIdeasAction] AI Flow Result (suggestions count): ${result.suggestions?.length || 0}. ContextualNote: ${result.contextualNote}`);
    return result;
  } catch (error: any) {
    console.error('[Server Action - getExploreIdeasAction] ERROR fetching explore ideas:', error.message, error.stack, error);
    return { 
      suggestions: [], 
      contextualNote: `Error GEIA1: The server action encountered an issue generating explore ideas. Please try again later.` 
    };
  }
}

export async function getAiFlightMapDealsAction(
  input: AiFlightMapDealInput 
): Promise<AiFlightMapDealOutput> {
  console.log(`[Server Action - getAiFlightMapDealsAction] Input:`, input);
  try {
    const result = await aiFlightMapDealsFlow(input);
    console.log(`[Server Action - getAiFlightMapDealsAction] AI Flow Result (suggestions count): ${result.suggestions.length}`);
    return result;
  } catch (error: any) {
    console.error('[Server Action - getAiFlightMapDealsAction] ERROR fetching flight map deals:', error.message, error.stack, error);
    return { 
        suggestions: [], 
        contextualNote: `Sorry, we encountered a server error: ${error.message}` 
    };
  }
}

export async function getConceptualFlightsAction(input: ConceptualFlightSearchInput): Promise<ConceptualFlightSearchOutput> {
  console.log('[Server Action - getConceptualFlightsAction] Input:', input);
  try {
    const result = await conceptualFlightSearchFlow(input);
    console.log(`[Server Action - getConceptualFlightsAction] AI Flow Result (flights count): ${result.flights?.length || 0}`);
    return result;
  } catch (error: any) {
    console.error('[Server Action - getConceptualFlightsAction] ERROR fetching conceptual flights:', error.message, error.stack, error);
    return {
      flights: [],
      summaryMessage: `A server error occurred: ${error.message}`
    };
  }
}

export async function getAiHotelSuggestionsAction(input: AiHotelSearchInput): Promise<AiHotelSearchOutput> {
  console.log('[Server Action - getAiHotelSuggestionsAction] Input:', JSON.stringify(input, null, 2));
  try {
    const result = await aiHotelSearchFlow(input);
    console.log(`[Server Action - getAiHotelSuggestionsAction] AI Flow Result (hotels count): ${result.hotels?.length || 0}. Search Summary: ${result.searchSummary}`);
    result.hotels.forEach((hotel, index) => {
      console.log(`[Server Action - getAiHotelSuggestionsAction] Hotel ${index}: ${hotel.name}, ImageURI: ${hotel.imageUri ? 'Present' : 'Missing'}, Lat: ${hotel.latitude}, Lng: ${hotel.longitude}`);
    });
    return result;
  } catch (error: any) {
    console.error('[Server Action - getAiHotelSuggestionsAction] ERROR fetching/processing hotel suggestions:', error.message, error.stack, error);
    return {
      hotels: [],
      searchSummary: `Sorry, we encountered a server error while searching for hotels in ${input.destination}: ${error.message}`
    };
  }
}


export async function getThingsToDoAction(input: ThingsToDoSearchInput): Promise<ThingsToDoOutput> {
  console.log('[Server Action - getThingsToDoAction] Input:', input);
  try {
    const result = await thingsToDoFlow(input);
    console.log(`[Server Action - getThingsToDoAction] AI Flow Result (activities count): ${result.activities?.length || 0}`);
    return result;
  } catch (error: any) {
    console.error('[Server Action - getThingsToDoAction] ERROR fetching things to do:', error.message, error.stack, error);
    return {
      activities: [],
      searchSummary: `Sorry, an error occurred while finding things to do in ${input.location}: ${error.message}`
    };
  }
}

// Original Server Action for a single feature image (can be deprecated or kept for other uses)
export async function getAiImageForFeatureServerAction(promptText: string): Promise<string | null> {
  console.log(`[Server Action - getAiImageForFeature] Received prompt: "${promptText}"`);
  try {
    // Assuming generateMultipleImagesFlow can handle a single item array for consistency,
    // or you can call a specific single image generation flow if you create one.
    const result = await generateMultipleImagesFlow({ prompts: [{ id: 'single-feature', prompt: promptText, styleHint: 'featureCard' }] });
    if (result.results && result.results.length > 0) {
      return result.results[0].imageUri;
    }
    return null;
  } catch (error: any) {
    console.error(`[Server Action - getAiImageForFeature] Error generating image for prompt "${promptText}":`, error.message, error.stack, error);
    return null;
  }
}
