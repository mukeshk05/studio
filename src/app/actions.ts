
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

import { PriceAdvisorInput, PriceAdvisorOutput } from '@/ai/types/price-advisor-flow-types';
import { getPriceAdvice as getPriceAdviceOriginal } from '@/ai/flows/price-advisor-flow';

import { ConceptualDateGridInput, ConceptualDateGridOutput } from '@/ai/types/ai-conceptual-date-grid-types';
import { conceptualDateGridFlow as conceptualDateGridFlowOriginal } from '@/ai/flows/conceptual-date-grid-flow';

import { ConceptualPriceGraphInput, ConceptualPriceGraphOutput } from '@/ai/types/ai-conceptual-price-graph-types';
import { conceptualPriceGraphFlow as conceptualPriceGraphFlowOriginal } from '@/ai/flows/conceptual-price-graph-flow';

import { CoTravelAgentInput, CoTravelAgentOutput } from '@/ai/types/co-travel-agent-types';
import { getCoTravelAgentResponse as getCoTravelAgentResponseOriginal } from '@/ai/flows/co-travel-agent-flow';

import { ItineraryAssistanceInput, ItineraryAssistanceOutput } from '@/ai/types/itinerary-assistance-types';
import { getItineraryAssistance as getItineraryAssistanceOriginal } from '@/ai/flows/itinerary-assistance-flow';

import { TripSummaryInput, TripSummaryOutput } from '@/ai/types/trip-summary-types';
import { generateTripSummary as generateTripSummaryOriginal } from '@/ai/flows/trip-summary-flow';

import { SmartBundleInput, SmartBundleOutput } from '@/ai/types/smart-bundle-types';
import { smartBundleFlow as smartBundleFlowOriginal } from '@/ai/flows/smart-bundle-flow';
import type { BundleSuggestion } from '@/ai/types/smart-bundle-types';

import { ThingsToDoSearchInput, ThingsToDoOutput } from '@/ai/types/things-to-do-types';
import { thingsToDoFlow as thingsToDoFlowOriginal } from '@/ai/flows/things-to-do-flow';
import type { FlightOption, HotelOption } from '@/lib/types'; 

import { format, addDays, parse, differenceInDays, addMonths, isBefore, isValid, parseISO } from 'date-fns'; // Added isValid, parseISO

const CACHE_EXPIRY_DAYS_API = 30;
const CACHE_EXPIRY_DAYS_IMAGE = 30;
const CACHE_EXPIRY_DAYS_IATA = 30;

const CACHE_EXPIRY_HOURS_API = CACHE_EXPIRY_DAYS_API * 24;
const CACHE_EXPIRY_HOURS_IMAGE = CACHE_EXPIRY_DAYS_IMAGE * 24;
const CACHE_EXPIRY_HOURS_IATA = CACHE_EXPIRY_DAYS_IATA * 24;


export interface ImageRequest {
  id: string;
  promptText: string;
  styleHint: 'hero' | 'featureCard' | 'destination' | 'general';
}

