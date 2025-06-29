
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

import { PriceAdvisorInput as PriceAdvisorInputType, PriceAdvisorOutput as PriceAdvisorOutputType } from '@/ai/types/price-advisor-flow-types';
import { getPriceAdvice as getPriceAdviceOriginal } from '@/ai/flows/price-advisor-flow';

import { ConceptualDateGridInput as ConceptualDateGridInputType, ConceptualDateGridOutput as ConceptualDateGridOutputType } from '@/ai/types/ai-conceptual-date-grid-types';
import { conceptualDateGridFlow as conceptualDateGridFlowOriginal } from '@/ai/flows/conceptual-date-grid-flow';

import { ConceptualPriceGraphInput as ConceptualPriceGraphInputType, ConceptualPriceGraphOutput as ConceptualPriceGraphOutputType } from '@/ai/types/ai-conceptual-price-graph-types';
import { conceptualPriceGraphFlow as conceptualPriceGraphFlowOriginal } from '@/ai/flows/conceptual-price-graph-flow';

import { CoTravelAgentInput as CoTravelAgentInputType, CoTravelAgentOutput as CoTravelAgentOutputType } from '@/ai/types/co-travel-agent-types';
import { getCoTravelAgentResponse as getCoTravelAgentResponseOriginal } from '@/ai/flows/co-travel-agent-flow';

import { ItineraryAssistanceInput as ItineraryAssistanceInputType, ItineraryAssistanceOutput as ItineraryAssistanceOutputType } from '@/ai/types/itinerary-assistance-types';
import { getItineraryAssistance as getItineraryAssistanceOriginal } from '@/ai/flows/itinerary-assistance-flow';

import { TripSummaryInput as TripSummaryInputType, TripSummaryOutput as TripSummaryOutputType } from '@/ai/types/trip-summary-types';
import { generateTripSummary as generateTripSummaryOriginal } from '@/ai/flows/trip-summary-flow';

import { SmartBundleInput as SmartBundleInputType, SmartBundleOutput as SmartBundleOutputType } from '@/ai/types/smart-bundle-types';
import { smartBundleFlow as smartBundleFlowOriginal } from '@/ai/flows/smart-bundle-flow';
import type { BundleSuggestion } from '@/ai/types/smart-bundle-types';

import { ThingsToDoSearchInput as ThingsToDoSearchInputType, ThingsToDoOutput as ThingsToDoOutputType } from '@/ai/types/things-to-do-types';
import { thingsToDoFlow as thingsToDoFlowOriginal } from '@/ai/flows/things-to-do-flow';
import type { FlightOption, HotelOption, ActivitySuggestion } from '@/lib/types';

import { format, addDays, parseISO, differenceInDays, addMonths, isBefore, isValid, startOfMonth, startOfWeek, endOfMonth } from 'date-fns';
import { getPackingList as getPackingListOriginal } from '@/ai/flows/packing-list-flow';
import type { PackingListInput, PackingListOutput } from '@/ai/flows/packing-list-flow';
import { getDestinationFact as getDestinationFactOriginal } from '@/ai/flows/destination-fact-flow';
import type { DestinationFactInput, DestinationFactOutput } from '@/ai/flows/destination-fact-flow';
import { generateTripMemory as generateTripMemoryOriginal } from '@/ai/flows/generate-trip-memory-flow';
import type { GenerateTripMemoryInput, GenerateTripMemoryOutput } from '@/ai/flows/generate-trip-memory-flow';
import { generateGroupSyncReport as generateGroupSyncReportOriginal } from '@/ai/flows/group-sync-flow';
import type { GroupSyncInput, GroupSyncOutput } from '@/ai/flows/group-sync-flow';
import { trackPrice as trackPriceOriginal } from '@/ai/flows/price-tracker';
import type { PriceTrackerInput, PriceTrackerOutput } from '@/ai/flows/price-tracker';
import { getPriceForecast as getPriceForecastOriginal } from '@/ai/flows/price-forecast-flow';
import type { PriceForecastInput, PriceForecastOutput } from '@/ai/flows/price-forecast-flow';
import { getTravelTip as getTravelTipOriginal } from '@/ai/flows/travel-tip-flow';
import type { TravelTipInput, TravelTipOutput } from '@/ai/flows/travel-tip-flow';
import { getLocalInsiderTips as getLocalInsiderTipsOriginal } from '@/ai/flows/local-insider-tips-flow';
import type { LocalInsiderTipsInput, LocalInsiderTipsOutput } from '@/ai/flows/local-insider-tips-types';
import { suggestHubAirportsFlow } from '@/ai/flows/suggest-hub-airports-flow';

// Helper to normalize parts of cache keys
const normalizeCacheKeyPart = (part?: string | number | null): string => {
  if (part === undefined || part === null) return 'na';
  let strPart = String(part).trim().toLowerCase();
  if (strPart === "") return 'empty';
  strPart = strPart.replace(/[^a-z0-9_\-]/g, '_').replace(/_+/g, '_');
  return strPart.substring(0, 50);
};

export interface ImageRequest {
  id: string;
  promptText: string;
  styleHint: 'hero' | 'featureCard' | 'destination' | 'general' | 'activity' | 'hotel' | 'hotelRoom';
}

export async function getLandingPageImagesWithFallback(
  requests: ImageRequest[]
): Promise<Record<string, string | null>> {
  console.log(`[Server Action - getLandingPageImagesWithFallback] Started. Total image requests: ${requests.length}`);
  const imageUris: Record<string, string | null> = {};
  requests.forEach(req => imageUris[req.id] = null);

  const itemsToGenerateAI: ImagePromptItem[] = requests.map(req => ({
    id: req.id || `fallback_${normalizeCacheKeyPart(req.promptText)}_${normalizeCacheKeyPart(req.styleHint)}`,
    prompt: req.promptText,
    styleHint: req.styleHint
  }));

  if (itemsToGenerateAI.length > 0) {
    try {
      console.log(`[LandingPageImages] Calling generateMultipleImagesFlowOriginal for ${itemsToGenerateAI.length} images. Caching is disabled.`);
      const aiResultsOutput: MultipleImagesOutput = await generateMultipleImagesFlowOriginal({ prompts: itemsToGenerateAI });
      const aiResults = aiResultsOutput.results || [];

      for (const aiResult of aiResults) {
        if (aiResult.imageUri) {
          imageUris[aiResult.id] = aiResult.imageUri;
        } else {
          console.warn(`[LandingPageImages] AI generation failed for ID ${aiResult.id}: ${aiResult.error}. Placeholder will be used by client.`);
        }
      }
    } catch (flowError: any) {
      console.error('[Server Action - Landing Img AI Error] Error calling generateMultipleImagesFlowOriginal for landing page. Error: ', flowError.message);
      itemsToGenerateAI.forEach(req => {
        if (imageUris[req.id] === null) imageUris[req.id] = null;
      });
    }
  }

  console.log(`[Server Action - getLandingPageImagesWithFallback] Completed. Returning URIs. Count: ${Object.keys(imageUris).length}`);
  return imageUris;
}

export async function getPopularDestinations(input: PopularDestinationsInput): Promise<PopularDestinationsOutput> {
  try {
    return await popularDestinationsFlow(input);
  } catch (error: any) {
    console.error(`[Action Error] getPopularDestinations failed:`, error);
    return { 
      destinations: [], 
      contextualNote: "Sorry, we encountered an error while fetching destination ideas. Please try again later." 
    };
  }
}

