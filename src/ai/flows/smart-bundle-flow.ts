
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
  prompt: `You are an AI Smart Travel Concierge for BudgetRoam. Your goal is to suggest 1 or 2 highly personalized trip bundles to the user (ID: {{{userId}}}).

To create these suggestions, you MUST perform the following steps in order, using the available tools and user inputs:
1.  **User's Travel Interests (Primary Input):** The user might provide specific desires in 'travelInterests': \`{{{travelInterests}}}\`. Carefully parse this for destination types (beach, city, mountains), activities (hiking, museums, relaxing), desired atmosphere, and any implicit or explicit destination ideas, dates, or budget constraints. This is a key driver for the suggestions.
2.  **User's Travel Persona (Context):** Call the 'getUserTravelPersona' tool. If a Travel Persona (Travel DNA) is found, this is a STRONG indicator of their general preferences (e.g., 'Luxury Explorer', 'Budget Backpacker'). Use this to refine the style and type of suggestions if 'travelInterests' is vague or to ensure alignment.
3.  **User's Search History (Context):** Call the 'getUserSearchHistory' tool to get the user's recent travel searches. This provides context on their past specific interests, destinations they've considered, budget ranges, and typical travel times. Use this to see if current interests align with past searches or to find inspiration if 'travelInterests' is very open.
4.  **User's Availability (Context):** Consider the user's optional current input for 'upcomingAvailability': \`{{{upcomingAvailability}}}\`. If provided, try to align suggested travel dates or trip duration with this.

**Synthesize ALL available information (Travel Interests (most important) > Persona > Search History > Availability) to generate 1 or 2 distinct trip bundle suggestions.**
If 'travelInterests' is very specific (e.g., "A 5-day trip to see cherry blossoms in Kyoto next April, budget $2000"), prioritize fulfilling that request.
If 'travelInterests' is more general (e.g., "adventure travel and good food"), use the Persona and Search History to narrow down options.

For each suggestion, you MUST provide:
-   'bundleName': A catchy and descriptive name for the bundle (e.g., "Kyoto Cherry Blossom Dream", "Andean Adventure & Culinary Delights").
-   'reasoning': A short explanation (1-2 sentences) of why this bundle is a good fit, EXPLICITLY referencing which information source(s) inspired it (e.g., "Based on your interest in 'cherry blossoms and Kyoto'...", "Aligning your 'Adventure Seeker' persona with your interest in 'hiking and mountains', and considering your past searches for South America...").
-   'tripIdea': A complete object with 'destination', 'travelDates', and 'budget' (in USD). This 'tripIdea' should be directly usable as input for a detailed trip planner.
    -   'destination': Be specific (e.g., "Paris, France", "Kyoto, Japan", "Banff National Park, Canada").
    -   'travelDates': Suggest plausible dates (e.g., "April 5-10, 2025", "Mid-July 2025 for 1 week", "Next available long weekend (e.g., Nov 8-10, 2024)"). If availability is given, use it. Be creative if dates are not specified in 'travelInterests'.
    -   'budget': Suggest a realistic budget in USD. Infer from persona style, search history, typical costs for the destination/duration, or any budget mentioned in 'travelInterests'.

Example Output for a single suggestion (ensure 'suggestions' is an array):
{
  "suggestions": [
    {
      "bundleName": "Relaxing Bali Beach Escape",
      "reasoning": "Your interest in a 'relaxing beach vacation' and 'wellness' aligns perfectly with this Bali escape. We've matched it to your 'Serene Traveler' persona and suggested dates based on your 'free in July' availability.",
      "tripIdea": {
        "destination": "Ubud & Seminyak, Bali, Indonesia",
        "travelDates": "July 10-20, 2025",
        "budget": 2200
      }
    }
  ]
}

Prioritize variety if suggesting two bundles. Ensure the output strictly follows the defined JSON schema for 'SmartBundleOutputSchema'.
If the Travel Persona is very specific and 'travelInterests' is empty, one highly relevant suggestion might be better.
If no persona or search history is available, rely heavily on the provided 'travelInterests' and 'upcomingAvailability'.
If no inputs at all are available (empty 'travelInterests', no persona, no history, no availability), suggest 1-2 broadly appealing, distinct trips (e.g., one city break, one nature escape).
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
    console.log('SmartBundleFlow received input:', JSON.stringify(input, null, 2));

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