// Helper function to normalize parts of cache keys
const normalizeCacheKeyPart = (part?: string): string => {
  if (!part || typeof part !== 'string') return 'unknown';
  return part.trim().toLowerCase().replace(/[\s,.]+/g, '_').replace(/[^a-z0-9_-]/g, '');
};


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
          const imageDocsQuery = query(collection(firestore, 'imageCache'), where(documentId(), 'in', chunkOfIds));
          const imageDocsSnap = await getDocs(imageDocsQuery);
          imageDocsSnap.forEach(docSnap => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              const originalRequest = requests.find(r => r.id === docSnap.id);
              const cachedAt = (data.cachedAt as Timestamp)?.toDate();
              const now = new Date();
              const hoursDiff = cachedAt ? (now.getTime() - cachedAt.getTime()) / (1000 * 60 * 60) : CACHE_EXPIRY_HOURS_IMAGE +1;

              if (data.imageUri && originalRequest?.styleHint === data.styleHint && hoursDiff < CACHE_EXPIRY_HOURS_IMAGE) {
                 imageUris[docSnap.id] = data.imageUri;
                 console.log(`[DB Check - Landing] Cache HIT for ID: ${docSnap.id}`);
              } else {
                if (originalRequest && !aiGenerationQueue.find(q => q.id === docSnap.id)) {
                     aiGenerationQueue.push({ id: originalRequest.id, prompt: originalRequest.promptText, styleHint: originalRequest.styleHint });
                     console.log(`[DB Check - Landing] Cache STALE/MISMATCH for ID: ${docSnap.id}. Queued for AI.`);
                }
              }
            }
          });
          chunkOfIds.forEach(idInChunk => {
            if (imageUris[idInChunk] === null) { 
                const originalRequest = requests.find(r => r.id === idInChunk);
                if (originalRequest && !aiGenerationQueue.find(q => q.id === idInChunk)) {
                    aiGenerationQueue.push({ id: originalRequest.id, prompt: originalRequest.promptText, styleHint: originalRequest.styleHint });
                    console.log(`[DB Check - Landing] Cache MISS for ID: ${idInChunk}. Queued for AI.`);
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
      console.warn("[LandingPageImages] Firestore is not available. Queuing all images for AI generation.");
      requests.forEach(req => aiGenerationQueue.push({ id: req.id, prompt: req.promptText, styleHint: req.styleHint }));
    }

    requests.forEach(req => {
      if (imageUris[req.id] === null && !aiGenerationQueue.find(q => q.id === req.id)) {
        aiGenerationQueue.push({ id: req.id, prompt: req.promptText, styleHint: req.styleHint });
        console.log(`[LandingPageImages] Fallback: Queued ${req.id} for AI as it was not satisfied by cache.`);
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
            if (originalRequest && firestore) { 
              const imageCacheKey = aiResult.id;
              const cacheDocRef = doc(firestore, 'imageCache', imageCacheKey);
              const dataToCache = {
                  imageUri: aiResult.imageUri,
                  promptUsed: originalRequest.promptText,
                  styleHint: originalRequest.styleHint,
                  cachedAt: serverTimestamp(),
              };
              console.log(`[Server Action - Landing Img] Attempting to SAVE to cache for key: ${imageCacheKey}. Data:`, JSON.stringify(dataToCache));
              setDoc(cacheDocRef, dataToCache, { merge: true })
              .then(() => console.log(`[Server Action - Landing Img] Successfully SAVED to cache for key: ${imageCacheKey}`))
              .catch(dbSaveError => console.error(`[Server Action - Landing Img Save Error] Firestore save failed for ${imageCacheKey}:`, dbSaveError));
            }
          }
        });
      } catch (flowError: any) {
        console.error('[Server Action - Landing Img AI Error] Error calling generateMultipleImagesAction. Error: ', flowError.message);
        aiGenerationQueue.forEach(req => {
          if (imageUris[req.id] === null) imageUris[req.id] = null; 
        });
      }
    }
    return imageUris;
  } catch (topLevelError: any) {
    console.error('[Server Action - getLandingPageImagesWithFallback] TOP LEVEL CRITICAL ERROR:', topLevelError.message);
    const fallbackUris: Record<string, string | null> = {};
    requests.forEach(req => fallbackUris[req.id] = null);
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
  } catch (e) {
    console.error("[Action Error] Failed to get real price context for map deals:", e);
  }
  return aiFlightMapDealsFlow(flowInput);
}

function deriveStopsDescription(flightOption: SerpApiFlightOption): string {
    const legs = flightOption.flights || [];
    if (legs.length === 0) return "Unknown stops";
    if (legs.length === 1 && (!flightOption.layovers || flightOption.layovers.length === 0)) return "Non-stop";
    if (legs.length === 2 && (!flightOption.layovers || flightOption.layovers.length === 0) && flightOption.type === 'Round trip') {
        if(legs[0]?.arrival_airport?.name === legs[1]?.departure_airport?.name && legs[0]?.departure_airport?.name === legs[1]?.arrival_airport?.name) {
            return "Non-stop (each way)";
        }
    }
    const numStops = (flightOption.layovers?.length || Math.max(0, legs.length - 1));
    if (numStops <= 0 && legs.length <= 2) return "Non-stop";
    let stopsDesc = `${numStops} stop${numStops > 1 ? 's' : ''}`;
    if (flightOption.layovers && flightOption.layovers.length > 0) {
        const layoverAirports = flightOption.layovers.map(l => l.name || l.id || "Airport").join(', ');
        if (layoverAirports) stopsDesc += ` in ${layoverAirports}`;
    }
    return stopsDesc;
}

