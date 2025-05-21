
'use server';
/**
 * @fileOverview AI flow for synthesizing post-trip feedback to refine travel DNA
 * and map future travel trajectories.
 *
 * - synthesizePostTripFeedback - Analyzes user feedback and suggests persona insights and future paths.
 */

import { ai } from '@/ai/genkit';
import {
  PostTripFeedbackInputSchema,
  type PostTripFeedbackInput,
  PostTripAnalysisOutputSchema,
  type PostTripAnalysisOutput,
} from '@/ai/types/post-trip-synthesizer-types';
// Import a tool to get user persona if we decide to use it.
// For now, we focus on deriving insights directly from feedback.
// import { getUserTravelPersona } from '@/lib/firestoreHooks'; // Example
// import { z } from 'zod';

// Example of a tool to fetch existing persona (conceptual, not used in prompt yet)
/*
const getUserTravelPersonaTool = ai.defineTool(
  {
    name: 'getExistingUserTravelPersona',
    description: "Fetches the user's currently defined Travel Persona (name and description) if available. This provides baseline context before suggesting refinements.",
    inputSchema: z.object({ userId: z.string().describe("The unique identifier of the user.") }),
    outputSchema: z.object({ name: z.string(), description: z.string() }).optional(),
  },
  async ({ userId }) => {
    // const persona = await getUserTravelPersona(userId);
    // return persona ? { name: persona.name, description: persona.description } : undefined;
    return undefined; // Placeholder
  }
);
*/

const synthesizePostTripPrompt = ai.definePrompt({
  name: 'synthesizePostTripPrompt',
  input: { schema: PostTripFeedbackInputSchema },
  output: { schema: PostTripAnalysisOutputSchema },
  // tools: [getUserTravelPersonaTool], // Add if using the tool
  prompt: `You are Aura AI, BudgetRoam's empathetic Post-Trip Synthesizer and Future Trajectory Mapper.
Your goal is to analyze a user's feedback on a recently completed trip and provide:
1.  **Refined Persona Insights:** How this trip experience might add to or refine their "Travel DNA" or travel persona. This should be a thoughtful narrative.
2.  **Future Travel Trajectory Suggestions (1-2):** Broader themes or styles of travel that build upon the positive aspects and learnings from this trip. These are not just single trip suggestions but evolving paths.

User's Trip Details & Feedback:
- Destination: {{{tripDestination}}}
- Travel Dates: {{{tripTravelDates}}}
{{#if tripStyleOrSummary}}- Trip Style/Summary: {{{tripStyleOrSummary}}}{{/if}}
- What they loved most / Highlights: {{{feedbackLovedMost}}}
{{#if feedbackSurprises}}- Surprises / Unexpected aspects: {{{feedbackSurprises}}}{{/if}}
{{#if feedbackFeelings}}- Overall feelings / Reflections: {{{feedbackFeelings}}}{{/if}}
{{#if feedbackKeyTakeaways}}- Key takeaways / New interests: {{{feedbackKeyTakeaways}}}{{/if}}
{{#if uploadedPhotoName}}- (Reference to an uploaded photo: {{{uploadedPhotoName}}} - note: content of photo not analyzed, but its existence may imply a visual memory).{{/if}}

{{#if userId}}
(Conceptual: If an existing travel persona for user {{{userId}}} was fetched, you'd use it here as a baseline: e.g., "User's current persona is 'Luxury Seeker'.")
For now, focus on deriving insights primarily from the direct feedback of *this* trip.
{{/if}}

Based on this feedback:

1.  **refinedPersonaInsights (String):**
    *   Write a short (2-4 sentences) narrative insight. How does this specific trip experience (positive or negative learnings) contribute to understanding their travel preferences more deeply?
    *   Example: "Your feedback on loving the 'spontaneous cooking class' in {{{tripDestination}}} and the 'vibrant local markets' suggests a growing passion for authentic culinary immersion. This might mean your 'Cultural Explorer' DNA is evolving to have a stronger 'Foodie Adventurer' component, prizing hands-on experiences over just sightseeing."

2.  **futureTrajectorySuggestions (Array of 1-2 objects):**
    For each trajectory:
    *   'trajectoryName': A catchy name (e.g., "Deep Dive into Culinary Arts & Local Gastronomy", "Off-the-Beaten-Path Nature Immersion").
    *   'description': Why this trajectory is a good fit based on their feedback. How does it build on what they enjoyed or learned? (1-2 sentences).
    *   'exampleDestinations': An array of 2-3 diverse destinations suitable for this trajectory.
    *   'nextStepTripIdea' (Optional AITripPlannerInput): For ONE trajectory, suggest a concrete next trip idea (destination, travelDates, budget) that could be a first step on this new path.
    *   'imagePrompt': A 3-5 word prompt for an image representing this trajectory's theme (e.g., "cooking class Italy pasta", "remote cabin mountain hike").

Example for one trajectory suggestion:
{
  "trajectoryName": "Solo Cultural Storyteller Expeditions",
  "description": "Your enjoyment of 'wandering alone and discovering hidden alleyways' and 'feeling a deep connection to local stories' in {{{tripDestination}}} suggests a path of solo travel focused on unearthing and documenting unique cultural narratives.",
  "exampleDestinations": ["Marrakech, Morocco", "Luang Prabang, Laos", "Valparaiso, Chile"],
  "nextStepTripIdea": {
    "destination": "Marrakech, Morocco",
    "travelDates": "Next spring for 10 days",
    "budget": 1800
  },
  "imagePrompt": "solo traveler journal Morocco"
}

Focus on insightful synthesis of the feedback to create meaningful and inspiring future paths.
Ensure the output strictly adheres to the PostTripAnalysisOutputSchema.
`,
});

export const synthesizePostTripFeedbackFlow = ai.defineFlow(
  {
    name: 'synthesizePostTripFeedbackFlow',
    inputSchema: PostTripFeedbackInputSchema,
    outputSchema: PostTripAnalysisOutputSchema,
  },
  async (input) => {
    // console.log('Synthesizer Flow Input:', JSON.stringify(input, null, 2));
    const { output } = await synthesizePostTripPrompt(input);
    if (!output || !output.futureTrajectorySuggestions || output.futureTrajectorySuggestions.length === 0) {
      console.warn("AI Post-Trip Synthesizer did not return valid suggestions. Returning a default.");
      return {
        refinedPersonaInsights: "We couldn't generate detailed insights from this feedback right now, but every trip helps shape your future adventures!",
        futureTrajectorySuggestions: [{
          trajectoryName: "General Exploration",
          description: "Continue exploring new places and discovering what you love about travel!",
          exampleDestinations: ["Rome, Italy", "Bali, Indonesia", "New York City, USA"],
          imagePrompt: "world map travel compass"
        }]
      };
    }
    return output;
  }
);

export async function synthesizePostTripFeedback(input: PostTripFeedbackInput): Promise<PostTripAnalysisOutput> {
  return synthesizePostTripFeedbackFlow(input);
}
