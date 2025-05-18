
'use server';
/**
 * @fileOverview An AI Smart Bundle Generator that suggests trip packages.
 *
 * - smartBundleFlow - A function that generates trip bundle suggestions.
 * - generateSmartBundles - Wrapper function to call the smartBundleFlow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getRecentUserSearchHistory, getUserTravelPersona } from '@/lib/firestoreHooks';
import {
  SmartBundleInputSchema,
  type SmartBundleInput,
  SmartBundleOutputSchema,
  type SmartBundleOutput
} from '@/ai/types/smart-bundle-types';
import type { UserTravelPersona } from '@/lib/types';


// Define the Genkit tool for fetching user search history
const getUserSearchHistoryTool = ai.defineTool(
  {
    name: 'getUserSearchHistory',
    description: "Fetches the user's recent travel search history (up to 5 entries) from the database to understand their past preferences.",
    inputSchema: z.object({ userId: z.string().describe("The unique identifier of the user.") }),
    outputSchema: z.array(z.object({
        destination: z.string(),
        travelDates: z.string(),
        budget: z.number(),
    })).optional().describe("An array of recent search entries, or undefined if none found."),
  },
  async ({ userId }) => {
    try {
      const history = await getRecentUserSearchHistory(userId, 5);
      if (history.length === 0) return undefined;
      return history.map(entry => ({
        destination: entry.destination,
        travelDates: entry.travelDates,
        budget: entry.budget,
      }));
    } catch (error) {
      console.error("Error fetching user search history for tool:", error);
      return undefined;
    }
  }
);

// Define the Genkit tool for fetching user's travel persona
const getUserTravelPersonaTool = ai.defineTool(
  {
    name: 'getUserTravelPersona',
    description: "Fetches the user's established Travel Persona (Travel DNA) from their profile, if available. This persona includes their preferred travel style name and description.",
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


// Define the main prompt for the Smart Bundle Generator
const smartBundlePrompt = ai.definePrompt({
  name: 'smartBundlePrompt',
  input: {schema: SmartBundleInputSchema},
  output: {schema: SmartBundleOutputSchema},
  tools: [getUserSearchHistoryTool, getUserTravelPersonaTool],
  prompt: `You are an AI Smart Travel Concierge for BudgetRoam. Your goal is to suggest 1 or 2 highly personalized trip bundles to the user (ID: {{{userId}}}).

To create these suggestions, you MUST perform the following steps in order:
1.  Call the 'getUserTravelPersona' tool. If a Travel Persona (Travel DNA) is found, this is a STRONG indicator of their preferences. Use it as primary inspiration.
2.  Call the 'getUserSearchHistory' tool to get the user's recent travel searches. This provides context on their past interests, preferred destinations, budget ranges, and typical travel times.
3.  Consider the user's optional current input for 'upcomingAvailability': {{{upcomingAvailability}}}. If provided, try to align suggestions with this.
4.  Consider the user's optional current input for 'travelInterests': {{{travelInterests}}}. If provided, tailor suggestions to these interests.
5.  Synthesize ALL available information (Persona > Search History > Current Inputs) to generate 1 or 2 distinct trip bundle suggestions.

For each suggestion, provide:
-   'bundleName': A catchy and descriptive name for the bundle (e.g., "The Cultural Connoisseur's Parisian Jaunt", "Serene Mountain Retreat for July").
-   'reasoning': A short explanation (1-2 sentences) of why this bundle is a good fit for the user, EXPLICITLY referencing which information source(s) inspired it (e.g., "Based on your 'Cultural Explorer' persona and recent searches for European cities...", or "Aligning with your interest in 'hiking' and upcoming 'long weekend'...").
-   'tripIdea': A complete object with 'destination', 'travelDates', and 'budget' (in USD). This 'tripIdea' should be directly usable as input for a detailed trip planner.
    -   'destination': Be specific (e.g., "Paris, France", "Kyoto, Japan").
    -   'travelDates': Suggest plausible dates based on availability or general appeal (e.g., "October 12-19, 2024", "Mid-July 2025 for 1 week"). If availability is given, use it.
    -   'budget': Suggest a realistic budget in USD. Infer from persona style, search history, or typical costs.

Example Output for a single suggestion (ensure 'suggestions' is an array):
{
  "suggestions": [
    {
      "bundleName": "Weekend Escape to Rome",
      "reasoning": "Inspired by your 'History Buff' persona and past searches for European capitals, a weekend trip to Rome focusing on ancient wonders could be exciting. This fits well with your stated 'next long weekend' availability.",
      "tripIdea": {
        "destination": "Rome, Italy",
        "travelDates": "Next available long weekend (e.g., Nov 8-10, 2024)",
        "budget": 1200
      }
    }
  ]
}

Prioritize variety if suggesting two bundles. Ensure the output strictly follows the defined JSON schema for 'SmartBundleOutputSchema'.
If the Travel Persona is very specific, one highly relevant suggestion might be better than two less relevant ones.
If no persona or search history is available, rely on the provided availability and interests, or suggest popular/diverse options.
If no inputs at all are available, suggest 1-2 broadly appealing, distinct trips (e.g., one city, one nature).
`,
});

// Define the Smart Bundle Flow
export const smartBundleFlow = ai.defineFlow(
  {
    name: 'smartBundleFlow',
    inputSchema: SmartBundleInputSchema,
    outputSchema: SmartBundleOutputSchema,
  },
  async (input) => {
    const { output } = await smartBundlePrompt(input);
    if (!output || !output.suggestions || output.suggestions.length === 0) {
        console.warn("Smart Bundle AI did not return valid suggestions. Returning a default.");
        return {
            suggestions: [{
                bundleName: "Explore a New City",
                reasoning: "Could not generate personalized suggestions at this time. How about exploring a vibrant city like Barcelona or Amsterdam?",
                tripIdea: {
                    destination: "Barcelona, Spain",
                    travelDates: "Next month for 5 days",
                    budget: 1500,
                }
            }]
        };
    }
    return output;
  }
);

export async function generateSmartBundles(input: SmartBundleInput): Promise<SmartBundleOutput> {
  return smartBundleFlow(input);
}
