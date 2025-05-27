
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AITripPlannerInput, AITripPlannerOutput, UserPersona } from "@/ai/types/trip-planner-types";
import { aiTripPlanner } from "@/ai/flows/ai-trip-planner";
import type { CoTravelAgentInput, CoTravelAgentOutput } from "@/ai/types/co-travel-agent-types";
import { getCoTravelAgentResponse, getIataCodeAction } from "@/app/actions";
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
import { CombinedTripDetailDialog } from "@/components/trip-planner/CombinedTripDetailDialog"; // New import
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

// Removed PreFilteredOptions as we are moving to TripPackageSuggestion

// Enhanced helper function to parse flexible date strings
function parseFlexibleDates(dateString: string): { from: Date, to: Date, durationDays: number } {
  const now = new Date();
  let fromDate: Date | null = null;
  let toDate: Date | null = null;
  let durationDays = 7; // Default duration

  const lowerDateString = dateString.toLowerCase();

  const specificDateRangeMatch = lowerDateString.match(/(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})\s*(?:-|to)\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})/);
  const singleDateMatch = lowerDateString.match(/(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})/);
  const durationForMatch = lowerDateString.match(/for\s+(\d+)\s*(days?|weeks?)/i);
  const nextWeekendMatch = lowerDateString.includes("next weekend");
  const nextMonthMatch = lowerDateString.includes("next month");
  const specificMonthMatch = lowerDateString.match(/(january|february|march|april|may|june|july|august|september|october|november|december)/i);

  if (specificDateRangeMatch) {
    const d1Str = specificDateRangeMatch[1].replace(/\//g, '-');
    const d2Str = specificDateRangeMatch[2].replace(/\//g, '-');
    // Attempt to parse common date formats before falling back to ISO
    let d1 = parse(d1Str, 'MM-dd-yyyy', new Date());
    if (!isValid(d1)) d1 = parse(d1Str, 'M-d-yyyy', new Date());
    if (!isValid(d1)) d1 = parseISO(d1Str);

    let d2 = parse(d2Str, 'MM-dd-yyyy', new Date());
    if (!isValid(d2)) d2 = parse(d2Str, 'M-d-yyyy', new Date());
    if (!isValid(d2)) d2 = parseISO(d2Str);

    if (isValid(d1) && isValid(d2) && d2 >= d1) {
      fromDate = d1 >= now ? d1 : now;
      toDate = d2;
    }
  } else if (singleDateMatch) {
    const d1Str = singleDateMatch[1].replace(/\//g, '-');
    let d1 = parse(d1Str, 'MM-dd-yyyy', new Date());
    if(!isValid(d1)) d1 = parse(d1Str, 'M-d-yyyy', new Date());
    if (!isValid(d1)) d1 = parseISO(d1Str);

    if (isValid(d1) && d1 >= now) {
      fromDate = d1;
      toDate = durationForMatch ? addDays(d1, durationDays - 1) : d1; // Apply default duration if no "for X days"
    }
  }

  if (durationForMatch) {
    const num = parseInt(durationForMatch[1], 10);
    const unit = durationForMatch[2].startsWith('week') ? 'weeks' : 'days';
    const calculatedDuration = unit === 'weeks' ? num * 7 : num;
    durationDays = Math.max(1, calculatedDuration); // Ensure at least 1 day
    if (fromDate && (!toDate || toDate < fromDate) ) {
      toDate = addDays(fromDate, durationDays - 1);
    } else if (!fromDate) {
      fromDate = startOfMonth(addMonths(now, nextMonthMatch ? 1 : 0)); // Default to start of current/next month
      toDate = addDays(fromDate, durationDays - 1);
    }
  }
  
  if (nextWeekendMatch && !fromDate) {
    fromDate = startOfWeek(addDays(now, (5 - now.getDay() + 7) % 7 + (now.getDay() >= 5 ? 7 : 0)), { weekStartsOn: 5 }); // Next Friday
    durationDays = 3;
    toDate = addDays(fromDate, durationDays - 1);
  } else if (nextMonthMatch && !fromDate) {
    fromDate = startOfMonth(addMonths(now, 1));
    if(!durationForMatch) toDate = addDays(fromDate, durationDays -1); // Apply default if not set by "for X days"
  } else if (specificMonthMatch && !fromDate) {
    const monthIndex = new Date(Date.parse(specificMonthMatch[0] +" 1, 2000")).getMonth();
    let year = now.getFullYear();
    if (monthIndex < now.getMonth()) year++; // If month is past, assume next year
    fromDate = new Date(year, monthIndex, 1);
    if (fromDate < now) fromDate = new Date(year + 1, monthIndex, 1); // Ensure future date
     if(!durationForMatch) toDate = addDays(fromDate, durationDays -1);
  }

  if (!fromDate) fromDate = addDays(now,1); // Tomorrow if all else fails
  if (!toDate || toDate < fromDate) toDate = addDays(fromDate, durationDays - 1);

  const finalDuration = Math.max(1, differenceInDays(toDate, fromDate) + 1);
  return { from: fromDate, to: toDate, durationDays: finalDuration };
}

function generateTripPackageSuggestions(
  filteredFlights: SerpApiFlightOption[],
  filteredHotels: SerpApiHotelSuggestion[],
  durationDays: number,
  destinationQuery: string,
  travelDatesQuery: string,
  userInput: AITripPlannerInput,
  overallBudget: number
): TripPackageSuggestion[] {
  const suggestions: TripPackageSuggestion[] = [];
  if (filteredFlights.length === 0 || filteredHotels.length === 0) {
    return [];
  }

  const budgetTolerance = 0.25; // Allow up to 25% over budget for a package

  // Sort hotels by rating (descending) if available, then price (ascending)
  const sortedHotels = [...filteredHotels].sort((a, b) => {
    if ((a.rating ?? 0) !== (b.rating ?? 0)) {
      return (b.rating ?? 0) - (a.rating ?? 0);
    }
    return (a.price_per_night ?? Infinity) - (b.price_per_night ?? Infinity);
  });

  // Strategy 1: Cheapest flight + Cheapest suitable hotel
  if (filteredFlights[0] && sortedHotels[0]) {
    const flight = filteredFlights[0];
    const hotel = sortedHotels.find(h => (flight.price || 0) + ((h.price_per_night || 0) * durationDays) <= overallBudget * (1 + budgetTolerance));
    if (hotel) {
      suggestions.push({
        id: `${flight.derived_flight_numbers || 'flight0'}_${hotel.name?.replace(/\s/g, '') || 'hotel0'}`,
        flight,
        hotel,
        totalEstimatedCost: (flight.price || 0) + ((hotel.price_per_night || 0) * durationDays),
        durationDays,
        destinationQuery,
        travelDatesQuery,
        userInput
      });
    }
  }

  // Strategy 2: Cheapest flight + Best-rated suitable hotel (if different from above)
  if (filteredFlights[0] && sortedHotels.length > 0) {
    const flight = filteredFlights[0];
    const bestRatedHotel = sortedHotels[0]; // Already sorted by rating primarily
    if (bestRatedHotel && (suggestions.length === 0 || suggestions[0].hotel.name !== bestRatedHotel.name)) {
       if ((flight.price || 0) + ((bestRatedHotel.price_per_night || 0) * durationDays) <= overallBudget * (1 + budgetTolerance)) {
          suggestions.push({
            id: `${flight.derived_flight_numbers || 'flight0'}_${bestRatedHotel.name?.replace(/\s/g, '') || 'hotelTopRated'}`,
            flight,
            hotel: bestRatedHotel,
            totalEstimatedCost: (flight.price || 0) + ((bestRatedHotel.price_per_night || 0) * durationDays),
            durationDays,
            destinationQuery,
            travelDatesQuery,
            userInput
          });
       }
    }
  }
  
  // Strategy 3: Second cheapest flight (if available) + Cheapest suitable hotel (if different from suggestion 1's hotel)
  if (filteredFlights.length > 1 && sortedHotels.length > 0) {
    const flight = filteredFlights[1];
    const hotel = sortedHotels.find(h => (flight.price || 0) + ((h.price_per_night || 0) * durationDays) <= overallBudget * (1 + budgetTolerance));
    if (hotel && (suggestions.length < 2 || (suggestions.length > 0 && suggestions[0].hotel.name !== hotel.name))) {
        suggestions.push({
            id: `${flight.derived_flight_numbers || 'flight1'}_${hotel.name?.replace(/\s/g, '') || 'hotel0'}`,
            flight,
            hotel,
            totalEstimatedCost: (flight.price || 0) + ((hotel.price_per_night || 0) * durationDays),
            durationDays,
            destinationQuery,
            travelDatesQuery,
            userInput
          });
    }
  }

  // Deduplicate and limit to 3
  const uniqueSuggestions = Array.from(new Map(suggestions.map(item => [item.id, item])).values());
  return uniqueSuggestions.slice(0, 3);
}


export default function TripPlannerPage() {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [currentUserInput, setCurrentUserInput] = useState("");
  const [isInputSheetOpen, setIsInputSheetOpen] = useState(false);
  const [selectedItinerary, setSelectedItinerary] = useState<Itinerary | null>(null); // For AI generated full itinerary
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [isSearchHistoryDrawerOpen, setIsSearchHistoryDrawerOpen] = useState(false);
  const [currentFormInitialValues, setCurrentFormInitialValues] = useState<Partial<AITripPlannerInput> | null>(null);
  const [isAiRespondingToChat, setIsAiRespondingToChat] = useState(false);

  const [selectedTripPackage, setSelectedTripPackage] = useState<TripPackageSuggestion | null>(null); // New state for packages
  const [isPackageDetailDialogOpen, setIsPackageDetailDialogOpen] = useState(false); // New state for package dialog


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

    const userMessage: ChatMessage = { id: crypto.randomUUID(), type: "user", payload: input, timestamp: new Date(), title: "Trip Plan Request" };
    const loadingMessage: ChatMessage = { id: crypto.randomUUID(), type: "loading", timestamp: new Date(), payload: "Fetching real-time flight and hotel data..." };
    setChatHistory(prev => [...prev, userMessage, loadingMessage]);

    const parsedDates = parseFlexibleDates(input.travelDates);
    const formattedDepartureDate = format(parsedDates.from, "yyyy-MM-dd");
    const formattedReturnDate = format(parsedDates.to, "yyyy-MM-dd");

    let realFlights: SerpApiFlightOption[] = [];
    let realHotels: SerpApiHotelSuggestion[] = [];

    let originIata = input.origin ? await getIataCodeAction(input.origin) : null;
    if (input.origin && !originIata) console.warn(`Could not find IATA for origin: ${input.origin}`);
    const destinationIata = await getIataCodeAction(input.destination);
    if (!destinationIata) console.warn(`Could not find IATA for destination: ${input.destination}`);

    try {
      const flightSearchInput = { origin: originIata || input.origin || "NYC", destination: destinationIata || input.destination, departureDate: formattedDepartureDate, returnDate: formattedReturnDate, tripType: "round-trip" as const };
      console.log("[PlannerPage] Flight Search Input to SerpApi:", flightSearchInput);
      const flightResults = await getRealFlightsAction(flightSearchInput);
      if (flightResults.best_flights) realFlights.push(...flightResults.best_flights);
      if (flightResults.other_flights) realFlights.push(...flightResults.other_flights);
      console.log(`Fetched ${realFlights.length} real flight options.`);
      toast({ title: "Flight Data Update", description: `SerpApi returned ${realFlights.length} flight options.` });
    } catch (e) { console.error("Error fetching real flights:", e); toast({ title: "Flight Fetch Error (SerpApi)", variant: "destructive" }); }

    try {
      const hotelSearchInput = { destination: input.destination, checkInDate: formattedDepartureDate, checkOutDate: formattedReturnDate, guests: "2" }; // Default guests for now
      console.log("[PlannerPage] Hotel Search Input to SerpApi:", hotelSearchInput);
      const hotelResults = await getRealHotelsAction(hotelSearchInput);
      if (hotelResults.hotels) realHotels = hotelResults.hotels;
      console.log(`Fetched ${realHotels.length} real hotel options.`);
      toast({ title: "Hotel Data Update", description: `SerpApi returned ${realHotels.length} hotel options.` });
    } catch (e) { console.error("Error fetching real hotels:", e); toast({ title: "Hotel Fetch Error (SerpApi)", variant: "destructive" }); }

    setChatHistory(prev => prev.map(msg => msg.id === loadingMessage.id ? { ...msg, payload: "Pre-filtering & combining best options..." } : msg));

    const flightBudgetPercentage = 0.40;
    const hotelBudgetPercentage = 0.60;
    const allocatedFlightBudget = input.budget * flightBudgetPercentage;
    const allocatedHotelBudgetTotal = input.budget * hotelBudgetPercentage;

    console.log(`Total Budget: $${input.budget}, Flight Allocation: $${allocatedFlightBudget.toFixed(0)}, Hotel Total Allocation: $${allocatedHotelBudgetTotal.toFixed(0)} for ${parsedDates.durationDays} days.`);

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
    
    const tripPackages = generateTripPackageSuggestions(filteredFlights, filteredHotels, parsedDates.durationDays, input.destination, input.travelDates, input, input.budget);

    let packageNote = `Generated ${tripPackages.length} trip package(s) from ${filteredFlights.length} suitable flights and ${filteredHotels.length} suitable hotels.`;
    if(tripPackages.length === 0) {
        packageNote = `Could not create any trip packages within budget from the ${filteredFlights.length} flights and ${filteredHotels.length} hotels found. You might need to increase your budget or adjust dates/destination.`;
    }

    const packageMessage: ChatMessage = {
      id: crypto.randomUUID(),
      type: "trip_package_suggestions",
      payload: { packages: tripPackages, note: packageNote, userInput: input },
      timestamp: new Date(),
      title: "Curated Trip Packages"
    };
    setChatHistory(prev => prev.filter(msg => msg.type !== 'loading').concat(packageMessage));

    // The AI Trip Planner call is now commented out as per request
    /*
    const plannerInputForAI: AITripPlannerInput = {
      ...input,
      userPersona: userPersona ? { name: userPersona.name, description: userPersona.description } : undefined,
      realFlightOptions: filteredFlights.length > 0 ? filteredFlights : undefined,
      realHotelOptions: filteredHotels.length > 0 ? filteredHotels : undefined,
    };
    console.log("[PlannerPage] Input to aiTripPlanner flow:", JSON.stringify(plannerInputForAI, null, 2));
    // ... (rest of AI call logic) ...
    */
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