export async function getExploreIdeasAction(input: ExploreIdeasFromHistoryInput): Promise<ExploreIdeasOutput> {
  try {
    return await getExploreIdeasFromHistoryFlow(input);
  } catch (error: any) {
    console.error(`[Action Error] getExploreIdeasAction failed:`, error);
    return { 
      suggestions: [], 
      contextualNote: "Sorry, an error occurred while generating personalized ideas. Please try again later."
    };
  }
}

export async function getAiFlightMapDealsAction(input: AiFlightMapDealInput): Promise<AiFlightMapDealOutput> {
  try {
    const flowInput: AiFlightMapDealInput & { realPriceContext?: string } = { ...input };
    try {
      const startDate = addMonths(new Date(), 1);
      const endDate = addDays(startDate, 7);
      
      const originForSearch = await getIataCodeAction(input.originDescription) || input.originDescription;
      const destinationForSearch = await getIataCodeAction(input.targetDestinationCity) || input.targetDestinationCity;

      const flightSearchInput: SerpApiFlightSearchInput = {
        origin: originForSearch,
        destination: destinationForSearch,
        departureDate: format(startDate, "yyyy-MM-dd"),
        returnDate: format(endDate, "yyyy-MM-dd"),
        tripType: "round-trip",
      };
      const flightResults = await getRealFlightsAction(flightSearchInput);
      const bestFlight = flightResults.best_flights?.[0] || flightResults.other_flights?.[0];
      if (bestFlight?.price) {
        flowInput.realPriceContext = `around $${bestFlight.price.toLocaleString()}`;
      }
    } catch (e: any) {
      console.error("[Action Error] Failed to get real price context for map deals:", e.message);
    }
    return await aiFlightMapDealsFlow(flowInput);
  } catch (error: any) {
    console.error(`[Action Error] getAiFlightMapDealsAction failed:`, error);
    return {
      suggestions: [],
      contextualNote: "Sorry, an error occurred while searching for flight map deals. Please try again."
    };
  }
}

function deriveStopsDescription(flightOption: Partial<SerpApiFlightOption>): string {
    const legs = flightOption.flights || [];
    const layovers = flightOption.layovers || [];

    if (legs.length === 0) return "Unknown stops";
    if (legs.length === 1 && layovers.length === 0) return "Non-stop";

    if (flightOption.type?.toLowerCase() === 'round trip' && legs.length === 2 && layovers.length === 0) {
        return "Non-stop (each way)";
    }
    
    const numStops = layovers.length;

    if (numStops === 0) {
      if (legs.length <= (flightOption.type?.toLowerCase() === 'round trip' ? 2 : 1)) {
        return "Non-stop";
      }
      const effectiveSegments = flightOption.type?.toLowerCase() === 'round trip' ? legs.length / 2 : legs.length;
      const calculatedStops = Math.max(0, Math.ceil(effectiveSegments) - 1);
      if (calculatedStops === 0) return "Non-stop";
      return `${calculatedStops} stop${calculatedStops !== 1 ? 's' : ''} (details unclear)`;
    }

    let stopsDesc = `${numStops} stop${numStops !== 1 ? 's' : ''}`;
    const layoverAirports = layovers.map(l => l.name || l.id || "Unknown").filter(Boolean).join(', ');
    if (layoverAirports) {
        stopsDesc += ` in ${layoverAirports}`;
    }
    return stopsDesc;
}

export async function getIataCodeAction(placeName?: string): Promise<string | null> {
  if (!placeName || placeName.trim().length < 2 || placeName.toLowerCase().includes("current location")) {
    console.log(`[getIataCodeAction] Skipping IATA lookup for trivial placeName: "${placeName}"`);
    return null;
  }
  if (/^[A-Z]{3}$/.test(placeName.trim().toUpperCase())) {
    console.log(`[getIataCodeAction] Provided placeName "${placeName}" is already in IATA format.`);
    return placeName.trim().toUpperCase();
  }

  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey || apiKey === "YOUR_SERPAPI_API_KEY_PLACEHOLDER") {
    console.warn("[getIataCodeAction] SerpApi key not found or is placeholder. Cannot fetch IATA code.");
    return null;
  }
  
  const params = { engine: "google_flights_travel_partners", q: `${placeName.trim()} airport code`, api_key: apiKey };
  console.log(`[SerpApi - IATA] Calling SerpApi for: "${placeName.trim()}" with params:`, params);
  let iataCode: string | null = null;
  try {
    const response = await getSerpApiJson(params);

    if (response.airports && response.airports.length > 0 && response.airports[0].id) {
      iataCode = response.airports[0].id;
    } else if (response.answer_box?.answer) {
      const m = response.answer_box.answer.match(/\b([A-Z]{3})\b/); if (m) iataCode = m[1];
    } else if (response.knowledge_graph?.iata_code) {
      iataCode = response.knowledge_graph.iata_code;
    } else if (response.knowledge_graph?.description) {
      const m = response.knowledge_graph.description.match(/IATA: ([A-Z]{3})/i); if (m) iataCode = m[1];
    } else if (response.organic_results?.length) {
      for (const r of response.organic_results) {
        const textToSearch = `${r.title || ''} ${r.snippet || ''}`;
        const m = textToSearch.match(/\b([A-Z]{3})\b is the IATA code for/i) || textToSearch.match(/IATA code for .*? is \b([A-Z]{3})\b/i) || textToSearch.match(/airport code for .*? is \b([A-Z]{3})\b/i) || textToSearch.match(/\(([A-Z]{3})\)/i);
        if (m && m[1]) { iataCode = m[1]; break; }
      }
    }
  } catch (error: any) {
    console.error(`Error fetching IATA for "${placeName.trim()}" from SerpApi:`, error.message, error);
    return null;
  }

  console.log(`[SerpApi - IATA] Fetched for "${placeName.trim()}": ${iataCode}`);
  return iataCode;
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

const processFlights = (flightArray: any[] | undefined): SerpApiFlightOption[] => {
    if (!flightArray || flightArray.length === 0) return [];
    return flightArray.map((flight: any): SerpApiFlightOption => {
        const legsArray = flight.flights || flight.segments || [];
        const firstLeg = legsArray[0]; 
        const lastLeg = legsArray[legsArray.length - 1];
        
        const processedFlight: SerpApiFlightOption = {
            flights: legsArray.map((l: any) => ({...l, duration: l.duration ? parseInt(l.duration) : undefined })),
            layovers: flight.layovers?.map((l: any) => ({...l, duration: l.duration ? parseInt(l.duration) : undefined })),
            total_duration: flight.total_duration ? parseInt(flight.total_duration) : undefined,
            departure_token: flight.departure_token,
            price: parsePrice(flight.price),
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
            derived_stops_description: deriveStopsDescription({ flights: legsArray, layovers: flight.layovers, type: flight.type }),
        };
        return processedFlight;
    }).filter(fo => fo.price != null && (fo.derived_departure_airport_name != null || (fo.flights && fo.flights.length > 0))); 
};

