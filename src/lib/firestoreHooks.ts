
'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firestore } from './firebase'; // Ensure firestore is correctly initialized and exported
import { collection, addDoc, deleteDoc, doc, getDocs, updateDoc, query, where, serverTimestamp, orderBy, limit, setDoc, getDoc, documentId, Timestamp } from 'firebase/firestore';
import type { Itinerary, PriceTrackerEntry, SearchHistoryEntry, UserTravelPersona, TripPackageSuggestion, AITripPlannerInput, AITripPlannerOutput } from './types';
import { useAuth } from '@/contexts/AuthContext';
import type { SerpApiFlightSearchOutput, SerpApiHotelSearchOutput } from '@/ai/types/serpapi-flight-search-types';


// --- Saved Trips Hooks ---

const SAVED_TRIPS_QUERY_KEY = 'savedTrips';

// Hook to get saved trips
export function useSavedTrips() {
  const { currentUser } = useAuth();

  return useQuery<Itinerary[], Error>({
    queryKey: [SAVED_TRIPS_QUERY_KEY, currentUser?.uid],
    queryFn: async () => {
      if (!currentUser) throw new Error("User not authenticated");
      const tripsCollectionRef = collection(firestore, 'users', currentUser.uid, 'savedTrips');
      const q = query(tripsCollectionRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ ...doc.data() as Omit<Itinerary, 'id'>, id: doc.id }));
    },
    enabled: !!currentUser,
    staleTime: 1000 * 60 * 5,
  });
}

// Hook to add a saved trip
export function useAddSavedTrip() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<string, Error, Omit<Itinerary, 'id' | 'aiGeneratedMemory' | 'aiTripSummary'>>({
    mutationFn: async (newTripData) => {
      if (!currentUser) throw new Error("User not authenticated");
      const tripsCollectionRef = collection(firestore, 'users', currentUser.uid, 'savedTrips');
      const docRef = await addDoc(tripsCollectionRef, { ...newTripData, createdAt: serverTimestamp() });
      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SAVED_TRIPS_QUERY_KEY, currentUser?.uid] });
    },
  });
}

// Hook to remove a saved trip
export function useRemoveSavedTrip() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (tripId) => {
      if (!currentUser) throw new Error("User not authenticated");
      const tripDocRef = doc(firestore, 'users', currentUser.uid, 'savedTrips', tripId);
      await deleteDoc(tripDocRef);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SAVED_TRIPS_QUERY_KEY, currentUser?.uid] });
    },
  });
}

// Hook to update AI generated memory for a saved trip
export function useUpdateSavedTripMemory() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<void, Error, { tripId: string; memory: { memoryText: string; generatedAt: string; } }>({
    mutationFn: async ({ tripId, memory }) => {
      if (!currentUser) throw new Error("User not authenticated");
      const tripDocRef = doc(firestore, 'users', currentUser.uid, 'savedTrips', tripId);
      await updateDoc(tripDocRef, {
        aiGeneratedMemory: memory,
        lastModified: serverTimestamp()
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.setQueryData([SAVED_TRIPS_QUERY_KEY, currentUser?.uid], (oldData: Itinerary[] | undefined) =>
        oldData?.map(trip =>
          trip.id === variables.tripId ? { ...trip, aiGeneratedMemory: variables.memory } : trip
        )
      );
    },
    onError: (error) => {
      console.error("Error updating trip memory:", error);
    }
  });
}

// Hook to update AI generated trip summary for a saved trip
export function useUpdateSavedTripSummary() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<void, Error, { tripId: string; summary: { text: string; generatedAt: string; } }>({
    mutationFn: async ({ tripId, summary }) => {
      if (!currentUser) throw new Error("User not authenticated");
      const tripDocRef = doc(firestore, 'users', currentUser.uid, 'savedTrips', tripId);
      await updateDoc(tripDocRef, {
        aiTripSummary: summary,
        lastModified: serverTimestamp()
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.setQueryData([SAVED_TRIPS_QUERY_KEY, currentUser?.uid], (oldData: Itinerary[] | undefined) =>
        oldData?.map(trip =>
          trip.id === variables.tripId ? { ...trip, aiTripSummary: variables.summary } : trip
        )
      );
    },
    onError: (error) => {
      console.error("Error updating trip summary:", error);
    }
  });
}


// --- Price Tracker Hooks ---

const TRACKED_ITEMS_QUERY_KEY = 'trackedItems';

// Hook to get tracked items
export function useTrackedItems() {
  const { currentUser } = useAuth();

  return useQuery<PriceTrackerEntry[], Error>({
    queryKey: [TRACKED_ITEMS_QUERY_KEY, currentUser?.uid],
    queryFn: async () => {
      if (!currentUser) throw new Error("User not authenticated");
      const itemsCollectionRef = collection(firestore, 'users', currentUser.uid, 'trackedItems');
      const q = query(itemsCollectionRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ ...doc.data() as Omit<PriceTrackerEntry, 'id'>, id: doc.id }));
    },
    enabled: !!currentUser,
    staleTime: 1000 * 60 * 5,
  });
}

