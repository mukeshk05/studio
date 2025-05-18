
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AITripPlannerInput, AITripPlannerOutput, UserPersona } from "@/ai/types/trip-planner-types";
import { aiTripPlanner } from "@/ai/flows/ai-trip-planner";
import type { Itinerary, SearchHistoryEntry } from "@/lib/types";
import { TripPlannerInputSheet } from "@/components/trip-planner/TripPlannerInputSheet";
import { ChatMessageCard } from "@/components/trip-planner/ChatMessageCard";
import { ItineraryDetailSheet } from "@/components/trip-planner/ItineraryDetailSheet";
import { MessageSquarePlusIcon, HistoryIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSavedTrips, useAddSavedTrip, useAddSearchHistory, useGetUserTravelPersona } from "@/lib/firestoreHooks";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { SearchHistoryDrawer } from "@/components/planner/SearchHistoryDrawer";

export interface ChatMessage {
  id: string;
  type: "user" | "ai" | "error" | "loading" | "system";
  payload?: any;
  timestamp: Date;
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
  const { data: userPersona } = useGetUserTravelPersona(); // Fetch user's travel persona
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
          payload: "Welcome to BudgetRoam AI Trip Planner! Click 'Plan New Trip' below or 'View Plan History' to get started.",
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

    // Augment input with userPersona if available
    const plannerInput: AITripPlannerInput = {
      ...input,
      userPersona: userPersona ? { name: userPersona.name, description: userPersona.description } : undefined,
    };

    try {
      const result: AITripPlannerOutput = await aiTripPlanner(plannerInput); // Use augmented input
      const itinerariesFromAI: Omit<Itinerary, 'id'>[] = (result.itineraries || []).map((it) => ({
        ...it,
        destinationImageUri: it.destinationImageUri || `https://placehold.co/600x400.png`,
        hotelOptions: (it.hotelOptions || []).map(hotel => ({
          ...hotel,
          hotelImageUri: hotel.hotelImageUri || `https://placehold.co/300x200.png?text=${encodeURIComponent(hotel.name.substring(0,10))}`
        })),
        dailyPlan: it.dailyPlan || [],
      }));

      const aiMessage: ChatMessage = {
        id: crypto.randomUUID(),
        type: "ai",
        payload: itinerariesFromAI.map(it => ({...it, id: `temp-${crypto.randomUUID()}`})),
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

      if (alreadyExists && itineraryToSave.id && !itineraryToSave.id.startsWith('temp-')) {
         toast({ title: "Already Saved", description: "This trip variation seems to be already in your dashboard." });
         return;
      }

      await addSavedTripMutation.mutateAsync(itineraryToSave);
      toast({
        title: "Trip Saved!",
        description: `${itineraryToSave.destination} has been added to your dashboard.`,
      });
      setIsDetailSheetOpen(false);
    } catch (error) {
      console.error("Error saving trip:", error);
      toast({ title: "Error Saving Trip", description: "Could not save the trip to your dashboard.", variant: "destructive" });
    }
  };

  const isTripSaved = (itinerary: Itinerary | Omit<Itinerary, 'id'>): boolean => {
    if (isLoadingSavedTrips || !savedTrips) return false;
    if ('id' in itinerary && itinerary.id && !itinerary.id.startsWith('temp-')) {
      return savedTrips.some(trip => trip.id === itinerary.id);
    }
    return savedTrips.some(
      (trip) =>
        trip.destination === itinerary.destination &&
        trip.travelDates === itinerary.travelDates &&
        trip.estimatedCost === itinerary.estimatedCost
    );
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

  // Function to handle trip planning from dashboard (e.g., smart bundle)
  // This effect listens for localStorage changes and opens the sheet.
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
    
    // Check on mount
    handleStorageChange();

    // Listen for storage events (e.g., if set by another tab, though less likely here)
    window.addEventListener('storage', handleStorageChange);
    // Listen for custom event if 'tripBundleToPlan' is set by same-page navigation (more reliable)
    window.addEventListener('localStorageUpdated_tripBundleToPlan', handleStorageChange);


    return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('localStorageUpdated_tripBundleToPlan', handleStorageChange);
    };
  }, []);


  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
      <div className="p-3 border-b border-border/30 bg-background/80 backdrop-blur-sm flex justify-between items-center">
        <h2 className="text-lg font-semibold text-foreground">AI Trip Planner</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsSearchHistoryDrawerOpen(true)}
          disabled={!currentUser || addSearchHistoryMutation.isPending || isAiProcessing}
          className="glass-interactive border-primary/30 text-primary hover:bg-primary/20"
        >
          <HistoryIcon className="w-4 h-4 mr-2" />
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

      <div className="p-4 border-t border-border/30 bg-background/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto">
            <Button
              onClick={handleOpenInputSheetForNewPlan}
              className="w-full text-lg py-3 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40"
              size="lg"
              disabled={!currentUser || addSavedTripMutation.isPending || isAiProcessing || addSearchHistoryMutation.isPending}
            >
              <MessageSquarePlusIcon className="w-6 h-6 mr-2" />
              {isAiProcessing ? "AI is thinking..." : "Plan New Trip"}
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
        />
      )}
    </div>
  );
}
