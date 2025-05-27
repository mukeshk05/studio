
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AITripPlannerInput, AITripPlannerOutput, UserPersona } from "@/ai/types/trip-planner-types";
import { aiTripPlanner } from "@/ai/flows/ai-trip-planner";
import type { CoTravelAgentInput, CoTravelAgentOutput } from "@/ai/types/co-travel-agent-types";
import { getCoTravelAgentResponse, getIataCodeAction, generateMultipleImagesFlow, type ImagePromptItem } from "@/app/actions"; // Added generateMultipleImagesFlow and ImagePromptItem
import type { Itinerary, SearchHistoryEntry, SerpApiFlightOption, SerpApiHotelSuggestion, TripPackageSuggestion } from "@/lib/types";
import { TripPlannerInputSheet } from "@/components/trip-planner/TripPlannerInputSheet";
import { ChatMessageCard } from "@/components/trip-planner/ChatMessageCard";
import { Input } from "@/components/ui/input";
import { History, Send, Loader2, MessageSquare, Bot, Plane as PlaneIcon, Hotel as HotelIcon, DollarSign as DollarSignIcon, Briefcase, Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSavedTrips, useAddSavedTrip, useAddSearchHistory, useGetUserTravelPersona } from "@/lib/firestoreHooks";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { SearchHistoryDrawer } from "@/components/planner/SearchHistoryDrawer";
import { ItineraryDetailSheet } from "@/components/trip-planner/ItineraryDetailSheet";
import { CombinedTripDetailDialog } from "@/components/trip-planner/CombinedTripDetailDialog";
import { getRealFlightsAction, getRealHotelsAction } from "@/app/actions";
import { format, addDays, parse, differenceInDays, addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isValid, parseISO } from 'date-fns';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";


export interface ChatMessage {
  id: string;
  type: "user" | "ai" | "error" | "loading" | "system" | "booking_guidance" | "ai_text_response" | "trip_package_suggestions";
  payload?: any;
  timestamp: Date;
  title?: string;
}

export interface PreFilteredOptions { // Keeping this if it's used elsewhere, otherwise can be removed
  flights: SerpApiFlightOption[];
  hotels: SerpApiHotelSuggestion[];
  note: string;
  userInput: AITripPlannerInput;
}