export async function getIataCodeAction(placeName: string): Promise<string | null> {
  if (!placeName || placeName.trim().length < 2) return null;
  const normalizedPlaceNameKey = normalizeCacheKeyPart(placeName);
  const cacheKey = `iata_${normalizedPlaceNameKey}`;
  const cacheCollectionName = 'iataCodeCache';
  console.log(`[getIataCodeAction] Attempting for place: "${placeName}", normalized key part: "${normalizedPlaceNameKey}", full cache key: "${cacheKey}"`);

  if (firestore) {
    const cacheDocRef = doc(firestore, cacheCollectionName, cacheKey);
    console.log(`[Cache Read - IATA] Attempting to read from Firestore for key: ${cacheKey}`);
    try {
      const docSnap = await getDoc(cacheDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const cachedAt = (data.cachedAt as Timestamp)?.toDate();
        if (cachedAt) {
          const now = new Date();
          const hoursDiff = (now.getTime() - cachedAt.getTime()) / (1000 * 60 * 60);
          console.log(`[Cache Read - IATA] Found cache entry for ${cacheKey}. Age: ${hoursDiff.toFixed(1)} hours. Max age: ${CACHE_EXPIRY_HOURS_IATA} hours. CachedAt: ${cachedAt.toISOString()}, Now: ${now.toISOString()}`);
          if (hoursDiff < CACHE_EXPIRY_HOURS_IATA && data.iataCode) {
            console.log(`[Cache HIT - IATA] For key: ${cacheKey}, Code: ${data.iataCode}`);
            return data.iataCode;
          }
          console.log(`[Cache STALE - IATA] For key: ${cacheKey}. Will fetch fresh data.`);
        } else {
          console.log(`[Cache Read - IATA] Cache entry for ${cacheKey} has no valid cachedAt. Will fetch fresh data.`);
        }
      } else {
        console.log(`[Cache MISS - IATA] For key: ${cacheKey}. Will fetch fresh data.`);
      }
    } catch (e: any) {
      console.error(`[Cache Read Error - IATA] For key ${cacheKey}:`, e.message, e);
    }
  } else {
    console.warn("[getIataCodeAction] Firestore instance is not available. Skipping cache check.");
  }

  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey || apiKey === "YOUR_SERPAPI_API_KEY_PLACEHOLDER") {
    console.warn("[getIataCodeAction] SerpApi key not found or is placeholder. Cannot fetch IATA code.");
    return null;
  }
  const params = { engine: "google_flights_travel_partners", q: `IATA code for ${placeName.trim()}`, api_key: apiKey };
  console.log(`[SerpApi - IATA] Calling SerpApi for: "${placeName.trim()}" with params:`, params);
  try {
    const response = await getSerpApiJson(params);
    let iataCode: string | null = null;
    if (response.answer_box?.answer) { const m = response.answer_box.answer.match(/\b([A-Z]{3})\b/); if (m) iataCode = m[1]; }
    if (!iataCode && response.knowledge_graph?.iata_code) iataCode = response.knowledge_graph.iata_code;
    if (!iataCode && response.knowledge_graph?.description) { const m = response.knowledge_graph.description.match(/IATA: ([A-Z]{3})/i); if (m) iataCode = m[1];}
    if (!iataCode && response.organic_results?.length) {
      for (const r of response.organic_results) {
        if (r.snippet) { const m = r.snippet.match(/\b([A-Z]{3})\b is the IATA code/i) || r.snippet.match(/IATA code: ([A-Z]{3})/i) || r.snippet.match(/airport code ([A-Z]{3})/i); if (m) { iataCode = m[1]; break; } }
        if (r.title) { const m = r.title.match(/\(([A-Z]{3})\)/i); if (m) { iataCode = m[1]; break; } }
      }
    }
    if (!iataCode && /^[A-Z]{3}$/.test(placeName.trim().toUpperCase())) iataCode = placeName.trim().toUpperCase();

    if (iataCode && firestore) {
      const cacheDocRef = doc(firestore, cacheCollectionName, cacheKey);
      const dataToCache = { iataCode, cachedAt: serverTimestamp(), queryKey: normalizedPlaceNameKey, originalQuery: placeName.trim() };
      console.log(`[Cache Write - IATA] Attempting to SAVE to cache. Key: ${cacheKey}, Data:`, JSON.stringify(dataToCache));
      try {
        await setDoc(cacheDocRef, dataToCache);
        console.log(`[Cache Write - IATA] Successfully SAVED to cache. Key: ${cacheKey}`);
      } catch (e: any) {
        console.error(`[Cache Write Error - IATA] For ${cacheKey}:`, e.message, e);
      }
    }
    console.log(`[SerpApi - IATA] Fetched for "${placeName.trim()}": ${iataCode}`);
    return iataCode;
  } catch (error: any) {
    console.error(`Error fetching IATA for "${placeName.trim()}" from SerpApi:`, error.message, error);
    return null;
  }
}

const parsePrice = (priceValue: any): number | undefined => {
    if (priceValue === null || priceValue === undefined) return undefined;
    if (typeof priceValue === 'number') return isNaN(priceValue) ? undefined : priceValue;
    if (typeof priceValue === 'string') {
        if (priceValue.trim() === "") return undefined;
        const cleanedString = priceValue.replace(/[^0-9.-]/g, ''); // Allow for negative if ever needed, keep decimal
        if (cleanedString === '') return undefined;
        const num = parseFloat(cleanedString);
        return isNaN(num) ? undefined : num;
    }
    return undefined;
};

