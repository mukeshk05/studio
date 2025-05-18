
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TripInputForm } from "@/components/trip-planner/trip-input-form";
import type { AITripPlannerInput, AITripPlannerOutput } from "@/ai/flows/ai-trip-planner";
import { aiTripPlanner } from "@/ai/flows/ai-trip-planner";
import { Itinerary } from "@/lib/types";
import { TripPlannerInputDialog } from "@/components/trip-planner/TripPlannerInputDialog";
import { ChatMessageCard } from "@/components/trip-planner/ChatMessageCard";
import { ItineraryDetailSheet } from "@/components/trip-planner/ItineraryDetailSheet";
import { MessageSquarePlusIcon, SparklesIcon } from "lucide-react";
import useLocalStorage from "@/hooks/use-local-storage";

export interface ChatMessage {
  id: string;
  type: "user" | "ai" | "error" | "loading" | "system";
  payload?: any; // For user: AITripPlannerInput, For AI: Itinerary[], For error: string
  timestamp: Date;
}

const EMPTY_SAVED_TRIPS_PLANNER: Itinerary[] = [];

export default function TripPlannerPage() {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isInputDialogOpen, setIsInputDialogOpen] = useState(false);
  const [selectedItinerary, setSelectedItinerary] = useState<Itinerary | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [savedTrips, setSavedTrips] = useLocalStorage<Itinerary[]>("savedTrips", EMPTY_SAVED_TRIPS_PLANNER);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatHistory.length === 0) {
      setChatHistory([
        {
          id: crypto.randomUUID(),
          type: "system",
          payload: "Welcome to BudgetRoam AI Trip Planner! Click the button below to start planning your next adventure.",
          timestamp: new Date(),
        },
      ]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [chatHistory]);

  const handlePlanRequest = async (input: AITripPlannerInput) => {
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

    try {
      const result: AITripPlannerOutput = await aiTripPlanner(input);
      
      const itinerariesWithIds: Itinerary[] = (result.itineraries || []).map((it, index) => ({
        ...it,
        destinationImageUri: it.destinationImageUri || `https://placehold.co/600x400.png`,
        hotelOptions: (it.hotelOptions || []).map(hotel => ({
          ...hotel,
          hotelImageUri: hotel.hotelImageUri || `https://placehold.co/300x200.png?text=${encodeURIComponent(hotel.name.substring(0,10))}`
        })),
        dailyPlan: it.dailyPlan || [],
        id: `${it.destination}-${it.travelDates}-${it.estimatedCost}-${index}-${crypto.randomUUID()}` // Ensure unique ID
      }));

      const aiMessage: ChatMessage = {
        id: crypto.randomUUID(),
        type: "ai",
        payload: itinerariesWithIds,
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

  const handleSaveTrip = (itineraryToSave: Itinerary) => {
    if (!savedTrips.find(trip => trip.id === itineraryToSave.id)) {
      setSavedTrips([...savedTrips, itineraryToSave]);
    }
    // Optionally, provide feedback like a toast, handled in ItineraryCard itself
  };

  const isTripSaved = (itineraryId: string): boolean => {
    return savedTrips.some(trip => trip.id === itineraryId);
  };


  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]"> {/* Adjust height based on header */}
      <ScrollArea className="flex-grow p-4 sm:p-6 bg-background" ref={chatContainerRef}>
        <div className="max-w-3xl mx-auto space-y-6">
          {chatHistory.map((msg) => (
            <ChatMessageCard key={msg.id} message={msg} onViewDetails={handleViewDetails} />
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-background">
        <div className="max-w-3xl mx-auto">
           {chatHistory.length > 0 && chatHistory[chatHistory.length -1].type === 'loading' ? (
             <div className="flex items-center justify-center text-muted-foreground">
                <SparklesIcon className="w-5 h-5 mr-2 animate-pulse text-primary" />
                BudgetRoam AI is thinking...
             </div>
           ) : (
            <Button
              onClick={() => setIsInputDialogOpen(true)}
              className="w-full text-lg py-3"
              size="lg"
            >
              <MessageSquarePlusIcon className="w-6 h-6 mr-2" />
              Plan New Trip or Ask Follow-up
            </Button>
           )}
        </div>
      </div>

      <TripPlannerInputDialog
        isOpen={isInputDialogOpen}
        onClose={() => setIsInputDialogOpen(false)}
        onPlanRequest={handlePlanRequest}
      />

      {selectedItinerary && (
        <ItineraryDetailSheet
          isOpen={isDetailSheetOpen}
          onClose={() => setIsDetailSheetOpen(false)}
          itinerary={selectedItinerary}
          onSaveTrip={handleSaveTrip}
          isTripSaved={isTripSaved(selectedItinerary.id)}
        />
      )}
    </div>
  );
}
