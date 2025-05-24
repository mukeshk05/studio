
'use server';
/**
 * @fileOverview An AI flow that suggests things to do for a given location,
 * including coordinates and AI-generated images.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import {
  ThingsToDoSearchInputSchema,
  type ThingsToDoSearchInput,
  ThingsToDoOutputSchema,
  type ThingsToDoOutput,
  ActivitySuggestionSchema as BaseActivitySuggestionSchema, // Use for text part
} from '@/ai/types/things-to-do-types';
import { generateMultipleImagesFlow, type ImagePromptItem, type ImageResultItem } from '@/ai/flows/generate-multiple-images-flow';

// Schema for the text-only part from the LLM (without final imageUri and parsed coords)
const ActivityTextSuggestionSchema = BaseActivitySuggestionSchema.omit({ 
    imageUri: true, 
    latitude: true, 
    longitude: true 
});

const ThingsToDoTextOutputSchema = z.object({
  activities: z.array(ActivityTextSuggestionSchema),
  searchSummary: z.string().optional(),
});

const thingsToDoTextPrompt = ai.definePrompt({
  name: 'thingsToDoTextPrompt',
  input: { schema: ThingsToDoSearchInputSchema },
  output: { schema: ThingsToDoTextOutputSchema },
  prompt: `You are an expert local tour guide AI for BudgetRoam.
For the location: '{{{location}}}'
{{#if interest}}
Considering the user's interest in: '{{{interest}}}'
{{/if}}
Suggest 4 to 6 diverse and engaging things to do or local attractions.

For EACH activity or attraction, you MUST provide a JSON object with ALL of the following fields:
-   'name': A clear and concise name (e.g., "Louvre Museum Visit", "Secret Food Tour of Le Marais").
-   'description': A brief, engaging description (1-2 sentences).
-   'category': A relevant category (e.g., "Museum", "Historical Site", "Outdoor Activity", "Food Tour", "Cultural Experience", "Shopping District", "Live Music Venue").
-   'estimatedPrice': A conceptual price indication (e.g., "Free", "$15", "$25 - $50 per person", "Approx $100 for tour", "Varies by shop/restaurant").
-   'latitudeString': Approximate latitude of the activity/attraction as a STRING (e.g., "48.8606" for Louvre). THIS IS CRITICAL.
-   'longitudeString': Approximate longitude as a STRING (e.g., "2.3376" for Louvre). THIS IS CRITICAL.
-   'imagePrompt': A concise text prompt (4-7 words) suitable for an image generation AI to create an attractive and representative photo of this activity/attraction (e.g., "Louvre Museum pyramid sunset", "Parisian food tour croissants cheese", "Eiffel Tower sparkling night").

Example for "Paris" with interest "art and history":
{
  "activities": [
    {
      "name": "Musée d'Orsay Exploration",
      "description": "Discover Impressionist and Post-Impressionist masterpieces in a stunning former railway station.",
      "category": "Museum",
      "estimatedPrice": "Approx $22 per person",
      "latitudeString": "48.859962",
      "longitudeString": "2.326556",
      "imagePrompt": "Musee dOrsay impressionist art clock"
    }
    // ... more activities
  ],
  "searchSummary": "Here are some artistic and historical highlights for your trip to Paris!"
}

Return a JSON object with a key "activities" containing an array of these activity objects, and an optional "searchSummary" string.
Ensure latitudeString and longitudeString are provided for every activity.
`,
});

export const thingsToDoFlow = ai.defineFlow(
  {
    name: 'thingsToDoFlow',
    inputSchema: ThingsToDoSearchInputSchema,
    outputSchema: ThingsToDoOutputSchema,
  },
  async (input: ThingsToDoSearchInput): Promise<ThingsToDoOutput> => {
    console.log('[AI Flow - thingsToDoFlow] Received input:', JSON.stringify(input, null, 2));
    
    const { output: textOutput } = await thingsToDoTextPrompt(input);

    if (!textOutput || !textOutput.activities || textOutput.activities.length === 0) {
      console.warn("[AI Flow - thingsToDoFlow] Text prompt did not return valid activities. Input was:", JSON.stringify(input, null, 2), "Output was:", JSON.stringify(textOutput, null, 2));
      return {
        activities: [],
        searchSummary: textOutput?.searchSummary || `AI couldn't find specific things to do in ${input.location} ${input.interest ? `related to '${input.interest}'` : ''} at this moment. Try a broader search!`,
      };
    }
    console.log(`[AI Flow - thingsToDoFlow] Text-only activity suggestions received: ${textOutput.activities.length}`);

    const imagePrompts: ImagePromptItem[] = textOutput.activities.map((activity, index) => ({
      id: `activity-${index}-${activity.name.replace(/\s+/g, '-')}`, // Create a unique ID
      prompt: activity.imagePrompt,
      styleHint: 'general', // Or a new specific style hint like 'activity'
    }));

    let imageResults: ImageResultItem[] = [];
    if (imagePrompts.length > 0) {
        try {
            const imageGenerationOutput = await generateMultipleImagesFlow({ prompts: imagePrompts });
            imageResults = imageGenerationOutput.results;
            console.log(`[AI Flow - thingsToDoFlow] Image generation results received: ${imageResults.length}`);
        } catch (imgError) {
            console.error("[AI Flow - thingsToDoFlow] Error calling generateMultipleImagesFlow:", imgError);
            // Continue without images if generation fails for all
        }
    }
    
    const activitiesWithImagesAndCoords = textOutput.activities.map((activityTextPart, index) => {
      const correspondingImageResult = imageResults.find(imgRes => imgRes.id === `activity-${index}-${activityTextPart.name.replace(/\s+/g, '-')}`);
      
      let latitude: number | undefined = undefined;
      let longitude: number | undefined = undefined;

      if (activityTextPart.latitudeString) {
          const latNum = parseFloat(activityTextPart.latitudeString);
          if (!isNaN(latNum) && latNum >= -90 && latNum <= 90) {
               latitude = latNum;
          } else {
               console.warn(`[AI Flow - thingsToDoFlow] Could not parse latitudeString "${activityTextPart.latitudeString}" or it's out of range for ${activityTextPart.name}. Parsed: ${latNum}.`);
          }
      } else {
          console.warn(`[AI Flow - thingsToDoFlow] Missing latitudeString for ${activityTextPart.name}.`);
      }
      if (activityTextPart.longitudeString) {
          const lonNum = parseFloat(activityTextPart.longitudeString);
          if (!isNaN(lonNum) && lonNum >= -180 && lonNum <= 180) {
              longitude = lonNum;
          } else {
              console.warn(`[AI Flow - thingsToDoFlow] Could not parse longitudeString "${activityTextPart.longitudeString}" or it's out of range for ${activityTextPart.name}. Parsed: ${lonNum}.`);
          }
      }
      
      return {
        ...activityTextPart,
        imageUri: correspondingImageResult?.imageUri || `https://placehold.co/600x400.png?text=${encodeURIComponent(activityTextPart.name.substring(0,15))}`,
        latitude,
        longitude,
      };
    });
    
    console.log(`[AI Flow - thingsToDoFlow] Processed ${activitiesWithImagesAndCoords.length} activities with images and coordinates.`);
    return {
      activities: activitiesWithImagesAndCoords,
      searchSummary: text