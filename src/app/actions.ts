
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


// Import original functions with aliases and their types
import { getPriceAdvice as getPriceAdviceFlow } from '@/ai/flows/price-advisor-flow';
import type { PriceAdvisorInput, PriceAdvisorOutput } from '@/ai/types/price-advisor-flow-types';

import { conceptualDateGridFlow as conceptualDateGridFlowOriginal } from '@/ai/flows/conceptual-date-grid-flow';
import type { ConceptualDateGridInput, ConceptualDateGridOutput } from '@/ai/types/ai-conceptual-date-grid-types';

import { conceptualPriceGraphFlow as conceptualPriceGraphFlowOriginal } from '@/ai/flows/conceptual-price-graph-flow';
import type { ConceptualPriceGraphInput, ConceptualPriceGraphOutput } from '@/ai/types/ai-conceptual-price-graph-types';

import { answerTravelQuestion as getCoTravelAgentResponseOriginal } from '@/ai/flows/co-travel-agent-flow';
import type { CoTravelAgentInput, CoTravelAgentOutput } from '@/ai/types/co-travel-agent-types';

import { getItineraryAssistance as getItineraryAssistanceOriginal } from '@/ai/flows/itinerary-assistance-flow';
import type { ItineraryAssistanceInput, ItineraryAssistanceOutput } from '@/ai/types/itinerary-assistance-types';

import { generateTripSummary as generateTripSummaryOriginal } from '@/ai/flows/trip-summary-flow';
import type { TripSummaryInput, TripSummaryOutput } from '@/ai/types/trip-summary-types';

import { smartBundleFlow as smartBundleFlowOriginal } from '@/ai/flows/smart-bundle-flow';
import type { SmartBundleInput, SmartBundleOutput, BundleSuggestion } from '@/ai/types/smart-bundle-types';
import { thingsToDoFlow as thingsToDoFlowOriginal } from '@/ai/flows/things-to-do-flow';
import type { ThingsToDoSearchInput, ThingsToDoOutput } from '@/ai/types/things-to-do-types';
import type { FlightOption, HotelOption } from '@/lib/types';


import { format, addDays, parse, differenceInDays, addMonths } from 'date-fns';


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
    return result;
  } catch (error: any) {
    console.error('[Server Action - getPopularDestinations] ERROR fetching popular destinations:', error);
    return { destinations: [], contextualNote: `Sorry, we encountered an error: ${error.message}` };
  }
}

