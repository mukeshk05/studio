
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AITripPlannerInput, AITripPlannerOutput, UserPersona } from "@/ai/types/trip-planner-types";
import { aiTripPlanner } from "@/ai/flows/ai-trip-planner";
import type { CoTravelAgentInput, CoTravelAgentOutput } from "@/ai/types/co-travel-agent-types"; 
import { getCoTravelAgentResponse, getIataCodeAction } from "@/app/actions"; 
import type { Itinerary, SearchHistoryEntry } from "@/lib/types";
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
import { getRealFlightsAction, getRealHotelsAction } from "@/app/actions";
import type { SerpApiFlightSearchInput, SerpApiFlightSearchOutput, SerpApiFlightOption, SerpApiHotelSuggestion } from "@/lib/types";
import { format, addDays, parse, differenceInDays, addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isValid, parseISO } from 'date-fns';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";


export interface ChatMessage {
  id: string;
  type: "user" | "ai" | "error" | "loading" | "system" | "booking_guidance" | "ai_text_response" | "pre_filter_results"; 
  payload?: any;
  timestamp: Date;
  title?: string;
}

interface PreFilteredOptions {
  flights: SerpApiFlightOption[];
  hotels: SerpApiHotelSuggestion[];
  note: string;
  userInput: AITripPlannerInput;
}


