
'use server'; 

import { firestore } from '@/lib/firebase';
import {
  generateMultipleImagesFlow,
  type MultipleImagesInput, 
  type ImageResultItem, 
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
// import { aiHotelSearchFlow } from '@/ai/flows/ai-hotel-search-flow'; // Keep this commented out for now as it's replaced conceptually
import type { AiHotelSearchInput, AiHotelSearchOutput, AiHotelSuggestion } from '@/ai/types/ai-hotel-search-types';
import { thingsToDoFlow } from '@/ai/flows/things-to-do-flow';
import type { ThingsToDoSearchInput, ThingsToDoOutput } from '@/ai/types/things-to-do-types';


export interface ImageRequest {
  id: string;
  promptText: string;
  styleHint: 'hero' | 'featureCard' | 'general' | 'activity';
}

// Internal helper to save image URI to Firestore
async function saveImageUriToDbInternal({
  id,
  imageUri,
  promptText,
  styleHint
}: {
  id: string;
  imageUri: string;
  promptText: string;
  styleHint: string; // string is fine here as it's just for storage
}) {
  try {
    console.log(`[DB Save Internal] Attempting to save image to Firestore for ID: ${id}. URI starts with: ${imageUri ? imageUri.substring(0, 50) + '...' : 'null'}`);
    if (!firestore) {
      console.error(`[DB Save Internal Error] Firestore instance is undefined. Cannot save image for ID ${id}.`);
      return;
    }
    const imageDocRef = doc(firestore, 'landingPageImages', id); // Using a generic collection name for now
    await setDoc(imageDocRef, {
      imageUri: imageUri,
      promptUsed: promptText,
      styleHint: styleHint,
      lastUpdated: serverTimestamp(),
    }, { merge: true });
    console.log(`[DB Save Internal] Image for ID ${id} SAVED/UPDATED successfully in Firestore.`);
  } catch (error: any) {
    console.error(`[DB Save Internal Error] Failed to save image for ID ${id} to Firestore:`, error.message, error.stack, error);
  }
}

export async function getLandingPageImagesWithFallback(
  requests: ImageRequest[]
): Promise<Record<string, string | null>> {
  console.log(`[Server Action - getLandingPageImagesWithFallback] Started. Total requests: ${requests.length}`);
  const imageUris: Record<string, string | null> = {};
  requests.forEach(req => imageUris[req.id] = null); // Initialize all with null

  const requestIds = requests.map(req => req.id);
  const aiGenerationQueue: Array<ImageRequest> = [];
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
                console.log(`[DB Check] Found existing image in Firestore for ID ${docSnap.id}.`);
              } else {
                console.log(`[DB Check] Document for ID ${docSnap.id} found but no imageUri. Will attempt AI gen.`);
              }
            }
          });
        } catch (dbError: any) {
          console.error(`[DB Check Error] Firestore query failed for chunk ${chunkOfIds.join(',')}:`, dbError.message, dbError.stack, dbError);
        }
      }
    } else if (!firestore) {
      console.warn("[DB Check] Firestore instance is undefined. Skipping DB check for all images.");
    }

    requests.forEach(req => {
      if (imageUris[req.id] === null) {
        aiGenerationQueue.push(req);
      }
    });

    console.log(`[Server Action] Found ${Object.values(imageUris).filter(uri => uri !== null).length} images in DB. Sending ${aiGenerationQueue.length} to AI.`);

    if (aiGenerationQueue.length > 0) {
      try {
        const promptsForAi = aiGenerationQueue.map(item => ({ id: item.id, prompt: item.promptText, styleHint: item.styleHint }));
        const aiResultsOutput = await generateMultipleImagesFlow({ prompts: promptsForAi });
        const aiResults = aiResultsOutput.results;
        console.log(`[Server Action] AI Results received. Count: ${aiResults.length}`);
        
        aiResults.forEach(aiResult => {
          const originalRequest = requests.find(r => r.id === aiResult.id);
          if (aiResult.imageUri) {
            imageUris[aiResult.id] = aiResult.imageUri;
            console.log(`[Server Action] Updated imageUris with AI result for ID ${aiResult.id}.`);
            if (originalRequest) {
              saveImageUriToDbInternal({ 
                id: aiResult.id,
                imageUri: aiResult.imageUri,
                promptText: originalRequest.promptText,
                styleHint: originalRequest.styleHint,
              }).catch(dbSaveError => console.error(`[Server Action - Background Save Error] Firestore save failed for ${aiResult.id}:`, dbSaveError));
            }
          } else {
            console.warn(`[Server Action] AI generation failed or returned null URI for ID ${aiResult.id}. Error: ${aiResult.error || 'Unknown AI error'}`);
          }
        });
      } catch (flowError: any) {
        console.error('[Server Action] CRITICAL ERROR calling generateMultipleImagesFlow:', flowError.message, flowError.stack, flowError);
        aiGenerationQueue.forEach(req => { imageUris[req.id] = null; });
      }
    }
    console.log(`[Server Action - getLandingPageImagesWithFallback] RETURNING imageUris object (values might be URI snippets or null):`, 
      Object.fromEntries(Object.entries(imageUris).map(([k, v]) => [k, v ? v.substring(0, 50) + '...' : null]))
    );
    return imageUris;
  } catch (error: any) {
    console.error('[Server Action - getLandingPageImagesWithFallback] TOP LEVEL CRITICAL ERROR:', error.message, error.stack, error);
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
      contextualNote: `Error GEIA1: The server action encountered an issue generating explore ideas: ${error.message}` 
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

// Updated getAiHotelSuggestionsAction to simulate SerpApi and use generateMultipleImagesFlow for images
export async function getAiHotelSuggestionsAction(input: AiHotelSearchInput): Promise<AiHotelSearchOutput> {
  console.log('[Server Action - getAiHotelSuggestionsAction] Input:', input);
  try {
    // --- SIMULATED SERPAPI / EXTERNAL API CALL ---
    // In a real scenario, you'd call SerpApi here with input.destination, input.checkInDate etc.
    // const serpApiKey = process.env.SERPAPI_API_KEY;
    // For now, using mock data.
    const mockSerpApiHotels = [
      { name: "The Grand Plaza", price: "$250 - $350", rating: 4.5, description: "A luxurious hotel in the heart of the city, known for its stunning views and impeccable service.", amenities: ["Pool", "Spa", "Gym", "Restaurant", "Free WiFi"], latitude: input.destination.includes("Paris") ? 48.8584 : (input.destination.includes("Tokyo") ? 35.6762 : 40.7128), longitude: input.destination.includes("Paris") ? 2.2945 : (input.destination.includes("Tokyo") ? 139.6503 : -74.0060), imageDescriptor: "grand hotel plaza facade" },
      { name: "Seaside Boutique Inn", price: "$180 - $280", rating: 4.2, description: "Charming inn with ocean views and a cozy atmosphere, perfect for a romantic getaway.", amenities: ["Beach Access", "Restaurant", "Free WiFi", "Balcony Rooms"], latitude: input.destination.includes("Paris") ? 48.8600 : (input.destination.includes("Tokyo") ? 35.6780 : 34.0522), longitude: input.destination.includes("Paris") ? 2.3000 : (input.destination.includes("Tokyo") ? 139.6700 : -118.2437), imageDescriptor: "boutique inn seaside balcony" },
      { name: "Urban Comfort Suites", price: "$120 - $200", rating: 3.9, description: "Modern suites offering great value and convenience for city explorers and business travelers.", amenities: ["Kitchenette", "Free WiFi", "Parking", "Business Center"], latitude: input.destination.includes("Paris") ? 48.8550 : (input.destination.includes("Tokyo") ? 35.6730 : 40.7580), longitude: input.destination.includes("Paris") ? 2.2900 : (input.destination.includes("Tokyo") ? 139.6900 : -73.9855), imageDescriptor: "modern urban hotel suites exterior" },
    ];
    console.log('[Server Action - getAiHotelSuggestionsAction] Using mock hotel data:', mockSerpApiHotels.length, "hotels.");

    const imagePromptsForHotels: ImageRequest[] = mockSerpApiHotels.map((hotel, index) => ({
      id: `hotel-${input.destination.replace(/\s+/g, '-')}-${index}`, // Unique ID for image mapping
      promptText: `High-quality, attractive photograph of a hotel described as: "${hotel.name}, ${hotel.description.substring(0, 50)}...". Focus: ${hotel.imageDescriptor}. Style: inviting, well-lit. Aspect ratio 16:9.`,
      styleHint: 'general', // Or a new 'hotel' styleHint if you define one
    }));

    let hotelImageResults: Record<string, string | null> = {};
    if (imagePromptsForHotels.length > 0) {
        const aiImageOutput = await generateMultipleImagesFlow({ prompts: imagePromptsForHotels });
        aiImageOutput.results.forEach(res => {
            hotelImageResults[res.id] = res.imageUri;
        });
    }
    console.log('[Server Action - getAiHotelSuggestionsAction] AI Image generation results for hotels:', hotelImageResults);
    
    const finalHotelSuggestions: AiHotelSuggestion[] = mockSerpApiHotels.map((mockHotel, index) => {
        const imageRequestId = `hotel-${input.destination.replace(/\s+/g, '-')}-${index}`;
        return {
            name: mockHotel.name,
            conceptualPriceRange: mockHotel.price,
            rating: mockHotel.rating,
            description: mockHotel.description,
            amenities: mockHotel.amenities,
            imagePrompt: imagePromptsForHotels.find(p=>p.id === imageRequestId)?.promptText || `Photo of ${mockHotel.name}`, // Fallback prompt
            imageUri: hotelImageResults[imageRequestId] || `https://placehold.co/600x400.png?text=${encodeURIComponent(mockHotel.name.substring(0,10))}`,
            latitude: mockHotel.latitude,
            longitude: mockHotel.longitude,
        };
    });

    console.log(`[Server Action - getAiHotelSuggestionsAction] Processed ${finalHotelSuggestions.length} hotel suggestions with (simulated SerpApi data + AI images).`);
    return {
      hotels: finalHotelSuggestions,
      searchSummary: `Found ${finalHotelSuggestions.length} conceptual hotel ideas for ${input.destination} (data simulated, images by AI).`
    };

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
    