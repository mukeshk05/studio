
'use server';

import { firestore } from '@/lib/firebase';
import { generateMultipleImagesFlow, type ImagePromptItem, type ImageResultItem } from '@/ai/flows/generate-multiple-images-flow';
import { collection, doc, getDocs, query, where, writeBatch, documentId, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';

export interface ImageRequest {
  id: string; // Unique ID for this image request (e.g., feature slug, hero-index)
  promptText: string;
  styleHint: 'hero' | 'featureCard';
}

export async function getLandingPageImagesWithFallback(
  requests: ImageRequest[]
): Promise<Record<string, string | null>> {
  console.log(`[Server Action - getLandingPageImagesWithFallback] Started. Requests received: ${requests.length}`);
  const imageUris: Record<string, string | null> = {};
  requests.forEach(req => imageUris[req.id] = null); // Initialize all with null

  const aiGenerationQueue: ImagePromptItem[] = [];
  const requestIds = requests.map(req => req.id);

  // Firestore Fetch (Chunked for 'in' query limit, typically 30 for Firestore)
  const MAX_FIRESTORE_IN_QUERY = 30; 
  try {
    if (requestIds.length > 0) {
      for (let i = 0; i < requestIds.length; i += MAX_FIRESTORE_IN_QUERY) {
        const chunk = requestIds.slice(i, i + MAX_FIRESTORE_IN_QUERY);
        if (chunk.length === 0) continue;

        console.log(`[DB Check] Querying Firestore for IDs: ${chunk.join(', ')}`);
        const imageDocsQuery = query(collection(firestore, 'landingPageImages'), where(documentId(), 'in', chunk));
        const imageDocsSnap = await getDocs(imageDocsQuery);
        
        imageDocsSnap.forEach(docSnap => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.imageUri) {
              imageUris[docSnap.id] = data.imageUri;
              console.log(`[DB Check] Found existing image in Firestore for ID ${docSnap.id}. URI starts with: ${data.imageUri.substring(0, 50)}...`);
            } else {
               console.log(`[DB Check] Document for ID ${docSnap.id} found but no imageUri field.`);
            }
          }
        });
      }
    }
  } catch (error) {
    console.error('[Server Action - Firestore Fetch Error] Error fetching from Firestore:', error);
    // Continue to AI generation for all, as DB fetch might have failed globally
  }
  
  requests.forEach(req => {
    if (!imageUris[req.id]) { // If not found in DB (still null)
      aiGenerationQueue.push({ id: req.id, prompt: req.promptText, styleHint: req.styleHint });
    }
  });

  console.log(`[Server Action] Found ${Object.values(imageUris).filter(uri => uri !== null).length} images in DB. Sending ${aiGenerationQueue.length} to AI for generation.`);

  if (aiGenerationQueue.length > 0) {
    try {
      console.log(`[Server Action] Calling generateMultipleImagesFlow for ${aiGenerationQueue.length} images.`);
      const aiResults = await generateMultipleImagesFlow({ prompts: aiGenerationQueue });
      console.log(`[Server Action] AI Results received: ${aiResults.results.length} items.`);
      
      aiResults.results.forEach(aiResult => {
        if (aiResult.imageUri) {
          imageUris[aiResult.id] = aiResult.imageUri;
          console.log(`[Server Action] Updated imageUris with AI result for ID ${aiResult.id}. URI starts with: ${aiResult.imageUri.substring(0, 50)}...`);
          
          // Find original request to get promptText and styleHint for DB save
          const originalRequest = requests.find(r => r.id === aiResult.id);
          if (originalRequest) {
            saveImageUriToDbInternal({
              id: aiResult.id,
              imageUri: aiResult.imageUri,
              promptText: originalRequest.promptText,
              styleHint: originalRequest.styleHint,
            }).catch(saveError => { // Fire-and-forget with error logging
              console.error(`[Server Action - Background DB Save Error] Failed to save image for ID ${aiResult.id} to DB:`, saveError);
            });
          } else {
            console.warn(`[Server Action] Could not find original request for AI result ID ${aiResult.id} to save to DB.`);
          }
        } else {
          console.warn(`[Server Action] AI generation failed or returned null URI for ID ${aiResult.id}.`);
          imageUris[aiResult.id] = null; // Ensure it's explicitly null if AI fails
        }
      });
    } catch (error) {
      console.error('[Server Action - AI Generation Error] Error calling generateMultipleImagesFlow:', error);
      // Mark all images queued for AI as null if the batch call fails
      aiGenerationQueue.forEach(req => {
        imageUris[req.id] = null;
      });
    }
  }

  console.log(`[Server Action - getLandingPageImagesWithFallback] RETURNING imageUris to client:`, Object.keys(imageUris).length, 'keys.');
  return imageUris;
}


