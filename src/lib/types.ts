
import type { AITripPlannerOutput, AITripPlannerInput as AITripPlannerInputOriginal, FlightOptionSchema as AIFlightOptionSchema, HotelOptionSchema as AIHotelOptionSchema, RoomSchema as AIRoomSchema, DailyPlanItemSchema as AIDailyPlanItemSchema } from "@/ai/types/trip-planner-types";
import type { SerpApiFlightSearchOutput, SerpApiFlightOption, SerpApiHotelSearchOutput, SerpApiHotelSuggestion } from "@/ai/types/serpapi-flight-search-types"; // This import is fine
import { z } from 'zod';

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
  weatherContext?: string | null;
  riskContext?: string | null;
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

// Updated SearchHistoryEntry
export interface SearchHistoryEntry {
  id: string;
  destination: string; // Kept for quick display in drawer
  travelDates: string; // Kept for quick display in drawer
  budget: number;      // Kept for quick display in drawer
  userInput: AITripPlannerInput; // The full input that triggered the search/plan
  flightResults?: SerpApiFlightSearchOutput | null; // Raw flight results from SerpApi
  hotelResults?: SerpApiHotelSearchOutput | null;   // Raw hotel results from SerpApi
  aiItineraries?: AITripPlannerOutput | null;     // Full AI planner output if generated
  tripPackages?: TripPackageSuggestion[] | null;  // Combined packages if generated
  searchedAt: any;
}


export interface UserTravelPersona {
  name: string;
  description: string;
  lastUpdated: any;
}


export type { AITripPlannerOutput } from "@/ai/types/trip-planner-types";

export type AITripPlannerInput = Omit<AITripPlannerInputOriginal, 'userPersona' | 'desiredMood' | 'weatherContext' | 'riskContext' | 'realFlightOptions' | 'realHotelOptions'> & {
  userId?: string; // Added userId here
  userPersona?: {
    name: string;
    description: string;
  } | null;
  desiredMood?: string | null;
  weatherContext?: string | null;
  riskContext?: string | null;
  realFlightOptions?: import('@/ai/types/serpapi-flight-search-types').SerpApiFlightOption[];
  realHotelOptions?: import('@/ai/types/serpapi-hotel-search-types').SerpApiHotelSuggestion[];
};

// New type for combined trip package suggestions
export interface TripPackageSuggestion {
  id: string;
  flight: SerpApiFlightOption;
  hotel: SerpApiHotelSuggestion;
  totalEstimatedCost: number;
  durationDays: number;
  destinationQuery: string;
  travelDatesQuery: string;
  userInput: AITripPlannerInput;
  destinationImagePrompt?: string;
  destinationImageUri?: string;
  userId: string;
  createdAt?: any; 
}

// Conceptual daily plan item for the dialog (simpler than full DailyPlanItem)
export interface ConceptualDailyPlanItem {
  day: string;
  activities: string;
}
