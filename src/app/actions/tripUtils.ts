'use server';

import { getPackingList as getPackingListOriginal } from '@/ai/flows/packing-list-flow';
import type { PackingListInput, PackingListOutput } from '@/ai/flows/packing-list-flow';

import { generateTripMemory as generateTripMemoryOriginal } from '@/ai/flows/generate-trip-memory-flow';
import type { GenerateTripMemoryInput, GenerateTripMemoryOutput } from '@/ai/flows/generate-trip-memory-flow';

import { generateGroupSyncReport as generateGroupSyncReportOriginal } from '@/ai/flows/group-sync-flow';
import type { GroupSyncInput, GroupSyncOutput } from '@/ai/types/group-sync-types';

import { generateTripSummary as generateTripSummaryOriginal } from '@/ai/flows/trip-summary-flow';
import type { TripSummaryInput, TripSummaryOutput } from '@/ai/types/trip-summary-types';

import { getTravelTip as getTravelTipOriginal } from '@/ai/flows/travel-tip-flow';
import type { TravelTipInput, TravelTipOutput } from '@/ai/flows/travel-tip-flow';

export async function getPackingList(input: PackingListInput): Promise<PackingListOutput> {
  try {
    return await getPackingListOriginal(input);
  } catch (error: any) {
    console.error(`[Action Error] getPackingList failed:`, error);
    return { packingList: ["Failed to generate list. Please check your inputs."] };
  }
}

export async function generateTripMemory(input: GenerateTripMemoryInput): Promise<GenerateTripMemoryOutput> {
  try {
    return await generateTripMemoryOriginal(input);
  } catch (error: any) {
    console.error(`[Action Error] generateTripMemory failed:`, error);
    return { memoryText: "Could not generate a memory for this trip." };
  }
}

export async function generateGroupSyncReport(input: GroupSyncInput): Promise<GroupSyncOutput> {
  try {
    return await generateGroupSyncReportOriginal(input);
  } catch (error: any) {
    console.error(`[Action Error] generateGroupSyncReport failed:`, error);
    return { compatibilityReport: "Failed to generate the group compatibility report due to an unexpected error." };
  }
}

export async function generateTripSummary(input: TripSummaryInput): Promise<TripSummaryOutput> {
  try {
    return await generateTripSummaryOriginal(input); 
  } catch (error: any) {
    console.error(`[Action Error] generateTripSummary failed:`, error);
    return { summary: "Could not generate an AI summary for this trip." };
  }
}

export async function getTravelTip(input?: TravelTipInput): Promise<TravelTipOutput> {
  try {
    return await getTravelTipOriginal(input || {});
  } catch (error: any) {
    console.error(`[Action Error] getTravelTip failed:`, error);
    return { tip: "Always pack a backup power bank for your phone!" };
  }
}
