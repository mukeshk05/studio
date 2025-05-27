
'use server';

import { firestore } from '@/lib/firebase';
import {
  generateMultipleImagesFlow as generateMultipleImagesFlowOriginal,
  type MultipleImagesInput,
  type ImagePromptItem,
  type ImageResultItem,
  type MultipleImagesOutput,
} from '@/ai/flows/generate-multiple-images-flow';
import { collection, doc, getDocs, query, where, writeBatch, documentId, setDoc, serverTimestamp, getDoc, Timestamp, addDoc, orderBy, limit, updateDoc, deleteDoc } from 'firebase/firestore';
import type { PopularDestinationsOutput, PopularDestinationsInput } from '@/ai/types/popular-destinations-types';
import { popularDestinationsFlow } from '@/ai/flows/popular-destinations-flow';
import { getExploreIdeasFromHistory as getExploreIdeasFromHistoryFlow } from '@/ai/flows/explore-ideas-from-history-flow';
import type { ExploreIdeasFromHistoryInput, ExploreIdeasOutput } from '@/ai/types/explore-ideas-types';
import {
  aiFlightMapDealsFlow,
} from '@/ai/flows/ai-flight-map-deals-flow';
import type {
    AiFlightMapDealInput,
    AiFlightMapDealOutput,
} from '@/ai/types/ai-flight-map-deals-types';
import { getJson as getSerpApiJson } from 'serpapi';
import type { SerpApiFlightSearchInput, SerpApiFlightSearchOutput, SerpApiFlightOption, SerpApiFlightLeg } from '@/ai/types/serpapi-flight-search-types';
import type { SerpApiHotelSearchInput, SerpApiHotelSearchOutput, SerpApiHotelSuggestion } from '@/ai/types/serpapi-hotel-search-types';

import { getPriceAdvice as getPriceAdviceOriginal, PriceAdvisorInput, PriceAdvisorOutput } from '@/ai/flows/price-advisor-flow'; // Import types directly

import { conceptualDateGridFlow as conceptualDateGridFlowOriginal, ConceptualDateGridInput, ConceptualDateGridOutput } from '@/ai/flows/conceptual-date-grid-flow'; // Import types directly

import { conceptualPriceGraphFlow as conceptualPriceGraphFlowOriginal, ConceptualPriceGraphInput, ConceptualPriceGraphOutput } from '@/ai/flows/conceptual-price-graph-flow'; // Import types directly

import { getCoTravelAgentResponse as getCoTravelAgentResponseOriginal, CoTravelAgentInput, CoTravelAgentOutput } from '@/ai/flows/co-travel-agent-flow'; // Import types directly

import { getItineraryAssistance as getItineraryAssistanceOriginal, ItineraryAssistanceInput, ItineraryAssistanceOutput } from '@/ai/flows/itinerary-assistance-flow'; // Import types directly

import { generateTripSummary as generateTripSummaryOriginal, TripSummaryInput, TripSummaryOutput } from '@/ai/flows/trip-summary-flow'; // Import types directly

import { smartBundleFlow as smartBundleFlowOriginal, SmartBundleInput, SmartBundleOutput } from '@/ai/flows/smart-bundle-flow'; // Import types directly
import type { BundleSuggestion } from '@/ai/types/smart-bundle-types';

import { thingsToDoFlow as thingsToDoFlowOriginal, ThingsToDoSearchInput, ThingsToDoOutput } from '@/ai/flows/things-to-do-flow'; // Import types directly
import type { FlightOption, HotelOption } from '@/lib/types';

import { format, addDays, parse, differenceInDays, addMonths } from 'date-fns';

const CACHE_EXPIRY_HOURS_API = 24;
const CACHE_EXPIRY_DAYS_IMAGE = 7;


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
    // Corrected path: 'imageCache' is collection, 'id' is documentId
    const imageDocRef = doc(firestore, 'imageCache', id); 
    await setDoc(imageDocRef, {
      imageUri: imageUri,
      promptUsed: promptText,
      styleHint: styleHint,
      lastUpdated: serverTimestamp(),
    }, { merge: true });
    console.log(`[DB Save Internal] Image for ID ${id} SAVED/UPDATED successfully in Firestore (imageCache).`);
  } catch (error: any) {
    console.error(`[DB Save Internal Error] Failed to save image for ID ${id} to Firestore. Error: ${error.message}`, error.stack);
  }
}

