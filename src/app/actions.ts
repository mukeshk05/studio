
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
import { aiHotelSearchFlow } from '@/ai/flows/ai-hotel-search-flow'; // Ensure this is correctly pointing if it's still used, or remove if SerpAPI sim replaced it
import type { AiHotelSearchInput, AiHotelSearchOutput } from '@/ai/types/ai-hotel-search-types';
import { thingsToDoFlow } from '@/ai/flows/things-to-do-flow';
import type { ThingsToDoSearchInput, ThingsToDoOutput } from '@/ai/types/things-to-do-types';
import { getPriceAdvice, type PriceAdvisorInput, type PriceAdvisorOutput } from '@/ai/flows/price-advisor-flow';
import { conceptualDateGridFlow } from '@/ai/flows/conceptual-date-grid-flow';
import type { ConceptualDateGridInput, ConceptualDateGridOutput } from '@/ai/types/ai-conceptual-date-grid-types';
import { conceptualPriceGraphFlow } from '@/ai/flows/conceptual-price-graph-flow';
import type { ConceptualPriceGraphInput, ConceptualPriceGraphOutput } from '@/ai/types/ai-conceptual-price-graph-types';


export interface ImageRequest {
  id: string;
  promptText: string;
  styleHint: 'hero' | 'featureCard' | 'destination' | 'general' | 'activity' | 'hotel' | 'hotelRoom';
}

