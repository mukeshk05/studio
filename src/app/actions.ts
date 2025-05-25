'use server';

import { firestore } from '@/lib/firebase';
import {
  generateMultipleImagesFlow,
  type MultipleImagesInput,
  type ImagePromptItem,
  type ImageResultItem,
  type MultipleImagesOutput,
} from '@/ai/flows/generate-multiple-images-flow';
import { collection, doc, getDocs, query, where, writeBatch, documentId, setDoc, serverTimestamp, getDoc, Timestamp, addDoc, orderBy, limit, updateDoc, deleteDoc } from 'firebase/firestore';
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
import { getAiHotelSuggestionsAction as DEPRECATED_getAiHotelSuggestionsAction } from './actions'; // This seems like a self-import, likely an error from previous steps. Removing.
import type { AiHotelSearchInput, AiHotelSearchOutput } from '@/ai/types/ai-hotel-search-types';
import { thingsToDoFlow } from '@/ai/flows/things-to-do-flow';
import type { ThingsToDoSearchInput, ThingsToDoOutput } from '@/ai/types/things-to-do-types';
import { getPriceAdvice, PriceAdvisorInput } from '@/ai/flows/price-advisor-flow';
import type { PriceAdvisorOutput } from '@/ai/flows/price-advisor-flow';
import { conceptualDateGridFlow } from '@/ai/flows/conceptual-date-grid-flow';
import type { ConceptualDateGridInput, ConceptualDateGridOutput } from '@/ai/types/ai-conceptual-date-grid-types';
import { conceptualPriceGraphFlow } from '@/ai/flows/conceptual-price-graph-flow';
import type { ConceptualPriceGraphInput, ConceptualPriceGraphOutput } from '@/ai/types/ai-conceptual-price-graph-types';


