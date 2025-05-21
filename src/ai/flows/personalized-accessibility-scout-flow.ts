
'use server';
/**
 * @fileOverview An AI flow that scouts accessibility for a destination based on personalized needs.
 *
 * - getPersonalizedAccessibilityScout - Fetches an AI-generated accessibility assessment.
 */

import { ai } from '@/ai/genkit';
import {
  PersonalizedAccessibilityScoutInputSchema,
  type PersonalizedAccessibilityScoutInput,
  PersonalizedAccessibilityScoutOutputSchema,
  type PersonalizedAccessibilityScoutOutput,
} from '@/ai/types/personalized-accessibility-scout-types';

const generateAccessibilityImage = async (promptText: string | undefined, fallbackDataAiHint: string): Promise<string> => {
  if (!promptText) return `https://placehold.co/600x400.png?text=${encodeURIComponent(fallbackDataAiHint.substring(0,20))}`;
  let imageUri = `https://placehold.co/600x400.png`; // Default placeholder
  try {
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp',
      prompt: `Generate an inclusive and positive travel image representing: ${promptText}. Style: photorealistic, bright, welcoming. Aspect ratio: 16:9.`,
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
      console.warn(`Accessibility image generation for prompt "${promptText}" did not return a media URL. Using placeholder.`);
      imageUri = `https://placehold.co/600x400.png?text=${encodeURIComponent(fallbackDataAiHint.substring(0,20))}`;
    }
  } catch (imageError) {
    console.error(`Failed to generate accessibility image for prompt "${promptText}":`, imageError);
    imageUri = `https://placehold.co/600x400.png?text=${encodeURIComponent(fallbackDataAiHint.substring(0,20))}`;
  }
  return imageUri;
};

const personalizedAccessibilityScoutPrompt = ai.definePrompt({
  name: 'personalizedAccessibilityScoutPrompt',
  input: { schema: PersonalizedAccessibilityScoutInputSchema },
  output: { schema: PersonalizedAccessibilityScoutOutputSchema.omit({ imageUri: true }) },
  prompt: `You are Aura, BudgetRoam's empathetic AI Accessibility Scout.
Your task is to provide a preliminary accessibility assessment for a given destination based on a user's detailed accessibility needs.
This is NOT definitive advice but a helpful starting point for their research.

Destination: {{{destination}}}
User's Accessibility Needs: {{{accessibilityNeeds}}}

Based on general knowledge of {{{destination}}} and the common types of accessibility considerations (e.g., mobility, sensory, cognitive, dietary), generate the following:

1.  **overallAssessment (String):** A concise (2-3 sentences) summary. How well might {{{destination}}} generally align with the *types* of needs described? Is it known for good/poor accessibility in these areas?
2.  **positiveAspects (Array of Strings, optional):** 2-3 potential positive points. What aspects of {{{destination}}} *might* be beneficial or cater to some of the needs? (e.g., "Many museums in {{{destination}}} offer audio guides and tactile exhibits.", "The city center is largely flat and pedestrian-friendly.").
3.  **potentialChallenges (Array of Strings, optional):** 2-3 potential challenges. What common issues might someone with these needs face in {{{destination}}}? (e.g., "Older parts of {{{destination}}} have many cobblestone streets which can be difficult for wheelchairs.", "Public transport may have limited accessible stations.").
4.  **specificSuggestions (Array of Strings, optional):** 2-4 actionable suggestions for the user's research. (e.g., "Search for 'Accessible {{{destination}}}' on official tourism websites.", "Contact hotels directly to confirm specific room accessibility features before booking.", "Look for restaurants with clear allergen menus if dietary needs are mentioned.").
5.  **imagePrompt (String):** A 3-7 word prompt for an inclusive and positive image representing accessible travel in/to {{{destination}}} (e.g., "diverse group accessible travel {{{destination}}}", "wheelchair user scenic view {{{destination}}}", "sensory garden peaceful {{{destination}}}").
6.  **disclaimer (String):** ALWAYS include this exact disclaimer: "This AI-generated information is for preliminary guidance only and not a substitute for thorough personal research and consultation with official accessibility resources for {{{destination}}}. Verify all details with providers and local authorities before traveling."

Example for Destination: "Paris, France", Needs: "Wheelchair user, requires step-free access to attractions and public transport. Interested in art museums."
{
  "overallAssessment": "Paris offers a mix of accessibility. Major museums and newer areas are generally accessible, but older areas and some Metro stations can be challenging for wheelchair users. Diligent research is key.",
  "positiveAspects": ["Louvre and Musée d'Orsay have good wheelchair accessibility.", "Many modern buses are equipped with ramps.", "Some Seine river cruises offer accessible options."],
  "potentialChallenges": ["Many Metro stations lack elevators.", "Cobblestone streets in historic districts like Le Marais.", "Smaller cafes and shops may have steps or narrow entrances."],
  "specificSuggestions": ["Check the official Paris tourism website for their 'Accessibility' section.", "Use apps like 'AccessRATP' for real-time accessible transport info.", "Research specific accessibility features of hotels in arrondissements like the 7th or 15th known for flatter terrain."],
  "imagePrompt": "wheelchair user Louvre Paris sunny",
  "disclaimer": "This AI-generated information is for preliminary guidance only and not a substitute for thorough personal research and consultation with official accessibility resources for Paris, France. Verify all details with providers and local authorities before traveling."
}

Ensure your output strictly adheres to the defined JSON schema (omitting imageUri). Be empathetic, practical, and cautious in your advice.
`,
});

export const personalizedAccessibilityScoutFlow = ai.defineFlow(
  {
    name: 'personalizedAccessibilityScoutFlow',
    inputSchema: PersonalizedAccessibilityScoutInputSchema,
    outputSchema: PersonalizedAccessibilityScoutOutputSchema,
  },
  async (input) => {
    const { output: textOutput } = await personalizedAccessibilityScoutPrompt(input);

    if (!textOutput || !textOutput.overallAssessment) {
      console.warn("AI Accessibility Scout did not return a valid assessment. Returning a default.");
      const fallbackImage = await generateAccessibilityImage(`accessible travel ${input.destination.substring(0,20)}`, `inclusive travel ${input.destination.substring(0,10)}`);
      return {
        overallAssessment: `Could not retrieve a specific accessibility assessment for "${input.destination}" based on your needs at this time.`,
        potentialChallenges: ["Accessibility can vary greatly. It's essential to research specific venues and transport options."],
        specificSuggestions: [`Visit the official tourism website for "${input.destination}" to find their accessibility resources.`, "Contact accommodations and attractions directly to inquire about your specific needs."],
        imagePrompt: `inclusive travel ${input.destination.substring(0,20)}`,
        imageUri: fallbackImage,
        disclaimer: `This AI-generated information is for preliminary guidance only and not a substitute for thorough personal research and consultation with official accessibility resources for ${input.destination}. Verify all details with providers and local authorities before traveling.`,
      };
    }
    
    const fallbackDataAiHint = textOutput.imagePrompt ? textOutput.imagePrompt.substring(0, 20) : `accessible ${input.destination.substring(0,10)}`;
    const imageUri = await generateAccessibilityImage(textOutput.imagePrompt, fallbackDataAiHint);

    return {
        ...textOutput,
        imageUri,
    };
  }
);

export async function getPersonalizedAccessibilityScout(input: PersonalizedAccessibilityScoutInput): Promise<PersonalizedAccessibilityScoutOutput> {
  return personalizedAccessibilityScoutFlow(input);
}
