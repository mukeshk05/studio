
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AITripPlannerInput, AITripPlannerOutput, UserPersona } from "@/ai/types/trip-planner-types";
import { aiTripPlanner } from "@/ai/flows/ai-trip-planner";
import type { Itinerary, SearchHistoryEntry } from "@/lib/types";
import { TripPlannerInputSheet } from "@/components/trip-planner/TripPlannerInputSheet";
import { ChatMessageCard } from "@/components/trip-planner/ChatMessageCard";
import { History, Send, Loader2 } from "lucide-react"; 
import { useAuth } from "@/contexts/AuthContext";
import { useSavedTrips, useAddSavedTrip, useAddSearchHistory, useGetUserTravelPersona } from "@/lib/firestoreHooks";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { SearchHistoryDrawer } from "@/components/planner/SearchHistoryDrawer";
import { ItineraryDetailSheet } from "@/components/trip-planner/ItineraryDetailSheet"; 

export interface ChatMessage {
  id: string;
  type: "user" | "ai" | "error" | "loading" | "system" | "booking_guidance";
  payload?: any;
  timestamp: Date;
  title?: string;
}

export default function TripPlannerPage() {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isInputSheetOpen, setIsInputSheetOpen] = useState(false);
  const [selectedItinerary, setSelectedItinerary] = useState<Itinerary | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [isSearchHistoryDrawerOpen, setIsSearchHistoryDrawerOpen] = useState(false);
  const [currentFormInitialValues, setCurrentFormInitialValues] = useState<Partial<AITripPlannerInput> | null>(null);

  const { currentUser } = useAuth();
  const { toast } = useToast();
  const { data: savedTrips, isLoading: isLoadingSavedTrips } = useSavedTrips();
  const { data: userPersona } = useGetUserTravelPersona();
  const addSavedTripMutation = useAddSavedTrip();
  const addSearchHistoryMutation = useAddSearchHistory();

  const chatContainerRef = useRef<HTMLDivElement>(null);

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
          payload: "Welcome to your AI Trip Planner! Click the 'Compose Trip Request' button below to describe your ideal trip.",
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
    };
    const loadingMessage: ChatMessage = {
      id: crypto.randomUUID(),
      type: "loading",
      timestamp: new Date(),
    };

    setChatHistory((prev) => [...prev, userMessage, loadingMessage]);

    const plannerInput: AITripPlannerInput = {
      ...input,
      userPersona: userPersona ? { name: userPersona.name, description: userPersona.description } : undefined,
    };

    try {
      const result: AITripPlannerOutput = await aiTripPlanner(plannerInput);
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
        })),
        destinationImageUri: it.destinationImageUri, 
        culturalTip: it.culturalTip === undefined ? null : it.culturalTip,
        weatherContext: it.weatherContext === undefined ? null : it.weatherContext,
        riskContext: it.riskContext === undefined ? null : it.riskContext,
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
            payload: "I couldn't find any itineraries based on your request. Please try different criteria.",
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

      // If it's a new temporary ID or it doesn't exist in savedTrips by content
      if (!('id' in itineraryToSave) || (itineraryToSave.id && itineraryToSave.id.startsWith('temp-')) || !alreadyExists) {
         // Strip temporary ID if present before saving
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
    
    // If it's a temporary ID, it's definitely not saved yet by its final ID
    if ('id' in itinerary && itinerary.id && itinerary.id.startsWith('temp-')) return false;

    // Check if a trip with the same final ID exists (if it's already been saved once)
    if ('id' in itinerary && itinerary.id && savedTrips.some(trip => trip.id === itinerary.id)) {
      return true;
    }
    
    // Fallback content check for items that might not have a persistent ID yet or if ID comparison fails
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


  const isAiProcessing = chatHistory.some(msg => msg.type === 'loading');

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
        <h2 className="text-lg font-semibold text-foreground">AI Trip Planner</h2>
        <Button
          size="sm"
          onClick={() => setIsSearchHistoryDrawerOpen(true)}
          disabled={!currentUser || addSearchHistoryMutation.isPending || isAiProcessing}
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
        <div className="max-w-3xl mx-auto space-y-6">
          {chatHistory.map((msg) => (
            <ChatMessageCard key={msg.id} message={msg} onViewDetails={handleViewDetails} />
          ))}
        </div>
      </ScrollArea>

      <div className={cn("p-4 border-t border-border/30", "glass-pane")}>
        <div className="max-w-3xl mx-auto">
            <Button
              onClick={handleOpenInputSheetForNewPlan}
              className={cn(prominentButtonClasses, "w-full")}
              size="lg"
              disabled={!currentUser || addSavedTripMutation.isPending || isAiProcessing || addSearchHistoryMutation.isPending}
            >
              {isAiProcessing ? <Loader2 className="w-6 h-6 mr-2 animate-spin" /> : <Send className="w-6 h-6 mr-2" />} 
              {isAiProcessing ? "AI is responding..." : "Compose Trip Request"}
            </Button>
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