export async function getRealFlightsAction(input: SerpApiFlightSearchInput): Promise<SerpApiFlightSearchOutput> {
  console.log('[Server Action - getRealFlightsAction] Input:', input);
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey || apiKey === "YOUR_SERPAPI_API_KEY_PLACEHOLDER") {
    console.error('[Server Action - getRealFlightsAction] SerpApi API key is not configured.');
    return { error: "Flight search service is not configured." };
  }

  const originKeyPart = normalizeCacheKeyPart(input.origin);
  const destinationKeyPart = normalizeCacheKeyPart(input.destination);
  const cacheKey = `flights_${originKeyPart}_${destinationKeyPart}_${input.departureDate}_${input.returnDate || 'ow'}_${input.tripType || 'rt'}`;
  const cacheCollectionName = 'serpApiFlightsCache';
  
  console.log(`[Cache Read - Flights] Using normalized parts: origin="${originKeyPart}", dest="${destinationKeyPart}"`);
  console.log(`[Cache Read - Flights] Attempting to read from Firestore for key: ${cacheKey}`);

  if (firestore) {
    const cacheDocRef = doc(firestore, cacheCollectionName, cacheKey);
    try {
      const docSnap = await getDoc(cacheDocRef);
      if (docSnap.exists()) {
        const cacheData = docSnap.data();
        const cachedAt = (cacheData.cachedAt as Timestamp)?.toDate();
        if (cachedAt) {
          const now = new Date();
          const hoursDiff = (now.getTime() - cachedAt.getTime()) / (1000 * 60 * 60);
          console.log(`[Cache Read - Flights] Found cache entry for ${cacheKey}. Age: ${hoursDiff.toFixed(1)} hours. Max age: ${CACHE_EXPIRY_HOURS_API} hours. CachedAt: ${cachedAt.toISOString()}, Now: ${now.toISOString()}`);
          if (hoursDiff < CACHE_EXPIRY_HOURS_API) {
            console.log(`[Cache HIT - Flights] For key: ${cacheKey}. Returning cached data.`);
            return cacheData.data as SerpApiFlightSearchOutput;
          }
          console.log(`[Cache STALE - Flights] For key: ${cacheKey}. Fetching fresh data.`);
        } else {
          console.log(`[Cache Read - Flights] Cache entry for ${cacheKey} has no valid cachedAt. Fetching fresh data.`);
        }
      } else {
        console.log(`[Cache MISS - Flights] For key: ${cacheKey}. Fetching fresh data.`);
      }
    } catch (cacheError: any) {
      console.error(`[Cache Read Error - Flights] For key ${cacheKey}:`, cacheError.message, cacheError);
    }
  } else {
    console.warn("[Server Action - getRealFlightsAction] Firestore instance is not available. Skipping cache check.");
  }

  const params: any = {
    engine: "google_flights", departure_id: input.origin, arrival_id: input.destination,
    outbound_date: input.departureDate, currency: input.currency || "USD", hl: input.hl || "en", api_key: apiKey,
  };
  if (input.tripType === "round-trip" && input.returnDate) params.return_date = input.returnDate;

  console.log('[Server Action - getRealFlightsAction] Parameters sent to SerpApi:', params);
  try {
    const response = await getSerpApiJson(params);
    console.log('[Server Action - getRealFlightsAction] RAW SerpApi Flight Response:', JSON.stringify(response, null, 2).substring(0, 1000) + "...");

    if (response.error) {
      console.error('[Server Action - getRealFlightsAction] SerpApi returned an error:', response.error);
      return { error: `SerpApi error: ${response.error}` };
    }

    const processFlights = (flightArray: any[] | undefined): SerpApiFlightOption[] => {
        if (!flightArray || flightArray.length === 0) return [];
        return flightArray.map((flight: any): SerpApiFlightOption => {
            const legsArray = flight.flights || flight.segments || [];
            const firstLeg = legsArray[0]; const lastLeg = legsArray[legsArray.length - 1];
            const processedFlight: SerpApiFlightOption = {
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
            return processedFlight;
        }).filter(fo => fo.price != null && (fo.derived_departure_airport_name != null || (fo.flights && fo.flights.length > 0)));
    }

    let bestFlightsProcessed = processFlights(response.best_flights);
    let otherFlightsProcessed = processFlights(response.other_flights);
    if (bestFlightsProcessed.length === 0 && otherFlightsProcessed.length === 0 && response.flights?.length > 0) {
        otherFlightsProcessed = processFlights(response.flights);
    }

    const output: SerpApiFlightSearchOutput = {
      search_summary: response.search_information?.displayed_query || `Found ${bestFlightsProcessed.length + otherFlightsProcessed.length} flight options.`,
      best_flights: bestFlightsProcessed.length > 0 ? bestFlightsProcessed : undefined,
      other_flights: otherFlightsProcessed.length > 0 ? otherFlightsProcessed : undefined,
      price_insights: response.price_insights,
    };

    if (firestore && (output.best_flights || output.other_flights)) {
      const cacheDocRef = doc(firestore, cacheCollectionName, cacheKey);
      const dataToCache = { data: output, cachedAt: serverTimestamp(), queryKey };
      console.log(`[Cache Write - Flights] Attempting to SAVE to cache for key: ${cacheKey}. Data preview:`, output.best_flights ? output.best_flights[0] : output.other_flights ? output.other_flights[0] : 'No flights in output');
      try {
        await setDoc(cacheDocRef, dataToCache, { merge: true });
        console.log(`[Cache Write - Flights] Successfully SAVED to cache for key: ${cacheKey}`);
      } catch (cacheWriteError: any) {
        console.error(`[Cache Write Error - Flights] For key ${cacheKey}:`, cacheWriteError.message, cacheWriteError);
      }
    }
    return output;
  } catch (error: any) {
    console.error('[Server Action - getRealFlightsAction] Error calling SerpApi or processing:', error.message, error);
    return { error: `Failed to fetch flights: ${error.message || 'Unknown error'}` };
  }
}