// Internal helper, not exported as a server action itself
async function saveImageUriToDbInternal({ 
  id, 
  imageUri, 
  promptText, 
  styleHint 
}: { 
  id: string; 
  imageUri: string; 
  promptText: string; 
  styleHint: 'hero' | 'featureCard'; 
}) {
  try {
    console.log(`[DB Save Internal] Attempting to save image to Firestore for ID: ${id}. URI starts with: ${imageUri.substring(0, 50)}...`);
    const imageDocRef = doc(firestore, 'landingPageImages', id);
    await setDoc(imageDocRef, {
      imageUri: imageUri,
      promptUsed: promptText,
      styleHint: styleHint,
      lastUpdated: serverTimestamp(),
    }, { merge: true });
    console.log(`[DB Save Internal] Image for ID ${id} SAVED/UPDATED successfully in Firestore.`);
  } catch (error) {
    console.error(`[DB Save Internal Error] Failed to save image for ID ${id} to Firestore:`, error);
    // Optionally, implement a retry mechanism or dead-letter queue for critical saves
  }
}

// Original Server Action for a single feature image (can be deprecated or kept for other uses)
export async function getAiImageForFeatureServerAction(promptText: string): Promise<string | null> {
  console.log(`[Server Action - getAiImageForFeature] Received prompt: "${promptText}"`);
  'use server';
  try {
    // Assuming generateMultipleImagesFlow can handle a single item array for consistency,
    // or you can call a specific single image generation flow if you create one.
    const results = await generateMultipleImagesFlow({ prompts: [{ id: 'single-feature', prompt: promptText, styleHint: 'featureCard' }] });
    const imageUri = results.results[0]?.imageUri || null;
    console.log(`[Server Action - getAiImageForFeature] Resulting URI for "${promptText}": ${imageUri ? imageUri.substring(0,50)+'...' : 'null'}`);
    return imageUri;
  } catch (error) {
    console.error(`[Server Action - getAiImageForFeature] Error generating image for prompt "${promptText}":`, error);
    return null;
  }
}

// Server action for popular destinations (from travel page)
export async function getPopularDestinations(
  input: { userLatitude?: number; userLongitude?: number }
): Promise<PopularDestinationsOutput> {
  'use server'; // Ensure this is a server action
  console.log(`[Server Action - getPopularDestinations] Input:`, input);
  try {
    // Dynamically import the flow to ensure it's only part of this server action's bundle if needed.
    const { popularDestinationsFlow } = await import('@/ai/flows/popular-destinations-flow');
    const result = await popularDestinationsFlow(input);
    console.log(`[Server Action - getPopularDestinations] AI Flow Result (destinations with images):`, result.destinations.map(d => ({name: d.name, imageUriProvided: !!d.imageUri})));
    return result;
  } catch (error) {
    console.error('[Server Action - getPopularDestinations] ERROR fetching popular destinations:', error);
    return { destinations: [], contextualNote: "Sorry, we encountered an error while fetching destination ideas." };
  }
}

