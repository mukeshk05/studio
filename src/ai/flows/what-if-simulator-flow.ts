
'use server';
/**
 * @fileOverview An AI flow that simulates comparing two destinations based on a travel interest.
 *
 * - getWhatIfAnalysis - Fetches an AI-generated comparison.
 */

import { ai } from '@/ai/genkit';
import {
  WhatIfSimulatorInputSchema,
  type WhatIfSimulatorInput,
  WhatIfSimulatorOutputSchema,
  type WhatIfSimulatorOutput,
  DestinationAnalysisSchema, // Ensuring this is available for prompt output
} from '@/ai/types/what-if-simulator-types';
import { z } from 'genkit'; // Import z for schema definitions within the prompt

// Schema for the text-only part of the AI's response, before image generation
const WhatIfTextOutputSchema = z.object({
  comparisonSummary: z.string().describe("A concise summary comparing the two destinations based on the travel interest."),
  destination1Analysis: DestinationAnalysisSchema.omit({ imageUri: true }).extend({
    imagePrompt: z.string().describe("A concise text prompt for generating an image for destination 1."),
  }),
  destination2Analysis: DestinationAnalysisSchema.omit({ imageUri: true }).extend({
    imagePrompt: z.string().describe("A concise text prompt for generating an image for destination 2."),
  }),
  aiRecommendation: z.string().optional().describe("An optional AI recommendation on which destination might be a better fit, or advice on choosing."),
});

const generateDestinationImage = async (promptText: string, fallbackDataAiHint: string): Promise<string> => {
  if (!promptText) return `https://placehold.co/600x400.png?text=${encodeURIComponent(fallbackDataAiHint.substring(0,20))}`;
  let imageUri = `https://placehold.co/600x400.png`;
  try {
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp',
      prompt: `Generate an appealing, photorealistic travel image representing: ${promptText}. Aspect ratio: 16:9. Focus on atmosphere and key visual elements.`,
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
      console.warn(`Destination image generation for prompt "${promptText}" did not return a media URL. Using placeholder.`);
      imageUri = `https://placehold.co/600x400.png?text=${encodeURIComponent(fallbackDataAiHint.substring(0,20))}`;
    }
  } catch (imageError) {
    console.error(`Failed to generate destination image for prompt "${promptText}":`, imageError);
    imageUri = `https://placehold.co/600x400.png?text=${encodeURIComponent(fallbackDataAiHint.substring(0,20))}`;
  }
  return imageUri;
};

const whatIfSimulatorTextPrompt = ai.definePrompt({
  name: 'whatIfSimulatorTextPrompt',
  input: { schema: WhatIfSimulatorInputSchema },
  output: { schema: WhatIfTextOutputSchema },
  prompt: `You are Aura, BudgetRoam's 'What If' Travel Simulator.
Your task is to compare two destinations based on a user's stated travel interest.

Inputs:
- Destination 1: {{{destination1}}}
- Destination 2: {{{destination2}}}
- Travel Interest: {{{travelInterest}}}

For each destination, provide:
- 'name': The destination name.
- 'suitabilityForInterest': How well this destination suits the specified 'travelInterest' (1-2 sentences).
- 'generalVibe': The overall atmosphere or feel of the destination (1-2 sentences).
- 'costExpectation': A general cost expectation (e.g., "Budget-Friendly", "Mid-Range", "Moderately Expensive", "Luxury").
- 'keyHighlights': An array of 2-4 key highlights or attractions relevant to the 'travelInterest'.
- 'imagePrompt': A concise text prompt (4-7 words) for an image generation AI to create a visually appealing representation of this destination, reflecting the 'travelInterest' (e.g., "Bali serene beach yoga sunset", "Rome ancient ruins culture").

Then, provide:
- 'comparisonSummary': A brief (2-3 sentences) overall summary comparing the two destinations for the given 'travelInterest'.
- 'aiRecommendation' (optional): If one destination seems a clearly better fit based on the interest, provide a brief recommendation. Otherwise, omit or offer advice on how to choose.

Example for Destination 1: "Paris, France", Destination 2: "Rome, Italy", Travel Interest: "Romantic Getaway & History"
Destination 1 Analysis (Paris):
{
  "name": "Paris, France",
  "suitabilityForInterest": "Paris is exceptionally suited for a romantic getaway, with iconic landmarks, charming streets, and world-class museums for history lovers.",
  "generalVibe": "Elegant, artistic, and deeply romantic, with a bustling city feel combined with historic charm.",
  "costExpectation": "Moderately Expensive to Luxury",
  "keyHighlights": ["Eiffel Tower views", "Louvre Museum art", "Seine River cruises", "Montmartre charm"],
  "imagePrompt": "Paris Eiffel Tower romantic evening"
}
(Similar analysis for Destination 2 - Rome)

Comparison Summary: "Both Paris and Rome offer incredible romantic and historical experiences. Paris excels in iconic romance and art, while Rome boasts unparalleled ancient history and passionate atmosphere. Your choice depends on which historical era and romantic style appeals more."
AI Recommendation: "For classic iconic romance and art museums, Paris is slightly favored. For ancient history and vibrant street life, Rome is a strong contender."

Ensure your output strictly follows the WhatIfTextOutputSchema.
`,
});

