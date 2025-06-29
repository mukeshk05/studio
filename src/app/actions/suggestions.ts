'use server';

import { popularDestinationsFlow } from '@/ai/flows/popular-destinations-flow';
import type { PopularDestinationsInput, PopularDestinationsOutput } from '@/ai/types/popular-destinations-types';

import { getExploreIdeasFromHistory as getExploreIdeasFromHistoryFlow } from '@/ai/flows/explore-ideas-from-history-flow';
import type { ExploreIdeasFromHistoryInput, ExploreIdeasOutput } from '@/ai/types/explore-ideas-types';

import { aiFlightMapDealsFlow } from '@/ai/flows/ai-flight-map-deals-flow';
import type { AiFlightMapDealInput, AiFlightMapDealOutput } from '@/ai/types/ai-flight-map-deals-types';

import { smartBundleFlow as smartBundleFlowOriginal } from '@/ai/flows/smart-bundle-flow';
import type { SmartBundleInput, SmartBundleOutput, BundleSuggestion } from '@/ai/types/smart-bundle-types';

import { format, addDays, addMonths, isBefore, isValid, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, differenceInDays } from 'date-fns';
import { getIataCodeAction, getRealFlightsAction, getRealHotelsAction } from './data';
import { generateMultipleImagesAction } from './images';
import { getThingsToDoAction } from './destination';
import type { FlightOption, HotelOption, ActivitySuggestion } from '@/lib/types';


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

      const flightSearchInput = {
        origin: originForSearch,
        destination: destinationForSearch,
        departureDate: format(startDate, "yyyy-MM-dd"),
        returnDate: format(endDate, "yyyy-MM-dd"),
        tripType: "round-trip" as const,
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

const normalizeCacheKeyPart = (part?: string | number | null): string => {
  if (part === undefined || part === null) return 'na';
  let strPart = String(part).trim().toLowerCase();
  if (strPart === "") return 'empty';
  strPart = strPart.replace(/[^a-z0-9_\-]/g, '_').replace(/_+/g, '_');
  return strPart.substring(0, 50);
};

export async function generateSmartBundles(input: SmartBundleInput): Promise<SmartBundleOutput> {
  try {
    console.log('[Server Action - generateSmartBundles] Input:', JSON.stringify(input, null, 2));
    
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
