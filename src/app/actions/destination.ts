'use server';

import { thingsToDoFlow } from '@/ai/flows/things-to-do-flow';
import type { ThingsToDoSearchInput, ThingsToDoOutput } from '@/ai/types/things-to-do-types';

import { getDestinationFact as getDestinationFactOriginal } from '@/ai/flows/destination-fact-flow';
import type { DestinationFactInput, DestinationFactOutput } from '@/ai/flows/destination-fact-flow';

import { getLocalInsiderTips as getLocalInsiderTipsOriginal } from '@/ai/flows/local-insider-tips-flow';
import type { LocalInsiderTipsInput, LocalInsiderTipsOutput } from '@/ai/types/local-insider-tips-types';

import { getSerendipitySuggestions as getSerendipitySuggestionsFlow } from '@/ai/flows/serendipity-engine-flow';
import type { SerendipityInput, SerendipityOutput } from '@/ai/types/serendipity-engine-types';

import { getAuthenticityVerification as getAuthenticityVerificationFlow } from '@/ai/flows/authenticity-verifier-flow';
import type { AuthenticityVerifierInput, AuthenticityVerifierOutput } from '@/ai/types/authenticity-verifier-types';

import { suggestHubAirportsFlow as suggestHubAirportsFlowOriginal } from '@/ai/flows/suggest-hub-airports-flow';
import type { SuggestHubAirportsInput, SuggestHubAirportsOutput } from '@/ai/types/suggest-hub-airports-types';

export async function getThingsToDoAction(input: ThingsToDoSearchInput): Promise<ThingsToDoOutput> {
  try {
    console.log('[Server Action - getThingsToDoAction] Input:', JSON.stringify(input, null, 2));
    console.log(`[AI Flow - ThingsToDo] Calling thingsToDoFlowOriginal directly (caching disabled).`);
    const result = await thingsToDoFlow(input);
    console.log(`[AI Flow - ThingsToDo] Result (first 500 chars):`, JSON.stringify(result,null,2).substring(0,500) + "...");
    return result;
  } catch (error: any) {
    console.error(`[Action Error] getThingsToDoAction failed:`, error);
    return {
      activities: [],
      searchSummary: "Sorry, an error occurred while searching for things to do. Please try again."
    };
  }
}

export async function getDestinationFact(input: DestinationFactInput): Promise<DestinationFactOutput> {
  try {
    return await getDestinationFactOriginal(input);
  } catch (error: any) {
    console.error(`[Action Error] getDestinationFact failed:`, error);
    return { fact: "Could not fetch a fun fact at this moment." };
  }
}

export async function getLocalInsiderTips(input: LocalInsiderTipsInput): Promise<LocalInsiderTipsOutput> {
  try {
    return await getLocalInsiderTipsOriginal(input);
  } catch (error: any) {
    console.error(`[Action Error] getLocalInsiderTips failed:`, error);
    return {
      trendingSpotsSummary: "Could not fetch trending spots.",
      hiddenGemPick: { name: "Error", description: "Could not fetch hidden gem.", reason: "Service unavailable." },
      dailyActivityPick: { name: "Error", description: "Could not fetch daily pick.", reason: "Service unavailable." },
      availabilityNotes: "Could not fetch availability notes."
    };
  }
}

export async function getSerendipitySuggestions(input: SerendipityInput): Promise<SerendipityOutput> {
  try {
    return await getSerendipitySuggestionsFlow(input);
  } catch (error: any) {
    console.error(`[Action Error] getSerendipitySuggestions failed:`, error);
    return { suggestions: [] };
  }
}

export async function getAuthenticityVerification(input: AuthenticityVerifierInput): Promise<AuthenticityVerifierOutput> {
  try {
    return await getAuthenticityVerificationFlow(input);
  } catch (error: any) {
    console.error(`[Action Error] getAuthenticityVerification failed:`, error);
    const fallbackImage = `https://placehold.co/600x400.png?text=Error`;
    return {
      verificationSummary: "Could not generate authenticity insights.",
      authenticityFactors: [],
      confidenceNote: "An error occurred while trying to verify.",
      generatedImagePrompt: "error",
      generatedImageUri: fallbackImage,
    };
  }
}

export async function suggestHubAirportsFlow(input: SuggestHubAirportsInput): Promise<SuggestHubAirportsOutput> {
    try {
        return await suggestHubAirportsFlowOriginal(input);
    } catch (error: any) {
        console.error(`[Action Error] suggestHubAirportsFlow failed:`, error);
        return { hubs: ["LHR", "CDG", "NRT", "DXB"] }; // Default fallback
    }
}
