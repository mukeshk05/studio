
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AITripPlannerInput, AITripPlannerOutput, UserPersona } from "@/ai/types/trip-planner-types";
import { aiTripPlanner } from "@/ai/flows/ai-trip-planner";
import { getCoTravelAgentResponse, getIataCodeAction, generateMultipleImagesAction, getRealFlightsAction, getRealHotelsAction } from "@/app/actions"; 
import type { Itinerary, SearchHistoryEntry, SerpApiFlightOption, SerpApiHotelSuggestion, TripPackageSuggestion } from "@/lib/types";
import { TripPlannerInputSheet } from "@/components/trip-planner/TripPlannerInputSheet";
import { ChatMessageCard } from "@/components/trip-planner/ChatMessageCard";
import { Input } from "@/components/ui/input";
import { History, Send, Loader2, MessageSquare, Bot, Plane as PlaneIcon, Hotel as HotelIcon, Briefcase, Star, Eye, ExternalLink, ImageOff, AlertTriangle } from "lucide-react"; 
import { useAuth } from "@/contexts/AuthContext";
import { useSavedTrips, useAddSavedTrip, useAddSearchHistory, useGetUserTravelPersona } from "@/lib/firestoreHooks";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { SearchHistoryDrawer } from "@/components/planner/SearchHistoryDrawer";
import { ItineraryDetailSheet } from "@/components/trip-planner/ItineraryDetailSheet";
import { CombinedTripDetailDialog } from "@/components/trip-planner/CombinedTripDetailDialog";
import { format, addDays, parse, differenceInDays, addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isValid, parseISO, isBefore, addYears } from 'date-fns';
import type { ImagePromptItem } from "@/ai/flows/generate-multiple-images-flow";

export interface ChatMessage {
  id: string;
  type: "user" | "ai" | "error" | "loading" | "system" | "booking_guidance" | "ai_text_response" | "trip_package_suggestions";
  payload?: any;
  timestamp: Date;
  title?: string;
}

export interface PreFilteredOptions {
  flights: SerpApiFlightOption[];
  hotels: SerpApiHotelSuggestion[];
  note: string;
  userInput: AITripPlannerInput;
}

