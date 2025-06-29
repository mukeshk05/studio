
'use server';

import { coTravelAgentFlow } from '@/ai/flows/co-travel-agent-flow';
import type { CoTravelAgentInput, CoTravelAgentOutput } from '@/ai/types/co-travel-agent-types';

import { itineraryAssistanceFlow } from '@/ai/flows/itinerary-assistance-flow';
import type { ItineraryAssistanceInput, ItineraryAssistanceOutput } from '@/ai/types/itinerary-assistance-types';

import { smartMapConceptFlow } from '@/ai/flows/smart-map-concept-flow';
import type { SmartMapConceptInput, SmartMapConceptOutput } from '@/ai/types/smart-map-concept-types';

import { whatIfSimulatorFlow } from '@/ai/flows/what-if-simulator-flow';
import type { WhatIfSimulatorInput, WhatIfSimulatorOutput } from '@/ai/types/what-if-simulator-types';

import { aiArPreviewFlow } from '@/ai/flows/ai-ar-preview-flow';
import type { AiArPreviewInput, AiArPreviewOutput } from '@/ai/types/ai-ar-preview-types';

import { moodEnergyOptimizerFlow } from '@/ai/flows/mood-energy-optimizer-flow';
import type { MoodEnergyOptimizerInput, MoodEnergyOptimizerOutput } from '@/ai/types/mood-energy-optimizer-types';

import { personalizedAccessibilityScoutFlow } from '@/ai/flows/personalized-accessibility-scout-flow';
import type { PersonalizedAccessibilityScoutInput, PersonalizedAccessibilityScoutOutput } from '@/ai/types/personalized-accessibility-scout-types';

import { localLegendNarratorFlow } from '@/ai/flows/local-legend-narrator-flow';
import type { LocalLegendNarratorInput, LocalLegendNarratorOutput } from '@/ai/types/local-legend-narrator-types';

import { synthesizePostTripFeedbackFlow } from '@/ai/flows/post-trip-synthesizer-flow';
import type { PostTripFeedbackInput, PostTripAnalysisOutput } from '@/ai/types/post-trip-synthesizer-types';

export async function getCoTravelAgentResponse(input: CoTravelAgentInput): Promise<CoTravelAgentOutput> { 
  try {
    return await coTravelAgentFlow(input); 
  } catch (error: any) {
    console.error(`[Action Error] getCoTravelAgentResponse failed:`, error);
    return {
      answer: "Sorry, the AI travel agent is currently unavailable. Please try again later.",
      relevantTips: []
    };
  }
}

export async function getItineraryAssistance(input: ItineraryAssistanceInput): Promise<ItineraryAssistanceOutput> {
  try {
    return await itineraryAssistanceFlow(input); 
  } catch (error: any) {
    console.error(`[Action Error] getItineraryAssistance failed:`, error);
    return {
      suggestedAdditions: [],
      assistanceSummary: "Sorry, the AI assistant could not provide suggestions at this time."
    };
  }
}

export async function generateSmartMapConcept(input: SmartMapConceptInput): Promise<SmartMapConceptOutput> {
  try {
    return await smartMapConceptFlow(input);
  } catch (error: any) {
    console.error(`[Action Error] generateSmartMapConcept failed:`, error);
    return {
      mapConceptDescription: "Could not generate a smart map concept due to an error.",
      suggestedLayers: [],
      examplePois: [],
      imagePrompt: "error map concept",
    };
  }
}

export async function getWhatIfAnalysis(input: WhatIfSimulatorInput): Promise<WhatIfSimulatorOutput> {
  try {
    return await whatIfSimulatorFlow(input);
  } catch (error: any) {
    console.error(`[Action Error] getWhatIfAnalysis failed:`, error);
    const fallbackImage = `https://placehold.co/600x400.png?text=Error`;
    return {
      comparisonSummary: "Could not generate a comparison due to an error.",
      destination1Analysis: { name: input.destination1, suitabilityForInterest: "N/A", generalVibe: "N/A", costExpectation: "N/A", keyHighlights: [], imageUri: fallbackImage, imagePrompt: "error" },
      destination2Analysis: { name: input.destination2, suitabilityForInterest: "N/A", generalVibe: "N/A", costExpectation: "N/A", keyHighlights: [], imageUri: fallbackImage, imagePrompt: "error" },
      aiRecommendation: "AI recommendation unavailable."
    };
  }
}

export async function getAiArPreview(input: AiArPreviewInput): Promise<AiArPreviewOutput> {
  try {
    return await aiArPreviewFlow(input);
  } catch (error: any) {
    console.error(`[Action Error] getAiArPreview failed:`, error);
    const fallbackImage = `https://placehold.co/600x400.png?text=Error`;
    return {
      sceneDescription: "Could not generate AR preview insights.",
      moodTags: [], activityTags: [],
      generatedImageUri: fallbackImage,
      generatedImagePrompt: "error"
    };
  }
}

export async function optimizeDayPlanByMood(input: MoodEnergyOptimizerInput): Promise<MoodEnergyOptimizerOutput> {
  try {
    return await moodEnergyOptimizerFlow(input);
  } catch (error: any) {
    console.error(`[Action Error] optimizeDayPlanByMood failed:`, error);
    return {
      optimizationSummary: "Could not generate optimizations due to an error.",
      suggestedAdjustments: []
    };
  }
}

export async function getPersonalizedAccessibilityScout(input: PersonalizedAccessibilityScoutInput): Promise<PersonalizedAccessibilityScoutOutput> {
  try {
    return await personalizedAccessibilityScoutFlow(input);
  } catch (error: any) {
    console.error(`[Action Error] getPersonalizedAccessibilityScout failed:`, error);
    const fallbackImage = `https://placehold.co/600x400.png?text=Error`;
    return {
      overallAssessment: "Could not generate an accessibility report due to an error.",
      disclaimer: `This AI-generated information is for preliminary guidance only and not a substitute for thorough personal research and consultation with official accessibility resources for ${input.destination}. Verify all details with providers and local authorities before traveling.`,
      imagePrompt: "error",
      imageUri: fallbackImage,
    };
  }
}

export async function narrateLocalLegend(input: LocalLegendNarratorInput): Promise<LocalLegendNarratorOutput> {
  try {
    return await localLegendNarratorFlow(input);
  } catch (error: any) {
    console.error(`[Action Error] narrateLocalLegend failed:`, error);
    const fallbackImage = `https://placehold.co/600x400.png?text=Error`;
    return {
      legendTitle: "The Lost Story",
      narrative: `Could not retrieve a legend due to an error.`,
      imageUri: fallbackImage,
      visualPrompt: "error story"
    };
  }
}

export async function synthesizePostTripFeedback(input: PostTripFeedbackInput): Promise<PostTripAnalysisOutput> {
  try {
    return await synthesizePostTripFeedbackFlow(input);
  } catch (error: any) {
    console.error(`[Action Error] synthesizePostTripFeedback failed:`, error);
    return {
      refinedPersonaInsights: "Could not synthesize feedback due to an error.",
      futureTrajectorySuggestions: []
    };
  }
}