// Internal helper, not a server action itself if called without await by another server action
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
        console.log(`[DB Check] Querying Firestore for IDs chunk (length: ${chunkOfIds.length}): ${chunkOfIds.join(', ').substring(0, 100)}...`);
        try {
          const imageDocsQuery = query(collection(firestore, 'landingPageImages'), where(documentId(), 'in', chunkOfIds));
          const imageDocsSnap = await getDocs(imageDocsQuery);
          console.log(`[DB Check] Firestore query for chunk returned ${imageDocsSnap.docs.length} documents.`);
          imageDocsSnap.forEach(docSnap => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (data.imageUri) {
                imageUris[docSnap.id] = data.imageUri;
                console.log(`[DB Check] Found existing image for ID ${docSnap.id}. URI starts with: ${data.imageUri.substring(0,50)}...`);
              } else {
                console.log(`[DB Check] Doc for ID ${docSnap.id} found but no imageUri. Queuing for AI.`);
                const originalRequest = requests.find(r => r.id === docSnap.id);
                if (originalRequest && !aiGenerationQueue.find(q => q.id === docSnap.id)) {
                     aiGenerationQueue.push({ id: originalRequest.id, prompt: originalRequest.promptText, styleHint: originalRequest.styleHint });
                }
              }
            } else {
                 console.log(`[DB Check] Document for ID ${docSnap.id} does not exist (this can happen if ID format is wrong or doc truly missing).`);
            }
          });
        } catch (dbError: any) {
          console.error(`[DB Check Error] Firestore query failed for chunk. Error: ${dbError.message}`, dbError.stack);
          chunkOfIds.forEach(idInChunk => {
            if (imageUris[idInChunk] === null) {
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

    requests.forEach(req => {
      if (imageUris[req.id] === null && !aiGenerationQueue.find(q => q.id === req.id)) {
        console.log(`[Server Action] ID ${req.id} missed cache or DB read failed, adding to AI queue.`);
        aiGenerationQueue.push({ id: req.id, prompt: req.promptText, styleHint: req.styleHint });
      }
    });

    console.log(`[Server Action] Found ${Object.values(imageUris).filter(uri => uri !== null).length} images in DB. Sending ${aiGenerationQueue.length} to AI for generation.`);

    if (aiGenerationQueue.length > 0) {
      try {
        console.log(`[Server Action] Calling AI for ${aiGenerationQueue.length} images with prompts:`, aiGenerationQueue.map(p=>p.prompt));
        const aiResultsOutput: MultipleImagesOutput = await generateMultipleImagesFlow({ prompts: aiGenerationQueue });
        const aiResults = aiResultsOutput.results || [];
        console.log(`[Server Action] AI Results received. Count: ${aiResults.length}. Results:`, aiResults);
        
        aiResults.forEach(aiResult => {
          if (aiResult.imageUri) {
            imageUris[aiResult.id] = aiResult.imageUri;
            console.log(`[Server Action] Updated imageUris with AI result for ID ${aiResult.id}. URI starts with: ${aiResult.imageUri.substring(0,50)}...`);
            const originalRequest = requests.find(r => r.id === aiResult.id);
            if (originalRequest) {
              saveImageUriToDbInternal({ 
                id: aiResult.id,
                imageUri: aiResult.imageUri,
                promptText: originalRequest.promptText,
                styleHint: originalRequest.styleHint,
              }).catch(dbSaveError => console.error(`[Server Action - Background Save Error] Firestore save failed for ${aiResult.id}:`, dbSaveError));
            }
          } else {
            console.warn(`[Server Action] AI generation failed or returned null URI for ID ${aiResult.id}. Error: ${aiResult.error || 'Unknown AI error'}. imageUris[${aiResult.id}] remains null.`);
          }
        });
      } catch (flowError: any) {
        console.error('[Server Action] CRITICAL ERROR calling generateMultipleImagesFlow. Error: ', flowError.message, flowError.stack);
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
    requests.forEach(req => fallbackUris[req.id] = null);
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
    // console.log(`[Server Action - getPopularDestinations] AI Flow Result (destinations with images):`, result.destinations?.map(d => ({name: d.name, imageUriProvided: !!d.imageUri, coords: {lat:d.latitude, lng:d.longitude}})));
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
    console.error('[Server Action - getExploreIdeasAction] ERROR fetching explore ideas:', error.message, error.stack);
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
  console.log('[Server Action - getConceptualFlightsAction] Calling Conceptual Flight Search with input:', input);
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
  
  const mockHotels = [ // A more diverse set of mock hotels
      { id: 'hotel_nyc_grand', name: `The Grand Plaza - ${input.destination.split(',')[0]}`, priceMin: 250, priceMax: 450, rating: 4.7, description: "Iconic luxury hotel offering breathtaking city views, opulent suites, and world-class dining. Steps from major attractions.", amenities: ["Indoor Pool", "Full Spa", "Michelin Star Restaurant", "Concierge", "Fitness Center", "Valet Parking"], lat: 40.7580, lon: -73.9855, imageHint: "grand hotel lobby new york city elegant" },
      { id: 'hotel_bali_serene', name: `Serene Jungle Villa - ${input.destination.split(',')[0]}`, priceMin: 180, priceMax: 320, rating: 4.9, description: "Secluded villas nestled in lush jungle, featuring private pools, yoga pavilions, and organic cuisine. Perfect for a tranquil escape.", amenities: ["Private Pool", "Yoga Classes", "Organic Restaurant", "Spa Services", "Jungle Treks"], lat: -8.3405, lon: 115.0919, imageHint: "bali jungle villa private pool serene" },
      { id: 'hotel_rome_boutique', name: `Artisan Boutique Hotel - ${input.destination.split(',')[0]}`, priceMin: 150, priceMax: 280, rating: 4.5, description: "Charming hotel in a historic building, adorned with local art and offering uniquely decorated rooms. Known for its personalized service.", amenities: ["Art Gallery", "Courtyard Garden", "Complimentary Breakfast", "Wine Bar", "City Tours"], lat: 41.9028, lon: 12.4964, imageHint: "rome boutique hotel art cozy" },
      { id: 'hotel_tokyo_capsule', name: `Modern Capsule Pod - ${input.destination.split(',')[0]}`, priceMin: 40, priceMax: 80, rating: 4.2, description: "Futuristic and efficient capsule hotel providing all essentials for a comfortable stay. Great for solo travelers on a budget.", amenities: ["High-Speed WiFi", "Shared Lounge", "Secure Lockers", "24-Hour Reception", "Vending Machines"], lat: 35.6895, lon: 139.6917, imageHint: "tokyo capsule hotel futuristic clean" },
      { id: 'hotel_paris_chic', name: `Chic Design Loft - ${input.destination.split(',')[0]}`, priceMin: 200, priceMax: 350, rating: 4.6, description: "Stylish loft apartments with contemporary design, full kitchens, and stunning city views. Located in a trendy neighborhood.", amenities: ["Full Kitchen", "City Views", "Designer Furniture", "Weekly Housekeeping", "Nespresso Machine"], lat: 48.8566, lon: 2.3522, imageHint: "paris design loft modern bright" }
  ];

  // Select 3-4 random hotels from the mock list to simulate variety
  const shuffled = mockHotels.sort(() => 0.5 - Math.random());
  const selectedMockHotels = shuffled.slice(0, Math.floor(Math.random() * 2) + 3); // 3 to 4 hotels

  console.log(`[Server Action - getAiHotelSuggestionsAction] Using ${selectedMockHotels.length} mock hotels for destination: ${input.destination}`);

  const imagePromptsForHotels: ImagePromptItem[] = selectedMockHotels.map((hotel) => ({
    id: hotel.id, 
    prompt: hotel.imageHint || `attractive photo of ${hotel.name}, ${hotel.description.substring(0, 50)}`,
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
    }
  }

  const finalHotelSuggestions: AiHotelSuggestion[] = selectedMockHotels.map(hotel => ({
    name: hotel.name,
    conceptualPriceRange: `$${hotel.priceMin} - $${hotel.priceMax} / night`,
    rating: hotel.rating,
    description: hotel.description,
    amenities: hotel.amenities,
    imagePrompt: imagePromptsForHotels.find(p => p.id === hotel.id)?.prompt || `photo of ${hotel.name}`,
    imageUri: hotelImageUris[hotel.id] || `https://placehold.co/600x400.png?text=${encodeURIComponent(hotel.name.substring(0,15))}`,
    latitude: hotel.lat,
    longitude: hotel.lon,
  }));
  
  console.log(`[Server Action - getAiHotelSuggestionsAction] Returning ${finalHotelSuggestions.length} conceptual hotels.`);
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
    console.log('[Server Action - getPriceAdviceAction] AI Flow Result:', result);
    return result;
  } catch (error: any) {
    console.error('[Server Action - getPriceAdviceAction] ERROR fetching price advice:', error);
    return { advice: `Sorry, could not fetch AI price advice: ${error.message}` };
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
      datePricePoints: []
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