async function fetchAndMergeReturnJourney(
    outboundOption: SerpApiFlightOption,
    originalInput: SerpApiFlightSearchInput,
    apiKey: string
): Promise<SerpApiFlightOption> {
    if (!outboundOption.departure_token) return outboundOption;

    console.log(`[SerpApi - Helper] Fetching return for token: ${outboundOption.departure_token}`);
    const returnParams = {
        engine: "google_flights",
        departure_token: outboundOption.departure_token,
        api_key: apiKey,
        hl: originalInput.hl || "en",
        currency: originalInput.currency || "USD",
    };
    try {
        const returnResponse = await getSerpApiJson(returnParams);
        if (returnResponse.error) {
            console.warn(`[SerpApi - Helper] Error fetching return flights: ${returnResponse.error}`);
            return outboundOption;
        }

        const potentialReturnJourneys = processFlights(returnResponse.best_flights)
            .concat(processFlights(returnResponse.other_flights))
            .concat(processFlights(returnResponse.flights)); 

        if (potentialReturnJourneys.length > 0) {
            const chosenReturnJourney = potentialReturnJourneys[0]; 

            const mergedFlights = (outboundOption.flights || []).concat(chosenReturnJourney.flights || []);
            const mergedLayovers = (outboundOption.layovers || []).concat(chosenReturnJourney.layovers || []);
            
            let newTotalDuration = 0;
            mergedFlights.forEach(leg => newTotalDuration += (leg.duration || 0));
            mergedLayovers.forEach(layover => newTotalDuration += (layover.duration || 0));
            
            const finalArrivalLeg = mergedFlights[mergedFlights.length - 1];

            return {
                ...outboundOption,
                flights: mergedFlights,
                layovers: mergedLayovers,
                total_duration: newTotalDuration,
                type: "Round trip", 
                derived_arrival_time: finalArrivalLeg?.arrival_airport?.time,
                derived_arrival_airport_name: finalArrivalLeg?.arrival_airport?.name,
                derived_stops_description: deriveStopsDescription({ flights: mergedFlights, layovers: mergedLayovers, type: "Round trip" }),
                departure_token: undefined, 
            };
        }
        console.warn(`[SerpApi - Helper] Token ${outboundOption.departure_token} did not yield usable return flights.`);
        return outboundOption; 
    } catch (tokenError: any) {
        console.error(`[SerpApi - Helper] Error during token fetch:`, tokenError.message);
        return outboundOption; 
    }
}

export async function getRealFlightsAction(input: SerpApiFlightSearchInput): Promise<SerpApiFlightSearchOutput> {
  console.log('[Server Action - getRealFlightsAction] Input:', input);
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey || apiKey === "YOUR_SERPAPI_API_KEY_PLACEHOLDER") {
    console.error('[Server Action - getRealFlightsAction] SerpApi API key is not configured.');
    return { error: "Flight search service is not configured." };
  }

  const originForSearch = await getIataCodeAction(input.origin) || input.origin;
  const destinationForSearch = await getIataCodeAction(input.destination) || input.destination;

  console.log(`[Server Action - getRealFlightsAction] Fetching flights directly (caching disabled).`);

  const params: any = {
    engine: "google_flights", 
    departure_id: originForSearch, 
    arrival_id: destinationForSearch, 
    outbound_date: input.departureDate, 
    currency: input.currency || "USD", 
    hl: input.hl || "en", 
    api_key: apiKey,
  };
  if (input.tripType === "round-trip" && input.returnDate) {
    params.return_date = input.returnDate;
  }

  console.log(`[SerpApi - Flights] Parameters being sent to SerpApi:`, JSON.stringify(params));
  try {
    const initialResponse = await getSerpApiJson(params);
    console.log(`[SerpApi - Flights] RAW SerpApi Response (first 1000 chars):`, JSON.stringify(initialResponse, null, 2).substring(0, 1000) + "...");

    if (initialResponse.error) {
      console.error('[Server Action - getRealFlightsAction] SerpApi returned an error:', initialResponse.error);
      return { error: `SerpApi error: ${initialResponse.error}` };
    }
    
    const enrichFlightList = async (list: any[] | undefined): Promise<SerpApiFlightOption[]> => {
        if (!list || list.length === 0) return [];
        const processedList = processFlights(list);
        const enrichedListPromises = processedList.map(async (option) => {
            if (input.tripType === "round-trip" && option.departure_token) {
                return await fetchAndMergeReturnJourney(option, input, apiKey);
            }
            return option;
        });
        return Promise.all(enrichedListPromises);
    };

    const enrichedBestFlights = await enrichFlightList(initialResponse.best_flights);
    const enrichedOtherFlights = await enrichFlightList(initialResponse.other_flights);
    const enrichedDirectFlights = await enrichFlightList(initialResponse.flights);

    const combinedProcessedFlights = [...enrichedBestFlights, ...enrichedOtherFlights, ...enrichedDirectFlights];
    const uniqueFlightMap = new Map<string, SerpApiFlightOption>();
    combinedProcessedFlights.forEach(flight => {
        const flightKey = `${flight.derived_flight_numbers}-${flight.price}-${flight.total_duration}-${flight.derived_departure_airport_name}-${flight.derived_arrival_airport_name}`;
        if (!uniqueFlightMap.has(flightKey)) {
            uniqueFlightMap.set(flightKey, flight);
        }
    });
    const allUniqueEnrichedFlights = Array.from(uniqueFlightMap.values());

    const finalBestFlights: SerpApiFlightOption[] = [];
    const finalOtherFlights: SerpApiFlightOption[] = [];

    if (initialResponse.best_flights && initialResponse.best_flights.length > 0) {
        const initialBestKeys = new Set(
            processFlights(initialResponse.best_flights).map(f => `${f.derived_flight_numbers}-${f.price}-${f.total_duration}-${f.derived_departure_airport_name}-${f.derived_arrival_airport_name}`)
        );
        allUniqueEnrichedFlights.forEach(f => {
            const key = `${f.derived_flight_numbers}-${f.price}-${f.total_duration}-${f.derived_departure_airport_name}-${f.derived_arrival_airport_name}`;
            if (initialBestKeys.has(key)) {
                finalBestFlights.push(f);
            } else {
                finalOtherFlights.push(f);
            }
        });
    } else {
        finalOtherFlights.push(...allUniqueEnrichedFlights);
    }
    
    if (finalOtherFlights.length > 0) {
      finalOtherFlights.sort((a, b) => (a.price || Infinity) - (b.price || Infinity));
    }
    if (finalBestFlights.length === 0 && finalOtherFlights.length > 0) {
        finalBestFlights.push(...finalOtherFlights.splice(0, Math.min(3, finalOtherFlights.length))); 
    }

    const output: SerpApiFlightSearchOutput = {
      search_summary: initialResponse.search_information?.displayed_query || `Processed ${allUniqueEnrichedFlights.length} flight options.`,
      best_flights: finalBestFlights.length > 0 ? finalBestFlights : undefined,
      other_flights: finalOtherFlights.length > 0 ? finalOtherFlights : undefined,
      price_insights: initialResponse.price_insights,
    };
    console.log(`[Server Action - getRealFlightsAction] Enriched ${allUniqueEnrichedFlights.length} unique flights. Best: ${output.best_flights?.length || 0}, Other: ${output.other_flights?.length || 0}`);

    return output;
  } catch (error: any) {
    console.error(`[SerpApi - Flights] Error calling SerpApi or processing:`, error.message, error);
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

  const destinationForSearch = await getIataCodeAction(input.destination) || input.destination;

  console.log(`[Server Action - getRealHotelsAction] Fetching hotels directly (caching disabled).`);

  const params: any = {
    engine: "google_hotels", 
    q: destinationForSearch, 
    check_in_date: input.checkInDate, 
    check_out_date: input.checkOutDate,
    adults: input.guests || "2", 
    currency: input.currency || "USD", 
    hl: input.hl || "en", 
    api_key: apiKey,
  };
  console.log(`[SerpApi - Hotels] Parameters being sent to SerpApi:`, JSON.stringify(params));

  try {
    const response = await getSerpApiJson(params);
    console.log(`[SerpApi - Hotels] RAW SerpApi Hotel Response (first 500 chars):`, JSON.stringify(response, null, 2).substring(0, 500) + "...");

    if (response.error) {
      console.error('[Server Action - getRealHotelsAction] SerpApi returned an error:', response.error);
      return { hotels: [], error: `SerpApi error: ${response.error}` };
    }

    const rawHotels = response.properties || [];
    console.log(`[Server Action - getRealHotelsAction] Found ${rawHotels.length} raw hotel properties from SerpApi.`);

    const hotels: SerpApiHotelSuggestion[] = rawHotels.map((hotel: any): SerpApiHotelSuggestion => {
      const priceSourceForPpn = hotel.rate_per_night?.lowest ?? hotel.price_per_night ?? hotel.price ?? hotel.extracted_price;
      let parsedPricePerNight: number | undefined = parsePrice(priceSourceForPpn);
      
      const priceSourceForTotal = hotel.total_price?.extracted_lowest ?? hotel.total_price;
      let parsedTotalPrice: number | undefined = parsePrice(priceSourceForTotal);

      const finalHotelObject: SerpApiHotelSuggestion = {
        name: hotel.name, 
        type: hotel.type, 
        description: hotel.overall_info || hotel.description,
        price_per_night: parsedPricePerNight, 
        total_price: parsedTotalPrice,
        price_details: typeof priceSourceForPpn === 'string' ? priceSourceForPpn : (parsedPricePerNight !== undefined ? `$${parsedPricePerNight}` : undefined),
        rating: hotel.overall_rating || hotel.rating, 
        reviews: hotel.reviews,
        amenities: hotel.amenities_objects?.map((am: any) => am.name) || hotel.amenities,
        link: hotel.link, 
        thumbnail: hotel.images?.[0]?.thumbnail || hotel.thumbnail,
        images: hotel.images?.map((img: any) => ({ thumbnail: img.thumbnail, original_image: img.original_image })),
        coordinates: hotel.gps_coordinates ? { latitude: hotel.gps_coordinates.latitude, longitude: hotel.gps_coordinates.longitude } : undefined,
        check_in_time: hotel.check_in_time, 
        check_out_time: hotel.check_out_time,
      };
      return finalHotelObject;
    }).filter((h: SerpApiHotelSuggestion) => h.name && (h.price_per_night !== undefined || h.total_price !== undefined || h.price_details));

    console.log(`[Server Action - getRealHotelsAction] Processed ${hotels.length} valid hotel suggestions.`);
    const output: SerpApiHotelSearchOutput = {
      hotels: hotels.length > 0 ? hotels : [],
      search_summary: response.search_information?.displayed_query || `Found ${hotels.length} hotel options.`,
      error: hotels.length === 0 && !response.error ? "No hotels found by SerpApi for this query." : undefined,
    };
    
    return output;
  } catch (error: any) {
    console.error(`[SerpApi - Hotels] Error calling SerpApi or processing hotels:`, error.message, error);
    return { hotels: [], error: `Failed to fetch hotels: ${error.message || 'Unknown error'}` };
  }
}

