
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AITripPlannerInput, AITripPlannerOutput, UserPersona } from "@/ai/types/trip-planner-types";
import { aiTripPlanner } from "@/ai/flows/ai-trip-planner";
import type { CoTravelAgentInput, CoTravelAgentOutput } from "@/ai/types/co-travel-agent-types"; 
import { getCoTravelAgentResponse } from "@/app/actions"; 
import type { Itinerary, SearchHistoryEntry } from "@/lib/types";
import { TripPlannerInputSheet } from "@/components/trip-planner/TripPlannerInputSheet";
import { ChatMessageCard } from "@/components/trip-planner/ChatMessageCard";
import { Input } from "@/components/ui/input"; 
import { History, Send, Loader2, MessageSquare, Bot } from "lucide-react"; 
import { useAuth } from "@/contexts/AuthContext";
import { useSavedTrips, useAddSavedTrip, useAddSearchHistory, useGetUserTravelPersona } from "@/lib/firestoreHooks";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { SearchHistoryDrawer } from "@/components/planner/SearchHistoryDrawer";
import { ItineraryDetailSheet } from "@/components/trip-planner/ItineraryDetailSheet"; 
import { getRealFlightsAction, getRealHotelsAction } from "@/app/actions"; // Import SerpApi actions
import type { SerpApiFlightSearchInput, SerpApiHotelSearchInput, SerpApiFlightOption, SerpApiHotelSuggestion } from "@/lib/types"; // Adjusted to import from lib/types
import { format, addDays, parse, differenceInDays } from 'date-fns';


export interface ChatMessage {
  id: string;
  type: "user" | "ai" | "error" | "loading" | "system" | "booking_guidance" | "ai_text_response"; 
  payload?: any;
  timestamp: Date;
  title?: string;
}

