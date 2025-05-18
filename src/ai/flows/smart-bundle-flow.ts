
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
    description: "Fetches the user's recent travel search history (up to 5 entries) from the database to understand their past preferences. Useful for seeing what destinations, date ideas, or budgets they've considered.",
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
    description: "Fetches the user's established Travel Persona (Travel DNA) from their profile, if available. This persona includes their preferred travel style name and description, which is a strong indicator of their general preferences.",
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
  prompt: `You are Aura AI, your passive travel intent listener and smart travel concierge for BudgetRoam. Your goal is to suggest 1 or 2 highly personalized trip bundles to the user (ID: {{{userId}}}).

To create these suggestions, you MUST perform the following steps in order, using the available tools and user inputs:
1.  **User's Travel Persona (Context):** First, call the 'getUserTravelPersona' tool. If a Travel Persona (Travel DNA) is found, this is a VERY STRONG indicator of their general preferences (e.g., 'Luxury Explorer', 'Budget Backpacker'). This should heavily influence your suggestions, especially if other inputs are vague.
2.  **User's Search History (Context):** Next, call the 'getUserSearchHistory' tool to get the user's recent travel searches. This provides context on their past specific interests, destinations they've considered, budget ranges, and typical travel times.
3.  **User's Direct Interests & Availability (Current Input):**
    *   The user might provide specific desires in 'travelInterests': \`{{{travelInterests}}}\`. Carefully parse this for destination types (beach, city, mountains), activities (hiking, museums, relaxing), desired atmosphere, and any implicit or explicit destination ideas, dates, or budget constraints.
    *   Consider the user's optional current input for 'upcomingAvailability': \`{{{upcomingAvailability}}}\`. If provided, try to align suggested travel dates or trip duration with this.

**Synthesize ALL available information (Travel Persona (if present) > User's Travel Interests (if specific) > Search History > Upcoming Availability (if provided)) to generate 1 or 2 distinct trip bundle suggestions.**

*   **If 'travelInterests' is very specific** (e.g., "A 5-day trip to see cherry blossoms in Kyoto next April, budget $2000"), prioritize fulfilling that request, but still ensure it aligns with their Travel Persona if possible.
*   **If 'travelInterests' is general or empty** (e.g., "adventure travel," or no input), Aura AI should proactively use the Travel Persona and Search History to infer what the user might like. In this scenario, your suggestions should feel like Aura AI is anticipating their desires.

For each suggestion, you MUST provide:
-   'bundleName': A catchy and descriptive name for the bundle (e.g., "Kyoto Cherry Blossom Dream", "Andean Adventure & Culinary Delights for the Intrepid Soul").
-   'reasoning': A short explanation (1-2 sentences) of why this bundle is a good fit, EXPLICITLY referencing which information source(s) inspired it (e.g., "Based on your 'Adventure Seeker' persona and interest in 'hiking', and considering your past searches for Patagonia...", "Since you're looking for 'cherry blossoms in Kyoto' and your persona is 'Cultural Connoisseur', this bundle is a perfect match."). If direct input was minimal, emphasize how the persona or history led to the suggestion.
-   'tripIdea': A complete object with 'destination', 'travelDates', and 'budget' (in USD). This 'tripIdea' should be directly usable as input for a detailed trip planner.
    -   'destination': Be specific (e.g., "Paris, France", "Kyoto, Japan", "Banff National Park, Canada").
    -   'travelDates': Suggest plausible dates (e.g., "April 5-10, 2025", "Mid-July 2025 for 1 week", "Next available long weekend (e.g., Nov 8-10, 2024)"). If availability is given, use it. Be creative if dates are not specified in 'travelInterests'.
    -   'budget': Suggest a realistic budget in USD. Infer from persona style, search history, typical costs for the destination/duration, or any budget mentioned in 'travelInterests'.

Example Output for a single suggestion (ensure 'suggestions' is an array):
{
  "suggestions": [
    {
      "bundleName": "Relaxing Bali Beach Escape",
      "reasoning": "Aura AI noticed your 'Serene Traveler' persona and your interest in 'relaxing beach vacations'. This Bali escape, with dates based on your 'free in July' availability, aligns perfectly.",
      "tripIdea": {
        "destination": "Ubud & Seminyak, Bali, Indonesia",
        "travelDates": "July 10-20, 2025",
        "budget": 2200
      }
    }
  ]
}

Prioritize variety if suggesting two bundles. Ensure the output strictly follows the defined JSON schema for 'SmartBundleOutputSchema'.
If the Travel Persona is very specific and 'travelInterests' is empty, one highly relevant suggestion based on the persona is excellent.
If no persona or search history is available, rely heavily on the provided 'travelInterests' and 'upcomingAvailability'.
If no inputs at all are available (empty 'travelInterests', no persona, no history, no availability), suggest 1-2 broadly appealing, distinct trips (e.g., one city break, one nature escape) explaining Aura AI is offering general inspiration.
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
    // Add a log to see the exact input received by the flow
    console.log('Aura AI (SmartBundleFlow) received input:', JSON.stringify(input, null, 2));

    const { output } = await smartBundlePrompt(input);
    if (!output || !output.suggestions || output.suggestions.length === 0) {
        console.warn("Aura AI (Smart Bundle) did not return valid suggestions. Returning a default.");
        return {
            suggestions: [{
                bundleName: "Explore a New City",
                reasoning: "Aura AI couldn't generate personalized suggestions at this time. How about exploring a vibrant city like Barcelona or Amsterdam?",
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