function parseFlexibleDates(dateStringInput: string): { from: Date, to: Date, durationDays: number } {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Normalize to start of day

    // Default values: 7 days from now, for 7 days.
    let fromDateCandidate = addDays(now, 7);
    let toDateCandidate = addDays(fromDateCandidate, 6); // 7 days total duration

    const safeReturn = (from: Date, to: Date, dur?: number): { from: Date, to: Date, durationDays: number } => {
        let finalFrom = from;
        let finalTo = to;
        let finalDur: number;

        if (!isValid(finalFrom) || isBefore(finalFrom, now)) {
            finalFrom = addDays(now, 7); // Default to a week from now if past or invalid
        }

        if (dur !== undefined && dur > 0) {
            finalTo = addDays(finalFrom, dur - 1);
        } else if (!isValid(finalTo) || isBefore(finalTo, finalFrom)) {
            finalTo = addDays(finalFrom, 6); // Default 7-day duration
        }
        
        finalDur = differenceInDays(finalTo, finalFrom) + 1;
        return { from: finalFrom, to: finalTo, durationDays: Math.max(1, finalDur) };
    };
    
    if (!dateStringInput || dateStringInput.trim() === "") {
      return safeReturn(fromDateCandidate, toDateCandidate, 7);
    }

    const dateString = dateStringInput.trim().toLowerCase();
    let parsedDurationDays: number | undefined = undefined;

    const durationKeywordMatch = dateString.match(/(?:for\s+)?(a|\d+)\s*(day|week|month)s?/i);
    if (durationKeywordMatch) {
        const num = durationKeywordMatch[1].toLowerCase() === 'a' ? 1 : parseInt(durationKeywordMatch[1], 10);
        const unit = durationKeywordMatch[2].toLowerCase();
        if (unit.startsWith('week')) parsedDurationDays = num * 7;
        else if (unit.startsWith('month')) parsedDurationDays = num * 30;
        else parsedDurationDays = num;
    }

    const specificRangeMatch = dateString.match(/(\d{1,2}[\/\-.]\d{1,2}(?:[\/\-.]\d{2,4})?|\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s*\d{4})?)\s*(?:to|-|until|&)\s*(\d{1,2}[\/\-.]\d{1,2}(?:[\/\-.]\d{2,4})?|\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s*\d{4})?)/i);
    if (specificRangeMatch) {
        try {
            const currentYear = now.getFullYear();
            const normalizeYear = (ds: string, baseYear: number) => {
                if (!ds.match(/\d{4}/) && ds.match(/\d{1,2}[\/\-.]\d{1,2}$/)) return `${ds}/${baseYear}`; // Append current year if just MM/DD
                if (ds.match(/\w+\s+\d{1,2}$/)) return `${ds}, ${baseYear}`; // Append current year if Month DD
                return ds;
            };

            let d1Str = specificRangeMatch[1].replace(/(st|nd|rd|th)/gi, '');
            let d2Str = specificRangeMatch[2].replace(/(st|nd|rd|th)/gi, '');
            
            d1Str = normalizeYear(d1Str, currentYear);
            d2Str = normalizeYear(d2Str, currentYear);

            let d1 = parseISO(new Date(d1Str).toISOString()); // Using parseISO for robustness
            let d2 = parseISO(new Date(d2Str).toISOString());

            if (isValid(d1) && d1.getFullYear() === currentYear && isBefore(d1, now) && !specificRangeMatch[1].match(/\d{4}/)) d1 = addYears(d1, 1);
            if (isValid(d2) && d2.getFullYear() === currentYear && isBefore(d2, d1) && !specificRangeMatch[2].match(/\d{4}/)) d2 = addYears(d2, 1);
            if (isValid(d2) && isBefore(d2, d1)) d2 = addYears(d2,1);


            if (isValid(d1) && isValid(d2)) {
                return safeReturn(d1, d2);
            }
        } catch (e) { console.warn("Could not parse specific date range:", dateString, e); }
    }

    if (dateString.includes("next weekend")) {
        fromDateCandidate = startOfWeek(addDays(now, 7), { weekStartsOn: 5 }); 
        return safeReturn(fromDateCandidate, addDays(fromDateCandidate, 2), 3);
    }
    if (dateString.includes("this weekend")) {
        fromDateCandidate = startOfWeek(now, { weekStartsOn: 5 });
        if (isBefore(fromDateCandidate, now)) fromDateCandidate = addDays(fromDateCandidate, 7);
        return safeReturn(fromDateCandidate, addDays(fromDateCandidate, 2), 3);
    }
    if (dateString.includes("next month")) {
        fromDateCandidate = startOfMonth(addMonths(now, 1));
        return safeReturn(fromDateCandidate, toDateCandidate, parsedDurationDays || 30); // Default to a month if duration unclear
    }
    if (dateString.includes("this month")) {
        fromDateCandidate = startOfMonth(now);
        if (isBefore(fromDateCandidate, now) && now.getDate() !== 1) fromDateCandidate = addDays(now,1); // If past start of this month, start tomorrow
        return safeReturn(fromDateCandidate, toDateCandidate, parsedDurationDays || (endOfMonth(now).getDate() - fromDateCandidate.getDate() +1) );
    }
    
    const inXTimeMatch = dateString.match(/in\s+(\d+)\s*(days?|weeks?|months?)/i);
    if (inXTimeMatch) {
        const num = parseInt(inXTimeMatch[1], 10);
        const unit = inXTimeMatch[2].toLowerCase();
        if (unit.startsWith('day')) fromDateCandidate = addDays(now, num);
        else if (unit.startsWith('week')) fromDateCandidate = addDays(now, num * 7);
        else if (unit.startsWith('month')) fromDateCandidate = addMonths(now, num);
        return safeReturn(fromDateCandidate, toDateCandidate, parsedDurationDays);
    }
    
    const monthKeywordMatch = dateString.match(/(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)/i);
    if (monthKeywordMatch) {
        const monthName = monthKeywordMatch[0];
        const monthIndex = new Date(Date.parse(monthName +" 1, 2000")).getMonth();
        let year = now.getFullYear();
        let tempFromDate = new Date(year, monthIndex, 1);
        const dayOfMonthMatch = dateString.match(new RegExp(monthName + "\\s*(\\d{1,2})(?:st|nd|rd|th)?", "i"));
        if (dayOfMonthMatch && dayOfMonthMatch[1]) {
            try { tempFromDate.setDate(parseInt(dayOfMonthMatch[1], 10)); } catch (e) { /* ignore */ }
        }
        if (isBefore(tempFromDate, now) && !dateString.includes(String(year+1)) && !dateString.match(/\d{4}/)) { // Don't advance year if user specified one
            tempFromDate.setFullYear(year + 1);
        }
        if(isValid(tempFromDate)) fromDateCandidate = tempFromDate;
        return safeReturn(fromDateCandidate, toDateCandidate, parsedDurationDays);
    }

    // Fallback for single date mentions or if nothing else parsed
    try {
        const parsedSingleDate = parseISO(new Date(dateString.replace(/(st|nd|rd|th)/gi, '')).toISOString());
        if (isValid(parsedSingleDate) && !isBefore(parsedSingleDate, now)) {
            fromDateCandidate = parsedSingleDate;
        }
    } catch(e) { /* ignore if single date parse fails */ }

    return safeReturn(fromDateCandidate, toDateCandidate, parsedDurationDays); // Default duration if only fromDate was found or all parsing failed
}


