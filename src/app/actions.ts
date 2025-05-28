
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

import { format, addDays, parse, differenceInDays, addMonths } from 'date-fns';

const CACHE_EXPIRY_DAYS_API = 30; 
const CACHE_EXPIRY_DAYS_IMAGE = 30;
const CACHE_EXPIRY_DAYS_IATA = 90;


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
    const imageDocRef = doc(firestore, 'imageCache', id); 
    await setDoc(imageDocRef, {
      imageUri: imageUri,
      promptUsed: promptText,
      styleHint: styleHint,
      cachedAt: serverTimestamp(), 
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
          const imageDocsQuery = query(collection(firestore, 'imageCache'), where(documentId(), 'in', chunkOfIds));
          const imageDocsSnap = await getDocs(imageDocsQuery);
          imageDocsSnap.forEach(docSnap => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              const originalRequest = requests.find(r => r.id === docSnap.id);
              const cachedAt = (data.cachedAt as Timestamp)?.toDate();
              const now = new Date();
              const daysDiff = cachedAt ? (now.getTime() - cachedAt.getTime()) / (1000 * 60 * 60 * 24) : CACHE_EXPIRY_DAYS_IMAGE +1;

              if (data.imageUri && originalRequest?.styleHint === data.styleHint && daysDiff < CACHE_EXPIRY_DAYS_IMAGE) {
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
  const normalizedPlaceName = placeName.trim().toLowerCase();
  const cacheKey = `iata_${normalizedPlaceName.replace(/[^a-z0-9]/g, '_')}`;
  const cacheCollection = 'iataCodeCache';

  if (firestore) {
    const cacheDocRef = doc(firestore, cacheCollection, cacheKey);
    try {
      const docSnap = await getDoc(cacheDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const cachedAt = (data.cachedAt as Timestamp)?.toDate();
        if (cachedAt) {
          const now = new Date();
          const daysDiff = (now.getTime() - cachedAt.getTime()) / (1000 * 60 * 60 * 24);
          if (daysDiff < CACHE_EXPIRY_DAYS_IATA) {
            console.log(`[Cache HIT - IATA] For: ${normalizedPlaceName}, Key: ${cacheKey}, Code: ${data.iataCode}`);
            return data.iataCode;
          }
          console.log(`[Cache STALE - IATA] For: ${normalizedPlaceName}, Key: ${cacheKey}`);
        }
      } else {
        console.log(`[Cache MISS - IATA] For: ${normalizedPlaceName}, Key: ${cacheKey}`);
      }
    } catch (e) {
      console.error(`[Cache Read Error - IATA] For ${cacheKey}:`, e);
    }
  }

  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) { console.warn("[getIataCodeAction] SerpApi key not found."); return null; }
  const params = { engine: "google", q: `IATA code for ${normalizedPlaceName} airport`, api_key: apiKey };
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
    if (!iataCode && /^[A-Z]{3}$/.test(normalizedPlaceName.toUpperCase())) iataCode = normalizedPlaceName.toUpperCase();
    
    if (iataCode && firestore) {
      const cacheDocRef = doc(firestore, cacheCollection, cacheKey);
      try {
        console.log(`[Cache Write - IATA] Attempting to SAVE to cache. Key: ${cacheKey}, Code: ${iataCode}`);
        await setDoc(cacheDocRef, { iataCode, cachedAt: serverTimestamp(), queryKey: normalizedPlaceName });
        console.log(`[Cache Write - IATA] Successfully SAVED to cache. Key: ${cacheKey}`);
      } catch (e) {
        console.error(`[Cache Write Error - IATA] For ${cacheKey}:`, e);
      }
    }
    console.log(`[SerpApi - IATA] Fetched for ${normalizedPlaceName}: ${iataCode}`);
    return iataCode;
  } catch (error) { console.error(`Error fetching IATA for ${normalizedPlaceName}:`, error); return null; }
}

const parsePrice = (priceValue: any): number | undefined => {
    if (priceValue === null || priceValue === undefined) return undefined;
    if (typeof priceValue === 'number') return isNaN(priceValue) ? undefined : priceValue;
    if (typeof priceValue === 'string') {
        if (priceValue.trim() === "") return undefined;
        const cleanedString = priceValue.replace(/[^0-9.]/g, ''); 
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

  const cacheKey = `flights_${(input.origin || 'any').replace(/[^a-zA-Z0-9]/g, '')}_${(input.destination || 'any').replace(/[^a-zA-Z0-9]/g, '')}_${input.departureDate}_${input.returnDate || 'ow'}_${input.tripType || 'rt'}`;
  const cacheCollection = 'serpApiFlightsCache';
  
  if (firestore) {
    const cacheDocRef = doc(firestore, cacheCollection, cacheKey);
    console.log(`[Cache Read - Flights] Attempting to read for key: ${cacheKey}`);
    try {
      const docSnap = await getDoc(cacheDocRef);
      console.log(`[Cache Read - Flights] Doc exists for key ${cacheKey}: ${docSnap.exists()}`);
      if (docSnap.exists()) {
        const cacheData = docSnap.data();
        const cachedAt = (cacheData.cachedAt as Timestamp)?.toDate();
        if (cachedAt) {
          const now = new Date();
          const daysDiff = (now.getTime() - cachedAt.getTime()) / (1000 * 60 * 60 * 24);
          console.log(`[Cache Read - Flights] Found cache entry for ${cacheKey}. Age: ${daysDiff.toFixed(1)} days. Max age: ${CACHE_EXPIRY_DAYS_API}`);
          if (daysDiff < CACHE_EXPIRY_DAYS_API) {
            console.log(`[Cache HIT - Flights] For key: ${cacheKey}. Returning cached data.`);
            return cacheData.data as SerpApiFlightSearchOutput;
          }
          console.log(`[Cache STALE - Flights] For key: ${cacheKey}. Fetching fresh data.`);
        } else {
          console.log(`[Cache Read - Flights] Cache entry for ${cacheKey} has no valid cachedAt. Fetching fresh.`);
        }
      } else {
        console.log(`[Cache MISS - Flights] For key: ${cacheKey}. Fetching fresh data.`);
      }
    } catch (cacheError: any) {
      console.error(`[Cache Read Error - Flights] For key ${cacheKey}:`, cacheError.message);
    }
  }


  const params: any = {
    engine: "google_flights", departure_id: input.origin, arrival_id: input.destination,
    outbound_date: input.departureDate, currency: input.currency || "USD", hl: input.hl || "en", api_key: apiKey,
  };
  if (input.tripType === "round-trip" && input.returnDate) params.return_date = input.returnDate;

  console.log('[Server Action - getRealFlightsAction] Parameters sent to SerpApi:', params);
  try {
    const response = await getSerpApiJson(params);
    // console.log('[Server Action - getRealFlightsAction] RAW SerpApi Response received:', JSON.stringify(response, null, 2).substring(0, 1000) + "..."); 

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
            // console.log(`[Server Action - getRealFlightsAction] Processed flight: ${processedFlight.airline} ${processedFlight.derived_flight_numbers}, Price: ${processedFlight.price} (Type: ${typeof processedFlight.price})`);
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
      const cacheDocRef = doc(firestore, cacheCollection, cacheKey);
      try {
        console.log(`[Cache Write - Flights] Attempting to SAVE to cache for key: ${cacheKey}. Data: `, JSON.stringify(output).substring(0,200));
        await setDoc(cacheDocRef, { data: output, cachedAt: serverTimestamp(), queryKey }, { merge: true });
        console.log(`[Cache Write - Flights] Successfully SAVED to cache for key: ${cacheKey}`);
      } catch (cacheWriteError: any) {
        console.error(`[Cache Write Error - Flights] For key ${cacheKey}:`, cacheWriteError.message, cacheWriteError.stack);
      }
    }
    return output;
  } catch (error: any) {
    console.error('[Server Action - getRealFlightsAction] Error calling SerpApi or processing:', error.message, error.stack);
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

  const cacheKey = `hotels_${(input.destination || 'any').replace(/[^a-zA-Z0-9]/g, '')}_${input.checkInDate}_${input.checkOutDate}_${input.guests || '2'}`;
  const cacheCollection = 'serpApiHotelsCache';
  
  if (firestore) {
    const cacheDocRef = doc(firestore, cacheCollection, cacheKey);
    console.log(`[Cache Read - Hotels] Attempting to read for key: ${cacheKey}`);
    try {
      const docSnap = await getDoc(cacheDocRef);
      console.log(`[Cache Read - Hotels] Doc exists for key ${cacheKey}: ${docSnap.exists()}`);
      if (docSnap.exists()) {
        const cacheData = docSnap.data();
        const cachedAt = (cacheData.cachedAt as Timestamp)?.toDate();
        if (cachedAt) {
          const now = new Date();
          const daysDiff = (now.getTime() - cachedAt.getTime()) / (1000 * 60 * 60 * 24);
          console.log(`[Cache Read - Hotels] Found cache entry for ${cacheKey}. Age: ${daysDiff.toFixed(1)} days. Max age: ${CACHE_EXPIRY_DAYS_API}`);
          if (daysDiff < CACHE_EXPIRY_DAYS_API) {
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
      console.error(`[Cache Read Error - Hotels] For key ${cacheKey}:`, cacheError.message);
    }
  }


  const params: any = {
    engine: "google_hotels", q: input.destination, check_in_date: input.checkInDate, check_out_date: input.checkOutDate,
    adults: input.guests || "2", currency: input.currency || "USD", hl: input.hl || "en", api_key: apiKey,
  };
  console.log('[Server Action - getRealHotelsAction] Parameters being sent to SerpApi:', params);

  try {
    console.log('[Server Action - getRealHotelsAction] Making SerpApi call for hotels...');
    const response = await getSerpApiJson(params);
    // console.log('[Server Action - getRealHotelsAction] RAW SerpApi Hotel Response:', JSON.stringify(response, null, 2).substring(0,1000) + "...");

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
      const cacheDocRef = doc(firestore, cacheCollection, cacheKey);
      try {
        console.log(`[Cache Write - Hotels] Attempting to SAVE to cache for key: ${cacheKey}. Data: `, JSON.stringify(output).substring(0,200));
        await setDoc(cacheDocRef, { data: output, cachedAt: serverTimestamp(), queryKey: cacheKey }, { merge: true });
        console.log(`[Cache Write - Hotels] Successfully SAVED to cache for key: ${cacheKey}`);
      } catch (cacheWriteError: any) {
        console.error(`[Cache Write Error - Hotels] For key ${cacheKey}:`, cacheWriteError.message, cacheWriteError.stack);
      }
    }
    return output;
  } catch (error: any) {
    console.error('[Server Action - getRealHotelsAction] Error calling SerpApi or processing hotels:', error.message, error.stack);
    return { hotels: [], error: `Failed to fetch hotels: ${error.message || 'Unknown error'}` };
  }
}

export async function generateMultipleImagesAction(input: MultipleImagesInput): Promise<MultipleImagesOutput> {
  console.log(`[Server Action - generateMultipleImagesAction] Starting generation for ${input.prompts.length} images.`);
  const results: ImageResultItem[] = [];
  const batchSize = 5; // Process in batches
  const cacheCollection = 'imageCache';

  for (let i = 0; i < input.prompts.length; i += batchSize) {
      const batch = input.prompts.slice(i, i + batchSize);
      console.log(`[Server Action - generateMultipleImagesAction] Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(input.prompts.length / batchSize)} (size: ${batch.length})`);

      const batchPromises = batch.map(async (item): Promise<ImageResultItem> => {
          const imageCacheKey = item.id; 
          console.log(`[Server Action - generateMultipleImagesAction] Processing item ID (cache key): ${imageCacheKey}`);

          if (imageCacheKey && firestore) {
              const cacheDocRef = doc(firestore, cacheCollection, imageCacheKey);
              try {
                  console.log(`[Cache Read - Images] Attempting to read from cache for key: ${imageCacheKey}`);
                  const docSnap = await getDoc(cacheDocRef);
                  console.log(`[Cache Read - Images] Doc exists for key ${imageCacheKey}: ${docSnap.exists()}`);
                  if (docSnap.exists()) {
                      const cacheData = docSnap.data();
                      const cachedAt = (cacheData.cachedAt as Timestamp)?.toDate();
                      if(cachedAt) {
                        const now = new Date();
                        const daysDiff = (now.getTime() - cachedAt.getTime()) / (1000 * 60 * 60 * 24);
                        console.log(`[Cache Read - Images] Found image cache entry for ${imageCacheKey}. Age: ${daysDiff.toFixed(1)} days. Max age: ${CACHE_EXPIRY_DAYS_IMAGE}`);
                        if (daysDiff < CACHE_EXPIRY_DAYS_IMAGE && cacheData.imageUri && cacheData.promptUsed === item.prompt && cacheData.styleHint === item.styleHint) {
                            console.log(`[Cache HIT - Images] For key: ${imageCacheKey}`);
                            return { id: item.id, imageUri: cacheData.imageUri };
                        }
                        console.log(`[Cache STALE - Images] For key: ${imageCacheKey}. Will regenerate.`);
                      } else {
                        console.log(`[Cache Read - Images] Cache entry for key: ${imageCacheKey} missing valid cachedAt. Will regenerate.`);
                      }
                  } else {
                      console.log(`[Cache MISS - Images] For key: ${imageCacheKey}`);
                  }
              } catch (cacheError: any) {
                  console.error(`[Cache Read Error - Images] For key ${imageCacheKey}:`, cacheError.message);
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
                      const cacheDocRef = doc(firestore, cacheCollection, imageCacheKey); 
                      try {
                          console.log(`[Cache Write - Images] Attempting to SAVE image to cache for key: ${imageCacheKey}. Prompt: ${item.prompt}, Style: ${item.styleHint}`);
                          await setDoc(cacheDocRef, { imageUri: mediaUrl, promptUsed: item.prompt, styleHint: item.styleHint, cachedAt: serverTimestamp() }, { merge: true });
                          console.log(`[Cache Write - Images] Successfully SAVED image to cache for key: ${imageCacheKey}`);
                      } catch (cacheWriteError: any) {
                          console.error(`[Cache Write Error - Images] For key ${imageCacheKey}:`, cacheWriteError.message, cacheWriteError.stack);
                      }
                  }
                  return { id: item.id, imageUri: mediaUrl };
              } else {
                  console.warn(`[Server Action - generateMultipleImagesAction] Image generation for ID: ${item.id} (prompt "${item.prompt}") did NOT return a media URL from AI flow.`);
                  return { id: item.id, imageUri: null, error: 'No media URL returned by AI.' };
              }
          } catch (error: any) {
              console.error(`[Server Action - generateMultipleImagesAction] FAILED to generate image for ID: ${item.id} (prompt "${item.prompt}"):`, error.message || error, error.stack);
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
    let fromDate = addDays(now, 30); 
    let durationDays = 7; 
    let toDate: Date | undefined = addDays(fromDate, durationDays -1);

    const daysMatch = travelDates.match(/(\d+)\s*days?/i);
    const weekMatch = travelDates.match(/(\d+)\s*weeks?/i);
    const monthMatch = travelDates.match(/(\d+)\s*months?/i);

    if (daysMatch) { durationDays = parseInt(daysMatch[1], 10); } 
    else if (weekMatch) { durationDays = parseInt(weekMatch[1], 10) * 7; } 
    else if (monthMatch) { durationDays = parseInt(monthMatch[1], 10) * 30; }
    
    if (travelDates.toLowerCase().includes("next month")) { fromDate = addMonths(now, 1); fromDate.setDate(1); } 
    else if (travelDates.toLowerCase().includes("weekend")) {
        let nextFriday = new Date(now);
        nextFriday.setDate(now.getDate() + (5 - now.getDay() + 7) % 7);
        if (nextFriday <= now) nextFriday.setDate(nextFriday.getDate() + 7);
        fromDate = nextFriday; durationDays = 3; 
    } else {
        const parts = travelDates.split(/\s*-\s*|\s*to\s*/i);
        if (parts.length > 0) {
            try {
                const d1 = parse(parts[0], 'MM/dd/yyyy', new Date());
                if (!isNaN(d1.getTime()) && d1 > now) {
                    fromDate = d1;
                    if (parts.length === 2) {
                        const d2 = parse(parts[1], 'MM/dd/yyyy', new Date());
                        if (!isNaN(d2.getTime()) && d2 >= fromDate) {
                            toDate = d2; durationDays = differenceInDays(toDate, fromDate) + 1;
                        } else { toDate = addDays(fromDate, Math.max(1, durationDays -1)); }
                    } else { toDate = addDays(fromDate, Math.max(1, durationDays -1)); }
                }
            } catch (e) { console.warn("Date parsing failed for smart bundle, using defaults:", e); }
        }
    }
    if (toDate === undefined || fromDate >= toDate) { 
        toDate = addDays(fromDate, durationDays - 1);
    }
    return { departureDate: format(fromDate, "yyyy-MM-dd"), returnDate: toDate ? format(toDate, "yyyy-MM-dd") : undefined, durationDays };
}

export async function generateSmartBundles(input: SmartBundleInput): Promise<SmartBundleOutput> {
  console.log('[Server Action - generateSmartBundles] Input:', input);
  const conceptualBundles = await smartBundleFlowOriginal(input);

  if (!conceptualBundles.suggestions || conceptualBundles.suggestions.length === 0) return { suggestions: [] };
  const augmentedSuggestions: BundleSuggestion[] = [];

  for (const conceptualSuggestion of conceptualBundles.suggestions) {
    let augmentedSugg: BundleSuggestion = { ...conceptualSuggestion };
    const { destination, travelDates, budget: conceptualBudget } = conceptualSuggestion.tripIdea;
    console.log(`[Server Action - generateSmartBundles] Augmenting bundle for: ${destination}, Dates: ${travelDates}, AI Budget: ${conceptualBudget}`);
    try {
      const parsedDates = parseTravelDatesForSerpApi(travelDates);
      console.log(`[Server Action - generateSmartBundles] Parsed dates for SerpApi: Departure ${parsedDates.departureDate}, Return ${parsedDates.returnDate}, Duration ${parsedDates.durationDays} days`);
      
      const originForFlight = input.origin || "NYC"; 
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

      const hotelResults = await getRealHotelsAction({ destination: destinationIata || destination, checkInDate: parsedDates.departureDate, checkOutDate: parsedDates.returnDate || format(addDays(parse(parsedDates.departureDate, "yyyy-MM-dd", new Date()), parsedDates.durationDays -1 ), "yyyy-MM-dd"), guests: "2" });
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
        console.error(`[Server Action - generateSmartBundles] Error augmenting bundle for ${destination}:`, error.message, error.stack);
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
  
