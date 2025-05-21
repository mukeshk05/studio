
'use server';
/**
 * @fileOverview An AI flow that generates serendipitous suggestions for a destination
 * based on a user's current mood or interest.
 *
 * - getSerendipitySuggestions - Fetches AI-generated serendipitous ideas.
 */

import { ai } from '@/ai/genkit';
import { 
    SerendipityInputSchema, 
    type SerendipityInput, 
    SerendipityOutputSchema, 
    type SerendipityOutput,
    SerendipitySuggestionSchema
} from '@/ai/types/serendipity-engine-types';
import { z } from 'genkit';

// Schema for the text-only part of the AI's response, before image generation
const SerendipityTextSuggestionSchema = SerendipitySuggestionSchema.omit({ imageUri: true });
const SerendipityTextOutputSchema = z.object({
  suggestions: z.array(SerendipityTextSuggestionSchema),
});


const generateSuggestionImage = async (promptText: string | undefined, fallbackDataAiHint: string): Promise<string> => {
  if (!promptText) return `https://placehold.co/600x400.png?text=${encodeURIComponent(fallbackDataAiHint.substring(0,20))}`;
  let imageUri = `https://placehold.co/600x400.png`;
  try {
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp',
      prompt: `Generate an appealing, slightly whimsical travel image representing: ${promptText}. Style: vibrant, unexpected, intriguing. Aspect ratio: 16:9.`,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
         safetySettings: [ 
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ],
      },
      // @ts-ignore
      experimentalDoNotSelectOutputTool: true, 
    });

    if (media?.url) {
      imageUri = media.url;
    } else {
      console.warn(`Serendipity image generation for prompt "${promptText}" did not return a media URL. Using placeholder.`);
      imageUri = `https://placehold.co/600x400.png?text=${encodeURIComponent(fallbackDataAiHint.substring(0,20))}`;
    }
  } catch (imageError) {
    console.error(`Failed to generate serendipity image for prompt "${promptText}":`, imageError);
    imageUri = `https://placehold.co/600x400.png?text=${encodeURIComponent(fallbackDataAiHint.substring(0,20))}`;
  }
  return imageUri;
};


const serendipityEnginePrompt = ai.definePrompt({
  name: 'serendipityEnginePrompt',
  input: { schema: SerendipityInputSchema },
  output: { schema: SerendipityTextOutputSchema }, // AI generates text parts + visualPrompt
  prompt: `You are "Aura," BudgetRoam's AI Serendipity Engine.
Your task is to discover 1-2 unique, plausible, and seemingly spontaneous local events, hidden gems, or activities for a user in {{{destination}}}, based on their stated 'currentMoodOrInterest'.
Imagine you have access to hyper-local, real-time information (social media trends, local event listings, etc.).

Destination: {{{destination}}}
User's Current Mood/Interest: {{{currentMoodOrInterest}}}

For each suggestion:
1.  'name': A catchy name for the serendipitous find.
2.  'description': A brief, enticing description of what it is.
3.  'reasoning': Why this is a great, unexpected find based on their mood/interest and the destination.
4.  'visualPrompt': A concise (3-7 words) text prompt suitable for an image generation AI to create a visually representative and slightly whimsical image for this suggestion (e.g., "hidden jazz club Paris night", "pop-up food stall Kyoto", "secret garden poetry reading").

Example for Destination: "Shibuya, Tokyo", Mood/Interest: "Find unique street art and alternative fashion":
{
  "suggestions": [
    {
      "name": "Pop-Up Harajuku Art Collective",
      "description": "A temporary gallery in a repurposed warehouse showcasing emerging Tokyo street artists and avant-garde fashion designers, just a short walk from the main crossing. Live DJ set tonight.",
      "reasoning": "Perfectly matches your interest in street art and alternative fashion, offering a fresh, underground experience beyond the usual tourist spots in Shibuya.",
      "visualPrompt": "Tokyo street art gallery vibrant"
    }
  ]
}

Ensure your output strictly follows the SerendipityTextOutputSchema. Be creative and make the suggestions feel genuinely serendipitous and exciting.
If no highly specific ideas come to mind, offer a slightly more general but still intriguing suggestion related to the mood/interest.
`,
});

export const serendipityEngineFlow = ai.defineFlow(
  {
    name: 'serendipityEngineFlow',
    inputSchema: SerendipityInputSchema,
    outputSchema: SerendipityOutputSchema,
  },
  async (input: SerendipityInput): Promise<SerendipityOutput> => {
    const { output: textOutput } = await serendipityEnginePrompt(input);

    if (!textOutput || !textOutput.suggestions || textOutput.suggestions.length === 0) {
      console.warn("AI Serendipity Engine did not return valid text suggestions. Returning a default.");
      const fallbackImage = await generateSuggestionImage("general interesting discovery", "serendipity");
      return {
        suggestions: [{
          name: "Explore a Local Neighborhood",
          description: `Sometimes the best discoveries in ${input.destination} are made by simply wandering off the beaten path. You might find a charming cafe or a unique local shop!`,
          reasoning: "A general sense of exploration often leads to unexpected delights, fitting any mood.",
          visualPrompt: "charming hidden street discovery",
          imageUri: fallbackImage,
        }]
      };
    }
    
    const suggestionsWithImages = await Promise.all(
      textOutput.suggestions.map(async (suggestion) => {
        const fallbackHint = `${suggestion.name.substring(0, 15)} ${input.destination.substring(0,10)}`;
        const imageUri = await generateSuggestionImage(suggestion.visualPrompt, fallbackHint);
        return { ...suggestion, imageUri };
      })
    );

    return {
        suggestions: suggestionsWithImages,
    };
  }
);

export async function getSerendipitySuggestions(input: SerendipityInput): Promise<SerendipityOutput> {
  return serendipityEngineFlow(input);
}
