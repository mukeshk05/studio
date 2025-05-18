
'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firestore } from './firebase';
import { collection, addDoc, deleteDoc, doc, getDocs, updateDoc, query, where, serverTimestamp, orderBy, limit, setDoc, getDoc } from 'firebase/firestore';
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

  return useMutation<string, Error, Omit<Itinerary, 'id'>>({
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

  return useMutation<string, Error, Omit<PriceTrackerEntry, 'id' | 'lastChecked' | 'aiAdvice' | 'createdAt' | 'alertStatus'>>({
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
export function useSearchHistory(count: number = 10) {
  const { currentUser } = useAuth();

  return useQuery<SearchHistoryEntry[], Error>({
    queryKey: [SEARCH_HISTORY_QUERY_KEY, currentUser?.uid, count],
    queryFn: async () => {
      if (!currentUser) throw new Error("User not authenticated to fetch search history");
      const historyCollectionRef = collection(firestore, 'users', currentUser.uid, 'searchHistory');
      const q = query(historyCollectionRef, orderBy('searchedAt', 'desc'), limit(count));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, searchedAt: doc.data().searchedAt?.toDate() || new Date() } as SearchHistoryEntry));
    },
    enabled: !!currentUser,
    staleTime: 1000 * 60 * 15,
  });
}

// Function to be called by Genkit tool to fetch search history
export async function getRecentUserSearchHistory(userId: string, count: number = 5): Promise<SearchHistoryEntry[]> {
  if (!userId) {
    console.error("getRecentUserSearchHistory: userId is required.");
    return [];
  }
  try {
    const historyCollectionRef = collection(firestore, 'users', userId, 'searchHistory');
    const q = query(historyCollectionRef, orderBy('searchedAt', 'desc'), limit(count));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        return {
            id: docSnapshot.id,
            destination: data.destination,
            travelDates: data.travelDates,
            budget: data.budget,
            searchedAt: data.searchedAt?.toDate() || new Date(), // Convert Timestamp to Date
        } as SearchHistoryEntry;
    });
  } catch (error) {
    console.error(`Error fetching search history for user ${userId}:`, error);
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
      // Store persona in a specific doc, e.g., users/{userId}/profile/travelPersona
      const personaDocRef = doc(firestore, 'users', currentUser.uid, 'profile', 'travelPersona');
      await setDoc(personaDocRef, {
        ...personaData,
        lastUpdated: serverTimestamp(),
      }, { merge: true }); // merge: true will create or update
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
        return {
            name: data.name,
            description: data.description,
            lastUpdated: data.lastUpdated?.toDate() || new Date(),
        } as UserTravelPersona;
      }
      return null;
    },
    enabled: !!currentUser,
    staleTime: 1000 * 60 * 15, // Cache for 15 minutes
  });
}

// Function to be called by Genkit tool to fetch user travel persona
export async function getUserTravelPersona(userId: string): Promise<UserTravelPersona | null> {
  if (!userId) {
    console.error("getUserTravelPersona: userId is required.");
    return null;
  }
  try {
    const personaDocRef = doc(firestore, 'users', userId, 'profile', 'travelPersona');
    const docSnap = await getDoc(personaDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
          name: data.name,
          description: data.description,
          lastUpdated: data.lastUpdated?.toDate() || new Date(),
      } as UserTravelPersona;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching travel persona for user ${userId}:`, error);
    return null;
  }
}