// Hook to add a tracked item
export function useAddTrackedItem() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<string, Error, Omit<PriceTrackerEntry, 'id' | 'lastChecked' | 'aiAdvice' | 'createdAt' | 'alertStatus' | 'priceForecast'>>({
    mutationFn: async (newItemData) => {
      if (!currentUser) throw new Error("User not authenticated");
      const itemsCollectionRef = collection(firestore, 'users', currentUser.uid, 'trackedItems');
      const docRef = await addDoc(itemsCollectionRef, {
        ...newItemData,
        lastChecked: new Date().toISOString(),
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TRACKED_ITEMS_QUERY_KEY, currentUser?.uid] });
    },
  });
}

// Hook to update a tracked item
export function useUpdateTrackedItem() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<void, Error, { itemId: string; dataToUpdate: Partial<Omit<PriceTrackerEntry, 'id' | 'createdAt'>> }>({
    mutationFn: async ({ itemId, dataToUpdate }) => {
      if (!currentUser) throw new Error("User not authenticated");
      const itemDocRef = doc(firestore, 'users', currentUser.uid, 'trackedItems', itemId);
      await updateDoc(itemDocRef, {
        ...dataToUpdate,
        lastChecked: new Date().toISOString(),
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.setQueryData<PriceTrackerEntry[]>([TRACKED_ITEMS_QUERY_KEY, currentUser?.uid], (oldData) =>
        oldData?.map(item => item.id === variables.itemId ? { ...item, ...variables.dataToUpdate, lastChecked: new Date().toISOString() } : item)
      );
    },
  });
}

// Hook to remove a tracked item
export function useRemoveTrackedItem() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (itemId) => {
      if (!currentUser) throw new Error("User not authenticated");
      const itemDocRef = doc(firestore, 'users', currentUser.uid, 'trackedItems', itemId);
      await deleteDoc(itemDocRef);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TRACKED_ITEMS_QUERY_KEY, currentUser?.uid] });
    },
  });
}

// --- Search History Hooks ---
const SEARCH_HISTORY_QUERY_KEY = 'searchHistory';

