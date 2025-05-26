
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
import { getJson as getSerpApiJson } from 'serpapi';
import type { SerpApiFlightSearchInput, SerpApiFlightSearchOutput, SerpApiFlightOption, SerpApiFlightLeg } from '@/ai/types/serpapi-flight-search-types';

import { aiHotelSearchFlow } from '@/ai/flows/ai-hotel-search-flow'; 
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

function deriveStopsDescription(flightOption: SerpApiFlightOption): string {
    const legs = flightOption.flights || [];
    if (legs.length === 0) return "Unknown stops";
    if (legs.length === 1) return "Non-stop";
    
    const numStops = (flightOption.layovers?.length || legs.length - 1);
    if (numStops <= 0) return "Non-stop"; // Should be caught by legs.length === 1 but good fallback
    
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
  const apiKey = process.env.SERPAPI_API_KEY; // Ensure this is how you store your key
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
    const response = await getSerpApiJson(params);
    // Log the entire raw response for thorough debugging
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
            if (legsArray.length === 0 && !flight.price) { // If no legs and no price, it's likely an unusable entry
                console.warn(`[Server Action - getRealFlightsAction - processFlights] Flight option at index ${index} has no legs/segments AND no price. Skipping. Raw:`, JSON.stringify(flight, null, 2));
                // Return a structure that will be filtered out or handled as invalid by the caller
                return { price: undefined } as unknown as SerpApiFlightOption; 
            }
             if (legsArray.length === 0 && flight.price) {
                console.warn(`[Server Action - getRealFlightsAction - processFlights] Flight option at index ${index} has a price but no legs/segments array. This might be a direct flight summarized at top level. Raw:`, JSON.stringify(flight, null, 2));
                // Attempt to construct a single leg from top-level info if possible, or handle as summary-only
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
        }).filter(fo => fo.price != null && (fo.derived_departure_airport_name != null || (fo.flights && fo.flights.length > 0))); // Ensure basic data exists
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

export async function getAiHotelSuggestionsAction(input: AiHotelSearchInput): Promise<AiHotelSearchOutput> {
  console.log('[Server Action - getAiHotelSuggestionsAction] Input:', JSON.stringify(input, null, 2));
  try {
    const result = await aiHotelSearchFlow(input);
    console.log(`[Server Action - getAiHotelSuggestionsAction] AI Flow Result (hotels count): ${result.hotels?.length || 0}`);
    return result;
  } catch (error:any) {
     console.error('[Server Action - getAiHotelSuggestionsAction] ERROR fetching AI hotel suggestions:', error);
    return { 
        hotels: [], 
        searchSummary: `Sorry, we encountered an error finding hotel ideas: ${error.message}` 
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

// For getCoTravelAgentResponse (used in planner page)
export { getCoTravelAgentResponse } from '@/ai/flows/co-travel-agent-flow';

// For getItineraryAssistance (used in dashboard)
export { getItineraryAssistance } from '@/ai/flows/itinerary-assistance-flow';

// For generateTripSummary (used in dashboard)
export { generateTripSummary } from '@/ai/flows/trip-summary-flow';