export interface ImageRequest {
  id: string;
  promptText: string;
  styleHint: 'hero' | 'featureCard' | 'destination' | 'general' | 'activity' | 'hotel' | 'hotelRoom';
}

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
    console.error(`[DB Save Internal Error] Failed to save image for ID ${id} to Firestore. Error: ${error.message}`, error.stack);
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
    if (requestIds.length > 0 && firestore) {
      console.log(`[DB Check] Total IDs to check in Firestore: ${requestIds.length}`);
      for (let i = 0; i < requestIds.length; i += MAX_FIRESTORE_IN_QUERY) {
        const chunkOfIds = requestIds.slice(i, i + MAX_FIRESTORE_IN_QUERY);
        if (chunkOfIds.length === 0) {
          console.log("[DB Check] Empty ID chunk, skipping Firestore query for this batch.");
          continue;
        }
        console.log(`[DB Check] Querying Firestore for IDs chunk (length: ${chunkOfIds.length}): ${chunkOfIds.join(', ').substring(0, 100)}...`);
        try {
          const imageDocsQuery = query(collection(firestore, 'landingPageImages'), where(documentId(), 'in', chunkOfIds));
          const imageDocsSnap = await getDocs(imageDocsQuery);
          imageDocsSnap.forEach(docSnap => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (data.imageUri) {
                imageUris[docSnap.id] = data.imageUri;
                console.log(`[DB Check] Found existing image for ID ${docSnap.id}.`);
              } else {
                console.log(`[DB Check] Doc for ID ${docSnap.id} found but no imageUri. Queuing for AI.`);
                const originalRequest = requests.find(r => r.id === docSnap.id);
                if (originalRequest) aiGenerationQueue.push({ id: originalRequest.id, prompt: originalRequest.promptText, styleHint: originalRequest.styleHint });
              }
            }
          });
        } catch (dbError: any) {
          console.error(`[DB Check Error] Firestore query failed for chunk. Error: ${dbError.message}`, dbError.stack);
          // If DB query fails for a chunk, assume all those IDs need AI generation if not already found
          chunkOfIds.forEach(idInChunk => {
            if (imageUris[idInChunk] === null) { // only if not already resolved from a previous successful chunk
              const originalRequest = requests.find(r => r.id === idInChunk);
              if (originalRequest && !aiGenerationQueue.find(q => q.id === idInChunk)) {
                aiGenerationQueue.push({ id: originalRequest.id, prompt: originalRequest.promptText, styleHint: originalRequest.styleHint });
              }
            }
          });
        }
      }
    } else if (!firestore) {
      console.warn("[DB Check] Firestore instance is undefined. Queuing all images for AI generation.");
      requests.forEach(req => aiGenerationQueue.push({ id: req.id, prompt: req.promptText, styleHint: req.styleHint }));
    }

    // Ensure all requests not found in DB are added to the AI queue
    requests.forEach(req => {
      if (imageUris[req.id] === null && !aiGenerationQueue.find(q => q.id === req.id)) {
        console.log(`[Server Action] ID ${req.id} missed cache or DB read failed, adding to AI queue.`);
        aiGenerationQueue.push({ id: req.id, prompt: req.promptText, styleHint: req.styleHint });
      }
    });

    console.log(`[Server Action] Found ${Object.values(imageUris).filter(uri => uri !== null).length} images in DB. Sending ${aiGenerationQueue.length} to AI for generation.`);

    if (aiGenerationQueue.length > 0) {
      try {
        const aiResultsOutput: MultipleImagesOutput = await generateMultipleImagesFlow({ prompts: aiGenerationQueue });
        const aiResults = aiResultsOutput.results || [];
        console.log(`[Server Action] AI Results received. Count: ${aiResults.length}`);
        
        aiResults.forEach(aiResult => {
          if (aiResult.imageUri) {
            imageUris[aiResult.id] = aiResult.imageUri;
            console.log(`[Server Action] Updated imageUris with AI result for ID ${aiResult.id}. URI starts with: ${aiResult.imageUri.substring(0,50)}...`);
            const originalRequest = requests.find(r => r.id === aiResult.id);
            if (originalRequest) {
              // Call to save, but don't await it to prevent blocking client response
              saveImageUriToDbInternal({ 
                id: aiResult.id,
                imageUri: aiResult.imageUri,
                promptText: originalRequest.promptText,
                styleHint: originalRequest.styleHint,
              }).catch(dbSaveError => console.error(`[Server Action - Background Save Error] Firestore save failed for ${aiResult.id}:`, dbSaveError));
            }
          } else {
            console.warn(`[Server Action] AI generation failed or returned null URI for ID ${aiResult.id}. Error: ${aiResult.error || 'Unknown AI error'}. imageUris[${aiResult.id}] remains null.`);
            // imageUris[aiResult.id] is already null by initialization
          }
        });
      } catch (flowError: any) {
        console.error('[Server Action] CRITICAL ERROR calling generateMultipleImagesFlow. Error: ', flowError.message, flowError.stack);
        // Ensure all items queued for AI are marked as null if the whole flow fails
        aiGenerationQueue.forEach(req => { 
          if (imageUris[req.id] === undefined || imageUris[req.id] === null) imageUris[req.id] = null; 
        });
      }
    }
    console.log(`[Server Action - getLandingPageImagesWithFallback] RETURNING imageUris:`, imageUris);
    return imageUris;

  } catch (topLevelError: any) {
    console.error('[Server Action - getLandingPageImagesWithFallback] TOP LEVEL CRITICAL ERROR:', topLevelError.message, topLevelError.stack);
    const fallbackUris: Record<string, string | null> = {};
    requests.forEach(req => fallbackUris[req.id] = null); // Return null for all on critical failure
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
    console.log(`[Server Action - getPopularDestinations] AI Flow Result (destinations with images):`, result.destinations?.map(d => ({name: d.name, imageUriProvided: !!d.imageUri, coords: {lat:d.latitude, lng:d.longitude}})));
    return result;
  } catch (error: any) {
    console.error('[Server Action - getPopularDestinations] ERROR fetching popular destinations:', error);
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
    console.error('[Server Action - getExploreIdeasAction] ERROR fetching explore ideas:', error);
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
    console.error('[Server Action - getAiFlightMapDealsAction] ERROR fetching flight map deals:', error);
    return { 
        suggestions: [], 
        contextualNote: `Sorry, we encountered a server error: ${error.message}` 
    };
  }
}

