
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
  culturalTip?: string; // Added from AITripPlannerOutputSchema implicitly
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
  targetPrice: number;
  currentPrice: number; 
  travelDates?: string; // Added optional travelDates
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

export type AITripPlannerInput = AITripPlannerInputOriginal & {
  userPersona?: {
    name: string;
    description: string;
  } | null;
  desiredMood?: string | null;
  weatherContext?: string | null;
  riskContext?: string | null;
};

