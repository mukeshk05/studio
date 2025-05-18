
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
  prompt: `You are an AI Travel Group Facilitator for BudgetRoam.
Your task is to analyze an existing trip plan and compare it against the preferences of several travel companions, as well as the original planner's persona (if provided).
Your goal is to generate a "Compatibility Report". This report should:
1.  Provide a brief OVERVIEW of the trip's general compatibility with the group.
2.  For EACH companion (and the original planner, if their persona is mentioned), highlight:
    *   Aspects of the trip that ALIGN WELL with their stated preferences.
    *   Aspects that might CONFLICT or be less ideal.
    *   CONCRETE, ACTIONABLE SUGGESTIONS for adjustments to the trip (activities, pace, type of accommodation, etc.) to better suit them, while trying to maintain the core essence of the trip if possible.
3.  Offer overall recommendations for making the trip enjoyable for everyone.

Structure your report clearly. Use headings (e.g., ## Overview, ## Companion: [Name]) and bullet points for suggestions to make it easy to read.

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

Generate the Compatibility Report. Be diplomatic but clear in your analysis and suggestions.
Focus on constructive advice.
Example of a suggestion for a companion:
"## Companion: Alex
Preferences: Enjoys relaxing holidays, not keen on museums.
- Alignment: The beach destination aligns well with Alex's preference for relaxation.
- Potential Conflict: The current itinerary includes two full days of museum visits.
- Suggestions:
    *   Consider replacing one museum day with a spa day or a leisurely boat trip.
    *   Offer Alex the option to skip a museum visit and relax at the hotel or beach instead."

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
        compatibilityReport: "Could not generate a detailed compatibility report at this time. Please ensure all companion preferences are clearly stated and try again. General advice: Discuss key activities and priorities with your group to find common ground!"
      };
    }
    return output;
  }
);
