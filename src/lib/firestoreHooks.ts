
'use client';
import { useQuery, useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { firestore } from './firebase';
import { collection, addDoc, deleteDoc, doc, getDocs, updateDoc, query, where, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import type { Itinerary, PriceTrackerEntry, SearchHistoryEntry } from './types';
import { useAuth } from '@/contexts/AuthContext';

// --- Saved Trips Hooks ---

const SAVED_TRIPS_QUERY_KEY = 'savedTrips';

// Hook to get saved trips
export function useSavedTrips() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  return useQuery<Itinerary[], Error>({
    queryKey: [SAVED_TRIPS_QUERY_KEY, currentUser?.uid],
    queryFn: async () => {
      if (!currentUser) throw new Error("User not authenticated");
      const tripsCollectionRef = collection(firestore, 'users', currentUser.uid, 'savedTrips');
      const querySnapshot = await getDocs(tripsCollectionRef);
      return querySnapshot.docs.map(doc => ({ ...doc.data() as Omit<Itinerary, 'id'>, id: doc.id }));
    },
    enabled: !!currentUser, // Only run query if user is logged in
    staleTime: 1000 * 60 * 5, // 5 minutes
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
      // Order by createdAt to show newest first, or lastChecked
      const q = query(itemsCollectionRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ ...doc.data() as Omit<PriceTrackerEntry, 'id'>, id: doc.id }));
    },
    enabled: !!currentUser,
    staleTime: 1000 * 60 * 5, // 5 minutes
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
        lastChecked: new Date().toISOString(), // Always update lastChecked on any update
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.setQueryData<PriceTrackerEntry[]>([TRACKED_ITEMS_QUERY_KEY, currentUser?.uid], (oldData) =>
        oldData?.map(item => item.id === variables.itemId ? { ...item, ...variables.dataToUpdate, lastChecked: new Date().toISOString() } : item)
      );
      // queryClient.invalidateQueries({ queryKey: [TRACKED_ITEMS_QUERY_KEY, currentUser?.uid] });
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
      // Optionally, you can log this error or show a non-blocking toast
      console.warn("Failed to save search history:", error.message);
    }
  });
}

// Hook to get search history (e.g., last 10 entries)
export function useSearchHistory(count: number = 10) {
  const { currentUser } = useAuth();

  return useQuery<SearchHistoryEntry[], Error>({
    queryKey: [SEARCH_HISTORY_QUERY_KEY, currentUser?.uid, count],
    queryFn: async () => {
      if (!currentUser) throw new Error("User not authenticated to fetch search history");
      const historyCollectionRef = collection(firestore, 'users', currentUser.uid, 'searchHistory');
      const q = query(historyCollectionRef, orderBy('searchedAt', 'desc'), limit(count));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ ...doc.data() as Omit<SearchHistoryEntry, 'id'>, id: doc.id }));
    },
    enabled: !!currentUser,
    staleTime: 1000 * 60 * 15, // 15 minutes for search history
  });
}
