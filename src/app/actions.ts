
'use server';

import { firestore } from '@/lib/firebase';
import {
  generateMultipleImagesFlow,
  type MultipleImagesInput,
  type ImagePromptItem,
  type ImageResultItem,
  type MultipleImagesOutputSchema,
  type MultipleImagesOutput,
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
// import { conceptualFlightSearchFlow } from '@/ai/flows/conceptual-flight-search-flow'; // Replaced by mock SerpApi
import type { ConceptualFlightSearchInput, ConceptualFlightSearchOutput, ConceptualFlightOption } from '@/ai/types/conceptual-flight-search-types';
// import { aiHotelSearchFlow } from '@/ai/flows/ai-hotel-search-flow'; // Replaced by mock SerpApi
import type { AiHotelSearchInput, AiHotelSearchOutput, AiHotelSuggestion } from '@/ai/types/ai-hotel-search-types';
import { thingsToDoFlow } from '@/ai/flows/things-to-do-flow';
import type { ThingsToDoSearchInput, ThingsToDoOutput } from '@/ai/types/things-to-do-types';

// --- Landing Page Image Caching & Generation (No changes here) ---
export interface ImageRequest {
  id: string;
  promptText: string;
  styleHint: 'hero' | 'featureCard' | 'destination' | 'general' | 'activity' | 'hotelRoom'; // Added hotelRoom
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
    console.error(`[DB Save Internal Error] Failed to save image for ID ${id} to Firestore. Error: ${error.message}`, error);
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
        console.log(`[DB Check] Querying Firestore for IDs chunk: ${chunkOfIds.join(', ')}`);
        try {
          const imageDocsQuery = query(collection(firestore, 'landingPageImages'), where(documentId(), 'in', chunkOfIds));
          const imageDocsSnap = await getDocs(imageDocsQuery);
          imageDocsSnap.forEach(docSnap => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (data.imageUri) {
                imageUris[docSnap.id] = data.imageUri;
                console.log(`[DB Check] Found existing image for ID ${docSnap.id}. URI starts with: ${data.imageUri.substring(0, 30)}...`);
              } else {
                console.log(`[DB Check] Doc for ID ${docSnap.id} found but no imageUri. Queuing for AI.`);
                const originalRequest = requests.find(r => r.id === docSnap.id);
                if (originalRequest) aiGenerationQueue.push({ id: originalRequest.id, prompt: originalRequest.promptText, styleHint: originalRequest.styleHint });
              }
            } else {
              console.log(`[DB Check] No doc for ID ${docSnap.id}. Queuing for AI.`);
              const originalRequest = requests.find(r => r.id === docSnap.id);
              if (originalRequest) aiGenerationQueue.push({ id: originalRequest.id, prompt: originalRequest.promptText, styleHint: originalRequest.styleHint });
            }
          });
        } catch (dbError: any) {
          console.error(`[DB Check Error] Firestore query failed for chunk. Error: ${dbError.message}`, dbError);
          // For IDs in this failed chunk, ensure they go to AI queue if not already processed
          chunkOfIds.forEach(idInChunk => {
            if (imageUris[idInChunk] === null) { // Only if not already found from a (hypothetical) previous successful chunk
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

    // Fill in any remaining nulls (requests not found in DB or added due to DB error)
    requests.forEach(req => {
      if (imageUris[req.id] === null && !aiGenerationQueue.find(q => q.id === req.id)) {
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
        console.error('[Server Action] CRITICAL ERROR calling generateMultipleImagesFlow. Error: ', flowError.message, flowError.stack, flowError);
        aiGenerationQueue.forEach(req => { 
          if (imageUris[req.id] === undefined || imageUris[req.id] === null) imageUris[req.id] = null; 
        });
      }
    }
    console.log(`[Server Action - getLandingPageImagesWithFallback] RETURNING imageUris object:`, JSON.stringify(Object.fromEntries(Object.entries(imageUris).map(([k, v]) => [k, v ? v.substring(0, 30) + '...' : null])), null, 2));
    return imageUris;

  } catch (topLevelError: any) {
    console.error('[Server Action - getLandingPageImagesWithFallback] TOP LEVEL CRITICAL ERROR:', topLevelError.message, topLevelError.stack, topLevelError);
    const fallbackUris: Record<string, string | null> = {};
    requests.forEach(req => fallbackUris[req.id] = null);
    return fallbackUris;
  }
}

// --- Popular Destinations (Used by /travel and /explore) ---
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
    console.error('[Server Action - getPopularDestinations] ERROR fetching popular destinations:', error.message, error.stack, error);
    return { destinations: [], contextualNote: `Sorry, we encountered an error: ${error.message}` };
  }
}

// --- Explore Ideas from History (Used by /explore) ---
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

// --- Flight Map Deals (Used by /flights) ---
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

// --- Conceptual Flight Search (Used by /flights) - SIMULATING SerpApi ---
export async function getConceptualFlightsAction(input: ConceptualFlightSearchInput): Promise<ConceptualFlightSearchOutput> {
  console.log('[Server Action - getConceptualFlightsAction] Simulating SerpApi call with input:', input);
  
  // TODO: User to implement actual SerpApi call here.
  // const serpApiKey = process.env.SERPAPI_API_KEY;
  // if (!serpApiKey) {
  //   console.error("SERPAPI_API_KEY not found in environment variables.");
  //   return { flights: [], summaryMessage: "Flight API key not configured." };
  // }
  // Example using fetch (you'd need to install 'node-fetch' or use built-in fetch if Node.js version >= 18)
  // const params = new URLSearchParams({
  //   engine: "google_flights",
  //   api_key: serpApiKey,
  //   departure_id: input.origin, // Assuming input.origin is airport code
  //   arrival_id: input.destination, // Assuming input.destination is airport code
  //   outbound_date: input.departureDate,
  //   return_date: input.returnDate || '', // if round-trip
  //   // ... other params like passengers, cabinClass, tripType might need mapping
  // });
  // const serpApiUrl = `https://serpapi.com/search.json?${params.toString()}`;
  // try {
  //   const response = await fetch(serpApiUrl);
  //   if (!response.ok) throw new Error(`SerpApi request failed with status ${response.status}`);
  //   const serpApiData = await response.json();
  //   // Now map serpApiData.best_flights or .other_flights to ConceptualFlightOption[]
  //   // This mapping will be highly dependent on SerpApi's response structure.
  // } catch (error: any) {
  //   console.error('[Server Action - getConceptualFlightsAction] Error calling real SerpApi:', error);
  //   return { flights: [], summaryMessage: `Error fetching live flight data: ${error.message}` };
  // }

  // --- MOCK SERPAPI DATA FOR NOW ---
  const mockFlights: ConceptualFlightOption[] = [];
  const airlines = ["SkyLink Airways", "BudgetFlyer", "AeroConnect", "TransGlobe Express"];
  const flightRemarks = ["Usually on time.", "Newer aircraft.", "Good for early birds.", "Check baggage allowance."];
  const numFlights = Math.floor(Math.random() * 2) + 2; // 2 to 3 mock flights

  for (let i = 0; i < numFlights; i++) {
    const price = Math.floor(Math.random() * 300) + 150; // $150 - $450
    const depHour = Math.floor(Math.random() * 12) + 6; // 6 AM to 5 PM
    const depMin = Math.random() > 0.5 ? 30 : 0;
    const durationHours = Math.floor(Math.random() * 5) + 2; // 2 to 6 hours
    const durationMins = Math.random() > 0.5 ? 30 : 0;
    const arrHour = (depHour + durationHours + Math.floor((depMin + durationMins) / 60)) % 24;
    const arrMin = (depMin + durationMins) % 60;

    mockFlights.push({
      airlineName: airlines[Math.floor(Math.random() * airlines.length)],
      flightNumber: `${airlines[0].substring(0,2).toUpperCase()}${Math.floor(Math.random() * 800) + 100}`,
      departureAirport: input.origin,
      arrivalAirport: input.destination,
      departureTime: `${String(depHour).padStart(2, '0')}:${String(depMin).padStart(2, '0')} AM/PM`, // Placeholder
      arrivalTime: `${String(arrHour).padStart(2, '0')}:${String(arrMin).padStart(2, '0')} AM/PM Local`, // Placeholder
      duration: `${durationHours}h ${durationMins}m`,
      stops: Math.random() > 0.6 ? "1 stop" : "Non-stop",
      conceptualPrice: `Around $${price}`,
      bookingHint: flightRemarks[Math.floor(Math.random() * flightRemarks.length)],
      extraDetails: Math.random() > 0.5 ? "Includes 1 checked bag" : "Wi-Fi available (paid)",
    });
  }
  
  console.log(`[Server Action - getConceptualFlightsAction] Returning ${mockFlights.length} mock flights.`);
  return { 
    flights: mockFlights, 
    summaryMessage: `Here are ${mockFlights.length} conceptual flight ideas from a simulated live API. Images by AI.` 
  };
}

// --- Hotel Search (Used by /hotels) - SIMULATING SerpApi & Using AI for Images ---
export async function getAiHotelSuggestionsAction(input: AiHotelSearchInput): Promise<AiHotelSearchOutput> {
  console.log('[Server Action - getAiHotelSuggestionsAction] Simulating SerpApi call with input:', JSON.stringify(input, null, 2));

  // TODO: User to implement actual SerpApi hotel search call here.
  // const serpApiKey = process.env.SERPAPI_API_KEY;
  // if (!serpApiKey) { /* ... handle missing key ... */ }
  // const params = new URLSearchParams({
  //   engine: "google_hotels",
  //   api_key: serpApiKey,
  //   q: input.destination,
  //   check_in_date: input.checkInDate,
  //   check_out_date: input.checkOutDate,
  //   adults: input.guests, // This might need parsing for SerpApi's format
  //   // ... other params
  // });
  // const serpApiUrl = `https://serpapi.com/search.json?${params.toString()}`;
  // try {
  //   const response = await fetch(serpApiUrl);
  //   if (!response.ok) throw new Error(`SerpApi request failed with status ${response.status}`);
  //   const serpApiData = await response.json();
  //   // Map serpApiData.properties (or similar key) to AiHotelSuggestion[]
  //   // This mapping will be highly dependent on SerpApi's response structure.
  // } catch (error: any) { /* ... handle error ... */ }

  // --- MOCK SERPAPI HOTEL DATA FOR NOW ---
  const mockSerpApiHotels: Array<Partial<AiHotelSuggestion> & { name: string; description: string; latitudeString?: string; longitudeString?: string; amenities: string[] }> = [
    { name: `Grand Plaza Hotel ${input.destination.split(',')[0]}`, conceptualPriceRange: "$200 - $350 / night", rating: 4.5, description: "A luxurious hotel in the heart of the city, perfect for sightseeing.", amenities: ["Pool", "Spa", "Gym", "Restaurant", "Free WiFi"], latitudeString: (Math.random() * 180 - 90).toFixed(4), longitudeString: (Math.random() * 360 - 180).toFixed(4) },
    { name: `Cozy Boutique Inn ${input.destination.split(',')[0]}`, conceptualPriceRange: "$120 - $180 / night", rating: 4.2, description: "Charming inn with personalized service and a cozy atmosphere.", amenities: ["Free WiFi", "Breakfast Included", "Garden"], latitudeString: (Math.random() * 180 - 90).toFixed(4), longitudeString: (Math.random() * 360 - 180).toFixed(4) },
    { name: `Modern Hub Suites ${input.destination.split(',')[0]}`, conceptualPriceRange: "$150 - $220 / night", rating: 4.0, description: "Sleek and contemporary suites for business or leisure.", amenities: ["Gym", "Business Center", "Kitchenette", "Free WiFi"], latitudeString: (Math.random() * 180 - 90).toFixed(4), longitudeString: (Math.random() * 360 - 180).toFixed(4) },
    { name: `Budget Traveler's Rest ${input.destination.split(',')[0]}`, conceptualPriceRange: "$70 - $110 / night", rating: 3.8, description: "Clean and affordable accommodation for budget-conscious travelers.", amenities: ["Shared Kitchen", "Lockers", "Free WiFi"], latitudeString: (Math.random() * 180 - 90).toFixed(4), longitudeString: (Math.random() * 360 - 180).toFixed(4) },
  ].slice(0, Math.floor(Math.random() * 2) + 3); // 3 to 4 mock hotels

  const imagePromptsForHotels: ImagePromptItem[] = mockSerpApiHotels.map((hotel, index) => ({
    id: `hotel-${index}-${hotel.name?.replace(/\s+/g, '-') || 'unknown'}`,
    prompt: hotel.imagePrompt || `photo of ${hotel.name}, ${hotel.description?.substring(0, 50)}, exterior view`,
    styleHint: 'hotel',
  }));

  let hotelImageUris: Record<string, string | null> = {};
  if (imagePromptsForHotels.length > 0) {
    try {
      const imageResults = await generateMultipleImagesFlow({ prompts: imagePromptsForHotels });
      imageResults.results.forEach(res => {
        hotelImageUris[res.id] = res.imageUri;
      });
      console.log("[Server Action - getAiHotelSuggestionsAction] Hotel images generated/fetched.");
    } catch (imgError) {
      console.error("[Server Action - getAiHotelSuggestionsAction] Error generating hotel images:", imgError);
    }
  }

  const finalHotelSuggestions: AiHotelSuggestion[] = mockSerpApiHotels.map((hotel, index) => {
    const imageId = `hotel-${index}-${hotel.name?.replace(/\s+/g, '-') || 'unknown'}`;
    let lat: number | undefined = undefined;
    let lon: number | undefined = undefined;
    if (hotel.latitudeString) {
        const parsedLat = parseFloat(hotel.latitudeString);
        if (!isNaN(parsedLat)) lat = parsedLat;
    }
    if (hotel.longitudeString) {
        const parsedLon = parseFloat(hotel.longitudeString);
        if (!isNaN(parsedLon)) lon = parsedLon;
    }

    return {
      name: hotel.name!,
      conceptualPriceRange: hotel.conceptualPriceRange || "$100 - $200 / night",
      rating: hotel.rating,
      description: hotel.description!,
      amenities: hotel.amenities || ["WiFi"],
      imagePrompt: imagePromptsForHotels.find(p => p.id === imageId)?.prompt || `photo of ${hotel.name}`,
      imageUri: hotelImageUris[imageId] || `https://placehold.co/600x400.png?text=${encodeURIComponent(hotel.name!.substring(0,15))}`,
      latitude: lat,
      longitude: lon,
    };
  });
  
  console.log(`[Server Action - getAiHotelSuggestionsAction] Returning ${finalHotelSuggestions.length} mock hotels with AI images.`);
  finalHotelSuggestions.forEach(h => console.log(`Hotel: ${h.name}, Lat: ${h.latitude}, Lng: ${h.longitude}, ImageURI: ${h.imageUri?.substring(0,30)}...`));

  return {
    hotels: finalHotelSuggestions,
    searchSummary: `Found ${finalHotelSuggestions.length} conceptual hotel ideas for ${input.destination} from a simulated live API. Images by AI.`
  };
}

// --- Things to Do (Used by /things-to-do) ---
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