export async function getLandingPageImagesWithFallback(
  requests: ImageRequest[]
): Promise<Record<string, string | null>> {
  console.log(`[Server Action - getLandingPageImagesWithFallback] Started. Total requests: ${requests.length}`);
  const imageUris: Record<string, string | null> = {};
  requests.forEach(req => imageUris[req.id] = null); 

  const requestIds = requests.map(req => req.id);
  const aiGenerationQueue: ImagePromptItem[] = [];
  const MAX_FIRESTORE_IN_QUERY = 30;

  try {
    if (requestIds.length > 0 && firestore) {
      console.log(`[DB Check] Total IDs to check in Firestore for landing page: ${requestIds.length}`);
      for (let i = 0; i < requestIds.length; i += MAX_FIRESTORE_IN_QUERY) {
        const chunkOfIds = requestIds.slice(i, i + MAX_FIRESTORE_IN_QUERY);
        if (chunkOfIds.length === 0) continue;
        try {
          // Corrected path: 'imageCache' is collection
          const imageDocsQuery = query(collection(firestore, 'imageCache'), where(documentId(), 'in', chunkOfIds));
          const imageDocsSnap = await getDocs(imageDocsQuery);
          imageDocsSnap.forEach(docSnap => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              const originalRequest = requests.find(r => r.id === docSnap.id);
              if (data.imageUri && originalRequest?.styleHint === data.styleHint) { // Check styleHint consistency if needed
                 imageUris[docSnap.id] = data.imageUri;
              } else {
                if (originalRequest && !aiGenerationQueue.find(q => q.id === docSnap.id)) {
                     aiGenerationQueue.push({ id: originalRequest.id, prompt: originalRequest.promptText, styleHint: originalRequest.styleHint });
                }
              }
            } else { // If doc doesn't exist, it needs generation
                const originalRequest = requests.find(r => r.id === docSnap.id); // docSnap.id is not right here if doc doesn't exist. Iterate chunkOfIds
                 chunkOfIds.forEach(idInChunk => {
                    if (docSnap.id === idInChunk && imageUris[idInChunk] === null) { // This logic is a bit off, fixed below
                        // This block might be redundant due to the fallback logic later
                    }
                });
            }
          });
           // Ensure all IDs not found in DB are queued for AI
          chunkOfIds.forEach(idInChunk => {
            if (imageUris[idInChunk] === null) { // If still null after DB check
                const originalRequest = requests.find(r => r.id === idInChunk);
                if (originalRequest && !aiGenerationQueue.find(q => q.id === idInChunk)) {
                    aiGenerationQueue.push({ id: originalRequest.id, prompt: originalRequest.promptText, styleHint: originalRequest.styleHint });
                }
            }
          });


        } catch (dbError: any) {
          console.error(`[DB Check Error - Landing] Firestore query failed for chunk. Error: ${dbError.message}`);
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
      requests.forEach(req => aiGenerationQueue.push({ id: req.id, prompt: req.promptText, styleHint: req.styleHint }));
    }

    // Fallback: ensure any request not satisfied by cache is added to AI queue
    requests.forEach(req => {
      if (imageUris[req.id] === null && !aiGenerationQueue.find(q => q.id === req.id)) {
        aiGenerationQueue.push({ id: req.id, prompt: req.promptText, styleHint: req.styleHint });
      }
    });

    if (aiGenerationQueue.length > 0) {
      try {
        console.log(`[LandingPageImages] Calling generateMultipleImagesAction for ${aiGenerationQueue.length} images.`);
        const aiResultsOutput: MultipleImagesOutput = await generateMultipleImagesAction({ prompts: aiGenerationQueue }); 
        const aiResults = aiResultsOutput.results || [];
        aiResults.forEach(aiResult => {
          if (aiResult.imageUri) {
            imageUris[aiResult.id] = aiResult.imageUri;
            const originalRequest = requests.find(r => r.id === aiResult.id);
            if (originalRequest) {
              saveImageUriToDbInternal({ 
                id: aiResult.id, imageUri: aiResult.imageUri, promptText: originalRequest.promptText, styleHint: originalRequest.styleHint,
              }).catch(dbSaveError => console.error(`[Server Action - Landing Img Save Error] Firestore save failed for ${aiResult.id}:`, dbSaveError));
            }
          }
        });
      } catch (flowError: any) {
        console.error('[Server Action - Landing Img AI Error] Error calling generateMultipleImagesAction. Error: ', flowError.message);
        aiGenerationQueue.forEach(req => { if (imageUris[req.id] === null) imageUris[req.id] = null; });
      }
    }
    return imageUris;
  } catch (topLevelError: any) {
    console.error('[Server Action - getLandingPageImagesWithFallback] TOP LEVEL CRITICAL ERROR:', topLevelError.message);
    const fallbackUris: Record<string, string | null> = {};
    requests.forEach(req => fallbackUris[req.id] = null); // Return nulls so UI can use static fallbacks
    return fallbackUris;
  }
}

export async function getPopularDestinations(input: PopularDestinationsInput): Promise<PopularDestinationsOutput> {
  return popularDestinationsFlow(input);
}

export async function getExploreIdeasAction(input: ExploreIdeasFromHistoryInput): Promise<ExploreIdeasOutput> {
  return getExploreIdeasFromHistoryFlow(input);
}

export async function getAiFlightMapDealsAction(input: AiFlightMapDealInput): Promise<AiFlightMapDealOutput> {
  const flowInput: AiFlightMapDealInput & { realPriceContext?: string } = { ...input };
  try {
    const startDate = addMonths(new Date(), 1);
    const endDate = addDays(startDate, 7);
    const originIata = await getIataCodeAction(input.originDescription);
    const destinationIata = await getIataCodeAction(input.targetDestinationCity);
    const flightSearchInput: SerpApiFlightSearchInput = {
      origin: originIata || input.originDescription,
      destination: destinationIata || input.targetDestinationCity,
      departureDate: format(startDate, "yyyy-MM-dd"),
      returnDate: format(endDate, "yyyy-MM-dd"),
      tripType: "round-trip",
    };
    const flightResults = await getRealFlightsAction(flightSearchInput);
    const bestFlight = flightResults.best_flights?.[0] || flightResults.other_flights?.[0];
    if (bestFlight?.price) {
      flowInput.realPriceContext = `around $${bestFlight.price.toLocaleString()}`;
    }
  } catch (e) { console.error("[Action Error] Failed to get real price context for map deals:", e); }
  return aiFlightMapDealsFlow(flowInput);
}

function deriveStopsDescription(flightOption: SerpApiFlightOption): string {
    const legs = flightOption.flights || [];
    if (legs.length === 0) return "Unknown stops";
    if (legs.length === 1 && (!flightOption.layovers || flightOption.layovers.length === 0)) return "Non-stop";
    const numStops = (flightOption.layovers?.length || Math.max(0, legs.length - 1));
    if (numStops <= 0) return "Non-stop";
    let stopsDesc = `${numStops} stop${numStops > 1 ? 's' : ''}`;
    if (flightOption.layovers && flightOption.layovers.length > 0) {
        const layoverAirports = flightOption.layovers.map(l => l.name || l.id || "Airport").join(', ');
        if (layoverAirports) stopsDesc += ` in ${layoverAirports}`;
    }
    return stopsDesc;
}