// Helper function to clean data for Firestore
// This function is now more robust.
function cleanDataForFirestore(obj: any): any {
  // Step 1: Deep clone and initial sanitization with JSON.parse(JSON.stringify())
  // This removes functions, symbols, and converts top-level undefined properties (though not deeply nested undefined in objects)
  // and converts undefined array elements to null.
  let sanitizedObj;
  try {
    sanitizedObj = JSON.parse(JSON.stringify(obj));
  } catch (e) {
    // Fallback for circular references or other stringify errors
    console.warn("[Firestore Clean] Initial JSON.parse(JSON.stringify()) failed. Proceeding with recursive cleaning on original object structure.", e);
    
    // Create a structured clone if possible as a better fallback
    if (typeof globalThis.structuredClone === 'function') {
        try {
            sanitizedObj = structuredClone(obj);
        } catch (cloneError) {
            console.warn("[Firestore Clean] structuredClone also failed. Falling back to shallow copy for root.", cloneError);
            sanitizedObj = Array.isArray(obj) ? [...obj] : { ...obj };
        }
    } else {
        sanitizedObj = Array.isArray(obj) ? [...obj] : { ...obj };
    }
  }


  // Step 2: Recursive deep cleaning function
  function deepClean(current: any): any {
    if (current === undefined) {
      return null; // Convert standalone undefined to null
    }
    if (current === null || typeof current !== 'object') {
      return current; // Primitives or null are fine
    }

    if (Array.isArray(current)) {
      const cleanedArray = current
        .map(item => {
          if (Array.isArray(item)) { // Nested array
            console.warn(`[Firestore Clean] Nested array found and converted to string: ${JSON.stringify(item)}`);
            return JSON.stringify(item); // Stringify inner arrays
          }
          return deepClean(item); // Recursively clean other items
        })
        .filter(item => item !== undefined && item !== null); // Remove items that became undefined or null
      return cleanedArray;
    }

    // Handling objects
    const newObject: { [key: string]: any } = {};
    for (const key in current) {
      if (Object.prototype.hasOwnProperty.call(current, key)) {
        const value = current[key];
        if (value !== undefined) { // Skip properties that are already undefined
          const cleanedValue = deepClean(value);
          if (cleanedValue !== undefined) { // Only add if the cleaned value isn't undefined
            newObject[key] = cleanedValue;
          }
        }
      }
    }
    return newObject;
  }

  return deepClean(sanitizedObj);
}


// Hook to add a search history entry
export function useAddSearchHistory() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<string, Error, Omit<SearchHistoryEntry, 'id' | 'searchedAt'>>({
    mutationFn: async (searchData) => {
      if (!currentUser) throw new Error("User not authenticated to save search history");
      const historyCollectionRef = collection(firestore, 'users', currentUser.uid, 'searchHistory');
      
      const dataToSave = {
        ...searchData,
        destination: searchData.userInput.destination, // Ensure these top-level fields are present for quick display
        travelDates: searchData.userInput.travelDates,
        budget: searchData.userInput.budget,
        searchedAt: serverTimestamp(),
      };
      
      const cleanedData = cleanDataForFirestore(dataToSave);
      console.log("[FirestoreHooks] Attempting to save search history (cleaned):", JSON.stringify(cleanedData, null, 2).substring(0, 500) + "...");

      const docRef = await addDoc(historyCollectionRef, cleanedData);
      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SEARCH_HISTORY_QUERY_KEY, currentUser?.uid] });
    },
    onError: (error) => {
      console.error("Failed to save search history:", error.message, error);
    }
  });
}


