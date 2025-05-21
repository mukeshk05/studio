
'use server';
/**
 * @fileOverview An AI flow that suggests adjustments to a day's travel plan
 * based on the user's desired mood and energy level.
 *
 * - optimizeDayPlanByMood - Main function to get AI-driven suggestions.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit'; // Added missing Zod import
import {
  MoodEnergyOptimizerInputSchema,
  type MoodEnergyOptimizerInput,
  MoodEnergyOptimizerOutputSchema,
  type MoodEnergyOptimizerOutput,
  SuggestedAdjustmentSchema,
} from '@/ai/types/mood-energy-optimizer-types';

const generateAdjustmentImage = async (promptText: string | undefined, fallbackDataAiHint: string): Promise<string> => {
  if (!promptText) return `https://placehold.co/600x400.png?text=${encodeURIComponent(fallbackDataAiHint.substring(0,20))}`;
  let imageUri = `https://placehold.co/600x400.png`;
  try {
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp',
      prompt: `Generate an appealing travel image representing: ${promptText}. Style: vibrant, inviting. Aspect ratio: 16:9.`,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
        safetySettings: [
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ],
      },
      // @ts-ignore
      experimentalDoNotSelectOutputTool: true,
    });

    if (media?.url) {
      imageUri = media.url;
    } else {
      console.warn(`Image generation for mood optimizer prompt "${promptText}" did not return a media URL. Using placeholder.`);
      imageUri = `https://placehold.co/600x400.png?text=${encodeURIComponent(fallbackDataAiHint.substring(0,20))}`;
    }
  } catch (imageError) {
    console.error(`Failed to generate image for mood optimizer prompt "${promptText}":`, imageError);
    imageUri = `https://placehold.co/600x400.png?text=${encodeURIComponent(fallbackDataAiHint.substring(0,20))}`;
  }
  return imageUri;
};

const moodEnergyOptimizerPrompt = ai.definePrompt({
  name: 'moodEnergyOptimizerPrompt',
  input: { schema: MoodEnergyOptimizerInputSchema },
  output: { schema: MoodEnergyOptimizerOutputSchema.omit({ suggestedAdjustments: true }).extend({ // AI generates text part of adjustments
    suggestedAdjustments: z.array(SuggestedAdjustmentSchema.omit({ imageUri: true }))
  })},
  prompt: `You are Aura, BudgetRoam's expert "Dynamic Itinerary Reshaper & Wellness Concierge".
Your task is to analyze a user's current plan for a day and their desired energy level/mood, then suggest 1-3 insightful adjustments.

User's Current Day Plan:
{{{currentDayPlanDescription}}}

User's Desired Energy Level/Mood for the Day: {{{desiredEnergyLevel}}}
(Interpret 'low' as relaxing/calm, 'medium' as balanced exploration, 'high' as action-packed/energetic.)

{{#if userPersonaName}}
Consider the user's Travel Persona:
- Name: {{{userPersonaName}}}
{{#if userPersonaDescription}}- Description: {{{userPersonaDescription}}}{{/if}}
Align suggestions with this persona while respecting the desired energy level.
{{/if}}

Generate:
1.  'optimizationSummary': A brief (1-2 sentences) narrative. How are you approaching the optimization based on the energy level?
2.  'suggestedAdjustments': An array of 1 to 3 distinct adjustments. For each adjustment:
    *   'adjustmentType': (e.g., "Modify Activity", "Replace Activity", "Add Break", "New Suggestion", "Pacing Tip").
    *   'originalActivityContext' (optional): If modifying/replacing, briefly mention which part of the original plan it refers to.
    *   'suggestionDetails': Your specific recommendation (e.g., "Swap the strenuous hike for a gentle nature walk in the park.").
    *   'reasoning': Why this fits the desired energy/mood and persona (if available).
    *   'energyImpact': A brief tag (e.g., "Lowers Energy Demand", "Adds Calm", "Maintains Pace", "Boosts Excitement").
    *   'visualPrompt': A concise (3-7 words) text prompt for an image illustrating this specific adjustment (e.g., "peaceful park bench walk", "vibrant street food stall", "relaxing museum cafe").

Example for original plan "Morning: Hike a volcano. Afternoon: Intense city bike tour." and desiredEnergyLevel "low":
{
  "optimizationSummary": "To align with a 'low' energy day, I'm suggesting replacing high-intensity activities with more relaxed, yet engaging alternatives.",
  "suggestedAdjustments": [
    {
      "adjustmentType": "Replace Activity",
      "originalActivityContext": "Morning volcano hike",
      "suggestionDetails": "Consider a visit to the serene botanical gardens instead of the volcano hike.",
      "reasoning": "Offers beautiful scenery and gentle paths, perfect for a calm morning stroll, aligning with a 'low' energy preference.",
      "energyImpact": "Lowers Energy Demand",
      "visualPrompt": "serene botanical garden path"
    },
    {
      "adjustmentType": "Modify Activity",
      "originalActivityContext": "Afternoon intense city bike tour",
      "suggestionDetails": "Opt for a leisurely e-bike tour focusing on scenic riverside paths, or a short, guided walking tour of a historic district.",
      "reasoning": "Less physically demanding than an intense bike tour, allowing enjoyment without overexertion.",
      "energyImpact": "Reduces Intensity",
      "visualPrompt": "e-bike scenic river tour"
    }
  ]
}

Ensure the output strictly follows the defined JSON schema for adjustments (omitting imageUri initially).
Focus on actionable and appealing suggestions.
`,
});

export const moodEnergyOptimizerFlow = ai.defineFlow(
  {
    name: 'moodEnergyOptimizerFlow',
    inputSchema: MoodEnergyOptimizerInputSchema,
    outputSchema: MoodEnergyOptimizerOutputSchema,
  },
  async (input): Promise<MoodEnergyOptimizerOutput> => {
    const { output: textOutput } = await moodEnergyOptimizerPrompt(input);

    if (!textOutput || !textOutput.suggestedAdjustments || textOutput.suggestedAdjustments.length === 0) {
      console.warn("AI Mood & Energy Optimizer did not return valid suggestions. Returning a default.");
      const fallbackImage = await generateAdjustmentImage("relaxing travel scene general", "relax travel");
      return {
        optimizationSummary: "Could not generate specific optimizations at this time. Consider taking a gentle walk or visiting a local cafe for a relaxing experience.",
        suggestedAdjustments: [{
          adjustmentType: "General Suggestion",
          suggestionDetails: "Explore a local park or enjoy a quiet coffee at a charming cafe.",
          reasoning: "This is a generally calming activity suitable for most energy levels.",
          energyImpact: "Lowers Energy Demand",
          visualPrompt: "relaxing park cafe",
          imageUri: fallbackImage,
        }]
      };
    }

    const adjustmentsWithImages = await Promise.all(
      textOutput.suggestedAdjustments.map(async (adjustment) => {
        const fallbackHint = adjustment.suggestionDetails.substring(0, 15);
        const imageUri = await generateAdjustmentImage(adjustment.visualPrompt, fallbackHint);
        return { ...adjustment, imageUri };
      })
    );

    return {
        optimizationSummary: textOutput.optimizationSummary,
        suggestedAdjustments: adjustmentsWithImages,
    };
  }
);

export async function optimizeDayPlanByMood(input: MoodEnergyOptimizerInput): Promise<MoodEnergyOptimizerOutput> {
  return moodEnergyOptimizerFlow(input);
}