export async function getIataCodeAction(placeName: string): Promise<string | null> {
  if (!placeName || placeName.trim().length < 3) return null;
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) return null;
  const params = { engine: "google", q: `IATA code for ${placeName} airport`, api_key: apiKey };
  try {
    const response = await getSerpApiJson(params);
    if (response.answer_box?.answer) { const m = response.answer_box.answer.match(/\b([A-Z]{3})\b/); if (m) return m[1]; }
    if (response.knowledge_graph?.iata_code) return response.knowledge_graph.iata_code;
    if (response.knowledge_graph?.description) { const m = response.knowledge_graph.description.match(/IATA: ([A-Z]{3})/i); if (m) return m[1];}
    if (response.organic_results?.length) {
      for (const r of response.organic_results) {
        if (r.snippet) { const m = r.snippet.match(/\b([A-Z]{3})\b is the IATA code/i) || r.snippet.match(/IATA code: ([A-Z]{3})/i) || r.snippet.match(/airport code ([A-Z]{3})/i); if (m) return m[1]; }
        if (r.title) { const m = r.title.match(/\(([A-Z]{3})\)/i); if (m) return m[1]; }
      }
    }
    if (/^[A-Z]{3}$/.test(placeName.toUpperCase())) return placeName.toUpperCase();
    return null;
  } catch (error) { console.error(`Error fetching IATA for ${placeName}:`, error); return null; }
}

const parsePrice = (priceValue: any): number | undefined => {
    if (priceValue === null || priceValue === undefined) return undefined;
    if (typeof priceValue === 'number') return isNaN(priceValue) ? undefined : priceValue;
    if (typeof priceValue === 'string') {
        const cleanedString = priceValue.replace(/[^0-9.]/g, '');
        if (cleanedString === '') return undefined;
        const num = parseFloat(cleanedString);
        return isNaN(num) ? undefined : num;
    }
    return undefined;
};

// --- Flight Search Action with Caching ---
export async function getRealFlightsAction(input: SerpApiFlightSearchInput): Promise<SerpApiFlightSearchOutput> {
  console.log('[Server Action - getRealFlightsAction] Input:', input);
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey || apiKey === "YOUR_SERPAPI_API_KEY_PLACEHOLDER") {
    console.error('[Server Action - getRealFlightsAction] SerpApi API key is not configured.');
    return { error: "Flight search service is not configured." };
  }

  const cacheKey = `flights_${input.origin}_${input.destination}_${input.departureDate}_${input.returnDate || 'ow'}_${input.tripType || 'rt'}`;
  const cacheDocRef = doc(firestore, 'serpApiFlightsCache', cacheKey); // Corrected collection name

  try {
    const docSnap = await getDoc(cacheDocRef);
    if (docSnap.exists()) {
      const cacheData = docSnap.data();
      const cachedAt = (cacheData.cachedAt as Timestamp).toDate();
      const now = new Date();
      const hoursDiff = (now.getTime() - cachedAt.getTime()) / (1000 * 60 * 60);
      if (hoursDiff < CACHE_EXPIRY_HOURS_API) {
        console.log(`[Server Action - getRealFlightsAction] Cache HIT for key: ${cacheKey}`);
        return cacheData.data as SerpApiFlightSearchOutput;
      }
      console.log(`[Server Action - getRealFlightsAction] Cache STALE for key: ${cacheKey}`);
    } else {
      console.log(`[Server Action - getRealFlightsAction] Cache MISS for key: ${cacheKey}`);
    }
  } catch (cacheError) {
    console.error(`[Server Action - getRealFlightsAction] Error reading cache for key ${cacheKey}:`, cacheError);
  }

  const params: any = {
    engine: "google_flights", departure_id: input.origin, arrival_id: input.destination,
    outbound_date: input.departureDate, currency: input.currency || "USD", hl: input.hl || "en", api_key: apiKey,
  };
  if (input.tripType === "round-trip" && input.returnDate) params.return_date = input.returnDate;

  console.log('[Server Action - getRealFlightsAction] Parameters sent to SerpApi:', params);
  try {
    const response = await getSerpApiJson(params);
    console.log('[Server Action - getRealFlightsAction] RAW SerpApi Response received:', JSON.stringify(response, null, 2));

    if (response.error) {
      console.error('[Server Action - getRealFlightsAction] SerpApi returned an error:', response.error);
      return { error: `SerpApi error: ${response.error}` };
    }
    
    const processFlights = (flightArray: any[] | undefined): SerpApiFlightOption[] => {
        if (!flightArray || flightArray.length === 0) return [];
        return flightArray.map((flight: any): SerpApiFlightOption => {
            const legsArray = flight.flights || flight.segments || [];
            const firstLeg = legsArray[0]; const lastLeg = legsArray[legsArray.length - 1];
            return {
                flights: legsArray.map((l: any) => ({...l, duration: l.duration ? parseInt(l.duration) : undefined })),
                layovers: flight.layovers?.map((l: any) => ({...l, duration: l.duration ? parseInt(l.duration) : undefined })),
                total_duration: flight.total_duration ? parseInt(flight.total_duration) : undefined,
                price: parsePrice(flight.price),
                type: flight.type, airline: flight.airline || firstLeg?.airline, airline_logo: flight.airline_logo || firstLeg?.airline_logo,
                link: flight.link, carbon_emissions: flight.carbon_emissions,
                derived_departure_time: firstLeg?.departure_airport?.time, derived_arrival_time: lastLeg?.arrival_airport?.time,
                derived_departure_airport_name: firstLeg?.departure_airport?.name, derived_arrival_airport_name: lastLeg?.arrival_airport?.name,
                derived_flight_numbers: legsArray.map((f: any) => f.flight_number).filter(Boolean).join(', '),
                derived_stops_description: deriveStopsDescription({ ...flight, flights: legsArray }),
            };
        }).filter(fo => fo.price != null && (fo.derived_departure_airport_name != null || (fo.flights && fo.flights.length > 0)));
    }

    let bestFlightsProcessed = processFlights(response.best_flights);
    let otherFlightsProcessed = processFlights(response.other_flights);
    if (bestFlightsProcessed.length === 0 && otherFlightsProcessed.length === 0 && response.flights?.length > 0) {
        otherFlightsProcessed = processFlights(response.flights);
    }
    
    const output: SerpApiFlightSearchOutput = {
      search_summary: response.search_summary?.displayed_query || `Found ${bestFlightsProcessed.length + otherFlightsProcessed.length} flight options.`,
      best_flights: bestFlightsProcessed.length > 0 ? bestFlightsProcessed : undefined,
      other_flights: otherFlightsProcessed.length > 0 ? otherFlightsProcessed : undefined,
      price_insights: response.price_insights,
    };

    if (firestore && (output.best_flights || output.other_flights)) {
      try {
        await setDoc(cacheDocRef, { data: output, cachedAt: serverTimestamp(), queryKey: cacheKey }, { merge: true });
        console.log(`[Server Action - getRealFlightsAction] Saved to cache for key: ${cacheKey}`);
      } catch (cacheWriteError) {
        console.error(`[Server Action - getRealFlightsAction] Error writing to cache for key ${cacheKey}:`, cacheWriteError);
      }
    }
    return output;
  } catch (error: any) {
    console.error('[Server Action - getRealFlightsAction] Error calling SerpApi or processing:', error);
    return { error: `Failed to fetch flights: ${error.message || 'Unknown error'}` };
  }
}