// Hook to get search history (e.g., last N entries)
export function useSearchHistory(count: number = 20) {
  const { currentUser } = useAuth();

  return useQuery<SearchHistoryEntry[], Error>({
    queryKey: [SEARCH_HISTORY_QUERY_KEY, currentUser?.uid, count],
    queryFn: async () => {
      if (!currentUser) throw new Error("User not authenticated to fetch search history");
      const historyCollectionRef = collection(firestore, 'users', currentUser.uid, 'searchHistory');
      const q = query(historyCollectionRef, orderBy('searchedAt', 'desc'), limit(count));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        let searchedAtDate = new Date(); // Default to now if parsing fails
        if (data.searchedAt instanceof Timestamp) {
          searchedAtDate = data.searchedAt.toDate();
        } else if (data.searchedAt && (typeof data.searchedAt === 'string' || typeof data.searchedAt === 'number' || (typeof data.searchedAt === 'object' && typeof data.searchedAt.seconds === 'number'))) {
          // Handle cases where searchedAt might be a simple ISO string or millis from Firestore (less common now with serverTimestamp)
          const tsSeconds = data.searchedAt.seconds || (typeof data.searchedAt === 'number' ? data.searchedAt / 1000 : undefined);
          const tsNanos = data.searchedAt.nanoseconds || 0;
          if (tsSeconds !== undefined) {
            searchedAtDate = new Timestamp(tsSeconds, tsNanos).toDate();
          } else {
             const parsed = new Date(data.searchedAt); // Try parsing as string
             if(!isNaN(parsed.getTime())) {
                searchedAtDate = parsed;
             } else {
                console.warn(`[FirestoreHooks] Could not parse searchedAt for doc ${doc.id}:`, data.searchedAt);
             }
          }
        } else if (data.searchedAt) { // If searchedAt exists but is not a Timestamp or recognized format
            console.warn(`[FirestoreHooks] Unexpected searchedAt format for doc ${doc.id}:`, data.searchedAt, `Type: ${typeof data.searchedAt}`);
        }


        return {
          ...data,
          id: doc.id,
          searchedAt: searchedAtDate
        } as SearchHistoryEntry; 
      });
    },
    enabled: !!currentUser,
    staleTime: 1000 * 60 * 15, // 15 minutes
  });
}

export async function getRecentUserSearchHistory(userId: string, count: number = 5): Promise<SearchHistoryEntry[]> {
  console.log(`[FirestoreHooks] getRecentUserSearchHistory: Called for userId: ${userId}, count: ${count}`);
  if (!userId) {
    console.error("[FirestoreHooks] getRecentUserSearchHistory: userId is required. Returning empty array.");
    return [];
  }
  if (!firestore) {
    console.error("[FirestoreHooks] Firestore instance is undefined in getRecentUserSearchHistory. Cannot fetch history. Returning empty array.");
    return [];
  }
  try {
    console.log(`[FirestoreHooks] getRecentUserSearchHistory: Attempting query for user ${userId}.`);
    const historyCollectionRef = collection(firestore, 'users', userId, 'searchHistory');
    const q = query(historyCollectionRef, orderBy('searchedAt', 'desc'), limit(count));
    const querySnapshot = await getDocs(q);
    const history = querySnapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        // Robust date parsing for searchedAt
        let searchedAtDate = new Date(); // Default to now if parsing fails
        if (data.searchedAt instanceof Timestamp) {
          searchedAtDate = data.searchedAt.toDate();
        } else if (data.searchedAt && (typeof data.searchedAt === 'string' || typeof data.searchedAt === 'number' || (typeof data.searchedAt === 'object' && typeof data.searchedAt.seconds === 'number'))) {
          const tsSeconds = data.searchedAt.seconds || (typeof data.searchedAt === 'number' ? data.searchedAt / 1000 : undefined);
          const tsNanos = data.searchedAt.nanoseconds || 0;
          if (tsSeconds !== undefined) {
            searchedAtDate = new Timestamp(tsSeconds, tsNanos).toDate();
          } else {
             const parsed = new Date(data.searchedAt);
             if(!isNaN(parsed.getTime())) searchedAtDate = parsed;
             else console.warn(`[FirestoreHooks] Could not parse searchedAt for doc ${docSnapshot.id}:`, data.searchedAt);
          }
        } else if (data.searchedAt) {
            console.warn(`[FirestoreHooks] Unexpected searchedAt format for doc ${docSnapshot.id}:`, data.searchedAt);
        }

        return {
            id: docSnapshot.id,
            destination: data.destination || "Unknown Destination",
            travelDates: data.travelDates || "Unknown Dates",
            budget: typeof data.budget === 'number' ? data.budget : 0,
            userInput: data.userInput || {} as AITripPlannerInput,
            flightResults: data.flightResults || null,
            hotelResults: data.hotelResults || null,
            aiItineraries: data.aiItineraries || null,
            tripPackages: data.tripPackages || null,
            searchedAt: searchedAtDate,
        } as SearchHistoryEntry;
    });
    console.log(`[FirestoreHooks] getRecentUserSearchHistory: Fetched ${history.length} entries for userId ${userId}.`);
    return history;
  } catch (error: any) {
    console.error(`[FirestoreHooks] CRITICAL ERROR in getRecentUserSearchHistory for user ${userId}:`, error.message);
    console.error(`[FirestoreHooks] Full error object:`, error);
    if(error.stack) console.error(`[FirestoreHooks] Error stack:`, error.stack);
    return [];
  }
}

