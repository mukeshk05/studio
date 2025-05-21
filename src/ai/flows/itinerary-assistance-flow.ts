
'use server';
/**
 * @fileOverview An AI flow that provides itinerary assistance by suggesting relevant additions.
 *
 * - getItineraryAssistance - Fetches AI-powered suggestions to enhance a trip plan.
 */

import { ai } from '@/ai/genkit';
import { getUserTravelPersona } from '@/lib/firestoreHooks'; // Assuming this can be used server-side
import type { UserTravelPersona } from '@/lib/types';
import {
  ItineraryAssistanceInputSchema,
  type ItineraryAssistanceInput,
  ItineraryAssistanceOutputSchema,
  type ItineraryAssistanceOutput,
  SuggestedAdditionSchema,
} from '@/ai/types/itinerary-assistance-types';
import { z } from 'zod';


const getUserTravelPersonaTool = ai.defineTool(
  {
    name: 'getUserTravelPersonaForAssistance',
    description: "Fetches the user's established Travel Persona (Travel DNA) from their profile, if available. This persona includes their preferred travel style name and description, which is a strong indicator of their general preferences for enriching an itinerary.",
    inputSchema: z.object({ userId: z.string().describe("The unique identifier of the user.") }),
    outputSchema: z.object({
        name: z.string(),
        description: z.string(),
    }).optional().describe("The user's travel persona including name and description, or undefined if not set."),
  },
  async ({ userId }): Promise<UserTravelPersona | undefined | null> => {
    try {
      const persona = await getUserTravelPersona(userId);
      return persona ? { name: persona.name, description: persona.description } : undefined;
    } catch (error) {
      console.error("Error fetching user travel persona for tool:", error);
      return undefined;
    }
  }
);


const itineraryAssistancePrompt = ai.definePrompt({
  name: 'itineraryAssistancePrompt',
  input: { schema: ItineraryAssistanceInputSchema },
  output: { schema: ItineraryAssistanceOutputSchema },
  tools: [getUserTravelPersonaTool],
  prompt: `You are Aura, BudgetRoam's expert AI Travel Assistant, specializing in enriching existing travel plans with personalized suggestions.

Given the following trip context:
- Destination: {{{destination}}}
- Travel Dates: {{{travelDates}}}
{{#if budget}}- Budget Context: Around \${{{budget}}} USD {{else}}- Budget Context: Not specified{{/if}}
{{#if existingActivities}}- Existing Plans/Interests: {{{existingActivities}}}{{else}}- Existing Plans/Interests: Open for suggestions.{{/if}}
{{#if hotelStyle}}- Accommodation Style: {{{hotelStyle}}}{{/if}}

{{#if userId}}
Before making suggestions, you MUST call the 'getUserTravelPersonaForAssistance' tool to fetch the user's (ID: {{{userId}}}) Travel Persona.
If a persona ({{{userPersonaName}}}, {{{userPersonaDescription}}}) is found, HEAVILY tailor your suggestions to match their travel style, preferences, and typical interests indicated by the persona.
{{else if userPersonaName}}
The user's pre-defined travel persona is:
- Name: {{{userPersonaName}}}
- Description: {{{userPersonaDescription}}}
HEAVILY tailor your suggestions to match this persona.
{{else}}
No specific user persona provided. Focus on generally appealing and high-quality suggestions suitable for {{{destination}}}.
{{/if}}

Your Task:
Suggest 2 to 4 highly relevant and engaging additions to enhance this itinerary. These additions can be activities, tours, unique local experiences, restaurant recommendations, or hidden gems.

For each suggestion, you MUST provide:
- 'type': The category of the suggestion (e.g., "activity", "restaurant", "tour", "experience", "hidden_gem").
- 'name': A clear and concise name for the suggestion.
- 'description': A brief (1-2 sentences), enticing description.
- 'estimatedCost': (Optional) An estimated cost in USD (e.g., for tickets, average meal). Omit if free or highly variable.
- 'relevanceReasoning': A short explanation (1-2 sentences) of *why* this specific suggestion is a good fit for THIS trip, considering the destination, existing plans/interests, and especially the user's persona (if available).
- 'imagePrompt': (Optional) A very brief (3-5 words) text prompt suitable for generating a representative image for this suggestion (e.g., "Eiffel Tower night view", "cozy Parisian cafe", "street art tour").

Rules:
- Avoid suggesting things that are likely already covered by generic trip plans (e.g., if "Eiffel Tower" is in existing activities, don't suggest it again unless it's a unique perspective like "Eiffel Tower summit at sunset").
- Offer a variety of suggestion types if possible.
- Ensure the 'relevanceReasoning' clearly links the suggestion to the provided trip context and persona.
- If the user explicitly states an interest (e.g., "art museums"), try to include a related suggestion.

Optionally, provide an 'assistanceSummary': A brief (1 sentence) overall helpful tip or insight related to your suggestions or the destination.

Example of one suggestion (ensure 'suggestedAdditions' is an array):
{
  "type": "activity",
  "name": "Guided Street Art Tour in Le Marais",
  "description": "Explore the vibrant and ever-changing street art scene in the historic Le Marais district with a knowledgeable local guide.",
  "estimatedCost": 30,
  "relevanceReasoning": "Adds a unique cultural layer to your Paris trip, aligning with an 'Urban Explorer' persona and offering a contrast to classic museum visits.",
  "imagePrompt": "Parisian street art colorful"
}

Ensure the output strictly follows the ItineraryAssistanceOutputSchema.
`,
});