// --- Hotel Search Action with Caching ---
export async function getRealHotelsAction(input: SerpApiHotelSearchInput): Promise<SerpApiHotelSearchOutput> {
  console.log('[Server Action - getRealHotelsAction] Received input:', JSON.stringify(input, null, 2));
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey || apiKey === "YOUR_SERPAPI_API_KEY_PLACEHOLDER") {
    console.error('[Server Action - getRealHotelsAction] SerpApi API key is not configured.');
    return { hotels: [], error: "Hotel search service is not configured." };
  }

  const cacheKey = `hotels_${input.destination}_${input.checkInDate}_${input.checkOutDate}_${input.guests || '2'}`;
  const cacheDocRef = doc(firestore, 'serpApiHotelsCache', cacheKey); // Corrected collection name

  try {
    const docSnap = await getDoc(cacheDocRef);
    if (docSnap.exists()) {
      const cacheData = docSnap.data();
      const cachedAt = (cacheData.cachedAt as Timestamp).toDate();
      const now = new Date();
      const hoursDiff = (now.getTime() - cachedAt.getTime()) / (1000 * 60 * 60);
      if (hoursDiff < CACHE_EXPIRY_HOURS_API) {
        console.log(`[Server Action - getRealHotelsAction] Cache HIT for key: ${cacheKey}`);
        return cacheData.data as SerpApiHotelSearchOutput;
      }
      console.log(`[Server Action - getRealHotelsAction] Cache STALE for key: ${cacheKey}`);
    } else {
      console.log(`[Server Action - getRealHotelsAction] Cache MISS for key: ${cacheKey}`);
    }
  } catch (cacheError) {
    console.error(`[Server Action - getRealHotelsAction] Error reading cache for key ${cacheKey}:`, cacheError);
  }

  const params: any = {
    engine: "google_hotels", q: input.destination, check_in_date: input.checkInDate, check_out_date: input.checkOutDate,
    adults: input.guests || "2", currency: input.currency || "USD", hl: input.hl || "en", api_key: apiKey,
  };
  console.log('[Server Action - getRealHotelsAction] Parameters sent to SerpApi:', params);

  try {
    const response = await getSerpApiJson(params);
    console.log('[Server Action - getRealHotelsAction] RAW SerpApi Hotel Response:', JSON.stringify(response, null, 2));

    if (response.error) {
      console.error('[Server Action - getRealHotelsAction] SerpApi returned an error:', response.error);
      return { hotels: [], error: `SerpApi error: ${response.error}` };
    }
    
    const rawHotels = response.properties || [];
    console.log(`[Server Action - getRealHotelsAction] Found ${rawHotels.length} raw hotel properties from SerpApi.`);
    const hotels: SerpApiHotelSuggestion[] = rawHotels.map((hotel: any): SerpApiHotelSuggestion => {
      const priceSourceForPpn = hotel.rate_per_night?.lowest ?? hotel.price_per_night ?? hotel.price ?? hotel.extracted_price;
      const parsedPricePerNight = parsePrice(priceSourceForPpn);
      const priceSourceForTotal = hotel.total_price?.extracted_lowest ?? hotel.total_price;
      const parsedTotalPrice = parsePrice(priceSourceForTotal);

      const finalHotelObject: SerpApiHotelSuggestion = {
        name: hotel.name, type: hotel.type, description: hotel.overall_info || hotel.description,
        price_per_night: parsedPricePerNight, 
        total_price: parsedTotalPrice,
        price_details: typeof priceSourceForPpn === 'string' ? priceSourceForPpn : (parsedPricePerNight !== undefined ? `$${parsedPricePerNight}` : undefined),
        rating: hotel.overall_rating || hotel.rating, reviews: hotel.reviews,
        amenities: hotel.amenities_objects?.map((am: any) => am.name) || hotel.amenities,
        link: hotel.link, thumbnail: hotel.images?.[0]?.thumbnail || hotel.thumbnail,
        images: hotel.images?.map((img: any) => ({ thumbnail: img.thumbnail, original_image: img.original_image })),
        coordinates: hotel.gps_coordinates ? { latitude: hotel.gps_coordinates.latitude, longitude: hotel.gps_coordinates.longitude } : undefined,
        check_in_time: hotel.check_in_time, check_out_time: hotel.check_out_time,
      };
      console.log(`[Server Action - getRealHotelsAction] FINAL MAPPING for ${finalHotelObject.name} - Raw PPN Source: '${priceSourceForPpn}', Parsed PPN: ${finalHotelObject.price_per_night} (Type: ${typeof finalHotelObject.price_per_night})`);
      return finalHotelObject;
    }).filter((h: SerpApiHotelSuggestion) => h.name && (h.price_per_night !== undefined || h.total_price !== undefined || h.price_details));
    
    console.log(`[Server Action - getRealHotelsAction] Processed ${hotels.length} valid hotel suggestions.`);
    const output: SerpApiHotelSearchOutput = {
      hotels: hotels.length > 0 ? hotels : [],
      search_summary: response.search_information?.displayed_query || `Found ${hotels.length} hotel options.`,
      error: hotels.length === 0 && !response.error ? "No hotels found by SerpApi." : undefined,
    };

    if (firestore && output.hotels && output.hotels.length > 0) {
      try {
        await setDoc(cacheDocRef, { data: output, cachedAt: serverTimestamp(), queryKey: cacheKey }, { merge: true });
        console.log(`[Server Action - getRealHotelsAction] Saved to cache for key: ${cacheKey}`);
      } catch (cacheWriteError) {
        console.error(`[Server Action - getRealHotelsAction] Error writing to cache for key ${cacheKey}:`, cacheWriteError);
      }
    }
    return output;
  } catch (error: any) {
    console.error('[Server Action - getRealHotelsAction] Error calling SerpApi or processing hotels:', error);
    return { hotels: [], error: `Failed to fetch hotels: ${error.message || 'Unknown error'}` };
  }
}

