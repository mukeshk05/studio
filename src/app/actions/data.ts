'use server';

import { getJson as getSerpApiJson } from 'serpapi';
import { format, addDays } from 'date-fns';
import type { SerpApiFlightSearchInput, SerpApiFlightSearchOutput, SerpApiFlightOption, SerpApiFlightLeg } from '@/ai/types/serpapi-flight-search-types';
import type { SerpApiHotelSearchInput, SerpApiHotelSearchOutput, SerpApiHotelSuggestion } from '@/ai/types/serpapi-hotel-search-types';


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
  try {
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
  try {
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
