
'use server'; // This directive MUST be at the very top of the file.

import { firestore } from '@/lib/firebase';
import {
  generateMultipleImagesFlow,
  type MultipleImagesInput, // Ensure this is exported from the flow file
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
import { conceptualFlightSearchFlow } from '@/ai/flows/conceptual-flight-search-flow';
import type { ConceptualFlightSearchInput, ConceptualFlightSearchOutput } from '@/ai/types/conceptual-flight-search-types';
import { aiHotelSearchFlow } from '@/ai/flows/ai-hotel-search-flow';
import type { AiHotelSearchInput, AiHotelSearchOutput } from '@/ai/types/ai-hotel-search-types';


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
    if (!firestore) {
      console.error(`[DB Save Internal Error] Firestore instance is undefined. Cannot save image for ID ${id}.`);
      return;
    }
    const imageDocRef = doc(firestore, 'landingPageImages', id);
    await setDoc(imageDocRef, {
      imageUri: imageUri,
      promptUsed: promptText,
      styleHint: styleHint,
      lastUpdated: serverTimestamp(),
    }, { merge: true });
    console.log(`[DB Save Internal] Image for ID ${id} SAVED/UPDATED successfully in Firestore.`);
  } catch (error: any) {
    console.error(`[DB Save Internal Error] Failed to save image for ID ${id} to Firestore:`, error.message);
    console.error(error); // Log the full error object
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
  const aiGenerationQueue: Array<{ id: string; prompt: string; styleHint: 'hero' | 'featureCard' }> = [];
  const MAX_FIRESTORE_IN_QUERY = 30; 

  try {
    if (requestIds.length > 0 && firestore) {
      console.log(`[DB Check] Total IDs to check in Firestore: ${requestIds.length}`);
      for (let i = 0; i < requestIds.length; i += MAX_FIRESTORE_IN_QUERY) {
        const chunkOfIds = requestIds.slice(i, i + MAX_FIRESTORE_IN_QUERY);
        if (chunkOfIds.length === 0) {
          console.log("[DB Check] Empty ID chunk, skipping Firestore query for this batch.");
          continue;
        }
        console.log(`[DB Check] Querying Firestore for IDs: ${chunkOfIds.join(', ')} (Chunk ${Math.floor(i / MAX_FIRESTORE_IN_QUERY) + 1})`);
        try {
          const imageDocsQuery = query(collection(firestore, 'landingPageImages'), where(documentId(), 'in', chunkOfIds));
          const imageDocsSnap = await getDocs(imageDocsQuery);

          imageDocsSnap.forEach(docSnap => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (data.imageUri) {
                imageUris[docSnap.id] = data.imageUri;
                console.log(`[DB Check] Found existing image in Firestore for ID ${docSnap.id}. URI starts: ${data.imageUri.substring(0,50)}...`);
              } else {
                console.log(`[DB Check] Document for ID ${docSnap.id} found but no imageUri. Will attempt AI gen.`);
              }
            } else {
               console.log(`[DB Check] No document found in Firestore for ID ${docSnap.id}. Will attempt AI gen.`);
            }
          });
        } catch (dbError) {
          console.error(`[DB Check Error] Firestore query failed for chunk starting with ${chunkOfIds[0]}:`, dbError);
          // Continue to AI generation for this chunk's items
        }
      }
    } else if (!firestore) {
        console.warn("[DB Check] Firestore instance is undefined. Skipping DB check for all images.");
    } else {
      console.log("[DB Check] No request IDs provided, skipping Firestore query.");
    }

    requests.forEach(req => {
      if (imageUris[req.id] === null) { 
        console.log(`[Server Action] Image for ID ${req.id} (Prompt: "${req.promptText}") not in DB or missing URI, adding to AI queue.`);
        aiGenerationQueue.push({ id: req.id, prompt: req.promptText, styleHint: req.styleHint });
      }
    });

    console.log(`[Server Action] Found ${Object.values(imageUris).filter(uri => uri !== null).length} images in DB. Sending ${aiGenerationQueue.length} to AI for generation.`);

    if (aiGenerationQueue.length > 0) {
      try {
        const promptsForAi = aiGenerationQueue.map(item => ({ id: item.id, prompt: item.prompt, styleHint: item.styleHint }));
        console.log('[Server Action] Calling generateMultipleImagesFlow for prompts:', promptsForAi.map(p=>({id: p.id, prompt: p.prompt.substring(0,30)+'...'})));
        
        const aiResultsOutput = await generateMultipleImagesFlow({ prompts: promptsForAi });
        const aiResults = aiResultsOutput.results;
        console.log(`[Server Action] AI Results received. Count: ${aiResults.length}. Results:`, aiResults.map(r => ({id: r.id, hasUri: !!r.imageUri, error: r.error})));
        
        aiResults.forEach(aiResult => {
          const originalRequest = requests.find(r => r.id === aiResult.id);
          if (aiResult.imageUri) {
            imageUris[aiResult.id] = aiResult.imageUri; // Ensure this is updated for client response
            console.log(`[Server Action] Updated imageUris with AI result for ID ${aiResult.id}. URI starts with: ${aiResult.imageUri.substring(0,50)}...`);
            if (originalRequest) {
              // Asynchronous save - fire and forget
              saveImageUriToDbInternal({ 
                id: aiResult.id,
                imageUri: aiResult.imageUri,
                promptText: originalRequest.promptText,
                styleHint: originalRequest.styleHint,
              }).catch(dbSaveError => console.error(`[Server Action - Background Save Error] Firestore save failed for ${aiResult.id}:`, dbSaveError));
            }
          } else {
            console.warn(`[Server Action] AI generation failed or returned null URI for ID ${aiResult.id}. Error: ${aiResult.error || 'Unknown AI error'}`);
            // imageUris[aiResult.id] will remain null as initialized
          }
        });
      } catch (flowError: any) {
        console.error('[Server Action] CRITICAL ERROR calling generateMultipleImagesFlow:', flowError.message, flowError.stack);
        console.error(flowError); // Log the full error object
        // Ensure all items in this AI batch are marked as null if the whole flow fails
        aiGenerationQueue.forEach(req => {
            imageUris[req.id] = null;
        });
      }
    }
    
    console.log(`[Server Action - getLandingPageImagesWithFallback] RETURNING imageUris:`, Object.fromEntries(Object.entries(imageUris).map(([k, v]) => [k, v ? v.substring(0, 50) + '...' : null])));
    return imageUris;

  } catch (error: any) {
    console.error('[Server Action - getLandingPageImagesWithFallback] TOP LEVEL CRITICAL ERROR:', error.message, error.stack);
    console.error(error); // Log the full error object
    const fallbackUris: Record<string, string | null> = {};
    requests.forEach(req => fallbackUris[req.id] = null); // Ensure all requested IDs get a null entry
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
    if (result.destinations) {
      result.destinations.forEach(d => {
        console.log(`[Server Action - getPopularDestinations] Dest: ${d.name}, ImageURI provided: ${!!d.imageUri}, Coords: Lat ${d.latitudeString || d.latitude}, Lng ${d.longitudeString || d.longitude}`);
      });
    }
    return result;
  } catch (error: any) {
    console.error('[Server Action - getPopularDestinations] ERROR fetching popular destinations:', error.message);
    console.error(error);
    let note = "Sorry, we encountered an error while fetching destination ideas. Please try again later.";
    if (input.interest) {
        note = `Sorry, we encountered an error fetching ideas for '${input.interest}'. Please try again later.`;
    } else if (input.userLatitude) {
        note = "Sorry, we encountered an error fetching ideas near your location. Please try again later.";
    }
    return { destinations: [], contextualNote: note };
  }
}