export async function generateMultipleImagesAction(input: MultipleImagesInput): Promise<MultipleImagesOutput> {
  console.log(`[Server Action - generateMultipleImagesAction] Starting generation for ${input.prompts.length} images (caching disabled).`);
  
  if (input.prompts.length === 0) {
    console.log("[Server Action - generateMultipleImagesAction] No prompts provided. Returning empty results.");
    return { results: [] };
  }

  try {
      const aiFlowResult = await generateMultipleImagesFlowOriginal(input);
      console.log(`[AI Image Gen] Success. Result count: ${aiFlowResult.results.length}`);
      return aiFlowResult;
  } catch (error: any) {
      console.error(`[AI Image Gen] FAILED to generate images:`, error.message, error);
      const errorResults: ImageResultItem[] = input.prompts.map(item => ({
        id: item.id,
        imageUri: null,
        error: error.message || 'Unknown error during image generation flow.'
      }));
      return { results: errorResults };
  }
}

function parseTravelDatesForSerpApi(travelDates: string): { departureDate: string; returnDate?: string; durationDays: number } {
    const now = new Date();
    now.setHours(0,0,0,0); 

    let fromDate: Date = addDays(now, 30); 
    let toDate: Date | undefined = addDays(fromDate, 6); 
    let durationDays: number = 7;
    let isRoundTrip = true;

    if (!travelDates || travelDates.trim() === "") {
      console.warn("[parseTravelDatesForSerpApi] Empty travelDates input, using defaults.");
      return { departureDate: format(fromDate, "yyyy-MM-dd"), returnDate: format(toDate, "yyyy-MM-dd"), durationDays };
    }
    
    const lowerTravelDates = travelDates.toLowerCase();

    if (lowerTravelDates.includes("one way") || lowerTravelDates.includes("one-way")) {
        isRoundTrip = false;
        toDate = undefined;
    }
    
    const specificDateRangeMatch = lowerTravelDates.match(/(\d{1,2}[\/\-.]\d{1,2}(?:[\/\-.]\d{2,4})?|\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s*\d{4})?)\s*(?:to|-|until|&)\s*(\d{1,2}[\/\-.]\d{1,2}(?:[\/\-.]\d{2,4})?|\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s*\d{4})?)/i);
    if (specificDateRangeMatch) {
        try {
            const d1Str = specificDateRangeMatch[1].replace(/(st|nd|rd|th)/gi, '');
            const d2Str = specificDateRangeMatch[2].replace(/(st|nd|rd|th)/gi, '');
            
            let d1Candidate = parseISO(new Date(d1Str).toISOString()); 
            let d2Candidate = parseISO(new Date(d2Str).toISOString());

            if (isValid(d1Candidate) && isBefore(d1Candidate, now) && !d1Str.match(/\d{4}/)) d1Candidate = addYears(d1Candidate, 1);
            if (isValid(d2Candidate) && isBefore(d2Candidate, d1Candidate) && !d2Str.match(/\d{4}/)) d2Candidate = addYears(d2Candidate, 1);
            
            if (isValid(d1Candidate) && isValid(d2Candidate)) {
                fromDate = d1Candidate;
                toDate = d2Candidate;
                durationDays = differenceInDays(toDate, fromDate) + 1;
                isRoundTrip = true; 
                console.log(`[parseTravelDatesForSerpApi] Parsed specific range: ${format(fromDate, "yyyy-MM-dd")} to ${format(toDate, "yyyy-MM-dd")}`);
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
        console.log(`[parseTravelDatesForSerpApi] Parsed duration: ${durationDays} days`);
    }

    if (lowerTravelDates.includes("next month")) {
        fromDate = startOfMonth(addMonths(now, 1));
    } else if (lowerTravelDates.includes("this month")) {
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
             let dayOfMonth = 1;

             const dayAndYearMatch = lowerTravelDates.match(new RegExp(monthNameMatch[0] + "\\s*(\\d{1,2})(?:st|nd|rd|th)?(?:,\\s*(\\d{4}))?", "i"));
             if (dayAndYearMatch) {
                if(dayAndYearMatch[1]) dayOfMonth = parseInt(dayAndYearMatch[1], 10);
                if(dayAndYearMatch[2]) year = parseInt(dayAndYearMatch[2], 10);
             }
             
             let tempFrom = new Date(year, monthIdx, dayOfMonth);
             if(isBefore(tempFrom, now) && !dayAndYearMatch?.[2] && !lowerTravelDates.match(/\d{4}/) ) tempFrom.setFullYear(year + 1); 
             
             if (isValid(tempFrom)) fromDate = tempFrom;
           }
        }
    }

    if (isBefore(fromDate, now)) {
        console.warn(`[parseTravelDatesForSerpApi] Calculated fromDate ${format(fromDate, "yyyy-MM-dd")} is in the past. Defaulting to 30 days from now.`);
        fromDate = addDays(now, 30);
    }
    
    if (isRoundTrip) {
      toDate = addDays(fromDate, Math.max(1, durationDays) - 1);
    } else {
      toDate = undefined; 
    }
    
    console.log(`[parseTravelDatesForSerpApi] Final dates: Departure: ${format(fromDate, "yyyy-MM-dd")}, Return: ${toDate ? format(toDate, "yyyy-MM-dd") : 'N/A'}, Duration: ${durationDays} days`);
    return { departureDate: format(fromDate, "yyyy-MM-dd"), returnDate: toDate ? format(toDate, "yyyy-MM-dd") : undefined, durationDays };
}