function parseFlexibleDates(dateString: string): { from: Date, to: Date, durationDays: number } {
  const now = new Date();
  let fromDate: Date | null = null;
  let toDate: Date | null = null;
  let durationDays = 7; // Default duration

  const lowerDateString = dateString.toLowerCase();

  // Attempt to parse specific date ranges first (e.g., "MM/DD/YYYY - MM/DD/YYYY")
  const specificDateRangeMatch = lowerDateString.match(/(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})\s*(?:-|to|until)\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/);
  if (specificDateRangeMatch) {
    try {
      let d1 = parse(specificDateRangeMatch[1].replace(/\//g, '-'), 'M-d-yy', new Date());
      if (!isValid(d1)) d1 = parse(specificDateRangeMatch[1].replace(/\//g, '-'), 'M-d-yyyy', new Date());
      
      let d2 = parse(specificDateRangeMatch[2].replace(/\//g, '-'), 'M-d-yy', new Date());
      if (!isValid(d2)) d2 = parse(specificDateRangeMatch[2].replace(/\//g, '-'), 'M-d-yyyy', new Date());

      if (isValid(d1) && isValid(d2) && d2 >= d1) {
        fromDate = d1 >= now ? d1 : now; // Ensure fromDate is not in the past
        toDate = d2;
        durationDays = differenceInDays(toDate, fromDate) + 1;
        return { from: fromDate, to: toDate, durationDays: Math.max(1, durationDays) };
      }
    } catch (e) { console.warn("Could not parse specific date range:", dateString, e); }
  }
  
  const durationForMatch = lowerDateString.match(/for\s+(\d+)\s*(days?|weeks?|months?)/i);
  if (durationForMatch) {
    const num = parseInt(durationForMatch[1], 10);
    const unit = durationForMatch[2].toLowerCase();
    if (unit.startsWith('week')) durationDays = num * 7;
    else if (unit.startsWith('month')) durationDays = num * 30; // Approximate
    else durationDays = num;
    durationDays = Math.max(1, durationDays);
  }

  if (lowerDateString.includes("next weekend")) {
    fromDate = startOfWeek(addDays(now, (5 - now.getDay() + 7) % 7 + (now.getDay() >= 5 ? 7 : 0)), { weekStartsOn: 5 }); // Next Friday
    durationDays = 3; // Fri, Sat, Sun
  } else if (lowerDateString.includes("this weekend")) {
     fromDate = startOfWeek(addDays(now, (5 - now.getDay() + 7) % 7), { weekStartsOn: 5 }); // This Friday or next if past
     if (fromDate < now) fromDate = addDays(fromDate, 7);
     durationDays = 3;
  } else if (lowerDateString.includes("next month")) {
    fromDate = startOfMonth(addMonths(now, 1));
  } else if (lowerDateString.includes("this month")) {
    fromDate = startOfMonth(now);
    if (fromDate < now) fromDate = addDays(startOfMonth(now), 1); // Ensure it's not today or past
  } else {
    // Check for "in X days/weeks/months"
    const inXTimeMatch = lowerDateString.match(/in\s+(\d+)\s*(days?|weeks?|months?)/i);
    if (inXTimeMatch) {
        const num = parseInt(inXTimeMatch[1], 10);
        const unit = inXTimeMatch[2].toLowerCase();
        if (unit.startsWith('day')) fromDate = addDays(now, num);
        else if (unit.startsWith('week')) fromDate = addDays(now, num * 7);
        else if (unit.startsWith('month')) fromDate = addMonths(now, num);
    } else {
      // Try parsing common month names
      const monthMatch = lowerDateString.match(/(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)/i);
      if (monthMatch) {
        const monthIndex = new Date(Date.parse(monthMatch[0] +" 1, 2000")).getMonth();
        let year = now.getFullYear();
        if (monthIndex < now.getMonth() && !lowerDateString.includes(String(year+1))) { // if month is past and next year not specified
          year++;
        }
        fromDate = new Date(year, monthIndex, 1); // Default to start of that month
        // If a day is specified after month, try to use it
        const dayOfMonthMatch = lowerDateString.match(new RegExp(monthMatch[0] + "\\s*(\\d{1,2})", "i"));
        if(dayOfMonthMatch && dayOfMonthMatch[1]){
            fromDate.setDate(parseInt(dayOfMonthMatch[1], 10));
        }
        if (fromDate < now && !durationForMatch) fromDate = addMonths(fromDate,12); // ensure future if no duration specified
      }
    }
  }
  
  if (!fromDate || fromDate < now) fromDate = addDays(now,1); // Default to tomorrow if still not set or past
  toDate = addDays(fromDate, durationDays - 1);

  return { from: fromDate, to: toDate, durationDays: Math.max(1, durationDays) };
}


function generateTripPackageSuggestions(
  filteredFlights: SerpApiFlightOption[],
  filteredHotels: SerpApiHotelSuggestion[],
  durationDays: number,
  destinationQuery: string,
  travelDatesQuery: string,
  userInput: AITripPlannerInput
): TripPackageSuggestion[] {
  const suggestions: TripPackageSuggestion[] = [];
  if (filteredFlights.length === 0 || filteredHotels.length === 0) {
    console.log("[PlannerPage] No flights or hotels available after filtering to generate packages.");
    return [];
  }

  const overallBudget = userInput.budget;
  const budgetTolerance = 0.25; // Allow up to 25% over budget for a package

  // Sort hotels by rating (descending) if available, then price (ascending)
  const sortedHotels = [...filteredHotels].sort((a, b) => {
    if ((a.rating ?? 0) !== (b.rating ?? 0)) {
      return (b.rating ?? 0) - (a.rating ?? 0);
    }
    return (a.price_per_night ?? Infinity) - (b.price_per_night ?? Infinity);
  });
  
  // Strategy 1: Cheapest flight + Cheapest suitable hotel
  if (filteredFlights[0] && sortedHotels.length > 0) {
    const flight = filteredFlights[0];
    const cheapestHotel = sortedHotels.reduce((prev, curr) => ((prev.price_per_night ?? Infinity) < (curr.price_per_night ?? Infinity) ? prev : curr), sortedHotels[0]);
    
    if (cheapestHotel.price_per_night !== undefined) {
        const totalCost = (flight.price || 0) + (cheapestHotel.price_per_night * durationDays);
        if (totalCost <= overallBudget * (1 + budgetTolerance)) {
          suggestions.push({
            id: `${flight.derived_flight_numbers || 'flight0'}_${cheapestHotel.name?.replace(/\s/g, '') || 'hotelCheapest'}`,
            flight,
            hotel: cheapestHotel,
            totalEstimatedCost: totalCost,
            durationDays,
            destinationQuery,
            travelDatesQuery,
            userInput,
            destinationImagePrompt: `Iconic view of ${destinationQuery}` // Add prompt
          });
        }
    }
  }

  // Strategy 2: Cheapest flight + Best-rated suitable hotel (if different from above)
  if (filteredFlights[0] && sortedHotels.length > 0) {
    const flight = filteredFlights[0];
    const bestRatedHotel = sortedHotels[0]; // Already sorted by rating primarily
     if (bestRatedHotel.price_per_night !== undefined && (suggestions.length === 0 || suggestions[0].hotel.name !== bestRatedHotel.name)) {
       const totalCost = (flight.price || 0) + (bestRatedHotel.price_per_night * durationDays);
       if (totalCost <= overallBudget * (1 + budgetTolerance)) {
          suggestions.push({
            id: `${flight.derived_flight_numbers || 'flight0'}_${bestRatedHotel.name?.replace(/\s/g, '') || 'hotelTopRated'}`,
            flight,
            hotel: bestRatedHotel,
            totalEstimatedCost: totalCost,
            durationDays,
            destinationQuery,
            travelDatesQuery,
            userInput,
            destinationImagePrompt: `Luxurious stay in ${destinationQuery}` // Add prompt
          });
       }
    }
  }
  
  // Strategy 3: Second cheapest flight (if available) + A different suitable hotel
  if (filteredFlights.length > 1 && sortedHotels.length > 0) {
    const flight = filteredFlights[1];
    // Try to find a hotel different from the first suggestion's hotel, if any
    const differentHotel = sortedHotels.find(h => suggestions.length > 0 ? h.name !== suggestions[0].hotel.name : true) || sortedHotels[0];
    
    if (differentHotel.price_per_night !== undefined) {
        const totalCost = (flight.price || 0) + (differentHotel.price_per_night * durationDays);
        if (totalCost <= overallBudget * (1 + budgetTolerance)) {
            // Ensure this package is distinct enough from others already added
            const newId = `${flight.derived_flight_numbers || 'flight1'}_${differentHotel.name?.replace(/\s/g, '') || 'hotelAlt'}`;
            if (!suggestions.find(s => s.id === newId)) {
                suggestions.push({
                    id: newId,
                    flight,
                    hotel: differentHotel,
                    totalEstimatedCost: totalCost,
                    durationDays,
                    destinationQuery,
                    travelDatesQuery,
                    userInput,
                    destinationImagePrompt: `Exploring ${destinationQuery} highlights` // Add prompt
                });
            }
        }
    }
  }

  console.log(`[PlannerPage] Generated ${suggestions.length} initial package suggestions.`);
  // Deduplicate and limit to 3
  const uniqueSuggestions = Array.from(new Map(suggestions.map(item => [item.id, item])).values());
  console.log(`[PlannerPage] Returning ${uniqueSuggestions.slice(0, 3).length} unique package suggestions.`);
  return uniqueSuggestions.slice(0, 3);
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
    setIsMapsScriptLoaded(true);
  }, []);

  useEffect(() => {
    if (!apiKey) { setIsMapsScriptLoaded(false); return; }
    if (typeof window !== 'undefined' && (window as any).google?.maps?.places) {
      if (!isMapsScriptLoaded) setIsMapsScriptLoaded(true); return;
    }
    const scriptId = 'google-maps-planner-page-script';
    if (document.getElementById(scriptId)) {
      if (typeof window !== 'undefined' && (window as any).google?.maps?.places && !isMapsScriptLoaded) setIsMapsScriptLoaded(true);
      return;
    }
    (window as any).initGoogleMapsApiPlannerPage = initGoogleMapsApiPlannerPageCallback;
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMapsApiPlannerPage`;
    script.async = true; script.defer = true;
    script.onerror = () => { setIsMapsScriptLoaded(false); };
    document.head.appendChild(script);
    return () => { if ((window as any).initGoogleMapsApiPlannerPage) delete (window as any).initGoogleMapsApiPlannerPage; };
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

  const handlePlanRequest = async (input: AITripPlannerInput) => {
    if (!currentUser) {
      toast({ title: "Authentication Required", description: "Please log in.", variant: "destructive" });
      setIsInputSheetOpen(false); return;
    }
    try { await addSearchHistoryMutation.mutateAsync({ destination: input.destination, travelDates: input.travelDates, budget: input.budget }); }
    catch (error) { console.warn("Failed to save search history:", error); }

    const userMessage: ChatMessage = { id: crypto.randomUUID(), type: "user", payload: input, timestamp: new Date(), title: "My Trip Request" };
    const loadingMessage: ChatMessage = { id: crypto.randomUUID(), type: "loading", timestamp: new Date(), payload: "Aura is fetching real-time flight & hotel data..." };
    setChatHistory(prev => [...prev, userMessage, loadingMessage]);

    const parsedDates = parseFlexibleDates(input.travelDates);
    const formattedDepartureDate = format(parsedDates.from, "yyyy-MM-dd");
    const formattedReturnDate = format(parsedDates.to, "yyyy-MM-dd");

    let realFlights: SerpApiFlightOption[] = [];
    let realHotels: SerpApiHotelSuggestion[] = [];

    let originForFlightSearch = input.origin || "NYC"; // Default if no origin provided
    let originIata = await getIataCodeAction(originForFlightSearch);
    if (input.origin && !originIata) console.warn(`Could not find IATA for origin: ${input.origin}, using name directly.`);
    
    const destinationIata = await getIataCodeAction(input.destination);
    if (!destinationIata) console.warn(`Could not find IATA for destination: ${input.destination}, using name directly.`);

    try {
      const flightSearchInput = { origin: originIata || originForFlightSearch, destination: destinationIata || input.destination, departureDate: formattedDepartureDate, returnDate: formattedReturnDate, tripType: "round-trip" as const };
      console.log("[PlannerPage] Flight Search Input to SerpApi:", flightSearchInput);
      const flightResults = await getRealFlightsAction(flightSearchInput);
      if (flightResults.best_flights) realFlights.push(...flightResults.best_flights);
      if (flightResults.other_flights) realFlights.push(...flightResults.other_flights);
      console.log(`Fetched ${realFlights.length} real flight options for planner.`);
      // toast({ title: "Flight Data Update", description: `SerpApi returned ${realFlights.length} flight options.` });
    } catch (e) { console.error("Error fetching real flights:", e); toast({ title: "Flight Fetch Error (SerpApi)", variant: "destructive" }); }

    try {
      const hotelSearchInput = { destination: input.destination, checkInDate: formattedDepartureDate, checkOutDate: formattedReturnDate, guests: "2" }; 
      console.log("[PlannerPage] Hotel Search Input to SerpApi:", hotelSearchInput);
      const hotelResults = await getRealHotelsAction(hotelSearchInput);
      if (hotelResults.hotels) realHotels = hotelResults.hotels;
      console.log(`Fetched ${realHotels.length} real hotel options for planner.`);
      // toast({ title: "Hotel Data Update", description: `SerpApi returned ${realHotels.length} hotel options.` });
    } catch (e) { console.error("Error fetching real hotels:", e); toast({ title: "Hotel Fetch Error (SerpApi)", variant: "destructive" }); }
    
    setChatHistory(prev => prev.map(msg => msg.id === loadingMessage.id ? { ...msg, payload: "Aura is pre-filtering & combining best options..." } : msg));

    const flightBudgetPercentage = 0.40; 
    const hotelBudgetPercentage = 0.60;
    const allocatedFlightBudget = input.budget * flightBudgetPercentage;
    const allocatedHotelBudgetTotal = input.budget * hotelBudgetPercentage;

    console.log(`Total Budget: $${input.budget}, Flight Allocation: ~$${allocatedFlightBudget.toFixed(0)}, Hotel Total Allocation: ~$${allocatedHotelBudgetTotal.toFixed(0)} for ${parsedDates.durationDays} days.`);

    const filteredFlights = realFlights
      .filter(flight => flight.price != null && flight.price <= allocatedFlightBudget)
      .sort((a, b) => (a.price || Infinity) - (b.price || Infinity))
      .slice(0, 10); 
    console.log(`Flights: ${realFlights.length} initially, ${filteredFlights.length} after budget filter.`);

    const filteredHotels = realHotels
      .filter(hotel => {
        if (hotel.price_per_night == null) return false;
        const totalStayCost = (hotel.price_per_night || 0) * parsedDates.durationDays;
        return totalStayCost <= allocatedHotelBudgetTotal;
      })
      .sort((a, b) => (a.price_per_night || Infinity) - (b.price_per_night || Infinity))
      .slice(0, 10);
    console.log(`Hotels: ${realHotels.length} initially, ${filteredHotels.length} after budget filter.`);
    
    const tripPackages = generateTripPackageSuggestions(filteredFlights, filteredHotels, parsedDates.durationDays, input.destination, input.travelDates, input);

    // Fetch images for packages
    const imagePromptsForPackages: ImagePromptItem[] = tripPackages.map((pkg, index) => ({
        id: `pkg-${pkg.id}`, // Use package ID for mapping
        prompt: pkg.destinationImagePrompt || `Iconic view of ${pkg.destinationQuery}`,
        styleHint: 'destination',
    }));

    let packagesWithImages = [...tripPackages];
    if (imagePromptsForPackages.length > 0) {
        try {
            console.log("[PlannerPage] Fetching images for generated packages...");
            const imageResults = await generateMultipleImagesFlow({ prompts: imagePromptsForPackages });
            packagesWithImages = tripPackages.map(pkg => {
                const imgResult = imageResults.results.find(res => res.id === `pkg-${pkg.id}`);
                return { ...pkg, destinationImageUri: imgResult?.imageUri || undefined };
            });
            console.log("[PlannerPage] Images fetched for packages.");
        } catch (imgError) {
            console.error("[PlannerPage] Error fetching images for packages:", imgError);
            toast({ title: "Image Fetch Error", description: "Could not load images for package suggestions.", variant: "warning"});
        }
    }
    

    let packageNote = `Aura AI curated ${packagesWithImages.length} trip package(s) from ${filteredFlights.length} suitable flights and ${filteredHotels.length} suitable hotels.`;
    if(packagesWithImages.length === 0) {
        packageNote = `Aura AI could not create any trip packages strictly within budget from the ${filteredFlights.length} flights and ${filteredHotels.length} hotels found. You might need to increase your budget, adjust dates/destination, or I can try to make a purely conceptual plan.`;
    }

    const packageMessage: ChatMessage = {
      id: crypto.randomUUID(),
      type: "trip_package_suggestions",
      payload: { packages: packagesWithImages, note: packageNote, userInput: input },
      timestamp: new Date(),
      title: "Curated Trip Packages by Aura AI"
    };
    // setChatHistory(prev => prev.filter(msg => msg.type !== 'loading').concat(packageMessage));
     // Commenting out the AI trip planner call as per previous instructions.
     // If you want to re-enable it, make sure plannerInputForAI is correctly defined using
     // the filtered (or all) realFlights and realHotels.

    const plannerInputForAI: AITripPlannerInput = {
      ...input,
      userPersona: userPersona ? { name: userPersona.name, description: userPersona.description } : undefined,
      realFlightOptions: filteredFlights.length > 0 ? filteredFlights : undefined,
      realHotelOptions: filteredHotels.length > 0 ? filteredHotels : undefined,
    };
    console.log("[PlannerPage] FINAL Input to aiTripPlanner flow (after filtering and package generation):", JSON.stringify(plannerInputForAI, null, 2));
    
    setChatHistory(prev => prev.map(msg => msg.id === loadingMessage.id ? { ...msg, payload: "Aura AI is now crafting your personalized itineraries based on these options..." } : msg));
    
    try {
      const aiResult = await aiTripPlanner(plannerInputForAI);
      const aiMessage: ChatMessage = {
        id: crypto.randomUUID(),
        type: "ai",
        payload: aiResult,
        timestamp: new Date(),
        title: "Your AI Curated Trip Options"
      };
       setChatHistory(prev => prev.filter(msg => msg.type !== 'loading').concat(packageMessage, aiMessage)); // Show packages THEN AI plans
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
      setChatHistory(prev => prev.filter(msg => msg.type !== 'loading').concat(packageMessage, errorMessage)); // Show packages even if AI plan fails
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
        const coAgentResp: CoTravelAgentOutput = await getCoTravelAgentResponse({ destination, question: text });
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
        await addSavedTripMutation.mutateAsync(dataToSaveReal as Omit<Itinerary, 'id' | 'aiGeneratedMemory'>);
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

