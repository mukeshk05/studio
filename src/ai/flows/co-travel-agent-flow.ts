
'use server';
/**
 * @fileOverview An AI flow that acts as a Co-Travel Agent, answering user questions about a destination.
 *
 * - answerTravelQuestion - Main function to get AI-driven answers.
 */

import { ai } from '@/ai/genkit';
import {
  CoTravelAgentInputSchema,
  type CoTravelAgentInput,
  CoTravelAgentOutputSchema,
  type CoTravelAgentOutput,
} from '@/ai/types/co-travel-agent-types';

export async function answerTravelQuestion(input: CoTravelAgentInput): Promise<CoTravelAgentOutput> {
  return coTravelAgentFlow(input);
}

const coTravelAgentPrompt = ai.definePrompt({
  name: 'coTravelAgentPrompt',
  input: { schema: CoTravelAgentInputSchema },
  output: { schema: CoTravelAgentOutputSchema },
  prompt: `You are "Aura," BudgetRoam's expert AI Co-Travel Agent.
You are an expert for the destination: {{{destination}}}.

A user has the following question about {{{destination}}}:
"{{{question}}}"

Your Task:
1.  Provide a clear, concise, and accurate 'answer' to the user's question.
2.  Optionally, if highly relevant and genuinely helpful, provide 1-2 very short 'relevantTips' (each tip being one sentence). These tips should directly relate to the question or offer crucial advice for {{{destination}}}. Do not provide tips if they are not truly valuable or directly related.

Example for destination "Tokyo, Japan", question "What is the tipping etiquette for restaurants?":
{
  "answer": "In Tokyo, and Japan in general, tipping is not customary in restaurants. In fact, it can sometimes be considered impolite as excellent service is expected and included in the price. A simple 'Gochisosama deshita' (Thank you for the meal) is a polite way to show appreciation.",
  "relevantTips": [
    "Some high-end international hotels or tourist-specific services might include a service charge.",
    "Always carry some cash, as not all smaller establishments accept credit cards."
  ]
}

Example for destination "Paris, France", question "How do I use the Metro?":
{
  "answer": "The Paris Metro is efficient. You can buy single tickets ('t+') or a Navigo pass (weekly/monthly). Tickets can be purchased from machines or counters at stations. Validate your ticket before entering the platform area. Keep your ticket until you exit, as checks are common. Metro maps are available at stations and online (e.g., RATP app).",
  "relevantTips": [
    "Consider a 'carnet' of 10 t+ tickets for a discount if making multiple single journeys.",
    "Watch out for pickpockets, especially in crowded Metro cars and stations."
  ]
}

Ensure your output strictly follows the defined JSON schema for CoTravelAgentOutputSchema.
Be helpful, friendly, and provide practical information for a traveler in {{{destination}}}.
Focus on directly answering the question first and foremost.
`,
});

export const coTravelAgentFlow = ai.defineFlow(
  {
    name: 'coTravelAgentFlow',
    inputSchema: CoTravelAgentInputSchema,
    outputSchema: CoTravelAgentOutputSchema,
  },
  async (input): Promise<CoTravelAgentOutput> => {
    const { output } = await coTravelAgentPrompt(input);

    if (!output || !output.answer) {
      console.warn("AI Co-Travel Agent did not return a valid answer. Returning a default.");
      return {
        answer: `I apologize, but I couldn't find a specific answer for your question about "${input.destination}" right now. Try rephrasing or asking about a more general topic.`,
        relevantTips: ["Always check official tourism websites for the most up-to-date information."]
      };
    }
    return output;
  }
);

export async function getCoTravelAgentResponse(input: CoTravelAgentInput): Promise<CoTravelAgentOutput> {
  return coTravelAgentFlow(input);
}