export async function getConceptualFlightsAction(input: ConceptualFlightSearchInput): Promise<ConceptualFlightSearchOutput> {
  console.log('[Server Action - getConceptualFlightsAction] Simulating Conceptual Flight Search with input:', input);
  try {
    const result = await conceptualFlightSearchFlow(input);
    console.log(`[Server Action - getConceptualFlightsAction] Returning ${result.flights.length} conceptual flights.`);
    return result;
  } catch (error: any) {
    console.error('[Server Action - getConceptualFlightsAction] Error calling conceptualFlightSearchFlow:', error);
    return {
      flights: [],
      summaryMessage: `Aura AI encountered an error trying to generate conceptual flight ideas: ${error.message}. Please try again.`
    };
  }
}


export async function getAiHotelSuggestionsAction(input: AiHotelSearchInput): Promise<AiHotelSearchOutput> {
  console.log('[Server Action - getAiHotelSuggestionsAction] Simulating API hotel data fetch & AI image generation. Input:', JSON.stringify(input, null, 2));
  
  // Simulate a list of hotels that might come from SerpApi or similar
  // For a real integration, you'd fetch this data from SerpApi here using your API key
  const mockApiHotelsData = [
    { id: 'hotel1', name: `The Grand City Central - ${input.destination.split(',')[0]}`, price: `${Math.floor(Math.random() * 100) + 180}`, rating: (Math.random() * 1.2 + 3.8).toFixed(1), description: "Luxurious hotel in the heart of the city, offering stunning views and premium amenities. Perfect for both business and leisure travelers seeking comfort and convenience.", amenities: ["Pool", "Spa", "Fitness Center", "Restaurant", "Free WiFi", "Valet Parking"], latitude: (Math.random() * 0.2 - 0.1 + 40.7128).toFixed(4) , longitude: (Math.random() * 0.2 - 0.1 + -74.0060).toFixed(4) },
    { id: 'hotel2', name: `Riverside Boutique Hotel - ${input.destination.split(',')[0]}`, price: `${Math.floor(Math.random() * 80) + 120}`, rating: (Math.random() * 1.0 + 4.0).toFixed(1), description: "Charming boutique hotel with personalized service, located by the scenic riverfront. Ideal for a romantic getaway or a peaceful retreat.", amenities: ["Free WiFi", "Breakfast Included", "Garden Terrace", "Bike Rentals"], latitude: (Math.random() * 0.2 - 0.1 + 34.0522).toFixed(4) , longitude: (Math.random() * 0.2 - 0.1 + -118.2437).toFixed(4) },
    { id: 'hotel3', name: `Modern Tech Hub Suites - ${input.destination.split(',')[0]}`, price: `${Math.floor(Math.random() * 70) + 150}`, rating: (Math.random() * 1.0 + 3.9).toFixed(1), description: "Sleek, contemporary suites equipped with the latest technology, catering to the modern traveler. Close to business districts and transport links.", amenities: ["Gym", "Business Center", "High-speed WiFi", "Kitchenette", "Rooftop Lounge"], latitude: (Math.random() * 0.2 - 0.1 + 51.5074).toFixed(4) , longitude: (Math.random() * 0.2 - 0.1 + -0.1278).toFixed(4) },
    { id: 'hotel4', name: `Budget Traveler's Rest Stop - ${input.destination.split(',')[0]}`, price: `${Math.floor(Math.random() * 40) + 70}`, rating: (Math.random() * 0.8 + 3.5).toFixed(1), description: "Clean, comfortable, and affordable accommodation for budget-conscious travelers. Offers essential amenities and a friendly atmosphere.", amenities: ["Shared Kitchen", "Lockers", "Free WiFi", "Laundry Facilities"], latitude: (Math.random() * 0.2 - 0.1 + 35.6895).toFixed(4) , longitude: (Math.random() * 0.2 - 0.1 + 139.6917).toFixed(4) },
  ].slice(0, Math.floor(Math.random() * 2) + 3); // 3 to 4 mock hotels

  console.log(`[Server Action - getAiHotelSuggestionsAction] Using ${mockApiHotelsData.length} mock hotels for destination: ${input.destination}`);

  const imagePromptsForHotels: ImagePromptItem[] = mockApiHotelsData.map((hotel, index) => ({
    id: hotel.id, // Use hotel ID for mapping image results
    prompt: `attractive photo of ${hotel.name}, ${hotel.description.substring(0, 70)}, exterior or lobby view`,
    styleHint: 'hotel',
  }));

  let hotelImageUris: Record<string, string | null> = {};
  if (imagePromptsForHotels.length > 0) {
    try {
      console.log(`[Server Action - getAiHotelSuggestionsAction] Generating ${imagePromptsForHotels.length} hotel images with AI...`);
      const imageResults = await generateMultipleImagesFlow({ prompts: imagePromptsForHotels });
      imageResults.results.forEach(res => {
        hotelImageUris[res.id] = res.imageUri;
      });
      console.log("[Server Action - getAiHotelSuggestionsAction] Hotel images generated/fetched.");
    } catch (imgError: any) {
      console.error("[Server Action - getAiHotelSuggestionsAction] Error generating hotel images:", imgError.message);
      // Continue without AI images if generation fails
    }
  }

  const finalHotelSuggestions: AiHotelSuggestion[] = mockApiHotelsData.map(hotel => ({
    name: hotel.name,
    conceptualPriceRange: `$${hotel.price} / night`,
    rating: parseFloat(hotel.rating || "4.0"),
    description: hotel.description,
    amenities: hotel.amenities,
    imagePrompt: imagePromptsForHotels.find(p => p.id === hotel.id)?.prompt || `photo of ${hotel.name}`,
    imageUri: hotelImageUris[hotel.id] || `https://placehold.co/600x400.png?text=${encodeURIComponent(hotel.name.substring(0,15))}`,
    latitude: hotel.latitude ? parseFloat(hotel.latitude) : undefined,
    longitude: hotel.longitude ? parseFloat(hotel.longitude) : undefined,
  }));
  
  console.log(`[Server Action - getAiHotelSuggestionsAction] Returning ${finalHotelSuggestions.length} conceptual hotels with AI images.`);
  return {
    hotels: finalHotelSuggestions,
    searchSummary: `Aura AI found ${finalHotelSuggestions.length} conceptual hotel ideas for ${input.destination}. These are simulated API results combined with AI-generated images.`
  };
}

