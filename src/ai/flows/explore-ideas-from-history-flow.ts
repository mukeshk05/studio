
'use server';
/**
 * @fileOverview An AI flow that generates personalized travel ideas ("Ideas for You")
 * for the Explore page based on the user's search history.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import {
  ExploreIdeasFromHistoryInputSchema,
  type ExploreIdeasFromHistoryInput,
  ExploreIdeasOutputSchema,
  type ExploreIdeasOutput,
  ExploreIdeaSuggestionSchema,
} from '@/ai/types/explore-ideas-types';
import { getRecentUserSearchHistory } from '@/lib/firestoreServer'; 

// Helper to generate an image for a single suggestion
async function generateSuggestionImage(promptText: string | undefined, fallbackHint: string): Promise<string | null> {
  if (!promptText) {
    console.warn(`[ExploreIdeasFlow] No image prompt for fallback: ${fallbackHint}`);
    return `https://placehold.co/600x400.png?text=${encodeURIComponent(fallbackHint.substring(0,20))}`;
  }
  try {
    console.log(`[ExploreIdeasFlow] Generating image for prompt: "${promptText}" (fallback: ${fallbackHint})`);
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp',
      prompt: `Generate an inspiring travel image representing: ${promptText}. Style: vibrant, appealing, wanderlust. Aspect ratio 16:9.`,
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
      console.log(`[ExploreIdeasFlow] Image generated successfully for prompt "${promptText}". URI starts: ${media.url.substring(0,50)}...`);
      return media.url;
    }
    console.warn(`[ExploreIdeasFlow] Image generation for prompt "${promptText}" did NOT return a media URL. Using placeholder.`);
    return `https://placehold.co/600x400.png?text=${encodeURIComponent(fallbackHint.substring(0,20))}`;
  } catch (error: any) {
    console.error(`[ExploreIdeasFlow] FAILED to generate image for prompt "${promptText}":`, error.message, error.stack);
    return `https://placehold.co/600x400.png?text=${encodeURIComponent(fallbackHint.substring(0,20))}`;
  }
}

// Define a schema for the text-only output from the LLM before image generation
const ExploreIdeaSuggestionTextOnlySchema = ExploreIdeaSuggestionSchema.omit({ imageUri: true, id: true });
const ExploreIdeasTextOutputSchema = z.object({
  suggestions: z.array(ExploreIdeaSuggestionTextOnlySchema),
  contextualNote: z.string().optional(),
});


const exploreIdeasPrompt = ai.definePrompt({
  name: 'exploreIdeasFromHistoryPrompt',
  input: z.object({
    searchHistoryText: z.string().describe("A summary of the user's recent search history, e.g., 'Searched for: Rome (next month, $1500), Paris (weekend, $800)'."),
  }),
  output: { schema: ExploreIdeasTextOutputSchema },
  prompt: `You are Aura, BudgetRoam's insightful "Travel Trajectory AI".
A user has the following recent search history:
{{{searchHistoryText}}}

Based on this history, generate 1 or 2 *new and distinct* travel ideas that might appeal to them. These ideas should build upon or offer interesting alternatives related to their past searches, not just repeat them.
For each idea, provide:
1.  'title': A catchy and descriptive title for the idea (e.g., "Tuscan Countryside Escape after Rome" or "Art Lover's Weekend in Amsterdam").
2.  'destination': The specific primary destination for this new idea (e.g., "Tuscany, Italy", "Amsterdam, Netherlands").
3.  'country': The country of the destination.
4.  'description': A captivating 2-3 sentence explanation of why this is a good suggestion, subtly linking it to their search history if possible (e.g., "Since you were looking at Rome, a relaxing trip through the Tuscan countryside offers a wonderful contrast...").
5.  'hotelIdea': A conceptual hotel suggestion: { type: string (e.g., "Charming Agriturismo", "Canal-side Boutique Hotel"), priceRange: string (e.g., "$120-$200", "Under $150") }.
6.  'flightIdea': A conceptual flight suggestion: { description: string (e.g., "Direct flights to Florence, then scenic train", "Well-connected from major European hubs"), priceRange: string (e.g., "$400-$700 from USA", "$50-$150 from nearby cities") }.
7.  'imagePrompt': A concise text prompt (4-7 words) for an image generation AI to create an inspiring travel photo for this idea (e.g., "Tuscan vineyard sunset", "Amsterdam canals bicycles spring").
8.  'latitudeString': Approximate latitude of the destination as a STRING (e.g., "43.7696" for Florence).
9.  'longitudeString': Approximate longitude of the destination as a STRING (e.g., "11.2558" for Florence).
10. 'originalSearchHint': A brief note about which part of their history inspired this (e.g., "Inspired by your search for historical cities like Rome").

If the search history is empty or too vague to derive meaningful suggestions, you can suggest 1-2 generally appealing diverse ideas (e.g., one city, one nature) and set the 'contextualNote' to explain this.
If relevant suggestions are made, set the 'contextualNote' to something like "Personalized ideas based on your recent searches!".

Ensure the output strictly follows the ExploreIdeasTextOutputSchema.
`,
});

export const exploreIdeasFromHistoryFlow = ai.defineFlow(
  {
    name: 'exploreIdeasFromHistoryFlow',
    inputSchema: ExploreIdeasFromHistoryInputSchema,
    outputSchema: ExploreIdeasOutputSchema,
  },
  async ({ userId }): Promise<ExploreIdeasOutput> => {
    console.log(`[ExploreIdeasFlow] Starting flow for userId: ${userId}`);
    let searchHistoryEntries: any[] = []; // Initialize as empty array
    try {
      console.log(`[ExploreIdeasFlow] Attempting to call getRecentUserSearchHistory for userId: ${userId}`);
      searchHistoryEntries = await getRecentUserSearchHistory(userId, 3); 
      console.log(`[ExploreIdeasFlow] getRecentUserSearchHistory returned:`, searchHistoryEntries);
      
      if (!Array.isArray(searchHistoryEntries)) { 
          console.warn(`[ExploreIdeasFlow] getRecentUserSearchHistory did not return an array for user ${userId}. Received:`, searchHistoryEntries, `Treating as empty.`);
          searchHistoryEntries = [];
      }
      console.log(`[ExploreIdeasFlow] Successfully processed search history. Count: ${searchHistoryEntries.length}.`);

    } catch (error: any) {
      console.error(`[ExploreIdeasFlow] CRITICAL ERROR during/after getRecentUserSearchHistory for userId ${userId}.`);
      console.error(`[ExploreIdeasFlow] Error message: ${error.message}`);
      if (error.stack) console.error(`[ExploreIdeasFlow] Error stack: ${error.stack}`);
      console.error(`[ExploreIdeasFlow] Full error object:`, JSON.stringify(error, Object.getOwnPropertyNames(error))); // Log full error
      return { 
        suggestions: [], 
        contextualNote: "Error EIFH1: Could not process search history. Check server logs for details." 
      };
    }

    let searchHistoryText = "User has no recent search history or it could not be reliably processed.";
    if (searchHistoryEntries.length > 0) {
      searchHistoryText = "User's recent searches include: " +
        searchHistoryEntries.map(entry =>
          `${entry.destination || 'N/A Dest.'} (around ${entry.travelDates || 'N/A Dates'}, budget ~$${entry.budget || 'N/A'})`
        ).join('; ') + ".";
    }
    console.log(`[ExploreIdeasFlow] Search history text for AI prompt: ${searchHistoryText}`);

    let textOutput;
    try {
      console.log(`[ExploreIdeasFlow] Calling exploreIdeasPrompt...`);
      const { output } = await exploreIdeasPrompt({ searchHistoryText });
      textOutput = output;
      console.log(`[ExploreIdeasFlow] exploreIdeasPrompt output received:`, textOutput);
    } catch (promptError: any) {
      console.error(`[ExploreIdeasFlow] Error calling exploreIdeasPrompt:`, promptError.message, promptError.stack);
      return {
        suggestions: [],
        contextualNote: "Error EIFH2: AI failed to generate initial ideas. Please try again later.",
      };
    }
    
    if (!textOutput || !textOutput.suggestions || textOutput.suggestions.length === 0) {
      console.warn("[ExploreIdeasFlow] AI did not return valid text suggestions from exploreIdeasPrompt.");
      const note = textOutput?.contextualNote || (searchHistoryEntries.length === 0 
        ? "No personalized ideas found based on your history yet. Explore some trips first!"
        : "Couldn't come up with personalized ideas right now. How about exploring top destinations?");
      return { suggestions: [], contextualNote: note };
    }
    console.log(`[ExploreIdeasFlow] AI Prompt returned ${textOutput.suggestions.length} text suggestions.`);

    try {
      console.log(`[ExploreIdeasFlow] Starting batch image generation for ${textOutput.suggestions.length} suggestions.`);
      const suggestionsWithImages = await Promise.all(
        textOutput.suggestions.map(async (suggestionTextPart) => {
          const imageUri = await generateSuggestionImage(suggestionTextPart.imagePrompt, suggestionTextPart.destination);
          return {
            ...suggestionTextPart,
            id: crypto.randomUUID(),
            imageUri,
          };
        })
      );
      
      console.log(`[ExploreIdeasFlow] Generated ${suggestionsWithImages.length} suggestions with images.`);
      return {
        suggestions: suggestionsWithImages,
        contextualNote: textOutput.contextualNote || "Here are some ideas you might like!",
      };
    } catch (imageGenError: any) {
       console.error(`[ExploreIdeasFlow] Error during batch image generation:`, imageGenError.message, imageGenError.stack);
       const suggestionsWithoutImages = textOutput.suggestions.map(sugg => ({
           ...sugg,
           id: crypto.randomUUID(),
           imageUri: `https://placehold.co/600x400.png?text=${encodeURIComponent(sugg.destination.substring(0,20))}` 
       }));
       return {
         suggestions: suggestionsWithoutImages,
         contextualNote: textOutput.contextualNote ? `${textOutput.contextualNote} (Error EIFH3: Visuals currently unavailable)` : "Here are some ideas! (Error EIFH3: Visuals currently unavailable)",
       };
    }
  }
);

export async function getExploreIdeasFromHistory(input: ExploreIdeasFromHistoryInput): Promise<ExploreIdeasOutput> {
  return exploreIdeasFromHistoryFlow(input);
}
    

    