// --- User Travel Persona Hooks ---
const USER_TRAVEL_PERSONA_QUERY_KEY = 'userTravelPersona';

export function useSaveUserTravelPersona() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<void, Error, Omit<UserTravelPersona, 'lastUpdated'>>({
    mutationFn: async (personaData) => {
      if (!currentUser) throw new Error("User not authenticated");
      const personaDocRef = doc(firestore, 'users', currentUser.uid, 'profile', 'travelPersona');
      await setDoc(personaDocRef, {
        ...personaData,
        lastUpdated: serverTimestamp(),
      }, { merge: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USER_TRAVEL_PERSONA_QUERY_KEY, currentUser?.uid] });
    },
  });
}

export function useGetUserTravelPersona() {
  const { currentUser } = useAuth();

  return useQuery<UserTravelPersona | null, Error>({
    queryKey: [USER_TRAVEL_PERSONA_QUERY_KEY, currentUser?.uid],
    queryFn: async () => {
      if (!currentUser) return null;
      const personaDocRef = doc(firestore, 'users', currentUser.uid, 'profile', 'travelPersona');
      const docSnap = await getDoc(personaDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        let lastUpdatedDate = new Date();
        if (data.lastUpdated instanceof Timestamp) {
          lastUpdatedDate = data.lastUpdated.toDate();
        } else if (data.lastUpdated && (typeof data.lastUpdated === 'string' || typeof data.lastUpdated === 'number')) {
           const parsed = new Date(data.lastUpdated);
           if (!isNaN(parsed.getTime())) lastUpdatedDate = parsed;
        }
        return {
            name: data.name || "Traveler",
            description: data.description || "Enjoys exploring new places.",
            lastUpdated: lastUpdatedDate,
        } as UserTravelPersona;
      }
      return null;
    },
    enabled: !!currentUser,
    staleTime: 1000 * 60 * 15, // 15 minutes
  });
}

export async function getUserTravelPersona(userId: string): Promise<UserTravelPersona | null> {
  console.log(`[FirestoreHooks] getUserTravelPersona called for userId: ${userId}`);
  if (!userId) {
    console.error("[FirestoreHooks] getUserTravelPersona: userId is required.");
    return null;
  }
   if (!firestore) {
    console.error("[FirestoreHooks] Firestore instance is undefined in getUserTravelPersona. Returning null.");
    return null;
  }
  try {
    const personaDocRef = doc(firestore, 'users', userId, 'profile', 'travelPersona');
    const docSnap = await getDoc(personaDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      let lastUpdatedDate = new Date(); // Default if parsing fails
        if (data.lastUpdated instanceof Timestamp) {
          lastUpdatedDate = data.lastUpdated.toDate();
        } else if (data.lastUpdated && (typeof data.lastUpdated === 'string' || typeof data.lastUpdated === 'number')) {
           const parsed = new Date(data.lastUpdated);
           if (!isNaN(parsed.getTime())) lastUpdatedDate = parsed;
        }
      console.log(`[FirestoreHooks] Found travel persona for userId ${userId}:`, data.name);
      return {
          name: data.name || "Traveler",
          description: data.description || "Enjoys exploring new places.",
          lastUpdated: lastUpdatedDate,
      } as UserTravelPersona;
    }
    console.log(`[FirestoreHooks] No travel persona found for userId ${userId}.`);
    return null;
  } catch (error: any) {
    console.error(`[FirestoreHooks] CRITICAL ERROR fetching travel persona for user ${userId}:`, error.message, error.stack, error);
    return null;
  }
}