// --- Image Generation Action with Caching ---
export async function generateMultipleImagesAction(input: MultipleImagesInput): Promise<MultipleImagesOutput> {
  console.log(`[Server Action - generateMultipleImagesAction] Starting generation for ${input.prompts.length} images.`);
  const results: ImageResultItem[] = [];
  const batchSize = 5; // Process in batches to avoid overwhelming the API or local resources

  for (let i = 0; i < input.prompts.length; i += batchSize) {
      const batch = input.prompts.slice(i, i + batchSize);
      console.log(`[Server Action - generateMultipleImagesAction] Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(input.prompts.length / batchSize)} (size: ${batch.length})`);

      const batchPromises = batch.map(async (item): Promise<ImageResultItem> => {
          const imageCacheKey = item.id; // Use provided ID as cache key (e.g., 'destination_image_paris_france')

          if (imageCacheKey && firestore) {
              const cacheDocRef = doc(firestore, 'imageCache', imageCacheKey); // Corrected path
              try {
                  const docSnap = await getDoc(cacheDocRef);
                  if (docSnap.exists()) {
                      const cacheData = docSnap.data();
                      const cachedAt = (cacheData.cachedAt as Timestamp).toDate();
                      const now = new Date();
                      const daysDiff = (now.getTime() - cachedAt.getTime()) / (1000 * 60 * 60 * 24);
                      
                      // Also check if the prompt/styleHint matches what's cached if necessary
                      if (daysDiff < CACHE_EXPIRY_DAYS_IMAGE && cacheData.imageUri && cacheData.promptUsed === item.prompt && cacheData.styleHint === item.styleHint) {
                          console.log(`[Server Action - generateMultipleImagesAction] Image Cache HIT for key: ${imageCacheKey}`);
                          return { id: item.id, imageUri: cacheData.imageUri };
                      }
                      console.log(`[Server Action - generateMultipleImagesAction] Image Cache STALE or mismatched for key: ${imageCacheKey}. Will regenerate.`);
                  } else {
                      console.log(`[Server Action - generateMultipleImagesAction] Image Cache MISS for key: ${imageCacheKey}`);
                  }
              } catch (cacheError) {
                  console.error(`[Server Action - generateMultipleImagesAction] Error reading image cache for key ${imageCacheKey}:`, cacheError);
              }
          }

          // If not cached or cache is stale, proceed with AI generation
          let fullPrompt = item.prompt; // Default to original prompt
            if (item.styleHint === 'hero') {
                fullPrompt = `Generate a captivating, high-resolution hero image for a travel website, representing: "${item.prompt}". Style: cinematic, inspiring, travel-focused. Aspect ratio 1:1 for carousel.`;
            } else if (item.styleHint === 'featureCard') {
                fullPrompt = `Generate a high-quality, visually appealing image suitable for a website feature card, representing the concept: "${item.prompt}". Style: modern, tech-forward, travel-related, slightly abstract or conceptual. Aspect ratio 16:9.`;
            } else if (item.styleHint === 'destination') {
                 fullPrompt = `Generate an iconic, vibrant, and high-quality travel photograph representing: ${item.prompt}. Aspect ratio 16:9. Focus on its most recognizable visual elements or overall atmosphere.`;
            } else if (item.styleHint === 'activity') {
                 fullPrompt = `Generate an attractive, high-quality photograph of a travel activity: ${item.prompt}. Focus on appealing visuals, good lighting, and a sense of action or place. Aspect ratio 16:9.`;
            } else if (item.styleHint === 'hotel') {
                 fullPrompt = `Generate an attractive, high-quality photograph of a hotel exterior or lobby based on: ${item.prompt}. Style: inviting, well-lit. Aspect ratio 16:9.`;
            } else if (item.styleHint === 'hotelRoom') {
                 fullPrompt = `Generate an attractive, high-quality photograph of a hotel room interior based on: ${item.prompt}. Style: clean, well-lit, inviting. Aspect ratio 16:9.`;
            }


          try {
              console.log(`[AI Flow - generateMultipleImagesFlow] Generating image for ID: ${item.id}, Full Prompt: "${fullPrompt}"`);
              // The original flow is called here with an array containing a single item
              const singleItemInput: MultipleImagesInput = { prompts: [{...item, prompt: fullPrompt }] }; 
              const aiFlowResult = await generateMultipleImagesFlowOriginal(singleItemInput);
              const mediaUrl = aiFlowResult.results[0]?.imageUri; // Assuming flow returns results for the single item

              if (mediaUrl) {
                  console.log(`[AI Flow - generateMultipleImagesFlow] Success for ID: ${item.id}. Image URI starts with: ${mediaUrl.substring(0, 50)}...`);
                  if (imageCacheKey && firestore) {
                      const cacheDocRef = doc(firestore, 'imageCache', imageCacheKey); // Corrected path
                      try {
                          await setDoc(cacheDocRef, { imageUri: mediaUrl, promptUsed: item.prompt, styleHint: item.styleHint, cachedAt: serverTimestamp() }, { merge: true });
                          console.log(`[Server Action - generateMultipleImagesAction] Saved image to cache for key: ${imageCacheKey}`);
                      } catch (cacheWriteError) {
                          console.error(`[Server Action - generateMultipleImagesAction] Error writing image to cache for key ${imageCacheKey}:`, cacheWriteError);
                      }
                  }
                  return { id: item.id, imageUri: mediaUrl };
              } else {
                  console.warn(`[AI Flow - generateMultipleImagesFlow] Image generation for ID: ${item.id}, prompt "${item.prompt}" did NOT return a media URL.`);
                  return { id: item.id, imageUri: null, error: 'No media URL returned by AI.' };
              }
          } catch (error: any) {
              console.error(`[AI Flow - generateMultipleImagesFlow] FAILED to generate image for ID: ${item.id}, prompt "${item.prompt}":`, error.message || error);
              return { id: item.id, imageUri: null, error: error.message || 'Unknown error during image generation.' };
          }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
  }
  
  console.log(`[Server Action - generateMultipleImagesAction] Finished generation. Total results: ${results.length}`);
  return { results };
}


// Helper for SmartBundle to parse dates
function parseTravelDatesForSerpApi(travelDates: string): { departureDate: string; returnDate?: string; durationDays: number } {
    const now = new Date();
    let fromDate = addMonths(now, 1); 
    let toDate = addDays(fromDate, 7); 
    let durationDays = 7;

    const daysMatch = travelDates.match(/(\d+)\s*days/i);
    const weekMatch = travelDates.match(/(\d+)\s*week/i);

    if (daysMatch) {
        durationDays = parseInt(daysMatch[1], 10);
        toDate = addDays(fromDate, durationDays -1);
    } else if (weekMatch) {
        durationDays = parseInt(weekMatch[1], 10) * 7;
        toDate = addDays(fromDate, durationDays -1);
    } else if (travelDates.toLowerCase().includes("next month")) {
        // Default handled
    } else if (travelDates.toLowerCase().includes("weekend")) {
        let nextFriday = new Date(now);
        nextFriday.setDate(now.getDate() + (5 - now.getDay() + 7) % 7);
        if (nextFriday <= now) nextFriday.setDate(nextFriday.getDate() + 7);
        fromDate = nextFriday;
        toDate = addDays(fromDate, 2);
        durationDays = 3;
    } else {
        const parts = travelDates.split(/\s*-\s*/);
        if (parts.length > 0) {
            try {
                const d1 = parse(parts[0], 'MM/dd/yyyy', new Date());
                if (!isNaN(d1.getTime()) && d1 > now) {
                    fromDate = d1;
                    if (parts.length === 2) {
                        const d2 = parse(parts[1], 'MM/dd/yyyy', new Date());
                        if (!isNaN(d2.getTime()) && d2 >= fromDate) {
                            toDate = d2;
                            durationDays = differenceInDays(toDate, fromDate) + 1;
                        } else { toDate = addDays(fromDate, Math.max(1, durationDays -1)); }
                    } else { toDate = addDays(fromDate, Math.max(1, durationDays -1)); }
                }
            } catch (e) { console.warn("Date parsing failed for smart bundle, using defaults:", e); }
        }
    }
    return { departureDate: format(fromDate, "yyyy-MM-dd"), returnDate: format(toDate, "yyyy-MM-dd"), durationDays };
}

export async function generateSmartBundles(input: SmartBundleInput): Promise<SmartBundleOutput> {
  console.log('[Server Action - generateSmartBundles] Input:', input);
  const conceptualBundles = await smartBundleFlowOriginal(input);

  if (!conceptualBundles.suggestions || conceptualBundles.suggestions.length === 0) return { suggestions: [] };
  const augmentedSuggestions: BundleSuggestion[] = [];

  for (const conceptualSuggestion of conceptualBundles.suggestions) {
    let augmentedSugg: BundleSuggestion = { ...conceptualSuggestion };
    const { destination, travelDates, budget: conceptualBudget } = conceptualSuggestion.tripIdea;
    try {
      const parsedDates = parseTravelDatesForSerpApi(travelDates);
      const originIata = await getIataCodeAction(input.origin || "NYC");
      const destinationIata = await getIataCodeAction(destination);
      const flightResults = await getRealFlightsAction({ origin: originIata || input.origin || "NYC", destination: destinationIata || destination, departureDate: parsedDates.departureDate, returnDate: parsedDates.returnDate, tripType: "round-trip" });
      const bestFlight = flightResults.best_flights?.[0] || flightResults.other_flights?.[0];
      if (bestFlight) augmentedSugg.realFlightExample = bestFlight as unknown as FlightOption;

      const hotelResults = await getRealHotelsAction({ destination: destination, checkInDate: parsedDates.departureDate, checkOutDate: parsedDates.returnDate, guests: "2" });
      const bestHotel = hotelResults.hotels?.[0];
      if (bestHotel) augmentedSugg.realHotelExample = bestHotel as unknown as HotelOption;
      
      let realPriceMin = 0; let priceNoteParts: string[] = [];
      if (bestFlight?.price) { realPriceMin += bestFlight.price; priceNoteParts.push(`Flight ~\$${bestFlight.price.toLocaleString()}`); } else { priceNoteParts.push("No specific flight price found."); }
      
      const hotelCostForStay = bestHotel?.total_price ?? (bestHotel?.price_per_night ? bestHotel.price_per_night * parsedDates.durationDays : 0);
      if (hotelCostForStay > 0) {
          realPriceMin += hotelCostForStay;
          priceNoteParts.push(`Hotel ~\$${hotelCostForStay.toLocaleString()}${bestHotel?.price_per_night ? ` for ${parsedDates.durationDays} nights` : ' total'}`);
      } else {
          priceNoteParts.push("No specific hotel price found.");
      }


      if (realPriceMin > 0) {
        augmentedSugg.estimatedRealPriceRange = `Around \$${realPriceMin.toLocaleString()}`;
        if (conceptualBudget) {
            if (realPriceMin > conceptualBudget * 1.2) augmentedSugg.priceFeasibilityNote = `AI's budget \$${conceptualBudget.toLocaleString()}. Total closer to ${augmentedSugg.estimatedRealPriceRange}. (${priceNoteParts.join(' + ')})`;
            else if (realPriceMin < conceptualBudget * 0.8) augmentedSugg.priceFeasibilityNote = `AI's budget \$${conceptualBudget.toLocaleString()}. Good news! Total could be ${augmentedSugg.estimatedRealPriceRange}. (${priceNoteParts.join(' + ')})`;
            else augmentedSugg.priceFeasibilityNote = `AI's budget \$${conceptualBudget.toLocaleString()} seems reasonable. Estimated ~${augmentedSugg.estimatedRealPriceRange}. (${priceNoteParts.join(' + ')})`;
        } else augmentedSugg.priceFeasibilityNote = `Est. real price: ${augmentedSugg.estimatedRealPriceRange}. (${priceNoteParts.join(' + ')})`;
      } else augmentedSugg.priceFeasibilityNote = "Could not determine real-time pricing.";
    } catch (error) { augmentedSugg.priceFeasibilityNote = "Error fetching real-time price context."; console.error(`Error augmenting bundle for ${destination}:`, error); }
    augmentedSuggestions.push(augmentedSugg);
  }
  return { suggestions: augmentedSuggestions };
}

// Wrapped AI Flows (Server Actions) - Ensure types are imported if not inferred

export async function getCoTravelAgentResponse(input: CoTravelAgentInput): Promise<CoTravelAgentOutput> { return getCoTravelAgentResponseOriginal(input); }
export async function getItineraryAssistance(input: ItineraryAssistanceInput): Promise<ItineraryAssistanceOutput> { return getItineraryAssistanceOriginal(input); }
export async function generateTripSummary(input: TripSummaryInput): Promise<TripSummaryOutput> { return generateTripSummaryOriginal(input); }
export async function getPriceAdviceAction(input: PriceAdvisorInput): Promise<PriceAdvisorOutput> { return getPriceAdviceOriginal(input); }
export async function getConceptualDateGridAction(input: ConceptualDateGridInput): Promise<ConceptualDateGridOutput> { return conceptualDateGridFlowOriginal(input); }
export async function getConceptualPriceGraphAction(input: ConceptualPriceGraphInput): Promise<ConceptualPriceGraphOutput> { return conceptualPriceGraphFlowOriginal(input); }
export async function getThingsToDoAction(input: ThingsToDoSearchInput): Promise<ThingsToDoOutput> { return thingsToDoFlowOriginal(input); }


// Other flow wrappers
import { getPackingList as getPackingListFlow } from '@/ai/flows/packing-list-flow';
import type { PackingListInput, PackingListOutput } from '@/ai/flows/packing-list-flow';
export async function getPackingList(input: PackingListInput): Promise<PackingListOutput> { return getPackingListFlow(input); }

import { getDestinationFact as getDestinationFactFlow } from '@/ai/flows/destination-fact-flow';
import type { DestinationFactInput, DestinationFactOutput } from '@/ai/flows/destination-fact-flow';
export async function getDestinationFact(input: DestinationFactInput): Promise<DestinationFactOutput> { return getDestinationFactFlow(input); }

import { generateTripMemory as generateTripMemoryFlow } from '@/ai/flows/generate-trip-memory-flow';
import type { GenerateTripMemoryInput, GenerateTripMemoryOutput } from '@/ai/flows/generate-trip-memory-flow';
export async function generateTripMemory(input: GenerateTripMemoryInput): Promise<GenerateTripMemoryOutput> { return generateTripMemoryFlow(input); }

import { generateGroupSyncReport as generateGroupSyncReportFlow } from '@/ai/flows/group-sync-flow';
import type { GroupSyncInput, GroupSyncOutput } from '@/ai/flows/group-sync-flow';
export async function generateGroupSyncReport(input: GroupSyncInput): Promise<GroupSyncOutput> { return generateGroupSyncReportFlow(input); }

import { trackPrice as trackPriceFlow } from '@/ai/flows/price-tracker';
import type { PriceTrackerInput, PriceTrackerOutput } from '@/ai/flows/price-tracker';
export async function trackPrice(input: PriceTrackerInput): Promise<PriceTrackerOutput> { return trackPriceFlow(input); }

import { getPriceForecast as getPriceForecastFlow } from '@/ai/flows/price-forecast-flow';
import type { PriceForecastInput, PriceForecastOutput } from '@/ai/flows/price-forecast-flow';
export async function getPriceForecast(input: PriceForecastInput): Promise<PriceForecastOutput> { return getPriceForecastFlow(input); }

import { getTravelTip as getTravelTipFlow } from '@/ai/flows/travel-tip-flow';
import type { TravelTipInput, TravelTipOutput } from '@/ai/flows/travel-tip-flow';
export async function getTravelTip(input?: TravelTipInput): Promise<TravelTipOutput> { return getTravelTipFlow(input); }

import { getSerendipitySuggestions as getSerendipitySuggestionsFlow } from '@/ai/flows/serendipity-engine-flow';
import type { SerendipityInput, SerendipityOutput } from '@/ai/flows/serendipity-engine-flow';
export async function getSerendipitySuggestions(input: SerendipityInput): Promise<SerendipityOutput> { return getSerendipitySuggestionsFlow(input); }

import { getAuthenticityVerification as getAuthenticityVerificationFlow } from '@/ai/flows/authenticity-verifier-flow';
import type { AuthenticityVerifierInput, AuthenticityVerifierOutput } from '@/ai/flows/authenticity-verifier-flow';
export async function getAuthenticityVerification(input: AuthenticityVerifierInput): Promise<AuthenticityVerifierOutput> { return getAuthenticityVerificationFlow(input); }

import { getLocalInsiderTips as getLocalInsiderTipsFlow } from '@/ai/flows/local-insider-tips-flow';
import type { LocalInsiderTipsInput, LocalInsiderTipsOutput } from '@/ai/flows/local-insider-tips-flow';
export async function getLocalInsiderTips(input: LocalInsiderTipsInput): Promise<LocalInsiderTipsOutput> { return getLocalInsiderTipsFlow(input); }

import { generateSmartMapConcept as generateSmartMapConceptFlow } from '@/ai/flows/smart-map-concept-flow';
import type { SmartMapConceptInput, SmartMapConceptOutput } from '@/ai/flows/smart-map-concept-flow';
export async function generateSmartMapConcept(input: SmartMapConceptInput): Promise<SmartMapConceptOutput> { return generateSmartMapConceptFlow(input); }

import { getWhatIfAnalysis as getWhatIfAnalysisFlow } from '@/ai/flows/what-if-simulator-flow';
import type { WhatIfSimulatorInput, WhatIfSimulatorOutput } from '@/ai/flows/what-if-simulator-flow';
export async function getWhatIfAnalysis(input: WhatIfSimulatorInput): Promise<WhatIfSimulatorOutput> { return getWhatIfAnalysisFlow(input); }

import { getAiArPreview as getAiArPreviewFlow } from '@/ai/flows/ai-ar-preview-flow';
import type { AiArPreviewInput, AiArPreviewOutput } from '@/ai/flows/ai-ar-preview-flow';
export async function getAiArPreview(input: AiArPreviewInput): Promise<AiArPreviewOutput> { return getAiArPreviewFlow(input); }

import { optimizeDayPlanByMood as optimizeDayPlanByMoodFlow } from '@/ai/flows/mood-energy-optimizer-flow';
import type { MoodEnergyOptimizerInput, MoodEnergyOptimizerOutput } from '@/ai/flows/mood-energy-optimizer-flow';
export async function optimizeDayPlanByMood(input: MoodEnergyOptimizerInput): Promise<MoodEnergyOptimizerOutput> { return optimizeDayPlanByMoodFlow(input); }

import { getPersonalizedAccessibilityScout as getPersonalizedAccessibilityScoutFlow } from '@/ai/flows/personalized-accessibility-scout-flow';
import type { PersonalizedAccessibilityScoutInput, PersonalizedAccessibilityScoutOutput } from '@/ai/flows/personalized-accessibility-scout-flow';
export async function getPersonalizedAccessibilityScout(input: PersonalizedAccessibilityScoutInput): Promise<PersonalizedAccessibilityScoutOutput> { return getPersonalizedAccessibilityScoutFlow(input); }

import { narrateLocalLegend as narrateLocalLegendFlow } from '@/ai/flows/local-legend-narrator-flow';
import type { LocalLegendNarratorInput, LocalLegendNarratorOutput } from '@/ai/flows/local-legend-narrator-flow';
export async function narrateLocalLegend(input: LocalLegendNarratorInput): Promise<LocalLegendNarratorOutput> { return narrateLocalLegendFlow(input); }

import { synthesizePostTripFeedback as synthesizePostTripFeedbackFlow } from '@/ai/flows/post-trip-synthesizer-flow';
import type { PostTripFeedbackInput, PostTripAnalysisOutput } from '@/ai/flows/post-trip-synthesizer-flow';
export async function synthesizePostTripFeedback(input: PostTripFeedbackInput): Promise<PostTripAnalysisOutput> { return synthesizePostTripFeedbackFlow(input); }

    
