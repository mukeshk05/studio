
import type { AITripPlannerOutput, AITripPlannerInput as AITripPlannerInputOriginal } from "@/ai/types/trip-planner-types";

// This effectively takes the type of a single itinerary object from the array
type SingleItineraryFromAI = AITripPlannerOutput["itineraries"][0];

// Add the 'id' field that we add manually
export type Itinerary = SingleItineraryFromAI & {
  id: string;
  aiGeneratedMemory?: { // Added for storing AI generated memory
    memoryText: string;
    generatedAt: string; // ISO date string
  };
};

// Type for a single hotel option, derived from the itinerary type
export type HotelOption = Itinerary["hotelOptions"][0];
export type Room = NonNullable<HotelOption["rooms"]>[0]; // Gets the type of a single room if rooms array exists

// Type for a single daily plan item, derived from the itinerary type
export type DailyPlanItem = Itinerary["dailyPlan"][0];

export interface PriceForecast {
  forecast: string;
  confidence?: 'low' | 'medium' | 'high';
  forecastedAt: string; // ISO date string
}

export interface PriceTrackerEntry {
  id: string;
  itemType: "flight" | "hotel";
  itemName: string;
  targetPrice: number;
  currentPrice: number; // Last known current price
  lastChecked: string; // ISO date string
  createdAt?: any; // Firestore ServerTimestamp
  alertStatus?: {
    shouldAlert: boolean;
    alertMessage: string;
  };
  aiAdvice?: string;
  priceForecast?: PriceForecast;
}

export interface SearchHistoryEntry {
  id: string; // Document ID from Firestore
  destination: string;
  travelDates: string;
  budget: number;
  searchedAt: any; // Firestore ServerTimestamp (can be Date on client)
}

export interface UserTravelPersona {
  name: string;
  description: string;
  lastUpdated: any; // Firestore ServerTimestamp (can be Date on client)
}


// Re-export AITripPlannerOutput from here if needed by UI components
export type { AITripPlannerOutput } from "@/ai/types/trip-planner-types";

// Augment AITripPlannerInput to include all optional fields for clarity
export type AITripPlannerInput = AITripPlannerInputOriginal & {
  userPersona?: {
    name: string;
    description: string;
  } | null;
  desiredMood?: string | null;
  weatherContext?: string | null;
  riskContext?: string | null;
};