export default function TripPlannerPage() {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [currentUserInput, setCurrentUserInput] = useState("");
  const [isInputSheetOpen, setIsInputSheetOpen] = useState(false);
  const [selectedItinerary, setSelectedItinerary] = useState<Itinerary | null>(null); 
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [isSearchHistoryDrawerOpen, setIsSearchHistoryDrawerOpen] = useState(false);
  const [currentFormInitialValues, setCurrentFormInitialValues] = useState<Partial<AITripPlannerInput> | null>(null);
  const [isAiRespondingToChat, setIsAiRespondingToChat] = useState(false);

  const [selectedTripPackage, setSelectedTripPackage] = useState<TripPackageSuggestion | null>(null);
  const [isPackageDetailDialogOpen, setIsPackageDetailDialogOpen] = useState(false);


  const { currentUser } = useAuth();
  const { toast } = useToast();
  const { data: savedTrips, isLoading: isLoadingSavedTrips } = useSavedTrips();
  const { data: userPersona } = useGetUserTravelPersona();
  const addSavedTripMutation = useAddSavedTrip();
  const addSearchHistoryMutation = useAddSearchHistory();

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  const [isMapsScriptLoaded, setIsMapsScriptLoaded] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const initGoogleMapsApiPlannerPageCallback = useCallback(() => {
    console.log("[PlannerPage] Google Maps API script loaded callback for planner page executed.");
    setIsMapsScriptLoaded(true);
  }, []);

  useEffect(() => {
    console.log("[PlannerPage] Maps API Script Loader Effect Triggered. API Key Present:", !!apiKey);
    if (!apiKey) { 
        console.error("[PlannerPage] Google Maps API key is missing. Autocomplete and map features will be disabled.");
        setIsMapsScriptLoaded(false); 
        return; 
    }
    if (typeof window !== 'undefined' && (window as any).google && (window as any).google.maps && (window as any).google.maps.places) {
      console.log("[PlannerPage] Google Maps API (with Places) already loaded.");
      if (!isMapsScriptLoaded) setIsMapsScriptLoaded(true);
      return;
    }
    
    const scriptId = 'google-maps-planner-page-script';
    if (document.getElementById(scriptId)) {
        console.log("[PlannerPage] Google Maps script tag already exists in document.");
         if (typeof window !== 'undefined' && (window as any).google?.maps?.places && !isMapsScriptLoaded) {
            setIsMapsScriptLoaded(true); 
        }
        return;
    }
    
    console.log("[PlannerPage] Attempting to load Google Maps API script with Places library...");
    (window as any).initGoogleMapsApiPlannerPage = initGoogleMapsApiPlannerPageCallback; 

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMapsApiPlannerPage`;
    script.async = true; 
    script.defer = true;
    script.onerror = () => { 
        console.error("[PlannerPage] Failed to load Google Maps API script. Check API key, network, and callback name.");
        setIsMapsScriptLoaded(false); 
    };
    document.head.appendChild(script);

    return () => { 
      if ((window as any).initGoogleMapsApiPlannerPage) {
        delete (window as any).initGoogleMapsApiPlannerPage;
      }
    };
  }, [apiKey, isMapsScriptLoaded, initGoogleMapsApiPlannerPageCallback]);

  useEffect(() => {
    const bundledTripData = localStorage.getItem('tripBundleToPlan');
    if (bundledTripData) {
      try {
        const tripIdea: AITripPlannerInput = JSON.parse(bundledTripData);
        setCurrentFormInitialValues(tripIdea);
        setIsInputSheetOpen(true);
      } catch (e) { console.error("Error parsing trip bundle data:", e); }
      finally { localStorage.removeItem('tripBundleToPlan'); }
    } else if (chatHistory.length === 0 && currentUser) {
      setChatHistory([{ id: crypto.randomUUID(), type: "system", payload: "Welcome! Compose a trip request or ask Aura AI a quick question.", timestamp: new Date() }]);
    } else if (chatHistory.length === 0 && !currentUser && !isLoadingSavedTrips) {
      setChatHistory([{ id: crypto.randomUUID(), type: "system", payload: "Log in to plan trips with Aura AI.", timestamp: new Date() }]);
    }
  }, [currentUser, isLoadingSavedTrips, chatHistory.length]);

  useEffect(() => {
    chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: "smooth" });
  }, [chatHistory]);
  
  function generateTripPackageSuggestions(
    filteredFlights: SerpApiFlightOption[],
    filteredHotels: SerpApiHotelSuggestion[],
    durationDays: number,
    destinationQuery: string,
    travelDatesQuery: string,
    userInputBudget: number,
    mainDestinationImageUri?: string // Accept main image URI
  ): TripPackageSuggestion[] {
    const suggestions: TripPackageSuggestion[] = [];
    if (filteredFlights.length === 0 || filteredHotels.length === 0) {
      console.log("[PlannerPage] No flights or hotels available after filtering to generate packages.");
      return [];
    }
  
    const sortedHotelsByPrice = [...filteredHotels].sort((a, b) => (a.price_per_night ?? Infinity) - (b.price_per_night ?? Infinity));
    const sortedHotelsByRating = [...filteredHotels].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  
    const budgetToleranceFactor = 1.25;
    const maxBudgetForPackage = userInputBudget * budgetToleranceFactor;
  
    const addSuggestion = (flight: SerpApiFlightOption, hotel: SerpApiHotelSuggestion, idPrefix: string) => {
      const totalCost = (flight.price || 0) + ((hotel.price_per_night || 0) * durationDays);
      if (totalCost <= maxBudgetForPackage && hotel.name && flight.derived_flight_numbers) { // Ensure hotel name exists
        suggestions.push({
          id: `${idPrefix}_${flight.derived_flight_numbers.replace(/\s|,/g, '')}_${hotel.name.replace(/\s/g, '').substring(0,10)}`,
          flight, hotel, totalEstimatedCost: totalCost, durationDays,
          destinationQuery, travelDatesQuery,
          destinationImageUri: mainDestinationImageUri, // Use the passed-in image
          destinationImagePrompt: `Iconic view of ${destinationQuery} for a trip`,
          userInput: { destination: destinationQuery, travelDates: travelDatesQuery, budget: userInputBudget, origin: flight.derived_departure_airport_name }
        });
      }
    };
  
    // Strategy 1: Cheapest flight + Cheapest suitable hotel
    if (filteredFlights[0] && sortedHotelsByPrice[0]?.price_per_night !== undefined) {
      addSuggestion(filteredFlights[0], sortedHotelsByPrice[0], "pkg_cheapF_cheapH");
    }
  
    // Strategy 2: Cheapest flight + Best-rated suitable hotel
    if (filteredFlights[0] && sortedHotelsByRating[0]?.price_per_night !== undefined) {
      if (suggestions.length === 0 || suggestions[0].hotel.name !== sortedHotelsByRating[0].name) { // Avoid duplicate hotel if it was already cheapest
        addSuggestion(filteredFlights[0], sortedHotelsByRating[0], "pkg_cheapF_topRatedH");
      }
    }
    
    // Strategy 3: Balanced flight + A different suitable hotel
    if (filteredFlights.length > 0 && sortedHotelsByPrice.length > 0 && suggestions.length < 3) {
      const flight = filteredFlights[Math.min(1, filteredFlights.length - 1)]; 
      const hotelToAvoid1 = suggestions[0]?.hotel.name;
      const hotelToAvoid2 = suggestions[1]?.hotel.name;
      const hotel = sortedHotelsByPrice.find(h => h.name !== hotelToAvoid1 && h.name !== hotelToAvoid2) || sortedHotelsByRating.find(h => h.name !== hotelToAvoid1 && h.name !== hotelToAvoid2) || sortedHotelsByPrice[0];
      
      if (hotel?.price_per_night !== undefined) {
        addSuggestion(flight, hotel, "pkg_balF_altH");
      }
    }
    
    const uniqueSuggestions = Array.from(new Map(suggestions.map(item => [item.id, item])).values());
    return uniqueSuggestions.slice(0, 3);
  }

  const handlePlanRequest = async (input: AITripPlannerInput) => {
    if (!currentUser) {
      toast({ title: "Authentication Required", description: "Please log in.", variant: "destructive" });
      setIsInputSheetOpen(false); return;
    }
    try { await addSearchHistoryMutation.mutateAsync({ destination: input.destination, travelDates: input.travelDates, budget: input.budget }); }
    catch (error) { console.warn("Failed to save search history:", error); }

    const userMessage: ChatMessage = { id: crypto.randomUUID(), type: "user", payload: input, timestamp: new Date(), title: "My Trip Request" };
    let loadingMessageId = crypto.randomUUID();
    setChatHistory(prev => [...prev, userMessage, { id: loadingMessageId, type: "loading", timestamp: new Date(), payload: "Aura is finding destination visuals..." }]);

    let mainDestinationImageUri: string | undefined = undefined;
    try {
        const normalizedDestinationForCacheKey = input.destination.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const imagePromptsForDestination: ImagePromptItem[] = [{ 
            id: `destination_image_${normalizedDestinationForCacheKey}`, 
            prompt: `Iconic scenic travel photograph of ${input.destination}`, 
            styleHint: 'destination' 
        }];
        const destImageResult = await generateMultipleImagesAction({ prompts: imagePromptsForDestination });
        mainDestinationImageUri = destImageResult.results[0]?.imageUri || undefined;
        if (mainDestinationImageUri) {
             setChatHistory(prev => prev.map(msg => msg.id === loadingMessageId ? { ...msg, payload: "Aura is fetching real-time flight & hotel data..." } : msg));
        } else {
            console.warn(`[PlannerPage] Failed to get main destination image for ${input.destination}. Using placeholder.`);
            setChatHistory(prev => prev.map(msg => msg.id === loadingMessageId ? { ...msg, payload: "Visual generation failed. Fetching options..." } : msg));
        }
    } catch (imgError) {
        console.error("[PlannerPage] Error fetching destination image:", imgError);
        setChatHistory(prev => prev.map(msg => msg.id === loadingMessageId ? { ...msg, payload: "Visual generation failed. Fetching options..." } : msg));
    }
    
    const parsedDates = parseFlexibleDates(input.travelDates);
    if (!isValid(parsedDates.from) || !isValid(parsedDates.to)) {
        const errorMsg = "Could not understand the travel dates provided. Please try a different format (e.g., 'next month for 7 days', '07/10/2024 - 07/17/2024').";
        toast({ title: "Date Parsing Error", description: errorMsg, variant: "destructive", duration: 7000 });
        setChatHistory(prev => prev.filter(msg => msg.id !== loadingMessageId).concat({
            id: crypto.randomUUID(), type: "error", payload: errorMsg, timestamp: new Date()
        }));
        return;
    }
    const formattedDepartureDate = format(parsedDates.from, "yyyy-MM-dd");
    const formattedReturnDate = format(parsedDates.to, "yyyy-MM-dd");

    let realFlights: SerpApiFlightOption[] = [];
    let realHotels: SerpApiHotelSuggestion[] = [];

    const originForFlightSearch = input.origin || "NYC"; 
    let originIata = await getIataCodeAction(originForFlightSearch);
    if (input.origin && !originIata) console.warn(`Could not find IATA for origin: ${input.origin}, using name directly for flight search.`);
    
    const destinationIata = await getIataCodeAction(input.destination);
    if (!destinationIata) console.warn(`Could not find IATA for destination: ${input.destination}, using name directly for flight/hotel search.`);

    try {
      console.log("[PlannerPage] Fetching real flights for planner...");
      const flightSearchInput = { origin: originIata || originForFlightSearch, destination: destinationIata || input.destination, departureDate: formattedDepartureDate, returnDate: formattedReturnDate, tripType: "round-trip" as const };
      console.log("[PlannerPage] Flight Search Input to SerpApi:", flightSearchInput);
      const flightResults = await getRealFlightsAction(flightSearchInput);
      if (flightResults.best_flights) realFlights.push(...flightResults.best_flights);
      if (flightResults.other_flights) realFlights.push(...flightResults.other_flights);
      console.log(`Fetched ${realFlights.length} real flight options for planner.`);
    } catch (e) { console.error("Error fetching real flights:", e); toast({ title: "Flight Fetch Error (SerpApi)", description: "Could not retrieve flight options from SerpApi.", variant: "destructive" }); }

    try {
      console.log("[PlannerPage] Fetching real hotels for planner...");
      const hotelSearchInput = { destination: destinationIata || input.destination, checkInDate: formattedDepartureDate, checkOutDate: formattedReturnDate, guests: "2" }; 
      console.log("[PlannerPage] Hotel Search Input to SerpApi:", hotelSearchInput);
      const hotelResults = await getRealHotelsAction(hotelSearchInput);
      if (hotelResults.hotels) realHotels = hotelResults.hotels;
      console.log(`Fetched ${realHotels.length} real hotel options for planner.`);
    } catch (e) { console.error("Error fetching real hotels:", e); toast({ title: "Hotel Fetch Error (SerpApi)", description: "Could not retrieve hotel options from SerpApi.", variant: "destructive" }); }
    
    setChatHistory(prev => prev.map(msg => msg.id === loadingMessageId ? { ...msg, payload: "Aura is pre-filtering & combining best options..." } : msg));

    const flightBudgetPercentage = 0.40; 
    const hotelBudgetPercentage = 0.60;
    const allocatedFlightBudget = input.budget * flightBudgetPercentage;
    const allocatedHotelBudgetTotal = input.budget * hotelBudgetPercentage;

    console.log(`Total User Budget: $${input.budget}, Flight Allocation: ~$${allocatedFlightBudget.toFixed(0)}, Hotel Total Allocation: ~$${allocatedHotelBudgetTotal.toFixed(0)} for ${parsedDates.durationDays} days.`);

    const filteredFlights = realFlights
      .filter(flight => flight.price != null && flight.price <= allocatedFlightBudget)
      .sort((a, b) => (a.price || Infinity) - (b.price || Infinity))
      .slice(0, 10); 
    console.log(`Flights: ${realFlights.length} initially, ${filteredFlights.length} after budget filter.`);

    const filteredHotels = realHotels
      .filter(hotel => {
        if (hotel.price_per_night == null && hotel.total_price == null) return false;
        const costForStay = hotel.total_price || ((hotel.price_per_night || 0) * parsedDates.durationDays);
        return costForStay <= allocatedHotelBudgetTotal;
      })
      .sort((a, b) => ((a.price_per_night ?? a.total_price ?? Infinity) - (b.price_per_night ?? b.total_price ?? Infinity)))
      .slice(0, 10);
    console.log(`Hotels: ${realHotels.length} initially, ${filteredHotels.length} after budget filter.`);
    
    const tripPackages = generateTripPackageSuggestions(
      filteredFlights, 
      filteredHotels, 
      parsedDates.durationDays, 
      input.destination, 
      input.travelDates,
      input.budget,
      mainDestinationImageUri
    );

    let packageNote = `Aura AI curated ${tripPackages.length} trip package(s) for ${input.destination} from ${filteredFlights.length} suitable flights and ${filteredHotels.length} suitable hotels found within budget allocations.`;
    if(tripPackages.length === 0) {
        packageNote = `Aura AI could not create any trip packages strictly within your budget from the ${filteredFlights.length} flights and ${filteredHotels.length} hotels found. You might need to increase your budget or adjust dates/destination. The AI will now try to make purely conceptual plans based on your original request.`;
    }

    const packageMessage: ChatMessage = {
      id: crypto.randomUUID(),
      type: "trip_package_suggestions",
      payload: { packages: tripPackages, note: packageNote, userInput: input },
      timestamp: new Date(),
      title: "Curated Trip Packages by Aura AI"
    };
    setChatHistory(prev => prev.map(msg => msg.id === loadingMessageId ? { ...msg, type:"system", payload: packageNote } : msg).concat(packageMessage)); 
    loadingMessageId = crypto.randomUUID(); 
    setChatHistory(prev => [...prev, { id: loadingMessageId, type: "loading", timestamp: new Date(), payload: "Aura AI is now crafting your personalized itineraries based on these options..." }]);

    const plannerInputForAI: AITripPlannerInput = {
      ...input,
      userPersona: userPersona ? { name: userPersona.name, description: userPersona.description } : undefined,
      realFlightOptions: filteredFlights.length > 0 ? filteredFlights : undefined,
      realHotelOptions: filteredHotels.length > 0 ? filteredHotels : undefined,
    };
    console.log("[PlannerPage] Input to aiTripPlanner flow:", JSON.stringify(plannerInputForAI, null, 2));
        
    try {
      const aiResult = await aiTripPlanner(plannerInputForAI);
      const aiMessage: ChatMessage = {
        id: crypto.randomUUID(),
        type: "ai",
        payload: aiResult,
        timestamp: new Date(),
        title: "Your AI Curated Trip Options"
      };
       setChatHistory(prev => prev.filter(msg => msg.id !== loadingMessageId).concat(aiMessage)); 
       if (!aiResult.itineraries || aiResult.itineraries.length === 0) {
         toast({
            title: "AI Planning Note",
            description: "Aura AI couldn't generate detailed daily plans with the selected options. You might need to adjust criteria or try a broader request.",
            duration: 7000,
         });
       }

    } catch (error: any) {
      console.error("Error calling AI Trip Planner:", error);
      const errorMessage: ChatMessage = { id: crypto.randomUUID(), type: "error", payload: `AI Planner Error: ${error.message}`, timestamp: new Date() };
      setChatHistory(prev => prev.filter(msg => msg.id !== loadingMessageId).concat(errorMessage));
    }
  };

  const handleSendUserChatMessage = async () => {
    const text = currentUserInput.trim();
    if (!text || !currentUser) return;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), type: 'user', payload: { text }, timestamp: new Date() };
    const loadingMsg: ChatMessage = { id: crypto.randomUUID(), type: 'loading', timestamp: new Date(), payload: "Aura is thinking..." };
    setChatHistory(prev => [...prev, userMsg, loadingMsg]);
    setCurrentUserInput("");
    setIsAiRespondingToChat(true);
    let aiResponsePayload: string; let aiResponseType: ChatMessage['type'] = "ai_text_response";
    const lowerText = text.toLowerCase();
    const questionKeywords = ['what is', 'what are', 'how do', 'can i', 'is it', 'visa', 'customs', 'etiquette', 'rule for', 'currency in'];
    const forMatch = lowerText.match(/(?:for|in|about|of)\s+([\w\s,]+)/i);
    let destination = forMatch?.[1]?.trim().replace(/\?$/, '').trim();
    if (!destination) { const questionWords = lowerText.split(" "); const lastFewWords = questionWords.slice(Math.max(questionWords.length - 3, 0)).join(" "); const commonLocHints = ["paris", "london", "tokyo", "new york", "rome"]; if (commonLocHints.some(hint => lastFewWords.includes(hint))) { destination = lastFewWords.replace(/\?$/, '').trim(); } }
    if (questionKeywords.some(kw => lowerText.includes(kw)) && destination) {
      try {
        const coAgentResp = await getCoTravelAgentResponse({ destination, question: text }); // Removed type CoTravelAgentOutput for direct use
        aiResponsePayload = coAgentResp.answer + ((coAgentResp.relevantTips?.length || 0) > 0 ? "\n\nRelevant tips:\n- " + coAgentResp.relevantTips?.join("\n- ") : "");
      } catch (e) { aiResponsePayload = "Sorry, I had trouble looking that up."; aiResponseType = "error"; }
    } else if (questionKeywords.some(kw => lowerText.includes(kw))) { aiResponsePayload = "Which destination are you asking about?";
    } else { aiResponsePayload = "For detailed trip planning, please use 'Compose Detailed Trip Request'. For general questions, try asking about a specific destination."; }
    setChatHistory(prev => prev.filter(msg => msg.type !== 'loading').concat([{ id: crypto.randomUUID(), type: aiResponseType, payload: aiResponsePayload, timestamp: new Date() }]));
    setIsAiRespondingToChat(false);
  };

  const handleViewDetails = (itinerary: Itinerary) => { setSelectedItinerary(itinerary); setIsDetailSheetOpen(true); };
  const handleViewPackageDetails = (pkg: TripPackageSuggestion) => { setSelectedTripPackage(pkg); setIsPackageDetailDialogOpen(true); };

  const handleSaveTrip = async (itineraryToSave: Omit<Itinerary, 'id'>) => {
    if (!currentUser) { toast({ title: "Authentication Required", variant: "destructive" }); return; }
    try {
      const alreadyExists = savedTrips?.some(trip => trip.destination === itineraryToSave.destination && trip.travelDates === itineraryToSave.travelDates && trip.estimatedCost === itineraryToSave.estimatedCost);
      if (!('id' in itineraryToSave) || (itineraryToSave.id && itineraryToSave.id.startsWith('temp-')) || !alreadyExists) {
        const { id, ...dataToSaveReal } = itineraryToSave as Itinerary;
        await addSavedTripMutation.mutateAsync(dataToSaveReal as Omit<Itinerary, 'id' | 'aiGeneratedMemory' | 'aiTripSummary'>);
        toast({ title: "Trip Saved!", description: `${itineraryToSave.destination} added to dashboard.` });
      } else if (alreadyExists) { toast({ title: "Already Saved", description: "This trip seems to be already saved." }); }
      setIsDetailSheetOpen(false);
    } catch (error) { console.error("Error saving trip:", error); toast({ title: "Error Saving Trip", variant: "destructive" }); }
  };

  const isTripSaved = (itinerary: Itinerary | Omit<Itinerary, 'id'>): boolean => {
    if (isLoadingSavedTrips || !savedTrips) return false;
    if ('id' in itinerary && itinerary.id && itinerary.id.startsWith('temp-')) return false;
    if ('id' in itinerary && itinerary.id && savedTrips.some(trip => trip.id === itinerary.id)) return true;
    return savedTrips.some(trip => trip.destination === itinerary.destination && trip.travelDates === itinerary.travelDates && trip.estimatedCost === itinerary.estimatedCost);
  };

  const handleInitiateBookingGuidance = (destination: string, travelDates: string) => {
    const flightSearchUrl = `https://www.google.com/travel/flights?q=flights+to+${encodeURIComponent(destination)}`;
    const hotelSearchUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(destination)}`;
    setChatHistory(prev => [...prev, { id: crypto.randomUUID(), type: "booking_guidance", title: `Booking Guidance for ${destination}`, payload: `Okay, let's get you started with booking your trip to ${destination} for ${travelDates}!\n\nHere are some helpful links:\n✈️ Search for flights: [Google Flights](${flightSearchUrl})\n🏨 Find hotels: [Booking.com](${hotelSearchUrl})\n\nRemember to compare prices and check cancellation policies.`, timestamp: new Date() }]);
    setIsDetailSheetOpen(false); setIsPackageDetailDialogOpen(false);
  };

  const isAiProcessingMainPlan = chatHistory.some(msg => msg.type === 'loading' && !isAiRespondingToChat);
  const handleSelectHistoryEntry = (entryData: Partial<AITripPlannerInput>) => { setCurrentFormInitialValues(entryData); setIsSearchHistoryDrawerOpen(false); setIsInputSheetOpen(true); };
  const handleStartNewBlankPlanFromDrawer = () => { setCurrentFormInitialValues(null); setIsSearchHistoryDrawerOpen(false); setIsInputSheetOpen(true); };
  const handleOpenInputSheetForNewPlan = () => { setCurrentFormInitialValues(null); setIsInputSheetOpen(true); };

  useEffect(() => {
    const handleStorageChange = () => {
      const bundledTripData = localStorage.getItem('tripBundleToPlan');
      if (bundledTripData) {
        try {
          const tripIdea: AITripPlannerInput = JSON.parse(bundledTripData);
          setCurrentFormInitialValues(tripIdea); setIsInputSheetOpen(true);
        } catch (e) { console.error("Error parsing trip bundle data from localStorage:", e); }
        finally { localStorage.removeItem('tripBundleToPlan'); }
      }
    };
    handleStorageChange(); window.addEventListener('storage', handleStorageChange); window.addEventListener('localStorageUpdated_tripBundleToPlan', handleStorageChange);
    return () => { window.removeEventListener('storage', handleStorageChange); window.removeEventListener('localStorageUpdated_tripBundleToPlan', handleStorageChange); };
  }, []);

  const prominentButtonClasses = "text-lg py-3 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:from-accent hover:to-primary focus-visible:ring-4 focus-visible:ring-primary/40 transform transition-all duration-300 ease-out hover:scale-[1.02] active:scale-100";


  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
      <div className={cn("p-3 border-b border-border/30 flex justify-between items-center", "glass-pane")}>
        <h2 className="text-lg font-semibold text-foreground flex items-center">
          <Bot className="w-6 h-6 mr-2 text-primary" /> Aura AI Planner & Concierge
        </h2>
        <Button size="sm" onClick={() => setIsSearchHistoryDrawerOpen(true)} disabled={!currentUser || addSearchHistoryMutation.isPending || isAiProcessingMainPlan || isAiRespondingToChat} className={cn("shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40", "bg-gradient-to-r from-primary to-accent text-primary-foreground", "hover:from-accent hover:to-primary", "focus-visible:ring-2 focus-visible:ring-primary/40", "transform transition-all duration-300 ease-out hover:scale-[1.02] active:scale-100")}>
          <History className="w-4 h-4 mr-2" /> Plan History
        </Button>
      </div>

      <ScrollArea className="flex-grow p-4 sm:p-6" ref={chatContainerRef}>
        <div className="max-w-3xl mx-auto space-y-6 pb-4">
          {chatHistory.map((msg) => (
            <ChatMessageCard key={msg.id} message={msg} onViewDetails={handleViewDetails} onViewPackageDetails={handleViewPackageDetails} />
          ))}
        </div>
      </ScrollArea>

      <div className={cn("p-3 border-t border-border/30", "glass-pane")}>
        <div className="max-w-3xl mx-auto space-y-3">
          <Button onClick={handleOpenInputSheetForNewPlan} className={cn(prominentButtonClasses, "w-full")} size="lg" disabled={!currentUser || addSavedTripMutation.isPending || isAiProcessingMainPlan || isAiRespondingToChat || addSearchHistoryMutation.isPending || !isMapsScriptLoaded}>
            {isAiProcessingMainPlan ? <Loader2 className="w-6 h-6 mr-2 animate-spin" /> : <Send className="w-6 h-6 mr-2" />}
            {isAiProcessingMainPlan ? "Aura is processing..." : "Compose Detailed Trip Request"}
          </Button>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-muted-foreground" />
            <Input ref={chatInputRef} type="text" placeholder={currentUser ? "Ask Aura a quick travel question..." : "Log in to chat with Aura AI"} value={currentUserInput} onChange={(e) => setCurrentUserInput(e.target.value)} onKeyPress={(e) => { if (e.key === 'Enter' && !isAiRespondingToChat) handleSendUserChatMessage(); }} disabled={!currentUser || isAiRespondingToChat || isAiProcessingMainPlan} className="flex-grow bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50" />
            <Button onClick={handleSendUserChatMessage} disabled={!currentUserInput.trim() || isAiRespondingToChat || isAiProcessingMainPlan || !currentUser} size="icon" className={cn("shadow-sm shadow-accent/30 hover:shadow-md hover:shadow-accent/40 aspect-square", "bg-gradient-to-r from-accent to-primary text-primary-foreground", "hover:from-primary hover:to-accent", "focus-visible:ring-2 focus-visible:ring-accent/40", "transform transition-all duration-300 ease-out hover:scale-[1.05] active:scale-100")}>
              {isAiRespondingToChat ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} <span className="sr-only">Send</span>
            </Button>
          </div>
        </div>
      </div>

      <TripPlannerInputSheet isOpen={isInputSheetOpen} onClose={() => setIsInputSheetOpen(false)} onPlanRequest={handlePlanRequest} initialValues={currentFormInitialValues} isMapsScriptLoaded={isMapsScriptLoaded} />
      <SearchHistoryDrawer isOpen={isSearchHistoryDrawerOpen} onClose={() => setIsSearchHistoryDrawerOpen(false)} onSelectHistoryEntry={handleSelectHistoryEntry} onStartNewBlankPlan={handleStartNewBlankPlanFromDrawer} />
      {selectedItinerary && (<ItineraryDetailSheet isOpen={isDetailSheetOpen} onClose={() => setIsDetailSheetOpen(false)} itinerary={selectedItinerary} onSaveTrip={handleSaveTrip} isTripSaved={isTripSaved(selectedItinerary)} isSaving={addSavedTripMutation.isPending} onInitiateBooking={() => handleInitiateBookingGuidance(selectedItinerary.destination, selectedItinerary.travelDates)} />)}
      {selectedTripPackage && (<CombinedTripDetailDialog isOpen={isPackageDetailDialogOpen} onClose={() => setIsPackageDetailDialogOpen(false)} tripPackage={selectedTripPackage} onInitiateBooking={() => handleInitiateBookingGuidance(selectedTripPackage.destinationQuery, selectedTripPackage.travelDatesQuery)} />)}
    </div>
  );
}


    