
'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firestore } from './firebase'; // Ensure firestore is correctly initialized and exported
import { collection, addDoc, deleteDoc, doc, getDocs, updateDoc, query, where, serverTimestamp, orderBy, limit, setDoc, getDoc, documentId, Timestamp } from 'firebase/firestore';
import type { Itinerary, PriceTrackerEntry, SearchHistoryEntry, UserTravelPersona } from './types';
import { useAuth } from '@/contexts/AuthContext';

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
      const querySnapshot = await getDocs(tripsCollectionRef);
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

  return useMutation<string, Error, Omit<Itinerary, 'id' | 'aiGeneratedMemory'>>({
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
        lastModified: serverTimestamp() // Optional: track last modification
      });
    },
    onSuccess: (_data, variables) => {
      // Invalidate and refetch to update the UI
      queryClient.invalidateQueries({ queryKey: [SAVED_TRIPS_QUERY_KEY, currentUser?.uid] });
      // Optionally, optimistically update the cache if needed for immediate UI feedback
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

// Hook to add a search history entry
export function useAddSearchHistory() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<string, Error, Omit<SearchHistoryEntry, 'id' | 'searchedAt'>>({
    mutationFn: async (searchData) => {
      if (!currentUser) throw new Error("User not authenticated to save search history");
      const historyCollectionRef = collection(firestore, 'users', currentUser.uid, 'searchHistory');
      const docRef = await addDoc(historyCollectionRef, {
        ...searchData,
        searchedAt: serverTimestamp(),
      });
      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SEARCH_HISTORY_QUERY_KEY, currentUser?.uid] });
    },
    onError: (error) => {
      console.warn("Failed to save search history:", error.message);
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
        // Ensure searchedAt is converted to Date; default to now if missing/invalid for robustness
        let searchedAtDate = new Date(); 
        if (data.searchedAt instanceof Timestamp) {
          searchedAtDate = data.searchedAt.toDate();
        } else if (typeof data.searchedAt === 'string' || typeof data.searchedAt === 'number') {
          const parsedDate = new Date(data.searchedAt);
          if (!isNaN(parsedDate.getTime())) {
            searchedAtDate = parsedDate;
          }
        }
        return { 
          ...data, 
          id: doc.id, 
          searchedAt: searchedAtDate 
        } as SearchHistoryEntry;
      });
    },
    enabled: !!currentUser,
    staleTime: 1000 * 60 * 15,
  });
}

// Function to be called by Genkit tool to fetch user search history
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
        let searchedAtDate = new Date(); 
        if (data.searchedAt instanceof Timestamp) {
          searchedAtDate = data.searchedAt.toDate();
        } else if (data.searchedAt && (typeof data.searchedAt === 'string' || typeof data.searchedAt === 'number' || (typeof data.searchedAt === 'object' && typeof data.searchedAt.seconds === 'number'))) {
          const tsSeconds = data.searchedAt.seconds || (typeof data.searchedAt === 'number' ? data.searchedAt / 1000 : undefined);
          const tsNanos = data.searchedAt.nanoseconds || 0;
          if (tsSeconds !== undefined) {
            searchedAtDate = new Timestamp(tsSeconds, tsNanos).toDate();
          } else {
            const parsed = new Date(data.searchedAt); 
            if (!isNaN(parsed.getTime())) {
              searchedAtDate = parsed;
            } else {
              console.warn(`[FirestoreHooks] Could not parse searchedAt for doc ${docSnapshot.id}:`, data.searchedAt);
            }
          }
        } else if (data.searchedAt) {
            console.warn(`[FirestoreHooks] Unexpected searchedAt format for doc ${docSnapshot.id}:`, data.searchedAt);
        }
        
        return {
            id: docSnapshot.id,
            destination: data.destination || "Unknown Destination",
            travelDates: data.travelDates || "Unknown Dates",
            budget: typeof data.budget === 'number' ? data.budget : 0,
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

// Hook to save/update user travel persona
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

// Hook to get user travel persona (primarily for client-side display if needed)
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
    staleTime: 1000 * 60 * 15, // Cache persona for 15 minutes
  });
}

// Function to be called by Genkit tool to fetch user travel persona
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
      let lastUpdatedDate = new Date();
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

// Function to get all saved trips for a user (server-side or tool use)
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
      // Add robust timestamp handling for nested properties if any exist
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

// Function to get a single saved trip by its ID (server-side or tool use)
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