export async function generateSmartBundles(input: SmartBundleInputType): Promise<SmartBundleOutputType> {
  try {
    console.log('[Server Action - generateSmartBundles] Input:', JSON.stringify(input, null, 2));
    
    // Caching for conceptual part is disabled to prevent permission errors
    console.log(`[AI Flow - SmartBundlesConceptual] Calling smartBundleFlowOriginal (caching disabled).`);
    const conceptualBundlesOutput = await smartBundleFlowOriginal(input);

    const conceptualBundles = conceptualBundlesOutput?.suggestions;

    if (!conceptualBundles || conceptualBundles.length === 0) {
      console.log('[Server Action - generateSmartBundles] No conceptual bundles from AI flow.');
      return { suggestions: [] };
    }

    const augmentedSuggestions: BundleSuggestion[] = [];

    for (const conceptualSuggestion of conceptualBundles) {
      let destinationLatitude: number | undefined = undefined;
      let destinationLongitude: number | undefined = undefined;

      if (conceptualSuggestion.destinationLatitudeString) {
          const latNum = parseFloat(conceptualSuggestion.destinationLatitudeString);
          if (!isNaN(latNum) && latNum >= -90 && latNum <= 90) destinationLatitude = latNum;
      }
      if (conceptualSuggestion.destinationLongitudeString) {
          const lonNum = parseFloat(conceptualSuggestion.destinationLongitudeString);
          if (!isNaN(lonNum) && lonNum >= -180 && lonNum <= 180) destinationLongitude = lonNum;
      }

      let augmentedSugg: BundleSuggestion = { 
          ...conceptualSuggestion, 
          userId: input.userId,
          suggestedActivities: [], 
          bundleImageUri: undefined, 
          destinationLatitude: destinationLatitude,
          destinationLongitude: destinationLongitude,
      };
      const { destination, travelDates, budget: conceptualBudget, origin: conceptualOrigin } = conceptualSuggestion.tripIdea;
      console.log(`[Server Action - generateSmartBundles] Augmenting bundle for: ${destination}, Dates: ${travelDates}, AI Budget: ${conceptualBudget}, Conceptual Origin: ${conceptualOrigin}`);
      
      if (conceptualSuggestion.bundleImagePrompt) {
          try {
              const imageResult = await generateMultipleImagesAction({
                  prompts: [{ id: `bundle_${normalizeCacheKeyPart(destination)}_${normalizeCacheKeyPart(conceptualSuggestion.bundleName)}`, prompt: conceptualSuggestion.bundleImagePrompt, styleHint: 'destination' }]
              });
              if (imageResult.results[0]?.imageUri) {
                  augmentedSugg.bundleImageUri = imageResult.results[0].imageUri;
                  console.log(`[Server Action - generateSmartBundles] Fetched bundle image for ${destination}.`);
              }
          } catch (imgError) {
              console.error(`[Server Action - generateSmartBundles] Error fetching bundle image for ${destination}:`, imgError);
          }
      }

      try {
        const parsedDates = parseTravelDatesForSerpApi(travelDates);
        console.log(`[Server Action - generateSmartBundles] Parsed dates for SerpApi: Departure ${parsedDates.departureDate}, Return ${parsedDates.returnDate}, Duration ${parsedDates.durationDays} days`);

        const originForFlight = conceptualSuggestion.tripIdea.origin || "NYC"; 
        
        const flightResults = await getRealFlightsAction({ 
          origin: originForFlight, 
          destination: destination, 
          departureDate: parsedDates.departureDate, 
          returnDate: parsedDates.returnDate, 
          tripType: parsedDates.returnDate ? "round-trip" : "one-way"
        });
        const bestFlight = flightResults.best_flights?.[0] || flightResults.other_flights?.[0];
        
        if (bestFlight) {
          augmentedSugg.realFlightExample = bestFlight as unknown as FlightOption; 
          console.log(`[Server Action - generateSmartBundles] Found real flight example: ${bestFlight.airline} for $${bestFlight.price}`);
        } else {
          console.log(`[Server Action - generateSmartBundles] No real flight found for ${destination}.`);
        }

        const hotelResults = await getRealHotelsAction({ 
          destination: destination, 
          checkInDate: parsedDates.departureDate, 
          checkOutDate: parsedDates.returnDate || format(addDays(parseISO(parsedDates.departureDate), parsedDates.durationDays -1 ), "yyyy-MM-dd"), 
          guests: "2" 
        });
        const bestHotel = hotelResults.hotels?.[0];
        if (bestHotel) {
          augmentedSugg.realHotelExample = bestHotel as unknown as HotelOption; 
           console.log(`[Server Action - generateSmartBundles] Found real hotel example: ${bestHotel.name} for ~$${bestHotel.price_per_night}/night`);
        } else {
           console.log(`[Server Action - generateSmartBundles] No real hotel found for ${destination}.`);
        }

        let realPriceMin = 0;
        let priceNoteParts: string[] = [];

        if (bestFlight?.price) {
          realPriceMin += bestFlight.price;
          priceNoteParts.push(`Flight ~\$${bestFlight.price.toLocaleString()}`);
        } else {
          priceNoteParts.push("No specific flight price found.");
        }

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
              if (realPriceMin > conceptualBudget * 1.2) {
                  augmentedSugg.priceFeasibilityNote = `AI's budget \$${conceptualBudget.toLocaleString()}. Total closer to ${augmentedSugg.estimatedRealPriceRange}. (${priceNoteParts.join(' + ')})`;
              } else if (realPriceMin < conceptualBudget * 0.8) {
                  augmentedSugg.priceFeasibilityNote = `Good news! AI's budget \$${conceptualBudget.toLocaleString()}. Total could be ${augmentedSugg.estimatedRealPriceRange}. (${priceNoteParts.join(' + ')})`;
              } else {
                  augmentedSugg.priceFeasibilityNote = `AI's budget \$${conceptualBudget.toLocaleString()} seems reasonable. Estimated ~${augmentedSugg.estimatedRealPriceRange}. (${priceNoteParts.join(' + ')})`;
              }
          } else {
              augmentedSugg.priceFeasibilityNote = `Est. real price: ${augmentedSugg.estimatedRealPriceRange}. (${priceNoteParts.join(' + ')})`;
          }
        } else {
          augmentedSugg.priceFeasibilityNote = "Could not determine real-time pricing from available options.";
        }
         console.log(`[Server Action - generateSmartBundles] Bundle for ${destination} - Feasibility: ${augmentedSugg.priceFeasibilityNote}`);
        
        const activityInterest = (conceptualSuggestion as any).activityKeywords?.join(", ") || undefined;
        const thingsToDoOutput = await getThingsToDoAction({ location: destination, interest: activityInterest });
        if (thingsToDoOutput.activities && thingsToDoOutput.activities.length > 0) {
          const placeholderActivity: ActivitySuggestion = {
            name: "Explore Local Area",
            description: "Wander around and discover local shops, cafes, and hidden gems at your own pace.",
            category: "Exploration",
            estimatedPrice: "Free - Varies",
            latitudeString: "",
            longitudeString: "",
            imagePrompt: "city street local shops exploration",
          };
          const activitiesToSet = thingsToDoOutput.activities.length > 0 
            ? thingsToDoOutput.activities.slice(0, 3) as ActivitySuggestion[]
            : [placeholderActivity as ActivitySuggestion];
          augmentedSugg.suggestedActivities = activitiesToSet;
          console.log(`[Server Action - generateSmartBundles] Added/Set ${augmentedSugg.suggestedActivities.length} activities for ${destination}.`);
        } else {
            augmentedSugg.suggestedActivities = [{
                name: "Explore Local Area",
                description: "Wander around and discover local shops, cafes, and hidden gems at your own pace.",
                category: "Exploration",
                estimatedPrice: "Free - Varies",
                latitudeString: "",
                longitudeString: "",
                imagePrompt: "city street local shops exploration",
            } as ActivitySuggestion];
          console.log(`[Server Action - generateSmartBundles] No specific activities found for ${destination} with interest: ${activityInterest}. Added placeholder.`);
        }

      } catch (error: any) {
          augmentedSugg.priceFeasibilityNote = "Error fetching real-time price context or activities for this bundle.";
          console.error(`[Server Action - generateSmartBundles] Error augmenting bundle for ${destination}:`, error.message, error);
      }
      augmentedSuggestions.push(augmentedSugg);
    }
    console.log('[Server Action - generateSmartBundles] Returning augmented suggestions:', augmentedSuggestions.length);
    return { suggestions: augmentedSuggestions };
  } catch (flowError: any) {
    console.error(`[Server Action - generateSmartBundles] Critical error in outer try-catch:`, flowError.message, flowError);
    return { suggestions: [] }; 
  }
}