export async function getRealHotelsAction(input: SerpApiHotelSearchInput): Promise<SerpApiHotelSearchOutput> {
  console.log('[Server Action - getRealHotelsAction] Received input:', JSON.stringify(input, null, 2));
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey || apiKey === "YOUR_SERPAPI_API_KEY_PLACEHOLDER") {
    console.error('[Server Action - getRealHotelsAction] SerpApi API key is not configured.');
    return { hotels: [], error: "Hotel search service is not configured." };
  }

  const destinationKeyPart = normalizeCacheKeyPart(input.destination);
  const guestsKeyPart = input.guests ? normalizeCacheKeyPart(input.guests) : '2'; // Normalize guests or use default
  const cacheKey = `hotels_${destinationKeyPart}_${input.checkInDate}_${input.checkOutDate}_${guestsKeyPart}`;
  const cacheCollectionName = 'serpApiHotelsCache';

  console.log(`[Cache Read - Hotels] Using normalized parts: dest="${destinationKeyPart}", guests="${guestsKeyPart}"`);
  console.log(`[Cache Read - Hotels] Attempting to read from Firestore for key: ${cacheKey}`);

  if (firestore) {
    const cacheDocRef = doc(firestore, cacheCollectionName, cacheKey);
    try {
      const docSnap = await getDoc(cacheDocRef);
      if (docSnap.exists()) {
        const cacheData = docSnap.data();
        const cachedAt = (cacheData.cachedAt as Timestamp)?.toDate();
        if (cachedAt) {
          const now = new Date();
          const hoursDiff = (now.getTime() - cachedAt.getTime()) / (1000 * 60 * 60);
          console.log(`[Cache Read - Hotels] Found cache entry for ${cacheKey}. Age: ${hoursDiff.toFixed(1)} hours. Max age: ${CACHE_EXPIRY_HOURS_API} hours. CachedAt: ${cachedAt.toISOString()}, Now: ${now.toISOString()}`);
          if (hoursDiff < CACHE_EXPIRY_HOURS_API) {
            console.log(`[Cache HIT - Hotels] For key: ${cacheKey}. Returning cached data.`);
            return cacheData.data as SerpApiHotelSearchOutput;
          }
           console.log(`[Cache STALE - Hotels] For key: ${cacheKey}. Fetching fresh data.`);
        } else {
           console.log(`[Cache Read - Hotels] Cache entry for ${cacheKey} has no valid cachedAt. Fetching fresh data.`);
        }
      } else {
        console.log(`[Cache MISS - Hotels] For key: ${cacheKey}. Fetching fresh data.`);
      }
    } catch (cacheError: any) {
      console.error(`[Cache Read Error - Hotels] For key ${cacheKey}:`, cacheError.message, cacheError);
    }
  } else {
    console.warn("[Server Action - getRealHotelsAction] Firestore instance is not available. Skipping cache check.");
  }

  const params: any = {
    engine: "google_hotels", q: input.destination, check_in_date: input.checkInDate, check_out_date: input.checkOutDate,
    adults: input.guests || "2", currency: input.currency || "USD", hl: input.hl || "en", api_key: apiKey,
  };
  console.log('[Server Action - getRealHotelsAction] Parameters being sent to SerpApi:', params);

  try {
    const response = await getSerpApiJson(params);
    console.log('[Server Action - getRealHotelsAction] RAW SerpApi Hotel Response:', JSON.stringify(response, null, 2).substring(0, 500) + "...");

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
      error: hotels.length === 0 && !response.error ? "No hotels found by SerpApi for this query." : undefined,
    };

    if (firestore && output.hotels && output.hotels.length > 0) {
      const cacheDocRef = doc(firestore, cacheCollectionName, cacheKey);
      const dataToCache = { data: output, cachedAt: serverTimestamp(), queryKey };
      console.log(`[Cache Write - Hotels] Attempting to SAVE to cache for key: ${cacheKey}. Data preview:`, output.hotels ? output.hotels[0] : 'No hotels in output');
      try {
        await setDoc(cacheDocRef, dataToCache, { merge: true });
        console.log(`[Cache Write - Hotels] Successfully SAVED to cache for key: ${cacheKey}`);
      } catch (cacheWriteError: any) {
        console.error(`[Cache Write Error - Hotels] For key ${cacheKey}:`, cacheWriteError.message, cacheWriteError);
      }
    }
    return output;
  } catch (error: any) {
    console.error('[Server Action - getRealHotelsAction] Error calling SerpApi or processing hotels:', error.message, error);
    return { hotels: [], error: `Failed to fetch hotels: ${error.message || 'Unknown error'}` };
  }
}

