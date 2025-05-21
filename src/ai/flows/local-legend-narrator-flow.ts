
'use server';
/**
 * @fileOverview An AI flow that narrates local legends, folklore, or obscure historical anecdotes.
 *
 * - narrateLocalLegend - Fetches an AI-generated story for a given destination/context.
 */

import { ai } from '@/ai/genkit';
import {
  LocalLegendNarratorInputSchema,
  type LocalLegendNarratorInput,
  LocalLegendNarratorOutputSchema,
  type LocalLegendNarratorOutput,
} from '@/ai/types/local-legend-narrator-types';

const generateVisual = async (promptText: string | undefined, fallbackDataAiHint: string): Promise<string> => {
  if (!promptText) return `https://placehold.co/600x400.png?text=${encodeURIComponent(fallbackDataAiHint.substring(0,20))}`;
  let imageUri = `https://placehold.co/600x400.png`; // Default placeholder
  try {
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp', // Ensure this model is available and configured for image generation
      prompt: `Generate an atmospheric, illustrative image representing the theme: ${promptText}. Style: evocative, slightly mysterious, digital painting. Aspect ratio: 16:9.`,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
         safetySettings: [ // Moderate safety settings
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
      console.warn(`Visual generation for prompt "${promptText}" did not return a media URL. Using placeholder.`);
      imageUri = `https://placehold.co/600x400.png?text=${encodeURIComponent(fallbackDataAiHint.substring(0,20))}`;
    }
  } catch (imageError) {
    console.error(`Failed to generate visual for prompt "${promptText}":`, imageError);
    imageUri = `https://placehold.co/600x400.png?text=${encodeURIComponent(fallbackDataAiHint.substring(0,20))}`;
  }
  return imageUri;
};


const localLegendNarratorPrompt = ai.definePrompt({
  name: 'localLegendNarratorPrompt',
  input: { schema: LocalLegendNarratorInputSchema },
  output: { schema: LocalLegendNarratorOutputSchema.omit({ imageUri: true }) }, // AI won't generate the image URI directly
  prompt: `You are "Aura the Storyteller," an AI expert in unearthing and narrating obscure local legends, folklore, and fascinating, little-known historical anecdotes.
Your goal is to provide an engaging and atmospheric story related to the given destination and specific landmark/context (if provided).

Destination: {{{destination}}}
{{#if landmarkOrContext}}Specific Landmark/Area or Context: {{{landmarkOrContext}}}{{/if}}

Task:
1.  Craft a 'legendTitle' for the story. Make it intriguing.
2.  Write the 'narrative'. This should be the core story, 2-5 paragraphs long. Make it vivid and captivating. Focus on storytelling rather than dry facts. If it's folklore, embrace the mystical. If historical, find an unusual or human-interest angle.
3.  Optionally, list 1-2 'relatedLandmarks' if other specific places are directly tied to your narrative.
4.  Optionally, provide a very brief (1-2 sentences) 'historicalContext' if it's essential to understanding the story's setting or significance.
5.  Generate a 'visualPrompt' (3-7 words) that captures the essence of the story, suitable for an image generation AI (e.g., "haunted samurai battlefield moon", "ancient stone circle mysterious mist", "Victorian ghost child window").

Example for Destination: "Whitby, England", LandmarkOrContext: "Whitby Abbey ruins":
{
  "legendTitle": "The Spectral Hound of Whitby Abbey",
  "narrative": "Locals whisper that on moonless nights, when the North Sea wind howls through the skeletal arches of Whitby Abbey, a spectral hound can be seen roaming the ancient graveyard. Its eyes glow with an eerie green light, and its mournful howls are said to foretell storms or misfortune for the town's fishing fleet. Some say it's the ghost of a loyal dog that belonged to a monk betrayed within the abbey walls, forever searching for its master. Others believe it to be a Barghest, a mythical beast of Northern English folklore, drawn to the abbey's spiritual energy and brooding presence. The tale has been passed down for generations, a chilling reminder of the abbey's long and sometimes dark history, intertwined with the wildness of the Yorkshire coast.",
  "relatedLandmarks": ["St. Mary's Church graveyard", "Tate Hill Pier (for storm views)"],
  "historicalContext": "Whitby Abbey, a 7th-century Christian monastery later re-established as a Benedictine abbey, has Gothic ruins that famously inspired Bram Stoker's Dracula.",
  "visualPrompt": "gothic abbey ruins spectral hound"
}

Ensure the output strictly follows the defined JSON schema for LocalLegendNarratorOutputSchema (omitting imageUri).
Focus on lesser-known or uniquely interpreted stories rather than very famous ones, unless a unique angle is taken for the 'landmarkOrContext'.
`,
});

export const localLegendNarratorFlow = ai.defineFlow(
  {
    name: 'localLegendNarratorFlow',
    inputSchema: LocalLegendNarratorInputSchema,
    outputSchema: LocalLegendNarratorOutputSchema,
  },
  async (input) => {
    const { output: textOutput } = await localLegendNarratorPrompt(input);

    if (!textOutput || !textOutput.narrative) {
      console.warn("AI Local Legend Narrator did not return valid narrative. Returning a default.");
      const fallbackImage = await generateVisual("mysterious ancient ruins", "mystery ruins");
      return {
        legendTitle: "The Lost Story",
        narrative: `Could not retrieve a specific legend for "${input.landmarkOrContext ? `${input.landmarkOrContext} in ` : ''}${input.destination}" at this time. Every place has its secrets; perhaps you'll uncover one during your travels!`,
        visualPrompt: "mysterious ancient ruins",
        imageUri: fallbackImage,
      };
    }
    
    const fallbackDataAiHint = textOutput.legendTitle ? textOutput.legendTitle.substring(0, 20) : "legend story";
    const imageUri = await generateVisual(textOutput.visualPrompt, fallbackDataAiHint);

    return {
        ...textOutput,
        imageUri,
    };
  }
);

export async function narrateLocalLegend(input: LocalLegendNarratorInput): Promise<LocalLegendNarratorOutput> {
  return localLegendNarratorFlow(input);
}