export async function getThingsToDoAction(input: ThingsToDoSearchInput): Promise<ThingsToDoOutput> {
  console.log('[Server Action - getThingsToDoAction] Input:', input);
  try {
    const result = await thingsToDoFlow(input);
    console.log(`[Server Action - getThingsToDoAction] AI Flow Result (activities count): ${result.activities?.length || 0}`);
    return result;
  } catch (error: any) {
    console.error('[Server Action - getThingsToDoAction] ERROR fetching things to do:', error);
    return {
      activities: [],
      searchSummary: `Sorry, an error occurred while finding things to do in ${input.location}: ${error.message}`
    };
  }
}

export async function getPriceAdviceAction(input: PriceAdvisorInput): Promise<PriceAdvisorOutput> {
  console.log('[Server Action - getPriceAdviceAction] Input:', input);
  try {
    const result = await getPriceAdvice(input);
    return result;
  } catch (error: any) {
    console.error('[Server Action - getPriceAdviceAction] ERROR fetching price advice:', error);
    return { advice: "Sorry, could not fetch AI price advice at this moment." };
  }
}

export async function getConceptualDateGridAction(input: ConceptualDateGridInput): Promise<ConceptualDateGridOutput> {
  console.log('[Server Action - getConceptualDateGridAction] Input:', input);
  try {
    const result = await conceptualDateGridFlow(input);
    return result;
  } catch (error: any) {
    console.error('[Server Action - getConceptualDateGridAction] ERROR fetching conceptual date grid:', error);
    return { 
      gridSummary: `Error fetching date insights: ${error.message}`,
      datePricePoints: [] // Ensure it's datePricePoints, not exampleDeals
    };
  }
}

export async function getConceptualPriceGraphAction(input: ConceptualPriceGraphInput): Promise<ConceptualPriceGraphOutput> {
  console.log('[Server Action - getConceptualPriceGraphAction] Input:', input);
  try {
    const result = await conceptualPriceGraphFlow(input);
    return result;
  } catch (error: any) {
    console.error('[Server Action - getConceptualPriceGraphAction] ERROR fetching conceptual price graph:', error);
    return { 
      trendDescription: `Error fetching price trend insights: ${error.message}`,
      conceptualDataPoints: []
    };
  }
}