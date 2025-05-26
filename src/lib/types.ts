
import type { AITripPlannerOutput, AITripPlannerInput as AITripPlannerInputOriginal, FlightOptionSchema as AIFlightOptionSchema, HotelOptionSchema as AIHotelOptionSchema, RoomSchema as AIRoomSchema, DailyPlanItemSchema as AIDailyPlanItemSchema } from "@/ai/types/trip-planner-types";

// This effectively takes the type of a single itinerary object from the array
type SingleItineraryFromAI = AITripPlannerOutput["itineraries"][0];

// Re-define local types based on the AI flow's output schemas for clarity and directness
export type FlightOption = z.infer<typeof AIFlightOptionSchema>;
export type Room = z.infer<typeof AIRoomSchema>;
export type HotelOption = Omit<z.infer<typeof AIHotelOptionSchema>, 'rooms'> & { rooms?: Room[] }; // Ensure rooms array uses local Room type
export type DailyPlanItem = z.infer<typeof AIDailyPlanItemSchema>;

// Add the 'id' field that we add manually and use the locally defined types
export type Itinerary = Omit<SingleItineraryFromAI, 'flightOptions' | 'hotelOptions' | 'dailyPlan'> & {
  id: string;
  flightOptions: FlightOption[];
  hotelOptions: HotelOption[];
  dailyPlan: DailyPlanItem[];
  aiGeneratedMemory?: { 
    memoryText: string;
    generatedAt: string; 
  };
  aiTripSummary?: {
    text: string;
    generatedAt: string; 
  };
  culturalTip?: string | null;
  weatherContext?: string | null; // Already in SingleItineraryFromAI if present in prompt, but good to ensure
  riskContext?: string | null; // Already in SingleItineraryFromAI if present in prompt
  // New fields for indicating if the suggestion is an alternative and why
  isAlternative?: boolean;
  alternativeReason?: string;
  destinationLatitude?: number;
  destinationLongitude?: number;
};


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
export type AITripPlannerInput = Omit<AITripPlannerInputOriginal, 'userPersona' | 'desiredMood' | 'weatherContext' | 'riskContext' | 'realFlightOptions' | 'realHotelOptions'> & {
  userPersona?: {
    name: string;
    description: string;
  } | null;
  desiredMood?: string | null;
  weatherContext?: string | null;
  riskContext?: string | null;
  // These will be populated by the planner page before calling the AI flow
  realFlightOptions?: import('@/ai/types/serpapi-flight-search-types').SerpApiFlightOption[];
  realHotelOptions?: import('@/ai/types/serpapi-hotel-search-types').SerpApiHotelSuggestion[];
};