export interface TrendingFlightDealsInput {
  originCity?: string;
}

export async function getTrendingFlightDealsAction(input?: TrendingFlightDealsInput): Promise<SerpApiFlightOption[]> {
  console.log("[Server Action - getTrendingFlightDealsAction] Fetching trending flights with input:", input);
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey || apiKey === "YOUR_SERPAPI_API_KEY_PLACEHOLDER") {
    console.error('[Server Action] SerpApi API key not configured.');
    return [];
  }

  // --- Primary Method: AI Suggested Hubs ---
  const originCityForAI = input?.originCity || "New York"; 
  console.log(`[TrendingDeals] Using origin for AI suggestions: ${originCityForAI}`);

  try {
    const originIata = await getIataCodeAction(originCityForAI) || originCityForAI;
    const hubSuggestionResult = await suggestHubAirportsFlow({ originCity: originCityForAI });
    const destinationHubs = hubSuggestionResult.hubs || [];

    if (destinationHubs.length > 0) {
      const searchPromises = destinationHubs.slice(0, 3).map(hubIata => {
        const departureDate = format(addMonths(new Date(), 1), "yyyy-MM-dd");
        const returnDate = format(addDays(addMonths(new Date(), 1), 7), "yyyy-MM-dd");
        return getRealFlightsAction({
          origin: originIata,
          destination: hubIata,
          departureDate,
          returnDate,
          tripType: "round-trip"
        });
      });

      const results = await Promise.all(searchPromises);
      const successfulDeals = results
        .map(res => res.best_flights?.[0] || res.other_flights?.[0])
        .filter((deal): deal is SerpApiFlightOption => deal !== null && deal !== undefined);
      
      if (successfulDeals.length > 0) {
        console.log(`[Server Action] Successfully fetched ${successfulDeals.length} AI-suggested trending deals from ${originCityForAI}.`);
        return successfulDeals;
      } else {
        console.warn(`[Server Action] AI-suggested hubs from ${originCityForAI} did not yield any flight deals. Proceeding to fallback.`);
      }
    }
  } catch (error: any) {
    console.error(`[Server Action] Error fetching AI-suggested trending flight deals from ${originCityForAI}:`, error.message, "Proceeding to fallback.");
  }

  // --- Fallback Method: Predefined Popular Routes ---
  console.log("[Server Action] Executing fallback for trending flight deals.");
  const fallbackRoutes = [
    { origin: "NYC", destination: "LAX", description: "New York to Los Angeles" },
    { origin: "LHR", destination: "CDG", description: "London to Paris" },
    { origin: "SIN", destination: "BKK", description: "Singapore to Bangkok" },
    { origin: "NYC", destination: "MIA", description: "New York to Miami" },
  ];

  const selectedRoutes = fallbackRoutes.sort(() => 0.5 - Math.random()).slice(0, 2);

  try {
    const searchPromises = selectedRoutes.map(route => {
      const departureDate = format(addMonths(new Date(), 1), "yyyy-MM-dd");
      const returnDate = format(addDays(addMonths(new Date(), 1), 7), "yyyy-MM-dd");
      return getRealFlightsAction({
        origin: route.origin,
        destination: route.destination,
        departureDate,
        returnDate,
        tripType: "round-trip"
      });
    });

    const results = await Promise.all(searchPromises);
    const successfulDeals = results
      .map(res => res.best_flights?.[0] || res.other_flights?.[0])
      .filter((deal): deal is SerpApiFlightOption => deal !== null && deal !== undefined);

    console.log(`[Server Action] Successfully fetched ${successfulDeals.length} deals from fallback routes.`);
    return successfulDeals;
  } catch(error: any) {
    console.error("[Server Action] Error fetching deals from fallback routes:", error.message);
    return [];
  }
}


export interface TrendingHotelDealsInput {
  destinationCity?: string;
  userLatitude?: number;
  userLongitude?: number;
}

