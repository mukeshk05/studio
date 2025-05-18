
import type { AITripPlannerOutput } from "@/ai/flows/ai-trip-planner";

// This effectively takes the type of a single itinerary object from the array
// It will now include destinationImageUri due to schema changes in the flow
type SingleItineraryFromAI = AITripPlannerOutput["itineraries"][0];

// Add the 'id' field that we add manually in ItineraryList
export type Itinerary = SingleItineraryFromAI & { id: string };


export interface PriceTrackerEntry {
  id: string;
  itemType: "flight" | "hotel";
  itemName: string;
  targetPrice: number;
  currentPrice: number; // Last known current price
  lastChecked: string; // ISO date string
  alertStatus?: {
    shouldAlert: boolean;
    alertMessage: string;
  };
}