const generateSuggestionImage = async (promptText: string | undefined, fallbackDataAiHint: string): Promise<string> => {
  if (!promptText) return `https://placehold.co/600x400.png?text=${encodeURIComponent(fallbackDataAiHint.substring(0,20))}`;
  let imageUri = `https://placehold.co/600x400.png`;
  try {
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp',
      prompt: `Generate an appealing travel image representing: ${promptText}. Style: photorealistic, vibrant. Aspect ratio: 16:9.`,
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
      console.warn(`Image generation for prompt "${promptText}" did not return a media URL. Using placeholder.`);
      imageUri = `https://placehold.co/600x400.png?text=${encodeURIComponent(fallbackDataAiHint.substring(0,20))}`;
    }
  } catch (imageError) {
    console.error(`Failed to generate image for prompt "${promptText}":`, imageError);
    imageUri = `https://placehold.co/600x400.png?text=${encodeURIComponent(fallbackDataAiHint.substring(0,20))}`;
  }
  return imageUri;
};


export const itineraryAssistanceFlow = ai.defineFlow(
  {
    name: 'itineraryAssistanceFlow',
    inputSchema: ItineraryAssistanceInputSchema,
    outputSchema: ItineraryAssistanceOutputSchema,
  },
  async (input) => {
    // If userId is provided, the prompt will use the tool to fetch persona.
    // If userPersonaName is directly provided, it will use that.
    const { output } = await itineraryAssistancePrompt(input);

    if (!output || !output.suggestedAdditions || output.suggestedAdditions.length === 0) {
      console.warn("AI Itinerary Assistance did not return valid suggestions. Returning a default.");
      return {
        suggestedAdditions: [{
          type: "experience",
          name: "Local Market Visit",
          description: "Immerse yourself in the local culture by visiting a bustling market. It's a great way to see local produce, crafts, and interact with residents.",
          relevanceReasoning: "A market visit is a generally appealing activity for most travelers, offering authentic local flavor.",
          imagePrompt: "vibrant local market"
        }],
        assistanceSummary: "Exploring local markets can often lead to delightful and unexpected discoveries!"
      };
    }
    
    // Generate images for suggestions
    const suggestionsWithImages = await Promise.all(
      output.suggestedAdditions.map(async (suggestion) => {
        const fallbackHint = `${suggestion.type} ${suggestion.name.substring(0,15)}`;
        const imageUri = await generateSuggestionImage(suggestion.imagePrompt, fallbackHint);
        return { ...suggestion, imageUri };
      })
    );

    return {
        ...output,
        suggestedAdditions: suggestionsWithImages
    };
  }
);

export async function getItineraryAssistance(input: ItineraryAssistanceInput): Promise<ItineraryAssistanceOutput> {
  return itineraryAssistanceFlow(input);
}