// Helper function to parse flexible date strings (simplified for demo)
function parseFlexibleDates(dateString: string): { from: Date, to: Date, durationDays: number } {
  const now = new Date();
  let fromDate = addDays(now, 30); // Default to next month
  let toDate = addDays(fromDate, 7); // Default 7 days duration

  // Very basic parsing logic
  if (dateString.toLowerCase().includes("next week")) {
    fromDate = addDays(now, 7);
    toDate = addDays(fromDate, 7);
  } else if (dateString.toLowerCase().includes("next month")) {
    fromDate = addDays(now, 30);
    toDate = addDays(fromDate, 7);
  } else if (dateString.match(/(\d+)\s*days/i)) {
    const daysMatch = dateString.match(/(\d+)\s*days/i);
    if (daysMatch) {
      const numDays = parseInt(daysMatch[1], 10);
      toDate = addDays(fromDate, numDays -1); // -1 because 'for X days' includes start day
    }
  } else {
    // Try to parse M/D/YYYY - M/D/YYYY
    const parts = dateString.split(/\s*-\s*/);
    if (parts.length === 2) {
      const d1 = parse(parts[0], 'MM/dd/yyyy', new Date());
      const d2 = parse(parts[1], 'MM/dd/yyyy', new Date());
      if (!isNaN(d1.getTime()) && !isNaN(d2.getTime()) && d2 >= d1) {
        fromDate = d1;
        toDate = d2;
      }
    }
  }
  const duration = differenceInDays(toDate, fromDate) + 1;
  return { from: fromDate, to: toDate, durationDays: duration };
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

  const { currentUser } = useAuth();
  const { toast } = useToast();
  const { data: savedTrips, isLoading: isLoadingSavedTrips } = useSavedTrips();
  const { data: userPersona } = useGetUserTravelPersona();
  const addSavedTripMutation = useAddSavedTrip();
  const addSearchHistoryMutation = useAddSearchHistory();

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);


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
    };

    setChatHistory((prev) => [...prev, userMessage, loadingMessage]);
    
    // Parse dates for SerpApi
    const parsedDates = parseFlexibleDates(input.travelDates);

    let realFlights: SerpApiFlightOption[] = [];
    let realHotels: SerpApiHotelSuggestion[] = [];

    try {
      console.log("Fetching real flights...");
      const flightSearchInput: SerpApiFlightSearchInput = {
        origin: "NYC", // TODO: Get origin from user profile or input form
        destination: input.destination,
        departureDate: format(parsedDates.from, "yyyy-MM-dd"),
        returnDate: format(parsedDates.to, "yyyy-MM-dd"), // Assuming round trip for now
        tripType: "round-trip",
      };
      const flightResults = await getRealFlightsAction(flightSearchInput);
      if (flightResults.best_flights) realFlights.push(...flightResults.best_flights);
      if (flightResults.other_flights) realFlights.push(...flightResults.other_flights);
      console.log(`Fetched ${realFlights.length} real flight options.`);
    } catch (e) {
      console.error("Error fetching real flights:", e);
      // Continue without real flights if this fails
    }

    try {
      console.log("Fetching real hotels...");
      const hotelSearchInput: SerpApiHotelSearchInput = {
        destination: input.destination,
        checkInDate: format(parsedDates.from, "yyyy-MM-dd"),
        checkOutDate: format(parsedDates.to, "yyyy-MM-dd"),
        guests: "2 adults", // TODO: Get guests from input form
      };
      const hotelResults = await getRealHotelsAction(hotelSearchInput);
      if (hotelResults.hotels) realHotels = hotelResults.hotels;
      console.log(`Fetched ${realHotels.length} real hotel options.`);
    } catch (e) {
      console.error("Error fetching real hotels:", e);
      // Continue without real hotels
    }

    const plannerInputForAI: AITripPlannerInput = {
      ...input,
      userPersona: userPersona ? { name: userPersona.name, description: userPersona.description } : undefined,
      realFlightOptions: realFlights.length > 0 ? realFlights : undefined,
      realHotelOptions: realHotels.length > 0 ? realHotels : undefined,
    };

    try {
      const result: AITripPlannerOutput = await aiTripPlanner(plannerInputForAI);
      const itinerariesFromAI: Omit<Itinerary, 'id' | 'aiGeneratedMemory'>[] = (result.itineraries || []).map(it => ({
        destination: it.destination,
        travelDates: it.travelDates,
        estimatedCost: it.estimatedCost,
        tripSummary: it.tripSummary === undefined ? null : it.tripSummary,
        dailyPlan: (it.dailyPlan || []).map(dp => ({
          day: dp.day,
          activities: dp.activities,
        })),
        flightOptions: (it.flightOptions || []).map(fo => ({
          name: fo.name,
          description: fo.description,
          price: fo.price,
          airline_logo: fo.airline_logo,
          total_duration: fo.total_duration,
          derived_stops_description: fo.derived_stops_description,
          link: fo.link,
        })),
        hotelOptions: (it.hotelOptions || []).map(hotel => ({
          name: hotel.name,
          description: hotel.description, 
          price: hotel.price,
          hotelImageUri: hotel.hotelImageUri, 
          rating: hotel.rating === undefined ? null : hotel.rating,
          amenities: hotel.amenities || [], 
          rooms: (hotel.rooms || []).map(room => ({
            name: room.name,
            description: room.description === undefined ? null : room.description,
            features: room.features || [], 
            pricePerNight: room.pricePerNight === undefined ? null : room.pricePerNight,
            roomImagePrompt: room.roomImagePrompt === undefined ? null : room.roomImagePrompt,
            roomImageUri: room.roomImageUri === undefined ? null : room.roomImageUri,
          })),
          latitude: hotel.latitude,
          longitude: hotel.longitude,
          link: hotel.link,
        })),
        destinationImageUri: it.destinationImageUri, 
        culturalTip: it.culturalTip === undefined ? null : it.culturalTip,
        isAlternative: it.isAlternative,
        alternativeReason: it.alternativeReason,
        destinationLatitude: it.destinationLatitude,
        destinationLongitude: it.destinationLongitude,
      }));


      const aiMessage: ChatMessage = {
        id: crypto.randomUUID(),
        type: "ai",
        payload: {itineraries: itinerariesFromAI.map(it => ({...it, id: `temp-${crypto.randomUUID()}`})), personalizationNote: result.personalizationNote},
        timestamp: new Date(),
      };
      setChatHistory((prev) => prev.filter(msg => msg.type !== 'loading').concat(aiMessage));

      if (!result.itineraries || result.itineraries.length === 0) {
         const noResultsMessage: ChatMessage = {
            id: crypto.randomUUID(),
            type: "system",
            payload: "I couldn't find any itineraries based on your request. Please try different criteria or check if real-time data was available.",
            timestamp: new Date(),
          };
          setChatHistory((prev) => [...prev, noResultsMessage]);
      }
    } catch (error) {
      console.error("Error planning trip:", error);
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        type: "error",
        payload: "Sorry, I encountered an error while planning your trip. Please try again.",
        timestamp: new Date(),
      };
      setChatHistory((prev) => prev.filter(msg => msg.type !== 'loading').concat(errorMessage));
    }
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
      const destination = forMatch?.[1]?.trim().replace(/\?$/, '').trim();

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
    const flightSearchUrl = `https://www.google.com/travel/flights?q=flights+to+${encodeURIComponent(itinerary.destination)}`;
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

  const isAiProcessingMainPlan = chatHistory.some(msg => msg.type === 'loading' && !isAiRespondingToChat);

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
              disabled={!currentUser || addSavedTripMutation.isPending || isAiProcessingMainPlan || isAiRespondingToChat || addSearchHistoryMutation.isPending}
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
