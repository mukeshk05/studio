'use server';

import { trackPrice as trackPriceOriginal } from '@/ai/flows/price-tracker';
import type { PriceTrackerInput, PriceTrackerOutput } from '@/ai/flows/price-tracker';

import { getPriceForecast as getPriceForecastOriginal } from '@/ai/flows/price-forecast-flow';
import type { PriceForecastInput, PriceForecastOutput } from '@/ai/flows/price-forecast-types';

import { getPriceAdvice as getPriceAdviceOriginal } from '@/ai/flows/price-advisor-flow';
import type { PriceAdvisorInput, PriceAdvisorOutput } from '@/ai/types/price-advisor-flow-types';


export async function trackPrice(input: PriceTrackerInput): Promise<PriceTrackerOutput> {
  try {
    return await trackPriceOriginal(input);
  } catch (error: any) {
    console.error(`[Action Error] trackPrice failed:`, error);
    return { shouldAlert: false, alertMessage: "Could not process price tracking request." };
  }
}

export async function getPriceForecast(input: PriceForecastInput): Promise<PriceForecastOutput> {
  try {
    return await getPriceForecastOriginal(input);
  } catch (error: any) {
    console.error(`[Action Error] getPriceForecast failed:`, error);
    return { forecast: "Could not generate a price forecast at this time.", confidence: "low" };
  }
}

export async function getPriceAdviceAction(input: PriceAdvisorInput): Promise<PriceAdvisorOutput> {
  try {
    return await getPriceAdviceOriginal(input); 
  } catch (error: any) {
    console.error(`[Action Error] getPriceAdviceAction failed:`, error);
    return { advice: "The AI price advisor is currently unavailable. Please check back later." };
  }
}