export async function getExploreIdeasAction(input: ExploreIdeasFromHistoryInput): Promise<ExploreIdeasOutput> {
  console.log(`[Server Action - getExploreIdeasAction] Input userId: ${input.userId}`);
  try {
    const result = await getExploreIdeasFromHistoryFlow(input);
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
    let realPriceContextString: string | undefined;

    const now = new Date();
    const startDate = addMonths(now, 1);
    const endDate = addDays(startDate, 7);

    const flightSearchInput: SerpApiFlightSearchInput = {
      origin: input.originDescription, 
      destination: input.targetDestinationCity,
      departureDate: format(startDate, "yyyy-MM-dd"),
      returnDate: format(endDate, "yyyy-MM-dd"),
      tripType: "round-trip",
    };
    console.log('[Server Action - getAiFlightMapDealsAction] Fetching real flight context with input:', flightSearchInput);
    const flightResults = await getRealFlightsAction(flightSearchInput);

    if (flightResults.best_flights && flightResults.best_flights.length > 0 && flightResults.best_flights[0].price) {
      realPriceContextString = `around $${flightResults.best_flights[0].price.toLocaleString()}`;
    } else if (flightResults.other_flights && flightResults.other_flights.length > 0 && flightResults.other_flights[0].price) {
      realPriceContextString = `around $${flightResults.other_flights[0].price.toLocaleString()}`;
    }
    console.log('[Server Action - getAiFlightMapDealsAction] Real price context found:', realPriceContextString);

    const flowInput: AiFlightMapDealInput & { realPriceContext?: string } = {
      ...input,
      // @ts-ignore
      realPriceContext: realPriceContextString,
    };

    const result = await aiFlightMapDealsFlow(flowInput);
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

function deriveStopsDescription(flightOption: SerpApiFlightOption): string {
    const legs = flightOption.flights || [];
    if (legs.length === 0) return "Unknown stops";
    if (legs.length === 1) return "Non-stop";
    
    const numStops = (flightOption.layovers?.length || legs.length - 1);
    if (numStops <= 0) return "Non-stop"; 
    
    let stopsDesc = `${numStops} stop${numStops > 1 ? 's' : ''}`;
    if (flightOption.layovers && flightOption.layovers.length > 0) {
        const layoverAirports = flightOption.layovers.map(l => l.name || l.id || "Unknown Airport").join(', ');
        if (layoverAirports) {
            stopsDesc += ` in ${layoverAirports}`;
        }
    }
    return stopsDesc;
}

export async function getRealFlightsAction(input: SerpApiFlightSearchInput): Promise<SerpApiFlightSearchOutput> {
  console.log('[Server Action - getRealFlightsAction] Input:', input);
  const apiKey = process.env.SERPAPI_API_KEY; 
  if (!apiKey) {
    console.error('[Server Action - getRealFlightsAction] SerpApi API key is not configured in .env file (SERPAPI_API_KEY).');
    return { error: "Flight search service is not configured. Please contact support." };
  }

  const params: any = {
    engine: "google_flights",
    departure_id: input.origin,
    arrival_id: input.destination,
    outbound_date: input.departureDate,
    currency: input.currency || "USD",
    hl: input.hl || "en",
    api_key: apiKey,
  };

  if (input.tripType === "round-trip" && input.returnDate) {
    params.return_date = input.returnDate;
  }

  try {
    console.log('[Server Action - getRealFlightsAction] Attempting to call SerpApi with params:', params);
    const response = await getSerpApiJson(params);
    console.log('[Server Action - getRealFlightsAction] RAW SerpApi Response:', JSON.stringify(response, null, 2));

    if (response.error) {
      console.error('[Server Action - getRealFlightsAction] SerpApi returned an error:', response.error);
      return { error: `SerpApi error: ${response.error}` };
    }
    
    const processFlights = (flightArray: any[] | undefined): SerpApiFlightOption[] => {
        if (!flightArray || flightArray.length === 0) return [];
        console.log(`[Server Action - getRealFlightsAction - processFlights] Processing ${flightArray.length} raw flight options.`);

        return flightArray.map((flight: any, index: number): SerpApiFlightOption => {
            const legsArray = flight.flights || flight.segments || []; 
            if (legsArray.length === 0 && !flight.price) { 
                console.warn(`[Server Action - getRealFlightsAction - processFlights] Flight option at index ${index} has no legs/segments AND no price. Skipping. Raw:`, JSON.stringify(flight, null, 2));
                return { price: undefined } as unknown as SerpApiFlightOption;
            }
             if (legsArray.length === 0 && flight.price) {
                console.warn(`[Server Action - getRealFlightsAction - processFlights] Flight option at index ${index} has a price but no legs/segments array. This might be a direct flight summarized at top level. Raw:`, JSON.stringify(flight, null, 2));
            }

            const firstLeg = legsArray[0];
            const lastLeg = legsArray[legsArray.length - 1];

            const processedLegs: SerpApiFlightLeg[] = legsArray.map((leg: any): SerpApiFlightLeg => ({
                departure_airport: leg.departure_airport,
                arrival_airport: leg.arrival_airport,
                duration: leg.duration,
                airline: leg.airline,
                airline_logo: leg.airline_logo,
                flight_number: leg.flight_number,
                airplane: leg.airplane,
                travel_class: leg.travel_class,
                extensions: leg.extensions,
            }));

            const flightOptionData: SerpApiFlightOption = {
                flights: processedLegs.length > 0 ? processedLegs : undefined,
                layovers: flight.layovers,
                total_duration: flight.total_duration,
                price: flight.price,
                type: flight.type,
                airline: flight.airline || firstLeg?.airline,
                airline_logo: flight.airline_logo || firstLeg?.airline_logo,
                link: flight.link,
                carbon_emissions: flight.carbon_emissions,
                
                derived_departure_time: firstLeg?.departure_airport?.time,
                derived_arrival_time: lastLeg?.arrival_airport?.time,
                derived_departure_airport_name: firstLeg?.departure_airport?.name,
                derived_arrival_airport_name: lastLeg?.arrival_airport?.name,
                derived_flight_numbers: legsArray.map((f: any) => f.flight_number).filter(Boolean).join(', '),
                derived_stops_description: deriveStopsDescription({ ...flight, flights: legsArray }),
            };
            return flightOptionData;
        }).filter(fo => fo.price != null && (fo.derived_departure_airport_name != null || (fo.flights && fo.flights.length > 0) ) );
    }

    let bestFlightsProcessed: SerpApiFlightOption[] = [];
    let otherFlightsProcessed: SerpApiFlightOption[] = [];
    let searchSummaryText: string;

    if (response.best_flights?.length > 0 || response.other_flights?.length > 0) {
        bestFlightsProcessed = processFlights(response.best_flights);
        otherFlightsProcessed = processFlights(response.other_flights);
        searchSummaryText = `Found ${bestFlightsProcessed.length + otherFlightsProcessed.length} flight options.`;
        console.log(`[Server Action - getRealFlightsAction] Processed ${bestFlightsProcessed.length} best flights and ${otherFlightsProcessed.length} other flights from dedicated keys.`);
    } else if (response.flights?.length > 0) { 
        console.log('[Server Action - getRealFlightsAction] No best_flights or other_flights, but found a general "flights" array. Processing that.');
        otherFlightsProcessed = processFlights(response.flights);
        searchSummaryText = `Found ${otherFlightsProcessed.length} flight options from general list.`;
        console.log(`[Server Action - getRealFlightsAction] Processed ${otherFlightsProcessed.length} flights from general "flights" key.`);
    } else {
        searchSummaryText = "SerpApi found 0 flight options for this search.";
        console.log('[Server Action - getRealFlightsAction] SerpApi returned no flight options (best_flights, other_flights, or general flights arrays are empty/missing).');
    }
    
    const output: SerpApiFlightSearchOutput = {
      search_summary: searchSummaryText,
      best_flights: bestFlightsProcessed.length > 0 ? bestFlightsProcessed : undefined,
      other_flights: otherFlightsProcessed.length > 0 ? otherFlightsProcessed : undefined,
      price_insights: response.price_insights,
    };

    if ((!output.best_flights || output.best_flights.length === 0) && (!output.other_flights || output.other_flights.length === 0)) {
        console.warn("[Server Action - getRealFlightsAction] No valid flights were processed into output despite potential raw data. Check processing logic against raw response.");
    }

    console.log('[Server Action - getRealFlightsAction] Final Processed Output (first 2 best_flights):', JSON.stringify((output.best_flights || []).slice(0,2), null, 2));
    console.log('[Server Action - getRealFlightsAction] Final Processed Output (first 2 other_flights):', JSON.stringify((output.other_flights || []).slice(0,2), null, 2));
    return output;

  } catch (error: any) {
    console.error('[Server Action - getRealFlightsAction] Error calling SerpApi or processing response:', error);
    return { error: `Failed to fetch flights from SerpApi: ${error.message || 'Unknown error'}` };
  }
}


export async function getRealHotelsAction(input: SerpApiHotelSearchInput): Promise<SerpApiHotelSearchOutput> {
  console.log('[Server Action - getRealHotelsAction] Received input:', input);
  const apiKey = "6f6955d85e5df06f0fdd5464515ee96571d7a8eee0f6b400fa404ff5d739b3d4";
  if (!apiKey || apiKey === "YOUR_SERPAPI_API_KEY") {
    console.error('[Server Action - getRealHotelsAction] SerpApi API key is not configured or is placeholder. Please set SERPAPI_API_KEY in your .env file.');
    return { hotels: [], error: "Hotel search service is not configured correctly (API key missing or invalid)." };
  }
  console.log('[Server Action - getRealHotelsAction] SerpApi API key found.');

  const params: any = {
    engine: "google_hotels",
    q: input.destination,
    check_in_date: input.checkInDate,
    check_out_date: input.checkOutDate,
    adults: input.guests || "2",
    currency: input.currency || "USD",
    hl: input.hl || "en",
    api_key: apiKey,
  };

  console.log('[Server Action - getRealHotelsAction] Parameters being sent to SerpApi:', params);

  try {
    console.log('[Server Action - getRealHotelsAction] >>> ATTEMPTING SERPAPI CALL for hotels <<<');
    const response = await getSerpApiJson(params);
    console.log('[Server Action - getRealHotelsAction] RAW SerpApi Hotel Response:', JSON.stringify(response, null, 2));

    if (response.error) {
      console.error('[Server Action - getRealHotelsAction] SerpApi returned an error:', response.error);
      return { hotels: [], error: `SerpApi error: ${response.error}` };
    }
    
    const rawHotels = response.properties || [];
    console.log(`[Server Action - getRealHotelsAction] Found ${rawHotels.length} raw hotel properties from SerpApi.`);

    const hotels: SerpApiHotelSuggestion[] = rawHotels.map((hotel: any): SerpApiHotelSuggestion => ({
      name: hotel.name,
      type: hotel.type,
      description: hotel.overall_info || hotel.description,
      price_per_night: hotel.rate_per_night?.lowest || hotel.price,
      total_price: hotel.total_price?.extracted_lowest,
      price_details: typeof hotel.rate_per_night === 'string' ? hotel.rate_per_night : hotel.price,
      rating: hotel.overall_rating || hotel.rating,
      reviews: hotel.reviews,
      amenities: hotel.amenities_objects?.map((am: any) => am.name) || hotel.amenities,
      link: hotel.link,
      thumbnail: hotel.images?.[0]?.thumbnail || hotel.thumbnail,
      images: hotel.images?.map((img: any) => ({ thumbnail: img.thumbnail, original_image: img.original_image })),
      coordinates: hotel.gps_coordinates ? { latitude: hotel.gps_coordinates.latitude, longitude: hotel.gps_coordinates.longitude } : undefined,
      check_in_time: hotel.check_in_time,
      check_out_time: hotel.check_out_time,
    })).filter((h: SerpApiHotelSuggestion) => h.name && (h.price_per_night || h.total_price || h.price_details));

    console.log(`[Server Action - getRealHotelsAction] Processed ${hotels.length} valid hotel suggestions.`);

    const searchSummary = response.search_information?.displayed_query || `Found ${hotels.length} hotel options.`;

    return {
      hotels: hotels.length > 0 ? hotels : [], // Return empty array instead of undefined
      search_summary: searchSummary,
      error: hotels.length === 0 && !response.error ? "No hotels found by SerpApi for this query." : undefined,
    };

  } catch (error: any) {
    console.error('[Server Action - getRealHotelsAction] Error calling SerpApi or processing response for hotels:', error);
    return { hotels: [], error: `Failed to fetch hotels from SerpApi: ${error.message || 'Unknown error'}` };
  }
}


// Helper for SmartBundle to parse dates (simplified)
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
        // Handled by default
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
            const d1 = parse(parts[0], 'MM/dd/yyyy', new Date());
            if (!isNaN(d1.getTime()) && d1 > now) {
                fromDate = d1;
                if (parts.length === 2) {
                    const d2 = parse(parts[1], 'MM/dd/yyyy', new Date());
                    if (!isNaN(d2.getTime()) && d2 >= fromDate) {
                        toDate = d2;
                        durationDays = differenceInDays(toDate, fromDate) + 1;
                    } else { 
                        toDate = addDays(fromDate, durationDays -1);
                    }
                } else { 
                     toDate = addDays(fromDate, durationDays -1);
                }
            }
        }
    }
    return {
        departureDate: format(fromDate, "yyyy-MM-dd"),
        returnDate: format(toDate, "yyyy-MM-dd"),
        durationDays,
    };
}