export async function generateMultipleImagesAction(input: MultipleImagesInput): Promise<MultipleImagesOutput> {
  console.log(`[Server Action - generateMultipleImagesAction] Starting generation for ${input.prompts.length} images.`);
  const results: ImageResultItem[] = [];
  const batchSize = 5; 
  const cacheCollectionName = 'imageCache';

  for (let i = 0; i < input.prompts.length; i += batchSize) {
      const batch = input.prompts.slice(i, i + batchSize);
      console.log(`[Server Action - generateMultipleImagesAction] Processing batch ${Math.floor(i / batchSize) + 1} (size: ${batch.length})`);

      const batchPromises = batch.map(async (item): Promise<ImageResultItem> => {
          const imageCacheKey = item.id; 
          console.log(`[Server Action - generateMultipleImagesAction] Processing item ID (cache key): ${imageCacheKey}`);

          if (imageCacheKey && firestore) {
              const cacheDocRef = doc(firestore, cacheCollectionName, imageCacheKey);
              console.log(`[Cache Read - Images] Attempting to read from Firestore for key: ${imageCacheKey}`);
              try {
                  const docSnap = await getDoc(cacheDocRef);
                  if (docSnap.exists()) {
                      const cacheData = docSnap.data();
                      const cachedAt = (cacheData.cachedAt as Timestamp)?.toDate();
                      if(cachedAt) {
                        const now = new Date();
                        const hoursDiff = (now.getTime() - cachedAt.getTime()) / (1000 * 60 * 60);
                        console.log(`[Cache Read - Images] Found image cache entry for ${imageCacheKey}. Age: ${hoursDiff.toFixed(1)} hours. Max age: ${CACHE_EXPIRY_HOURS_IMAGE} hours. CachedAt: ${cachedAt.toISOString()}, Prompt: ${cacheData.promptUsed}, Style: ${cacheData.styleHint}`);
                        if (hoursDiff < CACHE_EXPIRY_HOURS_IMAGE && cacheData.imageUri && cacheData.promptUsed === item.prompt && cacheData.styleHint === item.styleHint) {
                            console.log(`[Cache HIT - Images] For key: ${imageCacheKey}`);
                            return { id: item.id, imageUri: cacheData.imageUri };
                        }
                        console.log(`[Cache STALE - Images] For key: ${imageCacheKey}. Will regenerate.`);
                      } else {
                         console.log(`[Cache Read - Images] Cache entry for ${imageCacheKey} has no valid cachedAt. Will regenerate.`);
                      }
                  } else {
                      console.log(`[Cache MISS - Images] For key: ${imageCacheKey}. Will regenerate.`);
                  }
              } catch (cacheError: any) {
                  console.error(`[Cache Read Error - Images] For key ${imageCacheKey}:`, cacheError.message, cacheError);
              }
          } else {
             console.log(`[Server Action - generateMultipleImagesAction] No imageCacheKey or Firestore instance, proceeding to generate image for ID: ${item.id}`);
          }

          let fullPrompt = item.prompt;
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
              console.log(`[Server Action - generateMultipleImagesAction] Calling Genkit AI for ID: ${item.id}, Full Prompt: "${fullPrompt}"`);
              const singleItemInput: MultipleImagesInput = { prompts: [{...item, prompt: fullPrompt }] }; 
              const aiFlowResult = await generateMultipleImagesFlowOriginal(singleItemInput);
              const mediaUrl = aiFlowResult.results[0]?.imageUri;

              if (mediaUrl) {
                  console.log(`[Server Action - generateMultipleImagesAction] AI Success for ID: ${item.id}.`);
                  if (imageCacheKey && firestore) {
                      const cacheDocRef = doc(firestore, cacheCollectionName, imageCacheKey);
                      const dataToCache = { imageUri: mediaUrl, promptUsed: item.prompt, styleHint: item.styleHint as string, cachedAt: serverTimestamp() };
                      console.log(`[Cache Write - Images] Attempting to SAVE image to cache for key: ${imageCacheKey}. Data:`, JSON.stringify(dataToCache));
                      try {
                          await setDoc(cacheDocRef, dataToCache, { merge: true });
                          console.log(`[Cache Write - Images] Successfully SAVED image to cache for key: ${imageCacheKey}`);
                      } catch (cacheWriteError: any) {
                          console.error(`[Cache Write Error - Images] For key ${imageCacheKey}:`, cacheWriteError.message, cacheWriteError);
                      }
                  }
                  return { id: item.id, imageUri: mediaUrl };
              } else {
                  console.warn(`[Server Action - generateMultipleImagesAction] Image generation for ID: ${item.id} did NOT return a media URL from AI flow.`);
                  return { id: item.id, imageUri: null, error: 'No media URL returned by AI.' };
              }
          } catch (error: any) {
              console.error(`[Server Action - generateMultipleImagesAction] FAILED to generate image for ID: ${item.id}:`, error.message, error);
              return { id: item.id, imageUri: null, error: error.message || 'Unknown error during image generation.' };
          }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
  }

  console.log(`[Server Action - generateMultipleImagesAction] Finished generation. Total results: ${results.length}`);
  return { results };
}

function parseTravelDatesForSerpApi(travelDates: string): { departureDate: string; returnDate?: string; durationDays: number } {
    const now = new Date();
    now.setHours(0,0,0,0);

    let fromDate: Date = addDays(now, 30); 
    let toDate: Date | undefined = addDays(fromDate, 6); 
    let durationDays: number = 7;
    let isRoundTrip = true;

    if (!travelDates || travelDates.trim() === "") {
      return { departureDate: format(fromDate, "yyyy-MM-dd"), returnDate: format(toDate, "yyyy-MM-dd"), durationDays };
    }
    
    const lowerTravelDates = travelDates.toLowerCase();

    const specificDateRangeMatch = lowerTravelDates.match(/(\d{1,2}[\/\-.]\d{1,2}(?:[\/\-.]\d{2,4})?)\s*(?:to|-|until|&)\s*(\d{1,2}[\/\-.]\d{1,2}(?:[\/\-.]\d{2,4})?)/i);
    if (specificDateRangeMatch) {
        try {
            const d1Str = specificDateRangeMatch[1];
            const d2Str = specificDateRangeMatch[2];
            let d1Candidate = parseISO(new Date(d1Str).toISOString()); 
            let d2Candidate = parseISO(new Date(d2Str).toISOString());

            if (isValid(d1Candidate) && isBefore(d1Candidate, now)) d1Candidate = addYears(d1Candidate, 1);
            if (isValid(d2Candidate) && isBefore(d2Candidate, d1Candidate)) d2Candidate = addYears(d2Candidate, 1);
            
            if (isValid(d1Candidate) && isValid(d2Candidate)) {
                fromDate = d1Candidate;
                toDate = d2Candidate;
                durationDays = differenceInDays(toDate, fromDate) + 1;
                return { departureDate: format(fromDate, "yyyy-MM-dd"), returnDate: format(toDate, "yyyy-MM-dd"), durationDays };
            }
        } catch (e) { console.warn("Could not parse specific date range from:", travelDates, e); }
    }
    
    const durationKeywordMatch = lowerTravelDates.match(/(?:for\s+)?(\d+)\s*(day|week|month)s?/i);
    if (durationKeywordMatch) {
        const num = parseInt(durationKeywordMatch[1], 10);
        const unit = durationKeywordMatch[2].toLowerCase();
        if (unit.startsWith('week')) durationDays = num * 7;
        else if (unit.startsWith('month')) durationDays = num * 30; 
        else durationDays = num;
    }

    if (lowerTravelDates.includes("next month")) fromDate = startOfMonth(addMonths(now, 1));
    else if (lowerTravelDates.includes("this month")) {
        fromDate = startOfMonth(now);
        if (isBefore(fromDate, now) && now.getDate() !== 1) fromDate = addDays(now,1);
    } else if (lowerTravelDates.includes("next weekend")) {
        fromDate = startOfWeek(addDays(now, 7), { weekStartsOn: 5 }); 
        durationDays = 3;
    } else if (lowerTravelDates.includes("this weekend")) {
         fromDate = startOfWeek(now, { weekStartsOn: 5 });
         if (isBefore(fromDate, now)) fromDate = addDays(fromDate, 7);
         durationDays = 3;
    } else {
        const inXTimeMatch = lowerTravelDates.match(/in\s+(\d+)\s*(days?|weeks?|months?)/i);
        if (inXTimeMatch) {
            const num = parseInt(inXTimeMatch[1], 10);
            const unit = inXTimeMatch[2].toLowerCase();
            if (unit.startsWith('day')) fromDate = addDays(now, num);
            else if (unit.startsWith('week')) fromDate = addDays(now, num * 7);
            else if (unit.startsWith('month')) fromDate = addMonths(now, num);
        } else {
           const monthNameMatch = lowerTravelDates.match(/(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)/i);
           if (monthNameMatch) {
             const monthIdx = new Date(Date.parse(monthNameMatch[0] + " 1, 2000")).getMonth();
             let year = now.getFullYear();
             let tempFrom = new Date(year, monthIdx, 1);
             const dayOfMonthMatch = lowerTravelDates.match(new RegExp(monthNameMatch[0] + "\\s*(\\d{1,2})(?:st|nd|rd|th)?(?:,\\s*(\\d{4}))?", "i"));
             if (dayOfMonthMatch && dayOfMonthMatch[1]) {
                try { tempFrom.setDate(parseInt(dayOfMonthMatch[1],10)); } catch(e){}
                if (dayOfMonthMatch[2]) tempFrom.setFullYear(parseInt(dayOfMonthMatch[2],10));
             }
             if(isBefore(tempFrom, now) && !dayOfMonthMatch?.[2] && !lowerTravelDates.match(/\d{4}/) ) tempFrom.setFullYear(year + 1);
             if (isValid(tempFrom)) fromDate = tempFrom;
           }
        }
    }
    if (isBefore(fromDate, now)) fromDate = addDays(now, 7); 
    toDate = addDays(fromDate, durationDays - 1);
    return { departureDate: format(fromDate, "yyyy-MM-dd"), returnDate: isRoundTrip ? format(toDate, "yyyy-MM-dd") : undefined, durationDays };
}


export async function generateSmartBundles(input: SmartBundleInput): Promise<SmartBundleOutput> {
  console.log('[Server Action - generateSmartBundles] Input:', input);
  const conceptualBundles = await smartBundleFlowOriginal(input);

  if (!conceptualBundles.suggestions || conceptualBundles.suggestions.length === 0) return { suggestions: [] };
  const augmentedSuggestions: BundleSuggestion[] = [];

  for (const conceptualSuggestion of conceptualBundles.suggestions) {
    let augmentedSugg: BundleSuggestion = { ...conceptualSuggestion, userId: input.userId }; 
    const { destination, travelDates, budget: conceptualBudget, origin: conceptualOrigin } = conceptualSuggestion.tripIdea;
    console.log(`[Server Action - generateSmartBundles] Augmenting bundle for: ${destination}, Dates: ${travelDates}, AI Budget: ${conceptualBudget}, Conceptual Origin: ${conceptualOrigin}`);
    try {
      const parsedDates = parseTravelDatesForSerpApi(travelDates);
      console.log(`[Server Action - generateSmartBundles] Parsed dates for SerpApi: Departure ${parsedDates.departureDate}, Return ${parsedDates.returnDate}, Duration ${parsedDates.durationDays} days`);

      const originForFlight = conceptualOrigin || "NYC"; 
      const originIata = await getIataCodeAction(originForFlight);
      const destinationIata = await getIataCodeAction(destination);

      const flightResults = await getRealFlightsAction({ origin: originIata || originForFlight, destination: destinationIata || destination, departureDate: parsedDates.departureDate, returnDate: parsedDates.returnDate, tripType: "round-trip" });
      const bestFlight = flightResults.best_flights?.[0] || flightResults.other_flights?.[0];
      if (bestFlight) {
        augmentedSugg.realFlightExample = bestFlight as unknown as FlightOption; 
        console.log(`[Server Action - generateSmartBundles] Found real flight example: ${bestFlight.airline} for $${bestFlight.price}`);
      } else {
        console.log(`[Server Action - generateSmartBundles] No real flight found for ${destination}.`);
      }

      const hotelResults = await getRealHotelsAction({ destination: destinationIata || destination, checkInDate: parsedDates.departureDate, checkOutDate: parsedDates.returnDate || format(addDays(parseISO(parsedDates.departureDate), parsedDates.durationDays -1 ), "yyyy-MM-dd"), guests: "2" });
      const bestHotel = hotelResults.hotels?.[0];
      if (bestHotel) {
        augmentedSugg.realHotelExample = bestHotel as unknown as HotelOption; 
         console.log(`[Server Action - generateSmartBundles] Found real hotel example: ${bestHotel.name} for ~$${bestHotel.price_per_night}/night`);
      } else {
         console.log(`[Server Action - generateSmartBundles] No real hotel found for ${destination}.`);
      }

      let realPriceMin = 0; let priceNoteParts: string[] = [];
      if (bestFlight?.price) { realPriceMin += bestFlight.price; priceNoteParts.push(`Flight ~\$${bestFlight.price.toLocaleString()}`); } else { priceNoteParts.push("No specific flight price found."); }

      const hotelCostForStay = bestHotel?.price_per_night ? bestHotel.price_per_night * parsedDates.durationDays : (bestHotel?.total_price || 0);
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
      } else augmentedSugg.priceFeasibilityNote = "Could not determine real-time pricing from available options.";
       console.log(`[Server Action - generateSmartBundles] Bundle for ${destination} - Feasibility: ${augmentedSugg.priceFeasibilityNote}`);
    } catch (error: any) {
        augmentedSugg.priceFeasibilityNote = "Error fetching real-time price context for this bundle.";
        console.error(`[Server Action - generateSmartBundles] Error augmenting bundle for ${destination}:`, error.message, error);
    }
    augmentedSuggestions.push(augmentedSugg);
  } 
  return { suggestions: augmentedSuggestions };
}


export async function getCoTravelAgentResponse(input: CoTravelAgentInput): Promise<CoTravelAgentOutput> { return getCoTravelAgentResponseOriginal(input); }
export async function getItineraryAssistance(input: ItineraryAssistanceInput): Promise<ItineraryAssistanceOutput> { return getItineraryAssistanceOriginal(input); }
export async function generateTripSummary(input: TripSummaryInput): Promise<TripSummaryOutput> { return generateTripSummaryOriginal(input); }
export async function getPriceAdviceAction(input: PriceAdvisorInput): Promise<PriceAdvisorOutput> { return getPriceAdviceOriginal(input); }
export async function getConceptualDateGridAction(input: ConceptualDateGridInput): Promise<ConceptualDateGridOutput> { return conceptualDateGridFlowOriginal(input); }
export async function getConceptualPriceGraphAction(input: ConceptualPriceGraphInput): Promise<ConceptualPriceGraphOutput> { return conceptualPriceGraphFlowOriginal(input); }
export async function getThingsToDoAction(input: ThingsToDoSearchInput): Promise<ThingsToDoOutput> { return thingsToDoFlowOriginal(input); }

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
