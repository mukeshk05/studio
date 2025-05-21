
'use server';
/**
 * @fileOverview An AI flow that simulates an AR live preview of a landmark,
 * providing descriptive insights and generating a visual if needed.
 */

import { ai } from '@/ai/genkit';
import { AiArPreviewInputSchema, type AiArPreviewInput, AiArPreviewOutputSchema, type AiArPreviewOutput } from '@/ai/types/ai-ar-preview-types';
import { z } from 'zod';

// Define a schema that includes the currentTimeInfo for the prompt
const AiArPreviewPromptInputSchema = AiArPreviewInputSchema.extend({
  currentTimeInfo: z.string().describe("Contextual information about the current time, e.g., 'Morning (approx 9:00 AM)', 'Evening (around 7:30 PM)', 'Weekday Afternoon'.")
});

const generateImageForArPreview = async (promptText: string, fallbackDataAiHint: string): Promise<string> => {
  if (!promptText) return `https://placehold.co/600x400.png?text=${encodeURIComponent(fallbackDataAiHint.substring(0, 20))}`;
  let imageUri = `https://placehold.co/600x400.png`;
  try {
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp',
      prompt: `Generate a captivating, photorealistic image suitable for an AR preview of: ${promptText}. Aspect ratio 16:9. Focus on atmosphere and key visual elements.`,
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
      console.warn(`AR Preview image generation for prompt "${promptText}" did not return a media URL. Using placeholder.`);
      imageUri = `https://placehold.co/600x400.png?text=${encodeURIComponent(fallbackDataAiHint.substring(0, 20))}`;
    }
  } catch (imageError) {
    console.error(`Failed to generate AR Preview image for prompt "${promptText}":`, imageError);
    imageUri = `https://placehold.co/600x400.png?text=${encodeURIComponent(fallbackDataAiHint.substring(0, 20))}`;
  }
  return imageUri;
};

const arPreviewTextPrompt = ai.definePrompt({
  name: 'arPreviewTextPrompt',
  input: { schema: AiArPreviewPromptInputSchema },
  output: { schema: AiArPreviewOutputSchema.omit({ generatedImageUri: true }) }, // Text part only
  prompt: `You are "Aura Lens," an AI simulating an Augmented Reality live preview for travelers.
Your task is to analyze the provided landmark and generate descriptive insights as if viewing it through AR *right now*.

Landmark: {{{landmarkName}}}
{{#if photoDataUri}}User's Photo for Context: {{media url=photoDataUri}} (Use this photo to inform your description of the scene, lighting, and current activity if possible. Mention if you are referencing the photo's details.) {{else}} (No photo provided by user. Describe the landmark based on general knowledge and the current time.) {{/if}}
Current Time Context: {{{currentTimeInfo}}} (This is crucial. Tailor your description, mood, and activity tags to this time.)

Generate the following:
1.  'sceneDescription': A vivid, engaging description (2-3 sentences) of what the AR view might show for {{{landmarkName}}} considering the current time ({{{currentTimeInfo}}}). Describe the atmosphere, lighting, and potential current activity level.
2.  'moodTags': An array of 2-4 short tags describing the current mood or ambiance (e.g., "Bustling", "Serene", "Historic Atmosphere", "Vibrant Nightlife", "Peaceful Morning").
3.  'activityTags': An array of 2-4 short tags suggesting activities suitable for the scene *at this time* (e.g., "Photography", "People Watching", "Sunset Viewing", "Morning Coffee Spot", "Museum Hopping").
4.  'optimalPhotoTime' (optional): Suggest the best time of day or conditions for photos at {{{landmarkName}}}, considering its typical characteristics.
5.  'generatedImagePrompt' (string): A concise, descriptive prompt (5-10 words) suitable for an image generation AI to create a visually appealing representation of {{{landmarkName}}} as described in your 'sceneDescription' for the current time. ONLY provide this if no 'photoDataUri' was given by the user. If a user photo was provided, this should be an empty string or omitted.

Example (if no photo, current time "Evening around 7 PM"):
For Landmark: "Eiffel Tower, Paris", CurrentTimeInfo: "Evening (around 7:00 PM)"
{
  "sceneDescription": "The Eiffel Tower is beginning to sparkle against the dusky Parisian sky. The Champs de Mars below is dotted with people enjoying the cool evening. Streetlights cast a warm glow, creating a romantic and slightly bustling atmosphere.",
  "moodTags": ["Romantic", "Sparkling", "Evening Ambiance", "Iconic"],
  "activityTags": ["Evening Stroll", "Photography", "Picnicking", "Admiring Lights"],
  "optimalPhotoTime": "Just after sunset during the 'blue hour' or when it's fully lit at night.",
  "generatedImagePrompt": "Eiffel Tower Paris sparkling evening dusk"
}

Example (if photo provided, current time "Midday"):
For Landmark: "Trevi Fountain, Rome", Photo: (user photo details), CurrentTimeInfo: "Midday (around 1:00 PM)"
{
  "sceneDescription": "The Trevi Fountain, as seen in your photo, is dazzling under the midday sun, with crowds tossing coins into the clear water. The Baroque sculptures are brilliantly illuminated. It's quite busy, reflecting its daytime popularity.",
  "moodTags": ["Bright", "Touristy", "Iconic", "Majestic"],
  "activityTags": ["Coin Tossing", "Photography", "Gelato Break Nearby"],
  "optimalPhotoTime": "Early morning for fewer crowds and softer light, or illuminated at night.",
  "generatedImagePrompt": "" // Empty as user provided photo
}

Ensure your output strictly follows the defined JSON schema.
Focus on making the description feel immediate and relevant to the {{{currentTimeInfo}}}.
`,
});

