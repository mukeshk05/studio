
'use server';
/**
 * @fileOverview An AI flow that generates local insider tips for a destination,
 * simulating access to live local data and trends.
 *
 * - getLocalInsiderTips - Fetches simulated local insider tips.
 */

import { ai } from '@/ai/genkit';
import {
  LocalInsiderTipsInputSchema,
  type LocalInsiderTipsInput,
  LocalInsiderTipsOutputSchema,
  type LocalInsiderTipsOutput,
} from '@/ai/types/local-insider-tips-types';

export async function getLocalInsiderTips(input: LocalInsiderTipsInput): Promise<LocalInsiderTipsOutput> {
  return localInsiderTipsFlow(input);
}

const localInsiderTipsPrompt = ai.definePrompt({
  name: 'localInsiderTipsPrompt',
  input: { schema: LocalInsiderTipsInputSchema },
  output: { schema: LocalInsiderTipsOutputSchema },
  prompt: `You are "Aura Local Lens," an AI expert in uncovering the pulse of a city: {{{destination}}}.
Your task is to provide hyper-local, insightful, and seemingly real-time insider tips.
You will *simulate* having access to live data sources like Foursquare check-ins, local social media trends (e.g., TikTok, Instagram location tags), Google Trends for {{{destination}}}, and real-time crowd data.

Given the following context:
- Destination: {{{destination}}}
{{#if desiredMood}}- User's Desired Mood: {{{desiredMood}}}{{else}}- User's Desired Mood: Not specified, assume general curiosity.{{/if}}
{{#if weatherContext}}- Current Weather Context: {{{weatherContext}}}{{else}}- Current Weather Context: Not specified, assume generally pleasant weather suitable for most activities.{{/if}}

Please generate the following, making it sound authentic and current:

1.  **Trending Spots Summary (trendingSpotsSummary):**
    *   Briefly summarize 2-3 specific food, drink, or entertainment spots that are currently "buzzing" or trending today in {{{destination}}} based on your simulated local data.
    *   Example: "Locals in {{{destination}}} are flocking to 'The Alchemy Bar' for its innovative cocktails tonight, and 'Mama Rosa's Pizzeria' is seeing long lines for its new truffle special. The indie band 'The Nomads' is also playing a surprise gig at 'The Underground Venue' which is generating a lot of social buzz."

2.  **Hidden Gem Pick (hiddenGemPick):**
    *   Suggest ONE specific, lesser-known "hidden gem" (a cafe, a small shop, a quiet park, a unique viewpoint, a quirky local experience) in {{{destination}}}.
    *   The 'name' should be the place's name.
    *   The 'description' should briefly describe it.
    *   The 'reason' must explain why this gem is particularly suitable for someone with the 'desiredMood' (or general curiosity if no mood is specified) and considering the 'weatherContext'.
    *   Example for mood "reflective" and weather "cool evening": { name: "The Silent Quill Bookstore & Tea Room", description: "A cozy, second-hand bookstore with a small tea room tucked in the back.", reason: "Perfect for a 'reflective' mood on a 'cool evening', offering a quiet escape to browse books and enjoy a warm drink."}

3.  **Daily Activity Pick (dailyActivityPick):**
    *   Suggest ONE specific activity for today or this evening in {{{destination}}}.
    *   The 'name' should be the activity.
    *   The 'description' should briefly describe it.
    *   The 'reason' must explain why this activity is well-suited for the 'weatherContext' and 'desiredMood'.
    *   Example for weather "sunny afternoon" and mood "energetic": { name: "Cycle along the Riverfront Art Trail", description: "Rent a bike and explore the vibrant street art along the scenic riverfront path.", reason: "A great way to enjoy the 'sunny afternoon' with an 'energetic' vibe, combining exercise with cultural discovery."}

4.  **Availability Notes (availabilityNotes):**
    *   Provide a brief, general, and plausible note about typical restaurant/activity availability or crowd levels for {{{destination}}} at this time of day/week (inferring from general knowledge).
    *   Example: "Popular downtown restaurants in {{{destination}}} tend to get very busy on weekend evenings, so reservations are highly recommended. Museums are usually less crowded on weekday mornings."

Ensure your output strictly adheres to the LocalInsiderTipsOutputSchema. Be creative and make the tips sound genuinely insightful and current for {{{destination}}}.
`,
});

const localInsiderTipsFlow = ai.defineFlow(
  {
    name: 'localInsiderTipsFlow',
    inputSchema: LocalInsiderTipsInputSchema,
    outputSchema: LocalInsiderTipsOutputSchema,
  },
  async (input) => {
    const { output } = await localInsiderTipsPrompt(input);
    if (!output) {
      // Fallback if AI doesn't return valid output
      console.warn("Local Insider Tips AI did not return valid output. Returning a default.");
      return {
        trendingSpotsSummary: "Could not fetch specific trending spots right now. Explore the main attractions for a guaranteed good time!",
        hiddenGemPick: {
          name: "A Local Park",
          description: "Take a stroll in a nearby park.",
          reason: "Always a good option to relax and observe local life.",
        },
        dailyActivityPick: {
          name: "Visit a Museum",
          description: "Explore a local museum based on your interests.",
          reason: "A culturally enriching activity suitable for most weather.",
        },
        availabilityNotes: "General availability varies. It's always a good idea to check opening hours and book popular attractions or restaurants in advance.",
      };
    }
    return output;
  }
);
