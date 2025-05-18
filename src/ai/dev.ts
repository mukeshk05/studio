
import { config } from 'dotenv';
config();

import '@/ai/flows/ai-trip-planner.ts';
import '@/ai/flows/price-tracker.ts';
import '@/ai/flows/price-advisor-flow.ts'; 
import '@/ai/flows/travel-tip-flow.ts'; 
import '@/ai/flows/packing-list-flow.ts'; 
import '@/ai/flows/destination-fact-flow.ts'; 
import '@/ai/flows/smart-bundle-flow.ts'; // Added new flow