export async function getTrendingHotelDealsAction(input?: TrendingHotelDealsInput): Promise<SerpApiHotelSuggestion[]> {
  console.log("[Server Action - getTrendingHotelDealsAction] Fetching trending hotels with input:", input);
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    console.error("[Server Action] SerpApi key not configured for hotel deals.");
    return [];
  }

  let destinationToSearch = "Paris"; // Ultimate fallback
  let determinationMethod = "Ultimate Fallback";

  if (input?.destinationCity) {
    destinationToSearch = input.destinationCity;
    determinationMethod = `Direct Input: ${destinationToSearch}`;
  } else if (input?.userLatitude && input?.userLongitude) {
    try {
      const reverseGeoParams = {
        engine: "google_maps_reverse",
        ll: `@${input.userLatitude},${input.userLongitude},15z`,
        api_key: apiKey,
      };
      const geoResponse = await getSerpApiJson(reverseGeoParams);
      const cityComponent = geoResponse.address_components?.find((c: any) => c.types.includes("locality"));
      if (cityComponent) {
        destinationToSearch = cityComponent.long_name;
        determinationMethod = `Geolocation: ${destinationToSearch}`;
      } else {
        determinationMethod = `Geolocation (city not found, using fallback Paris)`;
      }
    } catch (e: any) {
      console.error("[TrendingHotelDeals] Reverse geocoding failed:", e.message);
      determinationMethod = `Geolocation failed, using fallback Paris`;
    }
  } else {
    const samplePopularDestinations = ["Paris", "Rome", "Barcelona"];
    destinationToSearch = samplePopularDestinations[Math.floor(Math.random() * samplePopularDestinations.length)];
    determinationMethod = `Random popular: ${destinationToSearch}`;
  }

  console.log(`[TrendingHotelDeals] Destination determined via ${determinationMethod}`);

  const now = new Date();
  const checkInDate = format(addMonths(now, 1), "yyyy-MM-dd");
  const checkOutDate = format(addDays(addMonths(now, 1), 3), "yyyy-MM-dd"); // 3-night stay

  try {
    const hotelResults = await getRealHotelsAction({
      destination: destinationToSearch,
      checkInDate,
      checkOutDate,
      guests: "2",
    });
    const deals = hotelResults.hotels || [];
    console.log(`[TrendingHotelDeals] Found ${deals.length} potential deals for ${destinationToSearch}.`);
    // Add filtering to make them "deals"
    return deals.filter(h => h.rating && h.rating >= 4.0 && h.price_per_night && h.price_per_night < 350).slice(0, 4);
  } catch (error) {
    console.error(`[TrendingHotelDeals] Error fetching hotels for ${destinationToSearch}:`, error);
    return [];
  }
}

export async function getCoTravelAgentResponse(input: CoTravelAgentInputType): Promise<CoTravelAgentOutputType> { 
  try {
    return await getCoTravelAgentResponseOriginal(input); 
  } catch (error: any) {
    console.error(`[Action Error] getCoTravelAgentResponse failed:`, error);
    return {
      answer: "Sorry, the AI travel agent is currently unavailable. Please try again later.",
      relevantTips: []
    };
  }
}

export async function getItineraryAssistance(input: ItineraryAssistanceInputType): Promise<ItineraryAssistanceOutputType> {
  try {
    return await getItineraryAssistanceOriginal(input); 
  } catch (error: any) {
    console.error(`[Action Error] getItineraryAssistance failed:`, error);
    return {
      suggestedAdditions: [],
      assistanceSummary: "Sorry, the AI assistant could not provide suggestions at this time."
    };
  }
}

export async function generateTripSummary(input: TripSummaryInputType): Promise<TripSummaryOutputType> {
  try {
    return await generateTripSummaryOriginal(input); 
  } catch (error: any) {
    console.error(`[Action Error] generateTripSummary failed:`, error);
    return { summary: "Could not generate an AI summary for this trip." };
  }
}

export async function getPriceAdviceAction(input: PriceAdvisorInputType): Promise<PriceAdvisorOutputType> {
  try {
    return await getPriceAdviceOriginal(input); 
  } catch (error: any) {
    console.error(`[Action Error] getPriceAdviceAction failed:`, error);
    return { advice: "The AI price advisor is currently unavailable. Please check back later." };
  }
}

export async function getConceptualDateGridAction(input: ConceptualDateGridInputType): Promise<ConceptualDateGridOutputType> { 
  try {
    return await conceptualDateGridFlowOriginal(input); 
  } catch (error: any) {
    console.error(`[Action Error] getConceptualDateGridAction failed:`, error);
    return {
      gridSummary: "Could not fetch date grid insights due to an error.",
      datePricePoints: [],
    };
  }
}

export async function getConceptualPriceGraphAction(input: ConceptualPriceGraphInputType): Promise<ConceptualPriceGraphOutputType> { 
  try {
    return await conceptualPriceGraphFlowOriginal(input); 
  } catch (error: any) {
    console.error(`[Action Error] getConceptualPriceGraphAction failed:`, error);
    return {
      trendDescription: "Could not fetch price trend insights due to an error.",
      conceptualDataPoints: []
    };
  }
}

export async function getThingsToDoAction(input: ThingsToDoSearchInputType): Promise<ThingsToDoOutputType> {
  try {
    console.log('[Server Action - getThingsToDoAction] Input:', JSON.stringify(input, null, 2));
    console.log(`[AI Flow - ThingsToDo] Calling thingsToDoFlowOriginal directly (caching disabled).`);
    const result = await thingsToDoFlowOriginal(input);
    console.log(`[AI Flow - ThingsToDo] Result (first 500 chars):`, JSON.stringify(result,null,2).substring(0,500) + "...");
    return result;
  } catch (error: any) {
    console.error(`[Action Error] getThingsToDoAction failed:`, error);
    return {
      activities: [],
      searchSummary: "Sorry, an error occurred while searching for things to do. Please try again."
    };
  }
}

export async function getPackingList(input: PackingListInput): Promise<PackingListOutput> {
  try {
    return await getPackingListOriginal(input);
  } catch (error: any) {
    console.error(`[Action Error] getPackingList failed:`, error);
    return { packingList: ["Failed to generate list. Please check your inputs."] };
  }
}

export async function getDestinationFact(input: DestinationFactInput): Promise<DestinationFactOutput> {
  try {
    return await getDestinationFactOriginal(input);
  } catch (error: any) {
    console.error(`[Action Error] getDestinationFact failed:`, error);
    return { fact: "Could not fetch a fun fact at this moment." };
  }
}

export async function generateTripMemory(input: GenerateTripMemoryInput): Promise<GenerateTripMemoryOutput> {
  try {
    return await generateTripMemoryOriginal(input);
  } catch (error: any) {
    console.error(`[Action Error] generateTripMemory failed:`, error);
    return { memoryText: "Could not generate a memory for this trip." };
  }
}

export async function generateGroupSyncReport(input: GroupSyncInput): Promise<GroupSyncOutput> {
  try {
    return await generateGroupSyncReportOriginal(input);
  } catch (error: any) {
    console.error(`[Action Error] generateGroupSyncReport failed:`, error);
    return { compatibilityReport: "Failed to generate the group compatibility report due to an unexpected error." };
  }
}

export async function trackPrice(input: PriceTrackerInput): Promise<PriceTrackerOutput> {
  try {
    return await trackPriceOriginal(input);
  } catch (error: any) {
    console.error(`[Action Error] trackPrice failed:`, error);
    return { shouldAlert: false, alertMessage: "Could not process price tracking request." };
  }
}

export async function getPriceForecast(input: PriceForecastInput): Promise<PriceForecastOutput> {
  try {
    return await getPriceForecastOriginal(input);
  } catch (error: any) {
    console.error(`[Action Error] getPriceForecast failed:`, error);
    return { forecast: "Could not generate a price forecast at this time.", confidence: "low" };
  }
}

export async function getTravelTip(input?: TravelTipInput): Promise<TravelTipOutput> {
  try {
    return await getTravelTipOriginal(input || {});
  } catch (error: any) {
    console.error(`[Action Error] getTravelTip failed:`, error);
    return { tip: "Always pack a backup power bank for your phone!" };
  }
}

export async function getLocalInsiderTips(input: LocalInsiderTipsInput): Promise<LocalInsiderTipsOutput> {
  try {
    return await getLocalInsiderTipsOriginal(input);
  } catch (error: any) {
    console.error(`[Action Error] getLocalInsiderTips failed:`, error);
    return {
      trendingSpotsSummary: "Could not fetch trending spots.",
      hiddenGemPick: { name: "Error", description: "Could not fetch hidden gem.", reason: "Service unavailable." },
      dailyActivityPick: { name: "Error", description: "Could not fetch daily pick.", reason: "Service unavailable." },
      availabilityNotes: "Could not fetch availability notes."
    };
  }
}