export async function generateSmartBundles(input: SmartBundleInput): Promise<SmartBundleOutput> {
  console.log('[Server Action - generateSmartBundles] Input:', input);
  const conceptualBundles = await smartBundleFlowOriginal(input);

  if (!conceptualBundles.suggestions || conceptualBundles.suggestions.length === 0) {
    return { suggestions: [] };
  }

  const augmentedSuggestions: BundleSuggestion[] = [];

  for (const conceptualSuggestion of conceptualBundles.suggestions) {
    let augmentedSugg: BundleSuggestion = { ...conceptualSuggestion };
    const { destination, travelDates, budget: conceptualBudget } = conceptualSuggestion.tripIdea;

    try {
      const parsedDates = parseTravelDatesForSerpApi(travelDates);
      
      const flightSearchInput: SerpApiFlightSearchInput = {
        origin: "NYC", 
        destination: destination,
        departureDate: parsedDates.departureDate,
        returnDate: parsedDates.returnDate,
        tripType: "round-trip",
      };
      const flightResults = await getRealFlightsAction(flightSearchInput);
      const bestFlight = flightResults.best_flights?.[0] || flightResults.other_flights?.[0];
      if (bestFlight) {
        augmentedSugg.realFlightExample = bestFlight as FlightOption; // Cast for now
      }

      const hotelSearchInput: SerpApiHotelSearchInput = {
        destination: destination,
        checkInDate: parsedDates.departureDate,
        checkOutDate: parsedDates.returnDate,
        guests: "2", 
      };
      const hotelResults = await getRealHotelsAction(hotelSearchInput);
      const bestHotel = hotelResults.hotels?.[0];
      if (bestHotel) {
        augmentedSugg.realHotelExample = bestHotel as unknown as HotelOption; // Cast for now
      }
      
      let realPriceMin = 0;
      let realPriceMax = 0;
      let priceNoteParts: string[] = [];

      if (bestFlight?.price) {
        realPriceMin += bestFlight.price;
        realPriceMax += bestFlight.price;
        priceNoteParts.push(`Flight ~\$${bestFlight.price.toLocaleString()}`);
      } else {
        priceNoteParts.push("No specific flight price found.");
      }

      if (bestHotel?.price_per_night) {
        const hotelTotal = bestHotel.price_per_night * parsedDates.durationDays;
        realPriceMin += hotelTotal;
        realPriceMax += hotelTotal;
         priceNoteParts.push(`Hotel ~\$${hotelTotal.toLocaleString()} for ${parsedDates.durationDays} nights`);
      } else if (bestHotel?.total_price) {
         realPriceMin += bestHotel.total_price;
         realPriceMax += bestHotel.total_price;
         priceNoteParts.push(`Hotel ~\$${bestHotel.total_price.toLocaleString()}`);
      } else {
         priceNoteParts.push("No specific hotel price found.");
      }

      if (realPriceMin > 0) {
        augmentedSugg.estimatedRealPriceRange = `Around \$${realPriceMin.toLocaleString()}`;
        if (realPriceMax > realPriceMin) { 
             augmentedSugg.estimatedRealPriceRange = `\$${realPriceMin.toLocaleString()} - \$${realPriceMax.toLocaleString()}`;
        }
        
        if (conceptualBudget) {
            if (realPriceMin > conceptualBudget * 1.2) {
                 augmentedSugg.priceFeasibilityNote = `AI's budget was \$${conceptualBudget.toLocaleString()}. Current checks suggest total is closer to ${augmentedSugg.estimatedRealPriceRange}. (${priceNoteParts.join(' + ')})`;
            } else if (realPriceMin < conceptualBudget * 0.8) {
                augmentedSugg.priceFeasibilityNote = `AI's budget was \$${conceptualBudget.toLocaleString()}. Good news! Current checks suggest total could be around ${augmentedSugg.estimatedRealPriceRange}. (${priceNoteParts.join(' + ')})`;
            } else {
                 augmentedSugg.priceFeasibilityNote = `AI's budget of \$${conceptualBudget.toLocaleString()} seems reasonable. Current checks estimate around ${augmentedSugg.estimatedRealPriceRange}. (${priceNoteParts.join(' + ')})`;
            }
        } else {
            augmentedSugg.priceFeasibilityNote = `Estimated real price: ${augmentedSugg.estimatedRealPriceRange}. (${priceNoteParts.join(' + ')})`;
        }

      } else {
         augmentedSugg.priceFeasibilityNote = "Could not determine real-time pricing for this conceptual bundle.";
      }

    } catch (error) {
      console.error(`Error augmenting bundle for ${destination}:`, error);
      augmentedSugg.priceFeasibilityNote = "Error fetching real-time price context for this bundle.";
    }
    augmentedSuggestions.push(augmentedSugg);
  }

  return { suggestions: augmentedSuggestions };
}


// Wrapped Server Actions
export async function getCoTravelAgentResponse(input: CoTravelAgentInput): Promise<CoTravelAgentOutput> {
  return getCoTravelAgentResponseOriginal(input);
}

export async function getItineraryAssistance(input: ItineraryAssistanceInput): Promise<ItineraryAssistanceOutput> {
  return getItineraryAssistanceOriginal(input);
}

export async function generateTripSummary(input: TripSummaryInput): Promise<TripSummaryOutput> {
  return generateTripSummaryOriginal(input);
}

export async function getPriceAdviceAction(input: PriceAdvisorInput): Promise<PriceAdvisorOutput> {
  return getPriceAdviceFlow(input);
}

export async function getConceptualDateGridAction(input: ConceptualDateGridInput): Promise<ConceptualDateGridOutput> {
  return conceptualDateGridFlowOriginal(input);
}

export async function getConceptualPriceGraphAction(input: ConceptualPriceGraphInput): Promise<ConceptualPriceGraphOutput> {
  return conceptualPriceGraphFlowOriginal(input);
}

export async function getThingsToDoAction(input: ThingsToDoSearchInput): Promise<ThingsToDoOutput> {
  return thingsToDoFlowOriginal(input);
}


