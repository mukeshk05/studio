
'use server';
/**
 * @fileOverview An AI Smart Bundle Generator that suggests trip packages.
 *
 * - smartBundleFlow - A function that generates trip bundle suggestions.
 * - SmartBundleInput - The input type for the smartBundleFlow function.
 * - SmartBundleOutput - The return type for the smartBundleFlow function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { AITripPlannerInput } from '@/ai/types/trip-planner-types';
import { getRecentUserSearchHistory } from '@/lib/firestoreHooks'; // Adjust path as necessary
import { AITripPlannerInputSchema } from '@/ai/types/trip-planner-types';

// Input Schema
export const SmartBundleInputSchema = z.object({
  userId: z.string().describe("The ID of the user requesting the bundle."),
  upcomingAvailability: z.string().optional().describe("User-provided text about their upcoming availability (e.g., 'Long weekend next month', 'Free in July')."),
  travelInterests: z.string().optional().describe("User-provided text about their general travel interests (e.g., 'History and food', 'Adventure travel, beaches')."),
});
export type SmartBundleInput = z.infer<typeof SmartBundleInputSchema>;

// Output Schema
const BundleSuggestionSchema = z.object({
  bundleName: z.string().describe("A creative and descriptive name for the suggested trip bundle (e.g., 'Historical European Capitals Tour', 'Relaxing Beach Getaway for July')."),
  reasoning: z.string().describe("A brief explanation of why this bundle is suggested, based on the user's history, availability, and interests."),
  tripIdea: AITripPlannerInputSchema.describe("A concrete trip idea that can be directly used as input for the AI Trip Planner, including destination, travelDates, and budget."),
});

export const SmartBundleOutputSchema = z.object({
  suggestions: z.array(BundleSuggestionSchema).min(1).max(2).describe("An array of 1 to 2 suggested trip bundles."),
});
export type SmartBundleOutput = z.infer<typeof SmartBundleOutputSchema>;


// Define the Genkit tool for fetching user search history
const getUserSearchHistoryTool = ai.defineTool(
  {
    name: 'getUserSearchHistory',
    description: "Fetches the user's recent travel search history from the database to understand their past preferences. Provides a summary of up to 5 recent searches.",
    inputSchema: z.object({ userId: z.string().describe("The unique identifier of the user.") }),
    outputSchema: z.array(z.object({
        destination: z.string(),
        travelDates: z.string(),
        budget: z.number(),
    })).describe("An array of recent search entries, each containing destination, travelDates, and budget."),
  },
  async ({ userId }) => {
    try {
      const history = await getRecentUserSearchHistory(userId, 5); // Fetch last 5 entries
      return history.map(entry => ({
        destination: entry.destination,
        travelDates: entry.travelDates,
        budget: entry.budget,
      }));
    } catch (error) {
      console.error("Error fetching user search history for tool:", error);
      // Return an empty array or a specific error structure if preferred
      return [];
    }
  }
);


// Define the main prompt for the Smart Bundle Generator
const smartBundlePrompt = ai.definePrompt({
  name: 'smartBundlePrompt',
  input: {schema: SmartBundleInputSchema},
  output: {schema: SmartBundleOutputSchema},
  tools: [getUserSearchHistoryTool],
  prompt: `You are an AI Smart Travel Concierge for BudgetRoam. Your goal is to suggest 1 or 2 personalized trip bundles to the user.

To create these suggestions, you MUST:
1.  Call the 'getUserSearchHistory' tool to get the user's (ID: {{{userId}}}) recent travel searches. This provides context on their past interests, preferred destinations, budget ranges, and typical travel times.
2.  Consider the user's optional input for 'upcomingAvailability': {{{upcomingAvailability}}}. If provided, try to align suggestions with this. If not, suggest common travel periods (e.g., "next month", "upcoming season").
3.  Consider the user's optional input for 'travelInterests': {{{travelInterests}}}. If provided, tailor suggestions to these interests.
4.  Synthesize all this information to generate 1 or 2 distinct trip bundle suggestions.

For each suggestion, provide:
-   'bundleName': A catchy and descriptive name for the bundle.
-   'reasoning': A short explanation (1-2 sentences) of why this bundle is a good fit for the user, referencing their history, availability, or interests if possible.
-   'tripIdea': A complete object with 'destination', 'travelDates', and 'budget' (in USD). This 'tripIdea' should be directly usable as input for a detailed trip planner.
    -   'destination': Be specific (e.g., "Paris, France", "Kyoto, Japan").
    -   'travelDates': Suggest plausible dates based on availability or general appeal (e.g., "October 12-19, 2024", "Mid-July 2025 for 1 week").
    -   'budget': Suggest a realistic budget in USD for the trip idea. Try to infer a reasonable budget based on search history or typical costs for the suggested destination and duration.

Example Output for a single suggestion (ensure 'suggestions' is an array):
{
  "suggestions": [
    {
      "bundleName": "Weekend Escape to Rome",
      "reasoning": "Based on your interest in historical sites and past searches for European cities, a weekend trip to Rome focusing on ancient wonders could be exciting. This fits well if you have a short upcoming break.",
      "tripIdea": {
        "destination": "Rome, Italy",
        "travelDates": "Next available long weekend (e.g., Nov 8-10, 2024)",
        "budget": 1200
      }
    }
  ]
}

Prioritize variety if suggesting two bundles. Ensure the output strictly follows the defined JSON schema for 'SmartBundleOutputSchema'.
If search history is empty or not very informative, rely more on the provided availability and interests, or suggest popular/diverse options.
If no availability or interests are provided, use general travel knowledge and common preferences based on search history if available, or suggest broadly appealing trips.
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
        // Fallback or error handling if AI doesn't return valid suggestions
        console.warn("Smart Bundle AI did not return valid suggestions. Returning a default.");
        // You could return a default suggestion or throw an error
        // For now, returning an empty array if AI fails, or a placeholder.
        // Let's try a generic suggestion if AI fails.
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