import { getSerendipitySuggestions as getSerendipitySuggestionsFlow } from '@/ai/flows/serendipity-engine-flow';
import type { SerendipityInput, SerendipityOutput } from '@/ai/types/serendipity-engine-types';
export async function getSerendipitySuggestions(input: SerendipityInput): Promise<SerendipityOutput> {
  try {
    return await getSerendipitySuggestionsFlow(input);
  } catch (error: any) {
    console.error(`[Action Error] getSerendipitySuggestions failed:`, error);
    return { suggestions: [] };
  }
}

import { getAuthenticityVerification as getAuthenticityVerificationFlow } from '@/ai/flows/authenticity-verifier-flow';
import type { AuthenticityVerifierInput, AuthenticityVerifierOutput } from '@/ai/types/authenticity-verifier-flow';
export async function getAuthenticityVerification(input: AuthenticityVerifierInput): Promise<AuthenticityVerifierOutput> {
  try {
    return await getAuthenticityVerificationFlow(input);
  } catch (error: any) {
    console.error(`[Action Error] getAuthenticityVerification failed:`, error);
    const fallbackImage = `https://placehold.co/600x400.png?text=Error`;
    return {
      verificationSummary: "Could not generate authenticity insights.",
      authenticityFactors: [],
      confidenceNote: "An error occurred while trying to verify.",
      generatedImagePrompt: "error",
      generatedImageUri: fallbackImage,
    };
  }
}

import { generateSmartMapConcept as generateSmartMapConceptFlow } from '@/ai/flows/smart-map-concept-flow';
import type { SmartMapConceptInput, SmartMapConceptOutput } from '@/ai/types/smart-map-concept-types';
export async function generateSmartMapConcept(input: SmartMapConceptInput): Promise<SmartMapConceptOutput> {
  try {
    return await generateSmartMapConceptFlow(input);
  } catch (error: any) {
    console.error(`[Action Error] generateSmartMapConcept failed:`, error);
    return {
      mapConceptDescription: "Could not generate a smart map concept due to an error.",
      suggestedLayers: [],
      examplePois: [],
      imagePrompt: "error map concept",
    };
  }
}

import { getWhatIfAnalysis as getWhatIfAnalysisFlow } from '@/ai/flows/what-if-simulator-flow';
import type { WhatIfSimulatorInput, WhatIfSimulatorOutput } from '@/ai/types/what-if-simulator-types';
export async function getWhatIfAnalysis(input: WhatIfSimulatorInput): Promise<WhatIfSimulatorOutput> {
  try {
    return await getWhatIfAnalysisFlow(input);
  } catch (error: any) {
    console.error(`[Action Error] getWhatIfAnalysis failed:`, error);
    const fallbackImage = `https://placehold.co/600x400.png?text=Error`;
    return {
      comparisonSummary: "Could not generate a comparison due to an error.",
      destination1Analysis: { name: input.destination1, suitabilityForInterest: "N/A", generalVibe: "N/A", costExpectation: "N/A", keyHighlights: [], imageUri: fallbackImage, imagePrompt: "error" },
      destination2Analysis: { name: input.destination2, suitabilityForInterest: "N/A", generalVibe: "N/A", costExpectation: "N/A", keyHighlights: [], imageUri: fallbackImage, imagePrompt: "error" },
      aiRecommendation: "AI recommendation unavailable."
    };
  }
}

import { getAiArPreview as getAiArPreviewFlow } from '@/ai/flows/ai-ar-preview-flow';
import type { AiArPreviewInput, AiArPreviewOutput } from '@/ai/types/ai-ar-preview-types';
export async function getAiArPreview(input: AiArPreviewInput): Promise<AiArPreviewOutput> {
  try {
    return await getAiArPreviewFlow(input);
  } catch (error: any) {
    console.error(`[Action Error] getAiArPreview failed:`, error);
    const fallbackImage = `https://placehold.co/600x400.png?text=Error`;
    return {
      sceneDescription: "Could not generate AR preview insights.",
      moodTags: [], activityTags: [],
      generatedImageUri: fallbackImage,
      generatedImagePrompt: "error"
    };
  }
}

import { optimizeDayPlanByMood as optimizeDayPlanByMoodFlow } from '@/ai/flows/mood-energy-optimizer-flow';
import type { MoodEnergyOptimizerInput, MoodEnergyOptimizerOutput } from '@/ai/types/mood-energy-optimizer-types';
export async function optimizeDayPlanByMood(input: MoodEnergyOptimizerInput): Promise<MoodEnergyOptimizerOutput> {
  try {
    return await optimizeDayPlanByMoodFlow(input);
  } catch (error: any) {
    console.error(`[Action Error] optimizeDayPlanByMood failed:`, error);
    return {
      optimizationSummary: "Could not generate optimizations due to an error.",
      suggestedAdjustments: []
    };
  }
}

import { getPersonalizedAccessibilityScout as getPersonalizedAccessibilityScoutFlow } from '@/ai/flows/personalized-accessibility-scout-flow';
import type { PersonalizedAccessibilityScoutInput, PersonalizedAccessibilityScoutOutput } from '@/ai/types/personalized-accessibility-scout-types';
export async function getPersonalizedAccessibilityScout(input: PersonalizedAccessibilityScoutInput): Promise<PersonalizedAccessibilityScoutOutput> {
  try {
    return await getPersonalizedAccessibilityScoutFlow(input);
  } catch (error: any) {
    console.error(`[Action Error] getPersonalizedAccessibilityScout failed:`, error);
    const fallbackImage = `https://placehold.co/600x400.png?text=Error`;
    return {
      overallAssessment: "Could not generate an accessibility report due to an error.",
      disclaimer: `This AI-generated information is for preliminary guidance only and not a substitute for thorough personal research and consultation with official accessibility resources for ${input.destination}. Verify all details with providers and local authorities before traveling.`,
      imagePrompt: "error",
      imageUri: fallbackImage,
    };
  }
}

import { narrateLocalLegend as narrateLocalLegendFlow } from '@/ai/flows/local-legend-narrator-flow';
import type { LocalLegendNarratorInput, LocalLegendNarratorOutput } from '@/ai/types/local-legend-narrator-types';
export async function narrateLocalLegend(input: LocalLegendNarratorInput): Promise<LocalLegendNarratorOutput> {
  try {
    return await narrateLocalLegendFlow(input);
  } catch (error: any) {
    console.error(`[Action Error] narrateLocalLegend failed:`, error);
    const fallbackImage = `https://placehold.co/600x400.png?text=Error`;
    return {
      legendTitle: "The Lost Story",
      narrative: `Could not retrieve a legend due to an error.`,
      imageUri: fallbackImage,
      visualPrompt: "error story"
    };
  }
}

import { synthesizePostTripFeedback as synthesizePostTripFeedbackFlow } from '@/ai/flows/post-trip-synthesizer-flow';
import type { PostTripFeedbackInput, PostTripAnalysisOutput } from '@/ai/types/post-trip-synthesizer-flow';
export async function synthesizePostTripFeedback(input: PostTripFeedbackInput): Promise<PostTripAnalysisOutput> {
  try {
    return await synthesizePostTripFeedbackFlow(input);
  } catch (error: any) {
    console.error(`[Action Error] synthesizePostTripFeedback failed:`, error);
    return {
      refinedPersonaInsights: "Could not synthesize feedback due to an error.",
      futureTrajectorySuggestions: []
    };
  }
}