// Enhanced helper function to parse flexible date strings
function parseFlexibleDates(dateString: string): { from: Date, to: Date, durationDays: number } {
  const now = new Date();
  let fromDate: Date | null = null;
  let toDate: Date | null = null;
  let durationDays = 7; // Default duration

  const lowerDateString = dateString.toLowerCase();

  // Attempt to parse specific date formats like "MM/DD/YYYY", "YYYY-MM-DD"
  const specificDateRangeMatch = lowerDateString.match(/(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})\s*(?:-|to)\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})/);
  const singleDateMatch = lowerDateString.match(/(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})/);

  if (specificDateRangeMatch) {
    const d1Str = specificDateRangeMatch[1].replace(/\//g, '-');
    const d2Str = specificDateRangeMatch[2].replace(/\//g, '-');
    const d1 = parseISO(d1Str.includes('-') ? d1Str : format(parse(d1Str, 'MM-dd-yyyy', new Date()), 'yyyy-MM-dd'));
    const d2 = parseISO(d2Str.includes('-') ? d2Str : format(parse(d2Str, 'MM-dd-yyyy', new Date()), 'yyyy-MM-dd'));

    if (isValid(d1) && isValid(d2) && d2 >= d1) {
      fromDate = d1 >= now ? d1 : now;
      toDate = d2;
    }
  } else if (singleDateMatch && !lowerDateString.includes("for")) { // A single date likely implies a one-day trip or start of a longer one
    const d1Str = singleDateMatch[1].replace(/\//g, '-');
    const d1 = parseISO(d1Str.includes('-') ? d1Str : format(parse(d1Str, 'MM-dd-yyyy', new Date()), 'yyyy-MM-dd'));
    if (isValid(d1) && d1 >= now) {
      fromDate = d1;
      toDate = d1; // Assume one day if no "for X days"
    }
  }

  // Check for "for X days/weeks" if specific dates weren't fully parsed or if a start date was found
  const durationMatch = lowerDateString.match(/for\s+(\d+)\s*(days?|weeks?)/i);
  if (durationMatch) {
    const num = parseInt(durationMatch[1], 10);
    const unit = durationMatch[2].startsWith('week') ? 'weeks' : 'days';
    durationDays = unit === 'weeks' ? num * 7 : num;
    if (fromDate && !toDate) { // Only start date was parsed, apply duration
      toDate = addDays(fromDate, durationDays - 1);
    } else if (!fromDate) { // No specific start date, apply duration from default start
      fromDate = startOfMonth(addMonths(now, 1)); // Default to start of next month
      toDate = addDays(fromDate, durationDays - 1);
    }
    // If both fromDate and toDate were parsed, durationMatch might refine durationDays
    // For simplicity, we'll prioritize specific dates if both are found
  }


  if (!fromDate) fromDate = startOfMonth(addMonths(now, 1));
  if (!toDate) toDate = addDays(fromDate, durationDays - 1);
  if (toDate < fromDate) toDate = fromDate; // Ensure toDate is not before fromDate

  const finalDuration = differenceInDays(toDate, fromDate) + 1;
  return { from: fromDate, to: toDate, durationDays: Math.max(1, finalDuration) };
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
  
  const [preFilteredOptions, setPreFilteredOptions] = useState<PreFilteredOptions | null>(null); // For displaying pre-filtered results

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
    console.log("[PlannerPage] Google Maps API script loaded callback executed.");
    setIsMapsScriptLoaded(true);
  }, []);

  useEffect(() => {
    if (!apiKey) {
      console.error("[PlannerPage] Google Maps API key is missing. Autocomplete in form will not work.");
      setIsMapsScriptLoaded(false); 
      return;
    }
    if (typeof window !== 'undefined' && (window as any).google && (window as any).google.maps && (window as any).google.maps.places) {
      if(!isMapsScriptLoaded) setIsMapsScriptLoaded(true);
      return;
    }
    const scriptId = 'google-maps-planner-page-script';
    if (document.getElementById(scriptId)) {
      if (typeof window !== 'undefined' && (window as any).google && (window as any).google.maps && (window as any).google.maps.places && !isMapsScriptLoaded) {
        setIsMapsScriptLoaded(true);
      }
      return;
    }
    
    console.log("[PlannerPage] Attempting to load Google Maps API script (with Places)...");
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMapsApiPlannerPage`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      console.error("[PlannerPage] Failed to load Google Maps API script.");
      setIsMapsScriptLoaded(false); 
    };
    (window as any).initGoogleMapsApiPlannerPage = initGoogleMapsApiPlannerPageCallback;
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
      } catch (e) {
        console.error("Error parsing trip bundle/quiz data from localStorage:", e);
      } finally {
        localStorage.removeItem('tripBundleToPlan'); 
      }
    } else if (chatHistory.length === 0 && currentUser) {
      setChatHistory([
        {
          id: crypto.randomUUID(),
          type: "system",
          payload: "Welcome to your AI Trip Planner & Concierge! Click 'Compose Trip Request' for detailed planning or ask me a quick travel question below.",
          timestamp: new Date(),
        },
      ]);
    } else if (chatHistory.length === 0 && !currentUser && !isLoadingSavedTrips) {
        setChatHistory([
        {
          id: crypto.randomUUID(),
          type: "system",
          payload: "Please log in to start planning your trips with BudgetRoam AI.",
          timestamp: new Date(),
        },
      ]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, isLoadingSavedTrips]); 

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [chatHistory]);

  const handlePlanRequest = async (input: AITripPlannerInput) => {
    if (!currentUser) {
      toast({ title: "Authentication Required", description: "Please log in to plan a trip.", variant: "destructive" });
      setIsInputSheetOpen(false);
      return;
    }

    try {
      await addSearchHistoryMutation.mutateAsync({
        destination: input.destination,
        travelDates: input.travelDates,
        budget: input.budget,
      });
    } catch (error) {
      console.warn("Failed to save search history:", error);
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      type: "user",
      payload: input,
      timestamp: new Date(),
      title: "Trip Plan Request"
    };
    const loadingMessage: ChatMessage = {
      id: crypto.randomUUID(),
      type: "loading",
      timestamp: new Date(),
      payload: "Fetching real-time flight and hotel data..."
    };

    setChatHistory((prev) => [...prev, userMessage, loadingMessage]);
    setPreFilteredOptions(null); // Clear previous pre-filtered results
    
    const parsedDates = parseFlexibleDates(input.travelDates);
    console.log(`[PlannerPage] Parsed dates for SerpApi: From ${format(parsedDates.from, 'yyyy-MM-dd')} To ${format(parsedDates.to, 'yyyy-MM-dd')}, Duration: ${parsedDates.durationDays} days`);

    const formattedDepartureDate = format(parsedDates.from, "yyyy-MM-dd");
    const formattedReturnDate = format(parsedDates.to, "yyyy-MM-dd");

    let realFlights: SerpApiFlightOption[] = [];
    let realHotels: SerpApiHotelSuggestion[] = [];

    // Fetch IATA codes
    let originIata: string | null = null;
    if (input.origin) {
        originIata = await getIataCodeAction(input.origin);
        if (!originIata) console.warn(`Could not find IATA for origin: ${input.origin}, using original string.`);
    }
    const destinationIata = await getIataCodeAction(input.destination);
    if (!destinationIata) console.warn(`Could not find IATA for destination: ${input.destination}, using original string.`);

    try {
      console.log("Fetching real flights for planner...");
      const flightSearchInput: SerpApiFlightSearchInput = {
        origin: originIata || input.origin || "NYC", // Default origin if not provided
        destination: destinationIata || input.destination,
        departureDate: formattedDepartureDate,
        returnDate: formattedReturnDate, 
        tripType: "round-trip",
      };
      console.log("[PlannerPage] Flight Search Input to SerpApi:", flightSearchInput);
      const flightResults = await getRealFlightsAction(flightSearchInput);
      if (flightResults.best_flights) realFlights.push(...flightResults.best_flights);
      if (flightResults.other_flights) realFlights.push(...flightResults.other_flights);
      console.log(`Fetched ${realFlights.length} real flight options for planner.`);
      toast({ title: "Flight Data", description: `Found ${realFlights.length} flight options from SerpApi.`});
    } catch (e) {
      console.error("Error fetching real flights for planner:", e);
      toast({ title: "Flight Fetch Error", description: "Could not retrieve flight options from SerpApi.", variant: "destructive"});
    }

    try {
      console.log("Fetching real hotels for planner...");
      const hotelSearchInput: SerpApiHotelSearchInput = {
        destination: input.destination, 
        checkInDate: formattedDepartureDate,
        checkOutDate: formattedReturnDate,
        guests: "2", 
      };
      console.log("[PlannerPage] Hotel Search Input to SerpApi:", hotelSearchInput);
      const hotelResults = await getRealHotelsAction(hotelSearchInput);
      if (hotelResults.hotels) realHotels = hotelResults.hotels;
      console.log(`Fetched ${realHotels.length} real hotel options for planner.`);
      toast({ title: "Hotel Data", description: `Found ${realHotels.length} hotel options from SerpApi.`});
    } catch (e) {
      console.error("Error fetching real hotels for planner:", e);
      toast({ title: "Hotel Fetch Error", description: "Could not retrieve hotel options from SerpApi.", variant: "destructive"});
    }
    
    // --- Pre-filtering Logic ---
    setChatHistory((prev) => prev.map(msg => msg.id === loadingMessage.id ? {...msg, payload: "Pre-filtering options based on your budget..."} : msg));
    
    const flightBudgetPercentage = 0.40; // Allocate 40% of total budget to flights
    const hotelBudgetPercentage = 0.60;  // Allocate 60% to hotels

    const allocatedFlightBudget = input.budget * flightBudgetPercentage;
    const allocatedHotelBudgetTotal = input.budget * hotelBudgetPercentage;
    
    console.log(`[PlannerPage] Total Budget: $${input.budget}, Flight Allocation: $${allocatedFlightBudget}, Hotel Total Allocation: $${allocatedHotelBudgetTotal} for ${parsedDates.durationDays} days.`);

    const filteredFlights = realFlights
      .filter(flight => flight.price != null && flight.price <= allocatedFlightBudget)
      .sort((a, b) => (a.price || Infinity) - (b.price || Infinity))
      .slice(0, 10); // Take top 10 cheapest within budget

    console.log(`[PlannerPage] Flights: ${realFlights.length} initially, ${filteredFlights.length} after budget filter ($${allocatedFlightBudget}).`);

    const filteredHotels = realHotels
      .filter(hotel => {
        if (hotel.price_per_night == null) return false;
        const totalStayCost = hotel.price_per_night * parsedDates.durationDays;
        return totalStayCost <= allocatedHotelBudgetTotal;
      })
      .sort((a, b) => (a.price_per_night || Infinity) - (b.price_per_night || Infinity))
      .slice(0, 10); // Take top 10 cheapest per night within budget

    console.log(`[PlannerPage] Hotels: ${realHotels.length} initially, ${filteredHotels.length} after budget filter ($${allocatedHotelBudgetTotal} total / ${parsedDates.durationDays} days).`);

    let filterNote = `Pre-filtered ${filteredFlights.length} flights (budget < $${allocatedFlightBudget.toFixed(0)}) and ${filteredHotels.length} hotels (total stay < $${allocatedHotelBudgetTotal.toFixed(0)} for ${parsedDates.durationDays} days). These options would now be sent to the AI for detailed itinerary creation.`;
    if(filteredFlights.length === 0 && filteredHotels.length === 0) {
        filterNote = "No flights or hotels found within the allocated budget portions after pre-filtering. The AI would likely resort to conceptual planning or suggest budget adjustments.";
    } else if (filteredFlights.length === 0) {
        filterNote = `No flights found within the allocated budget (< $${allocatedFlightBudget.toFixed(0)}). The AI would likely use conceptual flights alongside the ${filteredHotels.length} filtered hotels.`;
    } else if (filteredHotels.length === 0) {
        filterNote = `No hotels found within the allocated budget (total stay < $${allocatedHotelBudgetTotal.toFixed(0)}). The AI would likely use conceptual hotels alongside the ${filteredFlights.length} filtered flights.`;
    }
    
    // Display pre-filtered results
    const preFilterMessage: ChatMessage = {
        id: crypto.randomUUID(),
        type: "pre_filter_results",
        payload: {
            flights: filteredFlights,
            hotels: filteredHotels,
            note: filterNote,
            userInput: input // Pass user input for context
        },
        timestamp: new Date(),
        title: "Pre-filtered Flight & Hotel Options"
    };
    setChatHistory((prev) => prev.filter(msg => msg.type !== 'loading').concat(preFilterMessage));
    return; // Stop before calling AI for now
    
    // ----- AI CALL IS DISABLED FOR NOW - Code below would be re-enabled later -----
    /*
    const plannerInputForAI: AITripPlannerInput = {
      ...input,
      userPersona: userPersona ? { name: userPersona.name, description: userPersona.description } : undefined,
      realFlightOptions: filteredFlights.length > 0 ? filteredFlights : undefined,
      realHotelOptions: filteredHotels.length > 0 ? filteredHotels : undefined,
    };
    
    console.log("[PlannerPage] Input to aiTripPlanner flow:", JSON.stringify(plannerInputForAI, null, 2));
    setChatHistory((prev) => prev.map(msg => msg.id === loadingMessage.id ? {...msg, payload: "AI is crafting your itineraries..."} : msg));


    try {
      const result: AITripPlannerOutput = await aiTripPlanner(plannerInputForAI);
      // ... (rest of the AI result processing code) ...
    } catch (error) {
      // ... (error handling) ...
    }
    */
  };

  const handleSendUserChatMessage = async () => {
    const text = currentUserInput.trim();
    if (!text) return;
    if (!currentUser) {
      toast({ title: "Please Log In", description: "You need to be logged in to chat.", variant: "destructive" });
      return;
    }

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      type: 'user',
      payload: { text }, 
      timestamp: new Date(),
    };
    const loadingMsg: ChatMessage = {
      id: crypto.randomUUID(),
      type: 'loading',
      timestamp: new Date(),
    };
    setChatHistory(prev => [...prev, userMsg, loadingMsg]);
    setCurrentUserInput("");
    setIsAiRespondingToChat(true);

    let aiResponsePayload: string;
    let aiResponseType: ChatMessage['type'] = "ai_text_response";

    const lowerText = text.toLowerCase();
    const questionKeywords = ['what is', 'what are', 'how do', 'can i', 'is it', 'visa', 'customs', 'etiquette', 'rule for', 'currency in'];
    const searchKeywords = ['hotel in', 'flight to', 'find me a', 'book a', 'look for'];
    const modificationKeywords = ['add to', 'change my', 'update my', 'modify the'];

    if (questionKeywords.some(kw => lowerText.includes(kw))) {
      const forMatch = lowerText.match(/(?:for|in|about|of)\s+([\w\s,]+)/i);
      let destination = forMatch?.[1]?.trim().replace(/\?$/, '').trim();
      if (!destination) {
        const questionWords = lowerText.split(" ");
        const lastFewWords = questionWords.slice(Math.max(questionWords.length - 3, 0)).join(" ");
        const commonLocationHints = ["paris", "london", "tokyo", "new york", "rome", "berlin", "amsterdam", "bali", "kyoto", "denver", "new orleans"]; 
        if (commonLocationHints.some(hint => lastFewWords.includes(hint))) {
          destination = lastFewWords.replace(/\?$/, '').trim(); 
        }
      }


      if (destination) {
        try {
          const coAgentInput: CoTravelAgentInput = { destination, question: text };
          const coAgentResponse: CoTravelAgentOutput = await getCoTravelAgentResponse(coAgentInput);
          let responseText = coAgentResponse.answer;
          if (coAgentResponse.relevantTips && coAgentResponse.relevantTips.length > 0) {
            responseText += "\n\nHere are some relevant tips:\n- " + coAgentResponse.relevantTips.join("\n- ");
          }
          aiResponsePayload = responseText;
        } catch (e: any) {
          console.error("Error calling CoTravelAgent:", e);
          aiResponsePayload = "Sorry, I had trouble looking that up. Could you try rephrasing?";
          aiResponseType = "error";
        }
      } else {
        aiResponsePayload = "I can try to answer that! Which destination are you asking about?";
      }
    } else if (searchKeywords.some(kw => lowerText.includes(kw))) {
      aiResponsePayload = "I can help you find flights or hotels! Please use the 'Compose Trip Request' button above to provide details like dates, budget, and specific preferences for the best results.";
    } else if (modificationKeywords.some(kw => lowerText.includes(kw))) {
      aiResponsePayload = "To modify an existing plan or create an updated one, please use the 'Compose Trip Request' button. You can describe your changes there, and I'll generate new itineraries for you.";
    } else {
      aiResponsePayload = "I'm here to help with general travel questions or guide you in planning a new trip. For detailed itinerary planning, the 'Compose Trip Request' button is your best bet!";
    }

    const aiMsg: ChatMessage = {
      id: crypto.randomUUID(),
      type: aiResponseType,
      payload: aiResponsePayload,
      timestamp: new Date(),
    };
    setChatHistory(prev => prev.filter(msg => msg.type !== 'loading').concat(aiMsg));
    setIsAiRespondingToChat(false);
  };


  const handleViewDetails = (itinerary: Itinerary) => {
    setSelectedItinerary(itinerary);
    setIsDetailSheetOpen(true);
  };

  const handleSaveTrip = async (itineraryToSave: Omit<Itinerary, 'id'>) => {
    if (!currentUser) {
      toast({ title: "Authentication Required", description: "Please log in to save trips.", variant: "destructive" });
      return;
    }
    try {
      const alreadyExists = savedTrips?.some(
        (trip) =>
          trip.destination === itineraryToSave.destination &&
          trip.travelDates === itineraryToSave.travelDates &&
          trip.estimatedCost === itineraryToSave.estimatedCost
      );

      if (!('id' in itineraryToSave) || (itineraryToSave.id && itineraryToSave.id.startsWith('temp-')) || !alreadyExists) {
        const { id, ...dataToSaveReal } = itineraryToSave as Itinerary; 
        await addSavedTripMutation.mutateAsync(dataToSaveReal as Omit<Itinerary, 'id' | 'aiGeneratedMemory'>);
        toast({
          title: "Trip Saved!",
          description: `${itineraryToSave.destination} has been added to your dashboard.`,
        });
      } else if (alreadyExists) {
         toast({ title: "Already Saved", description: "This trip variation seems to be already in your dashboard." });
      }
      setIsDetailSheetOpen(false);
    } catch (error) {
      console.error("Error saving trip:", error);
      toast({ title: "Error Saving Trip", description: "Could not save the trip to your dashboard.", variant: "destructive" });
    }
  };

  const isTripSaved = (itinerary: Itinerary | Omit<Itinerary, 'id'>): boolean => {
    if (isLoadingSavedTrips || !savedTrips) return false;
    if ('id' in itinerary && itinerary.id && itinerary.id.startsWith('temp-')) return false;
    if ('id' in itinerary && itinerary.id && savedTrips.some(trip => trip.id === itinerary.id)) {
      return true;
    }
    return savedTrips.some(
      (trip) =>
        trip.destination === itinerary.destination &&
        trip.travelDates === itinerary.travelDates &&
        trip.estimatedCost === itinerary.estimatedCost
    );
  };

  const handleInitiateBookingGuidance = (itinerary: Itinerary) => {
    const flightSearchUrl = `https://www.google.com/travel/flights?q=flights+from+${encodeURIComponent(itinerary.origin || 'your location')}+to+${encodeURIComponent(itinerary.destination)}`;
    const hotelSearchUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(itinerary.destination)}`;
    const guidanceMessage: ChatMessage = {
      id: crypto.randomUUID(),
      type: "booking_guidance",
      title: `Booking Guidance for ${itinerary.destination}`,
      payload: `Okay, let's get you started with booking your trip to ${itinerary.destination} for ${itinerary.travelDates}!
      
Here are some helpful links:
✈️ Search for flights: [Google Flights](${flightSearchUrl})
🏨 Find hotels: [Booking.com](${hotelSearchUrl})

Remember to compare prices and check cancellation policies before booking. Happy travels!`,
      timestamp: new Date(),
    };
    setChatHistory(prev => [...prev, guidanceMessage]);
    setIsDetailSheetOpen(false); 
  };

  const isAiProcessingMainPlan = chatHistory.some(msg => msg.type === 'loading' && msg.payload !== "Fetching real-time flight and hotel data..." && msg.payload !== "Pre-filtering options based on your budget..." && !isAiRespondingToChat);

  const handleSelectHistoryEntry = (entryData: Partial<AITripPlannerInput>) => {
    setCurrentFormInitialValues(entryData);
    setIsSearchHistoryDrawerOpen(false);
    setIsInputSheetOpen(true);
  };

  const handleStartNewBlankPlanFromDrawer = () => {
    setCurrentFormInitialValues(null);
    setIsSearchHistoryDrawerOpen(false);
    setIsInputSheetOpen(true);
  };

  const handleOpenInputSheetForNewPlan = () => {
    setCurrentFormInitialValues(null); 
    setIsInputSheetOpen(true);
  };

  useEffect(() => {
    const handleStorageChange = () => {
        const bundledTripData = localStorage.getItem('tripBundleToPlan');
        if (bundledTripData) {
            try {
                const tripIdea: AITripPlannerInput = JSON.parse(bundledTripData);
                setCurrentFormInitialValues(tripIdea);
                setIsInputSheetOpen(true);
            } catch (e) {
                console.error("Error parsing trip bundle data from localStorage:", e);
            } finally {
                localStorage.removeItem('tripBundleToPlan');
            }
        }
    };
    
    handleStorageChange();
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('localStorageUpdated_tripBundleToPlan', handleStorageChange);

    return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('localStorageUpdated_tripBundleToPlan', handleStorageChange);
    };
  }, []);

  const prominentButtonClasses = "text-lg py-3 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:from-accent hover:to-primary focus-visible:ring-4 focus-visible:ring-primary/40 transform transition-all duration-300 ease-out hover:scale-[1.02] active:scale-100";

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background"> 
      <div className={cn("p-3 border-b border-border/30 flex justify-between items-center", "glass-pane")}>
        <h2 className="text-lg font-semibold text-foreground flex items-center">
            <Bot className="w-6 h-6 mr-2 text-primary"/> AI Trip Planner & Concierge
        </h2>
        <Button
          size="sm"
          onClick={() => setIsSearchHistoryDrawerOpen(true)}
          disabled={!currentUser || addSearchHistoryMutation.isPending || isAiProcessingMainPlan || isAiRespondingToChat}
          className={cn(
            "shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40",
            "bg-gradient-to-r from-primary to-accent text-primary-foreground",
            "hover:from-accent hover:to-primary",
            "focus-visible:ring-2 focus-visible:ring-primary/40", 
            "transform transition-all duration-300 ease-out hover:scale-[1.02] active:scale-100"
          )}
        >
          <History className="w-4 h-4 mr-2" />
          View Plan History
        </Button>
      </div>

      <ScrollArea className="flex-grow p-4 sm:p-6" ref={chatContainerRef}>
        <div className="max-w-3xl mx-auto space-y-6 pb-4"> 
          {chatHistory.map((msg) => (
            <ChatMessageCard key={msg.id} message={msg} onViewDetails={handleViewDetails} />
          ))}
        </div>
      </ScrollArea>
      
      <div className={cn("p-3 border-t border-border/30", "glass-pane")}>
        <div className="max-w-3xl mx-auto space-y-3">
            <Button
              onClick={handleOpenInputSheetForNewPlan}
              className={cn(prominentButtonClasses, "w-full")}
              size="lg"
              disabled={!currentUser || addSavedTripMutation.isPending || isAiProcessingMainPlan || isAiRespondingToChat || addSearchHistoryMutation.isPending || !isMapsScriptLoaded}
            >
              {isAiProcessingMainPlan ? <Loader2 className="w-6 h-6 mr-2 animate-spin" /> : <Send className="w-6 h-6 mr-2" />} 
              {isAiProcessingMainPlan ? "AI is generating full plan..." : "Compose Detailed Trip Request"}
            </Button>
            
            <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-muted-foreground" />
                <Input
                    ref={chatInputRef}
                    type="text"
                    placeholder={currentUser ? "Ask Aura a quick travel question..." : "Log in to chat with Aura AI"}
                    value={currentUserInput}
                    onChange={(e) => setCurrentUserInput(e.target.value)}
                    onKeyPress={(e) => { if (e.key === 'Enter' && !isAiRespondingToChat) handleSendUserChatMessage(); }}
                    disabled={!currentUser || isAiRespondingToChat || isAiProcessingMainPlan}
                    className="flex-grow bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50"
                />
                <Button
                    onClick={handleSendUserChatMessage}
                    disabled={!currentUserInput.trim() || isAiRespondingToChat || isAiProcessingMainPlan || !currentUser}
                    size="icon"
                    className={cn(
                        "shadow-sm shadow-accent/30 hover:shadow-md hover:shadow-accent/40 aspect-square",
                        "bg-gradient-to-r from-accent to-primary text-primary-foreground",
                        "hover:from-primary hover:to-accent",
                        "focus-visible:ring-2 focus-visible:ring-accent/40",
                         "transform transition-all duration-300 ease-out hover:scale-[1.05] active:scale-100"
                    )}
                >
                    {isAiRespondingToChat ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span className="sr-only">Send</span>
                </Button>
            </div>
        </div>
      </div>


      <TripPlannerInputSheet
        isOpen={isInputSheetOpen}
        onClose={() => setIsInputSheetOpen(false)}
        onPlanRequest={handlePlanRequest}
        initialValues={currentFormInitialValues}
        isMapsScriptLoaded={isMapsScriptLoaded} 
      />

      <SearchHistoryDrawer
        isOpen={isSearchHistoryDrawerOpen}
        onClose={() => setIsSearchHistoryDrawerOpen(false)}
        onSelectHistoryEntry={handleSelectHistoryEntry}
        onStartNewBlankPlan={handleStartNewBlankPlanFromDrawer}
      />

      {selectedItinerary && (
        <ItineraryDetailSheet
          isOpen={isDetailSheetOpen}
          onClose={() => setIsDetailSheetOpen(false)}
          itinerary={selectedItinerary}
          onSaveTrip={handleSaveTrip}
          isTripSaved={isTripSaved(selectedItinerary)}
          isSaving={addSavedTripMutation.isPending}
          onInitiateBooking={handleInitiateBookingGuidance} 
        />
      )}
    </div>
  );
}
