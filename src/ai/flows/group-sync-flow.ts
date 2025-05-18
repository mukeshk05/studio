
'use server';
/**
 * @fileOverview AI flow for generating a group trip compatibility report.
 *
 * - generateGroupSyncReport - Analyzes a trip against companion preferences.
 */

import { ai } from '@/ai/genkit';
import { GroupSyncInputSchema, type GroupSyncInput, GroupSyncOutputSchema, type GroupSyncOutput } from '@/ai/types/group-sync-types';

export async function generateGroupSyncReport(input: GroupSyncInput): Promise<GroupSyncOutput> {
  return groupSyncFlow(input);
}

const groupSyncPrompt = ai.definePrompt({
  name: 'groupSyncPrompt',
  input: { schema: GroupSyncInputSchema },
  output: { schema: GroupSyncOutputSchema },
  prompt: `You are an AI Travel Group Facilitator and Harmony Predictor for BudgetRoam.
Your task is to analyze an existing trip plan and compare it against the preferences of several travel companions, as well as the original planner's persona (if provided).
Your goal is to generate a "Group Harmony & Compatibility Report". This report should:

1.  Provide a brief OVERVIEW of the trip's general compatibility with the group.
2.  **Predict Potential Dynamics:** Based on the combination of all preferences (planner and companions), identify:
    *   Potential areas of friction or conflicting desires (e.g., "Alex's high-energy adventure preference might clash with Sarah's desire for a relaxed pace during morning activities.").
    *   Opportunities for enhanced group cohesion (e.g., "The shared interest in local cuisine between Maria and David could be leveraged for a group cooking class.").
3.  For EACH companion (and the original planner, if their persona is mentioned), highlight:
    *   Aspects of the trip that ALIGN WELL with their stated preferences.
    *   Aspects that might CONFLICT or be less ideal, considering the predicted group dynamics.
    *   CONCRETE, ACTIONABLE SUGGESTIONS for adjustments to the trip (activities, pace, type of accommodation, optional activities, or even communication strategies for the group) to better suit them and promote overall harmony.
4.  Offer overall recommendations for making the trip enjoyable for everyone, focusing on compromise and shared experiences.

Structure your report clearly. Use headings (e.g., ## Overall Harmony Outlook, ## Companion: [Name] - Alignment & Suggestions) and bullet points for suggestions to make it easy to read.

Existing Trip Details:
- Destination: {{{tripDestination}}}
- Travel Dates: {{{tripTravelDates}}}
{{#if tripSummary}}- Trip Summary: {{{tripSummary}}}{{/if}}
{{#if tripDailyPlanActivities}}- Daily Activities Summary: {{{tripDailyPlanActivities}}}{{/if}}

Planner's Persona:
{{#if plannerPersonaName}}- Name: {{{plannerPersonaName}}} (Consider this as the baseline or the original planner's general style)
{{else}}- Not specified.
{{/if}}

Companion Preferences:
{{#each companions}}
-   Companion Name: {{{this.name}}}
    -   Preferences: {{{this.preferences}}}
{{/each}}

Generate the Group Harmony & Compatibility Report. Be diplomatic but clear in your analysis and suggestions.
Focus on constructive, predictive advice to enhance the group experience.
Example of a predictive suggestion for a companion:
"## Companion: Alex
Preferences: Enjoys relaxing holidays, not keen on museums. The planner enjoys cultural sites.
- Alignment: The beach destination aligns well with Alex's preference for relaxation.
- Potential Conflict & Prediction: The current itinerary includes two full days of museum visits. This might lead to Alex feeling disengaged. It's predicted that if Alex is offered alternatives, overall group satisfaction will be higher.
- Suggestions:
    *   Consider replacing one museum day with a spa day or a leisurely boat trip that the whole group might enjoy, or that Alex could opt into.
    *   Offer Alex the option to skip a museum visit and relax at the hotel or explore a nearby cafe instead. Suggest the planner communicates these options clearly beforehand."

Keep the entire report as a single string for the 'compatibilityReport' field.
`,
});

const groupSyncFlow = ai.defineFlow(
  {
    name: 'groupSyncFlow',
    inputSchema: GroupSyncInputSchema,
    outputSchema: GroupSyncOutputSchema,
  },
  async (input) => {
    const { output } = await groupSyncPrompt(input);
    if (!output || !output.compatibilityReport) {
      console.warn("Group Sync AI did not return a valid report. Returning a default message.");
      return {
        compatibilityReport: "Could not generate a detailed group harmony report at this time. Please ensure all companion preferences are clearly stated and try again. General advice: Open communication is key! Discuss key activities, pace, and individual 'must-dos' with your group to find common ground and ensure everyone feels heard."
      };
    }
    return output;
  }
);

