import type { AITripPlannerOutput } from "@/ai/flows/ai-trip-planner";

export type Itinerary = AITripPlannerOutput["itineraries"][0] & { id: string };

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