export const whatIfSimulatorFlow = ai.defineFlow(
  {
    name: 'whatIfSimulatorFlow',
    inputSchema: WhatIfSimulatorInputSchema,
    outputSchema: WhatIfSimulatorOutputSchema,
  },
  async (input: WhatIfSimulatorInput): Promise<WhatIfSimulatorOutput> => {
    const { output: textOutput } = await whatIfSimulatorTextPrompt(input);

    if (!textOutput || !textOutput.destination1Analysis || !textOutput.destination2Analysis) {
      console.warn("AI 'What If' Simulator text prompt did not return complete output. Returning a default.");
      const fallbackImage = await generateDestinationImage(`general travel image ${input.destination1.substring(0,10)}`, input.destination1);
      return {
        comparisonSummary: `Could not generate a detailed comparison for ${input.destination1} and ${input.destination2} regarding "${input.travelInterest}". Please try different inputs.`,
        destination1Analysis: {
          name: input.destination1,
          suitabilityForInterest: "General information unavailable.",
          generalVibe: "Vibe unknown.",
          costExpectation: "N/A",
          keyHighlights: ["Explore local attractions."],
          imageUri: fallbackImage,
          imagePrompt: `general travel image ${input.destination1.substring(0,10)}`
        },
        destination2Analysis: {
          name: input.destination2,
          suitabilityForInterest: "General information unavailable.",
          generalVibe: "Vibe unknown.",
          costExpectation: "N/A",
          keyHighlights: ["Discover local culture."],
          imageUri: fallbackImage, // Re-use or generate another, for simplicity re-using here
          imagePrompt: `general travel image ${input.destination2.substring(0,10)}`
        },
        aiRecommendation: "General travel advice: research both destinations based on your specific preferences.",
      };
    }

    const [image1Uri, image2Uri] = await Promise.all([
      generateDestinationImage(textOutput.destination1Analysis.imagePrompt, textOutput.destination1Analysis.name),
      generateDestinationImage(textOutput.destination2Analysis.imagePrompt, textOutput.destination2Analysis.name)
    ]);
    
    return {
      comparisonSummary: textOutput.comparisonSummary,
      destination1Analysis: {
        ...textOutput.destination1Analysis,
        imageUri: image1Uri,
      },
      destination2Analysis: {
        ...textOutput.destination2Analysis,
        imageUri: image2Uri,
      },
      aiRecommendation: textOutput.aiRecommendation,
    };
  }
);

export async function getWhatIfAnalysis(input: WhatIfSimulatorInput): Promise<WhatIfSimulatorOutput> {
  return whatIfSimulatorFlow(input);
}
