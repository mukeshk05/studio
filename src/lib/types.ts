
import type { AITripPlannerOutput, AITripPlannerInput as AITripPlannerInputOriginal } from "@/ai/types/trip-planner-types";

// This effectively takes the type of a single itinerary object from the array
type SingleItineraryFromAI = AITripPlannerOutput["itineraries"][0];

// Add the 'id' field that we add manually
export type Itinerary = SingleItineraryFromAI & {
  id: string;
  aiGeneratedMemory?: { 
    memoryText: string;
    generatedAt: string; 
  };
  culturalTip?: string | null; // Allow null
  weatherContext?: string | null; // Allow null
  riskContext?: string | null; // Allow null
};

// Type for a single hotel option, derived from the itinerary type
export type HotelOption = Itinerary["hotelOptions"][0];
export type Room = NonNullable<HotelOption["rooms"]>[0]; 

// Type for a single daily plan item, derived from the itinerary type
export type DailyPlanItem = Itinerary["dailyPlan"][0];

export interface PriceForecast {
  forecast: string;
  confidence?: 'low' | 'medium' | 'high';
  forecastedAt: string; 
}

export interface PriceTrackerEntry {
  id: string;
  itemType: "flight" | "hotel";
  itemName: string; 
  originCity?: string; 
  destination?: string; 
  targetPrice: number;
  currentPrice: number; 
  travelDates?: string;
  lastChecked: string; 
  createdAt?: any; 
  alertStatus?: {
    shouldAlert: boolean;
    alertMessage: string;
  };
  aiAdvice?: string;
  priceForecast?: PriceForecast;
}

export interface SearchHistoryEntry {
  id: string; 
  destination: string;
  travelDates: string;
  budget: number;
  searchedAt: any; 
}

export interface UserTravelPersona {
  name: string;
  description: string;
  lastUpdated: any; 
}


export type { AITripPlannerOutput } from "@/ai/types/trip-planner-types";

// Update AITripPlannerInput to allow null for optional fields
export type AITripPlannerInput = Omit<AITripPlannerInputOriginal, 'userPersona' | 'desiredMood' | 'weatherContext' | 'riskContext'> & {
  userPersona?: {
    name: string;
    description: string;
  } | null;
  desiredMood?: string | null;
  weatherContext?: string | null;
  riskContext?: string | null;
};