export const aiArPreviewFlow = ai.defineFlow(
  {
    name: 'aiArPreviewFlow',
    inputSchema: AiArPreviewInputSchema,
    outputSchema: AiArPreviewOutputSchema,
  },
  async (input: AiArPreviewInput): Promise<AiArPreviewOutput> => {
    const now = new Date();
    const hours = now.getHours();
    let timeOfDay: string;

    if (hours < 6) timeOfDay = "Late Night (after midnight)";
    else if (hours < 10) timeOfDay = "Morning (approx " + now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + ")";
    else if (hours < 13) timeOfDay = "Late Morning (approx " + now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + ")";
    else if (hours < 17) timeOfDay = "Afternoon (approx " + now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + ")";
    else if (hours < 21) timeOfDay = "Evening (around " + now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + ")";
    else timeOfDay = "Night (after 9 PM)";

    const dayOfWeek = now.toLocaleDateString(undefined, { weekday: 'long' });
    const currentTimeInfo = `${dayOfWeek} ${timeOfDay}`;

    const promptInput = { ...input, currentTimeInfo };
    const { output: textOutput } = await arPreviewTextPrompt(promptInput);

    if (!textOutput) {
      console.warn("AI AR Preview text prompt did not return output. Returning a default.");
      const fallbackImage = await generateImageForArPreview(`generic image of ${input.landmarkName}`, input.landmarkName);
      return {
        sceneDescription: `Could not generate AR preview insights for ${input.landmarkName} at ${currentTimeInfo}. Please try again.`,
        moodTags: ["Info Unavailable"],
        activityTags: ["Try Again Later"],
        generatedImageUri: fallbackImage,
        generatedImagePrompt: `generic image of ${input.landmarkName}`
      };
    }

    let finalImageUri: string | undefined = undefined;
    let finalImagePrompt: string | undefined = textOutput.generatedImagePrompt;

    if (!input.photoDataUri && textOutput.generatedImagePrompt) {
      finalImageUri = await generateImageForArPreview(textOutput.generatedImagePrompt, input.landmarkName);
    } else if (input.photoDataUri) {
      // If user provided a photo, we don't generate a new one.
      // The frontend will display the user's photo.
      finalImageUri = undefined; // Explicitly set to undefined
      finalImagePrompt = undefined; // No AI prompt was used to generate an image in this case
    } else {
      // No user photo AND no image prompt from AI (shouldn't happen with good prompt logic but handle defensively)
      finalImageUri = await generateImageForArPreview(`general scenic view of ${input.landmarkName}`, input.landmarkName);
      finalImagePrompt = `general scenic view of ${input.landmarkName}`;
    }
    
    return {
      ...textOutput,
      generatedImageUri: finalImageUri,
      generatedImagePrompt: finalImagePrompt, // Return the prompt used, if any
    };
  }
);

export async function getAiArPreview(input: AiArPreviewInput): Promise<AiArPreviewOutput> {
  return aiArPreviewFlow(input);
}