export async function getExploreIdeasAction(input: ExploreIdeasFromHistoryInput): Promise<ExploreIdeasOutput> {
  console.log(`[Server Action - getExploreIdeasAction] Input userId: ${input.userId}`);
  try {
    const result = await getExploreIdeasFromHistory(input);
    console.log(`[Server Action - getExploreIdeasAction] AI Flow Result (suggestions count): ${result.suggestions?.length || 0}. ContextualNote: ${result.contextualNote}`);
    return result;
  } catch (error: any) {
    console.error('[Server Action - getExploreIdeasAction] ERROR fetching explore ideas:', error.message);
    console.error(error);
    return { 
      suggestions: [], 
      contextualNote: "Error GEIA1: The server action encountered an issue generating explore ideas. Please try again later." 
    };
  }
}

export async function getAiFlightMapDealsAction(
  input: AiFlightMapDealInput // Corrected type
): Promise<AiFlightMapDealOutput> {
  console.log(`[Server Action - getAiFlightMapDealsAction] Input:`, input);
  try {
    const result = await aiFlightMapDealsFlow(input);
    console.log(`[Server Action - getAiFlightMapDealsAction] AI Flow Result (suggestions count): ${result.suggestions.length}`);
    return result;
  } catch (error: any) {
    console.error('[Server Action - getAiFlightMapDealsAction] ERROR fetching flight map deals:', error.message);
     console.error(error);
    return { 
        suggestions: [], 
        contextualNote: `Sorry, we encountered a server error while fetching flight deal ideas for ${input.targetDestinationCity} from ${input.originDescription}. Please try again.` 
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
    console.error('[Server Action - getConceptualFlightsAction] ERROR fetching conceptual flights:', error.message);
    console.error(error);
    return {
      flights: [], // Return empty array for flights on error
      summaryMessage: "A server error occurred while Aura AI was searching for conceptual flight options. Please try again."
    };
  }
}

export async function getAiHotelSuggestionsAction(input: AiHotelSearchInput): Promise<AiHotelSearchOutput> {
  console.log('[Server Action - getAiHotelSuggestionsAction] Input:', input);
  try {
    const result = await aiHotelSearchFlow(input);
    console.log(`[Server Action - getAiHotelSuggestionsAction] AI Flow Result (hotels count): ${result.hotels?.length || 0}`);
    return result;
  } catch (error: any) {
    console.error('[Server Action - getAiHotelSuggestionsAction] ERROR fetching hotel suggestions:', error.message);
    console.error(error);
    return {
      hotels: [],
      searchSummary: `Sorry, we encountered a server error while searching for hotels in ${input.destination}. Please try again.`
    };
  }
}
