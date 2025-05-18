
'use server';
/**
 * @fileOverview An AI flow that matches users to travel adventure types/personas based on quiz answers.
 *
 * - matchAdventure - A function that takes quiz answers and returns adventure suggestions/personas.
 */

import { ai } from '@/ai/genkit';
import {
  AdventureQuizInputSchema,
  type AdventureQuizInput,
  AdventureMatcherOutputSchema,
  type AdventureMatcherOutput,
} from '@/ai/types/adventure-matcher-types';

export async function matchAdventure(input: AdventureQuizInput): Promise<AdventureMatcherOutput> {
  return adventureMatcherFlow(input);
}

const adventureMatcherPrompt = ai.definePrompt({
  name: 'adventureMatcherPrompt',
  input: { schema: AdventureQuizInputSchema },
  output: { schema: AdventureMatcherOutputSchema },
  prompt: `You are an expert AI Travel Persona Matchmaker for BudgetRoam.
Your goal is to analyze a user's answers to a travel preferences quiz and suggest 1-3 distinct travel personas or "Travel DNA" profiles that would best suit them.
These personas should be inspiring and help the user understand their travel style better.

Here are the quiz questions and their possible answers:
1.  **Ideal Vacation Pace (pace):**
    *   relaxing: Prefers chilling out, leisurely activities.
    *   balanced: Enjoys a mix of activities and downtime.
    *   action-packed: Likes to be always on the go, exploring extensively.
2.  **Preferred Environment (environment):**
    *   beach: Loves sandy beaches and ocean breezes.
    *   mountains: Prefers majestic mountains and fresh air.
    *   city: Enjoys vibrant cities and urban exploration.
    *   countryside: Seeks quiet countryside and nature escapes.
3.  **Primary Travel Interest (interest):**
    *   culture-history: Fascinated by museums, ancient sites, local traditions.
    *   food-drink: Eager for culinary experiences, local markets, unique dining.
    *   adventure-outdoors: Thrilled by hiking, water sports, extreme activities.
    *   wellness-relaxation: Looks for spas, yoga retreats, peaceful rejuvenation.
4.  **Travel Style (style):**
    *   budget: Prefers budget-friendly options like hostels and local eateries.
    *   mid-range: Opts for mid-range comfort, boutique hotels, varied dining.
    *   luxury: Desires high-end resorts, fine dining, premium experiences.
5.  **Travel Company (company):**
    *   solo: Travels alone.
    *   partner: Travels with a significant other.
    *   family: Travels with family, possibly including children.
    *   friends: Travels with a group of friends.

User's Quiz Answers:
- Pace: {{{pace}}}
- Environment: {{{environment}}}
- Interest: {{{interest}}}
- Style: {{{style}}}
- Company: {{{company}}}

Based on this unique combination of preferences, generate 1 to 3 distinct travel persona suggestions.
For each suggestion, you MUST provide:
-   'name': A catchy and descriptive name for the travel persona (e.g., "The Serene Solo Explorer," "Luxury Urban Connoisseur," "Budget Family Beachcomber"). This name represents their core travel DNA.
-   'description': A brief (1-2 sentences), engaging description of what this travel persona entails.
-   'exampleDestinations': An array of 1 to 3 example destinations that would be ideal for this persona (e.g., for "Serene Solo Explorer" focusing on mountains and wellness: ["Banff, Canada", "Swiss Alps", "Patagonia, Argentina"]).
-   'matchReasoning': A short explanation (1-2 sentences) clearly stating why this persona is a good fit for the user, directly referencing their specific quiz answers (e.g., "Given your preference for a 'relaxing' pace and 'wellness' interest, this persona focusing on rejuvenation is a perfect match.").
-   'suggestedTripIdea' (Optional): A concrete trip idea that can be directly used by our AI Trip Planner. This should include:
    -   'destination': Pick ONE specific destination from your 'exampleDestinations' or a similar one.
    -   'travelDates': Suggest a plausible, general timeframe (e.g., "Next spring for 7 days", "A long weekend in October", "Two weeks in July").
    -   'budget': Suggest a realistic budget in USD appropriate for the persona's style and the suggested destination/duration.

Example of one suggestion (ensure 'suggestions' is an array):
{
  "name": "The Budget-Conscious Cultural Voyager",
  "description": "This traveler loves to immerse themselves in history and local culture without breaking the bank, enjoying a balanced pace.",
  "exampleDestinations": ["Prague, Czech Republic", "Lisbon, Portugal", "Mexico City, Mexico"],
  "matchReasoning": "Your 'balanced' pace, interest in 'culture-history', and 'budget' style align perfectly with exploring rich historical cities affordably.",
  "suggestedTripIdea": {
    "destination": "Lisbon, Portugal",
    "travelDates": "September, 10 days",
    "budget": 1800
  }
}

Ensure the output strictly follows the defined JSON schema for 'AdventureMatcherOutputSchema'.
Focus on providing insightful persona descriptions and strong reasoning. The first suggestion should be considered the primary match.
If suggesting multiple options, try to offer some variety if the user's answers allow for it.
`,
});

const adventureMatcherFlow = ai.defineFlow(
  {
    name: 'adventureMatcherFlow',
    inputSchema: AdventureQuizInputSchema,
    outputSchema: AdventureMatcherOutputSchema,
  },
  async (input) => {
    const { output } = await adventureMatcherPrompt(input);
    if (!output || !output.suggestions || output.suggestions.length === 0) {
      // Fallback if AI doesn't return valid suggestions
      console.warn("Adventure Matcher AI did not return valid suggestions. Returning a default.");
      return {
        suggestions: [{
          name: "General Explorer",
          description: "Ready for a new adventure? Let's find a great trip for you!",
          exampleDestinations: ["Paris, France", "Bali, Indonesia", "New York City, USA"],
          matchReasoning: "Based on your quiz, a general exploration trip could be exciting. You can refine this by planning a specific trip.",
          suggestedTripIdea: {
            destination: "Paris, France",
            travelDates: "Next month for 7 days",
            budget: 2000,
          }
        }]
      };
    }
    return output;
  }
);
