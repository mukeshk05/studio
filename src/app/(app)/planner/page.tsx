
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AITripPlannerInput, AITripPlannerOutput } from "@/ai/flows/ai-trip-planner";
import { aiTripPlanner } from "@/ai/flows/ai-trip-planner";
import type { Itinerary } from "@/lib/types";
import { TripPlannerInputSheet } from "@/components/trip-planner/TripPlannerInputSheet"; // Updated import
import { ChatMessageCard } from "@/components/trip-planner/ChatMessageCard";
import { ItineraryDetailSheet } from "@/components/trip-planner/ItineraryDetailSheet";
import { MessageSquarePlusIcon, SparklesIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSavedTrips, useAddSavedTrip } from "@/lib/firestoreHooks";
import { useToast } from "@/hooks/use-toast";

export interface ChatMessage {
  id: string;
  type: "user" | "ai" | "error" | "loading" | "system";
  payload?: any; 
  timestamp: Date;
}

export default function TripPlannerPage() {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isInputSheetOpen, setIsInputSheetOpen] = useState(false); // Renamed from isInputDialogOpen
  const [selectedItinerary, setSelectedItinerary] = useState<Itinerary | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const { data: savedTrips, isLoading: isLoadingSavedTrips } = useSavedTrips();
  const addSavedTripMutation = useAddSavedTrip();

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
      
      // Firestore will generate IDs, so we don't create them here.
      // The 'id' will be added when fetching from Firestore or immediately after adding.
      // For display before saving, a temporary client-side ID could be used if needed,
      // but for now, let's assume ID is only relevant once saved.
      const itinerariesFromAI: Omit<Itinerary, 'id'>[] = (result.itineraries || []).map((it) => ({
        ...it,
        destinationImageUri: it.destinationImageUri || `https://placehold.co/600x400.png`,
        hotelOptions: (it.hotelOptions || []).map(hotel => ({
          ...hotel,
          hotelImageUri: hotel.hotelImageUri || `https://placehold.co/300x200.png?text=${encodeURIComponent(hotel.name.substring(0,10))}`
        })),
        dailyPlan: it.dailyPlan || [],
        // No client-side 'id' generation here; Firestore will handle it.
        // For viewing details of an unsaved trip, we pass the full Itinerary (Omit<Itinerary, 'id'>) object.
      }));


      const aiMessage: ChatMessage = {
        id: crypto.randomUUID(),
        type: "ai",
        // Pass the AI output directly. The ItineraryCard will handle unsaved items.
        payload: itinerariesFromAI.map(it => ({...it, id: `temp-${crypto.randomUUID()}`})), // Add temp id for key prop
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

  const handleViewDetails = (itinerary: Itinerary) => { // Expects Itinerary which might have temp id
    setSelectedItinerary(itinerary);
    setIsDetailSheetOpen(true);
  };

  const handleSaveTrip = async (itineraryToSave: Omit<Itinerary, 'id'>) => {
    if (!currentUser) {
      toast({ title: "Authentication Required", description: "Please log in to save trips.", variant: "destructive" });
      return;
    }
    try {
      // Check if a very similar trip (destination, travelDates, estimatedCost) already exists to avoid exact duplicates if user clicks save multiple times on an unsaved card
      // This client-side check is basic. A more robust check could be done via Firestore query if needed.
      const alreadyExists = savedTrips?.some(
        (trip) => 
          trip.destination === itineraryToSave.destination &&
          trip.travelDates === itineraryToSave.travelDates &&
          trip.estimatedCost === itineraryToSave.estimatedCost
      );

      if (alreadyExists && !itineraryToSave.id?.startsWith('temp-')) { // only check for already saved trips
         toast({ title: "Already Saved", description: "This trip variation seems to be already in your dashboard." });
         return;
      }

      await addSavedTripMutation.mutateAsync(itineraryToSave);
      toast({
        title: "Trip Saved!",
        description: `${itineraryToSave.destination} has been added to your dashboard.`,
      });
      setIsDetailSheetOpen(false); // Close sheet after saving
    } catch (error) {
      console.error("Error saving trip:", error);
      toast({ title: "Error Saving Trip", description: "Could not save the trip to your dashboard.", variant: "destructive" });
    }
  };
  
  const isTripSaved = (itinerary: Itinerary | Omit<Itinerary, 'id'>): boolean => {
    if (isLoadingSavedTrips || !savedTrips) return false;
    // If the itinerary has a non-temporary ID, check if it's in savedTrips
    if (itinerary.id && !itinerary.id.startsWith('temp-')) {
      return savedTrips.some(trip => trip.id === itinerary.id);
    }
    // For unsaved (temporary ID) or items without ID, check by content
    return savedTrips.some(
      (trip) =>
        trip.destination === itinerary.destination &&
        trip.travelDates === itinerary.travelDates &&
        trip.estimatedCost === itinerary.estimatedCost
    );
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
              onClick={() => setIsInputSheetOpen(true)} // Updated to setIsInputSheetOpen
              className="w-full text-lg py-3"
              size="lg"
              disabled={!currentUser || addSavedTripMutation.isPending}
            >
              <MessageSquarePlusIcon className="w-6 h-6 mr-2" />
              Plan New Trip
            </Button>
           )}
        </div>
      </div>

      <TripPlannerInputSheet // Updated component name
        isOpen={isInputSheetOpen} // Updated prop name
        onClose={() => setIsInputSheetOpen(false)} // Updated prop name
        onPlanRequest={handlePlanRequest}
      />

      {selectedItinerary && (
        <ItineraryDetailSheet
          isOpen={isDetailSheetOpen}
          onClose={() => setIsDetailSheetOpen(false)}
          itinerary={selectedItinerary} // selectedItinerary now includes a temporary ID if unsaved
          onSaveTrip={handleSaveTrip}
          isTripSaved={isTripSaved(selectedItinerary)}
          isSaving={addSavedTripMutation.isPending}
        />
      )}
    </div>
  );
}