export async function getAllUserSavedTrips(userId: string): Promise<Itinerary[]> {
  console.log(`[FirestoreHooks] getAllUserSavedTrips called for userId: ${userId}`);
  if (!userId) {
    console.error("[FirestoreHooks] getAllUserSavedTrips: userId is required.");
    return [];
  }
  if (!firestore) {
    console.error("[FirestoreHooks] Firestore instance is undefined in getAllUserSavedTrips. Returning empty array.");
    return [];
  }
  try {
    const tripsCollectionRef = collection(firestore, 'users', userId, 'savedTrips');
    const querySnapshot = await getDocs(tripsCollectionRef);
    const trips = querySnapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      return {
        ...data,
        id: docSnapshot.id,
      } as Itinerary;
    });
    console.log(`[FirestoreHooks] Fetched ${trips.length} saved trips for userId ${userId}.`);
    return trips;
  } catch (error: any) {
    console.error(`[FirestoreHooks] Error fetching all saved trips for user ${userId}:`, error.message, error.stack);
    return [];
  }
}

export async function getSingleUserSavedTrip(userId: string, tripId: string): Promise<Itinerary | null> {
  console.log(`[FirestoreHooks] getSingleUserSavedTrip called for userId: ${userId}, tripId: ${tripId}`);
  if (!userId || !tripId) {
    console.error("[FirestoreHooks] getSingleUserSavedTrip: userId and tripId are required.");
    return null;
  }
  if (!firestore) {
    console.error("[FirestoreHooks] Firestore instance is undefined in getSingleUserSavedTrip. Returning null.");
    return null;
  }
  try {
    const tripDocRef = doc(firestore, 'users', userId, 'savedTrips', tripId);
    const docSnap = await getDoc(tripDocRef);
    if (docSnap.exists()) {
      const tripData = { ...docSnap.data() as Omit<Itinerary, 'id'>, id: docSnap.id };
      console.log(`[FirestoreHooks] Fetched single saved trip for userId ${userId}, tripId: ${tripId}.`);
      return tripData as Itinerary;
    } else {
      console.log(`[FirestoreHooks] No saved trip found for userId ${userId}, tripId: ${tripId}.`);
      return null;
    }
  } catch (error: any) {
    console.error(`[FirestoreHooks] Error fetching single saved trip for user ${userId}, tripId: ${tripId}:`, error.message, error.stack, error);
    return null;
  }
}

// --- Saved Trip Packages Hooks ---
const SAVED_TRIP_PACKAGES_QUERY_KEY = 'savedTripPackages';

export function useAddSavedPackage() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<string, Error, TripPackageSuggestion>({ 
    mutationFn: async (packageData) => {
      const currentUserId = packageData.userId || currentUser?.uid;
      if (!currentUserId) throw new Error("User ID is missing for saving package.");

      const packagesCollectionRef = collection(firestore, 'users', currentUserId, 'savedTripPackages');
      
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...dataToSaveWithoutId } = packageData; 
      
      const finalDataToSave = {
        ...dataToSaveWithoutId,
        userId: currentUserId,
        createdAt: serverTimestamp(),
      };
      const cleanedDataToSave = cleanDataForFirestore(finalDataToSave);
      console.log("[FirestoreHooks useAddSavedPackage] Attempting to save package (cleaned):", JSON.stringify(cleanedDataToSave, null, 2).substring(0,500)+"...");

      const docRef = await addDoc(packagesCollectionRef, cleanedDataToSave);
      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SAVED_TRIP_PACKAGES_QUERY_KEY, currentUser?.uid] });
    },
    onError: (error) => {
        console.error("[FirestoreHooks useAddSavedPackage] Error saving package:", error.message, error);
    }
  });
}

    