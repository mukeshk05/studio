'use server';

import { conceptualDateGridFlow } from '@/ai/flows/conceptual-date-grid-flow';
import type { ConceptualDateGridInput, ConceptualDateGridOutput } from '@/ai/types/ai-conceptual-date-grid-types';

import { conceptualPriceGraphFlow } from '@/ai/flows/conceptual-price-graph-flow';
import type { ConceptualPriceGraphInput, ConceptualPriceGraphOutput } from '@/ai/types/ai-conceptual-price-graph-types';

export async function getConceptualDateGridAction(input: ConceptualDateGridInput): Promise<ConceptualDateGridOutput> { 
  try {
    return await conceptualDateGridFlow(input); 
  } catch (error: any) {
    console.error(`[Action Error] getConceptualDateGridAction failed:`, error);
    return {
      gridSummary: "Could not fetch date grid insights due to an error.",
      datePricePoints: [],
    };
  }
}

export async function getConceptualPriceGraphAction(input: ConceptualPriceGraphInput): Promise<ConceptualPriceGraphOutput> { 
  try {
    return await conceptualPriceGraphFlow(input); 
  } catch (error: any) {
    console.error(`[Action Error] getConceptualPriceGraphAction failed:`, error);
    return {
      trendDescription: "Could not fetch price trend insights due to an error.",
      conceptualDataPoints: []
    };
  }
}
