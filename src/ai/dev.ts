
import { config } from 'dotenv';
config();

import '@/ai/flows/ai-trip-planner.ts';
import '@/ai/flows/price-tracker.ts';
import '@/ai/flows/price-advisor-flow.ts'; 
import '@/ai/flows/travel-tip-flow.ts'; 
import '@/ai/flows/packing-list-flow.ts'; 
import '@/ai/flows/destination-fact-flow.ts'; 
import '@/ai/flows/smart-bundle-flow.ts';
import '@/ai/flows/adventure-matcher-flow.ts';
import '@/ai/flows/price-forecast-flow.ts';
import '@/ai/flows/group-sync-flow.ts';
import '@/ai/flows/generate-trip-memory-flow.ts';
import '@/ai/flows/local-insider-tips-flow.ts'; 
import '@/ai/flows/itinerary-assistance-flow.ts';
import '@/ai/flows/post-trip-synthesizer-flow.ts';
import '@/ai/flows/local-legend-narrator-flow.ts';
import '@/ai/flows/personalized-accessibility-scout-flow.ts';
import '@/ai/flows/mood-energy-optimizer-flow.ts';
import '@/ai/flows/co-travel-agent-flow.ts';
import '@/ai/flows/ai-ar-preview-flow.ts';
import '@/ai/flows/what-if-simulator-flow.ts';
import '@/ai/flows/smart-map-concept-flow.ts';
import '@/ai/flows/authenticity-verifier-flow.ts';
import '@/ai/flows/serendipity-engine-flow.ts';
import '@/ai/flows/popular-destinations-flow.ts';
import '@/ai/flows/generate-multiple-images-flow.ts';
import '@/ai/flows/explore-ideas-from-history-flow.ts'; 
import '@/ai/flows/ai-flight-map-deals-flow.ts';
// import '@/ai/flows/conceptual-flight-search-flow.ts'; // Removed as replaced by SerpApi in actions.ts
import '@/ai/flows/ai-hotel-search-flow.ts'; // This remains as it's a conceptual AI search, not directly replaced by a data API yet.
import '@/ai/flows/things-to-do-flow.ts';
import '@/ai/flows/conceptual-date-grid-flow.ts';
import '@/ai/flows/conceptual-price-graph-flow.ts';
import '@/ai/flows/trip-summary-flow.ts'; // Added new flow
import '@/ai/flows/generate-feature-image-flow.ts'; // Added new import
import '@/ai/flows/suggest-hub-airports-flow.ts';
import '@/ai/flows/price-check-scheduler-flow.ts';
