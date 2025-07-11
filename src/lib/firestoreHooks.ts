
'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firestore, auth } from './firebase'; // Import auth
import { collection, addDoc, deleteDoc, doc, getDocs, updateDoc, query, where, serverTimestamp, orderBy, limit, setDoc, getDoc, documentId, Timestamp } from 'firebase/firestore';
import type { Itinerary, PriceTrackerEntry, SearchHistoryEntry, UserTravelPersona, TripPackageSuggestion, AITripPlannerInput, AITripPlannerOutput, QuizResult, SavedPackingList, SavedComparison, SavedAccessibilityReport, SavedToolResult, SavedAiFeatureResult, SavedIdea, BundleSuggestion } from './types';
import { useAuth } from '@/contexts/AuthContext';
import type { SerpApiFlightSearchOutput, SerpApiHotelSearchOutput } from '@/ai/types/serpapi-flight-search-types';


// --- Saved Trips Hooks ---

const SAVED_TRIPS_QUERY_KEY = 'savedTrips';
const MAX_IMAGE_URI_LENGTH_FIRESTORE = 1000000; // Approx 1MB, slightly less than Firestore's limit for a single field

// Hook to get saved trips
export function useSavedTrips() {
  const { currentUser, loading: authLoading } = useAuth();

  return useQuery<Itinerary[], Error>({
    queryKey: [SAVED_TRIPS_QUERY_KEY, currentUser?.uid],
    queryFn: async () => {
      const user = auth.currentUser;
      if (!user?.uid) {
        return []; 
      }
      
      const tripsCollectionRef = collection(firestore, 'users', user.uid, 'savedTrips');
      
      try {
        const querySnapshot = await getDocs(tripsCollectionRef);
        return querySnapshot.docs.map(docSnapshot => ({ ...docSnapshot.data() as Omit<Itinerary, 'id'>, id: docSnapshot.id }));
      } catch (e: any) { 
        if (e.code === 'permission-denied') {
          // This can happen during auth state changes. Return empty to avoid crash and console error.
          console.warn("[useSavedTrips] Permission denied. This may be due to auth state change. Silently failing.");
          return []; 
        }
        // For other errors, it might be useful to log them but still return empty to avoid crashing UI.
        console.error("[useSavedTrips] Unexpected Firestore error: ", e);
        throw e; // Re-throw other errors so react-query can handle them
      }
    },
    enabled: !authLoading && !!currentUser,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook to add a saved trip
export function useAddSavedTrip() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<string, Error, Omit<Itinerary, 'id' | 'aiGeneratedMemory' | 'aiTripSummary'>>({
    mutationFn: async (newTripData) => {
      try {
        const user = auth.currentUser;
        if (!user?.uid) throw new Error("User not authenticated");
        const tripsCollectionRef = collection(firestore, 'users', user.uid, 'savedTrips');
        const docRef = await addDoc(tripsCollectionRef, { ...newTripData, createdAt: serverTimestamp() });
        return docRef.id;
      } catch (e: any) {
        if (e.code === 'permission-denied') {
          throw new Error("Permission denied. Your session might be initializing, please try again.");
        }
        throw e;
      }
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
      try {
        const user = auth.currentUser;
        if (!user?.uid) throw new Error("User not authenticated");
        const tripDocRef = doc(firestore, 'users', user.uid, 'savedTrips', tripId);
        await deleteDoc(tripDocRef);
      } catch (e: any) {
        if (e.code === 'permission-denied') {
          throw new Error("Permission denied. Your session might be initializing, please try again.");
        }
        throw e;
      }
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
      try {
        const user = auth.currentUser;
        if (!user?.uid) throw new Error("User not authenticated");
        const tripDocRef = doc(firestore, 'users', user.uid, 'savedTrips', tripId);
        await updateDoc(tripDocRef, {
          aiGeneratedMemory: memory,
          lastModified: serverTimestamp()
        });
      } catch (e: any) {
        if (e.code === 'permission-denied') {
          throw new Error("Permission denied. Your session might be initializing, please try again.");
        }
        throw e;
      }
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
      try {
        const user = auth.currentUser;
        if (!user?.uid) throw new Error("User not authenticated");
        const tripDocRef = doc(firestore, 'users', user.uid, 'savedTrips', tripId);
        await updateDoc(tripDocRef, {
          aiTripSummary: summary,
          lastModified: serverTimestamp()
        });
      } catch (e: any) {
        if (e.code === 'permission-denied') {
          throw new Error("Permission denied. Your session might be initializing, please try again.");
        }
        throw e;
      }
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
  const { currentUser, loading: authLoading } = useAuth();

  return useQuery<PriceTrackerEntry[], Error>({
    queryKey: [TRACKED_ITEMS_QUERY_KEY, currentUser?.uid],
    queryFn: async () => {
      const user = auth.currentUser;
      if (!user?.uid) {
        return [];
      }
      try {
        const itemsCollectionRef = collection(firestore, 'users', user.uid, 'trackedItems');
        const q = query(itemsCollectionRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ ...doc.data() as Omit<PriceTrackerEntry, 'id'>, id: doc.id }));
      } catch (e: any) {
        if (e.code === 'permission-denied') {
          console.warn("[useTrackedItems] Permission denied. This may be due to auth state change. Silently failing.");
          return [];
        }
        console.error("[useTrackedItems] Unexpected Firestore error: ", e);
        throw e;
      }
    },
    enabled: !authLoading && !!currentUser,
    staleTime: 1000 * 60 * 5,
  });
}

// Hook to add a tracked item
export function useAddTrackedItem() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<string, Error, Partial<Omit<PriceTrackerEntry, 'id' | 'lastChecked' | 'createdAt'>>>({
    mutationFn: async (newItemData) => {
      try {
        const user = auth.currentUser;
        if (!user?.uid) throw new Error("User not authenticated");

        // Defensively remove any keys with undefined values
        const dataToSave = { ...newItemData };
        Object.keys(dataToSave).forEach(keyStr => {
            const key = keyStr as keyof typeof dataToSave;
            if (dataToSave[key] === undefined) {
                delete dataToSave[key];
            }
        });
        
        const itemsCollectionRef = collection(firestore, 'users', user.uid, 'trackedItems');
        const docRef = await addDoc(itemsCollectionRef, {
          ...dataToSave,
          lastChecked: new Date().toISOString(),
          createdAt: serverTimestamp(),
        });
        return docRef.id;
      } catch (e: any) {
        if (e.code === 'permission-denied') {
          throw new Error("Permission denied. Your session might be initializing, please try again.");
        }
        console.error("Firestore addDoc error:", e);
        throw e;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TRACKED_ITEMS_QUERY_KEY, currentUser?.uid] });
    },
    onError: (error) => {
      console.error("[useAddTrackedItem] Mutation Error:", error);
    }
  });
}

// Hook to update a tracked item
export function useUpdateTrackedItem() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<void, Error, { itemId: string; dataToUpdate: Partial<Omit<PriceTrackerEntry, 'id' | 'createdAt'>> }>({
    mutationFn: async ({ itemId, dataToUpdate }) => {
      try {
        const user = auth.currentUser;
        if (!user?.uid) throw new Error("User not authenticated");
        const itemDocRef = doc(firestore, 'users', user.uid, 'trackedItems', itemId);
        await updateDoc(itemDocRef, {
          ...dataToUpdate,
          lastChecked: new Date().toISOString(),
        });
      } catch (e: any) {
        if (e.code === 'permission-denied') {
          throw new Error("Permission denied. Your session might be initializing, please try again.");
        }
        throw e;
      }
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
      try {
        const user = auth.currentUser;
        if (!user?.uid) throw new Error("User not authenticated");
        const itemDocRef = doc(firestore, 'users', user.uid, 'trackedItems', itemId);
        await deleteDoc(itemDocRef);
      } catch (e: any) {
        if (e.code === 'permission-denied') {
          throw new Error("Permission denied. Your session might be initializing, please try again.");
        }
        throw e;
      }
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
      try {
        const user = auth.currentUser;
        if (!user?.uid) throw new Error("User not authenticated to save search history");
        const historyCollectionRef = collection(firestore, 'users', user.uid, 'searchHistory');
        
        const dataToSave: Partial<SearchHistoryEntry> = {
          userInput: searchData.userInput,
          flightResults: searchData.flightResults,
          hotelResults: searchData.hotelResults,
          aiItineraries: searchData.aiItineraries,
          tripPackages: searchData.tripPackages,
          searchedAt: serverTimestamp(),
        };
        
        if(searchData.userInput){
          dataToSave.destination = searchData.userInput.destination;
          dataToSave.travelDates = searchData.userInput.travelDates;
          dataToSave.budget = searchData.userInput.budget;
        } else {
          dataToSave.destination = "Unknown Destination";
          dataToSave.travelDates = "Unknown Dates";
          dataToSave.budget = 0;
        }
        
        console.log("[FirestoreHooks useAddSearchHistory] Attempting to save search history:", JSON.stringify(dataToSave, null, 2).substring(0, 1000) + "...");
  
  
        const docRef = await addDoc(historyCollectionRef, dataToSave as any); // Cast to any if cleaning is handled elsewhere
        return docRef.id;
      } catch (e: any) {
        if (e.code === 'permission-denied') {
          throw new Error("Permission denied. Your session might be initializing, please try again.");
        }
        throw e;
      }
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
  const { currentUser, loading: authLoading } = useAuth();

  return useQuery<SearchHistoryEntry[], Error>({
    queryKey: [SEARCH_HISTORY_QUERY_KEY, currentUser?.uid, count],
    queryFn: async () => {
      const user = auth.currentUser;
      if (!user?.uid) {
        return [];
      }
      try {
        const historyCollectionRef = collection(firestore, 'users', user.uid, 'searchHistory');
        const q = query(historyCollectionRef, orderBy('searchedAt', 'desc'), limit(count));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
          const data = doc.data();
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
               if(!isNaN(parsed.getTime())) {
                  searchedAtDate = parsed;
               } else {
                  console.warn(`[FirestoreHooks] Could not parse searchedAt for doc ${doc.id}:`, data.searchedAt);
               }
            }
          } else if (data.searchedAt) { 
              console.warn(`[FirestoreHooks] Unexpected searchedAt format for doc ${doc.id}:`, data.searchedAt, `Type: ${typeof data.searchedAt}`);
          }


          return {
            ...data,
            id: doc.id,
            searchedAt: searchedAtDate
          } as SearchHistoryEntry; 
        });
      } catch (e: any) {
        if (e.code === 'permission-denied') {
          console.warn("[useSearchHistory] Permission denied. This may be due to auth state change. Silently failing.");
          return [];
        }
        console.error("[useSearchHistory] Unexpected Firestore error: ", e);
        throw e;
      }
    },
    enabled: !authLoading && !!currentUser,
    staleTime: 1000 * 60 * 15, // 15 minutes
  });
}

// --- User Travel Persona Hooks ---
const USER_TRAVEL_PERSONA_QUERY_KEY = 'userTravelPersona';

export function useSaveUserTravelPersona() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<void, Error, Omit<UserTravelPersona, 'lastUpdated'>>({
    mutationFn: async (personaData) => {
      try {
        const user = auth.currentUser;
        if (!user?.uid) throw new Error("User not authenticated");
        const personaDocRef = doc(firestore, 'users', user.uid, 'profile', 'travelPersona');
        await setDoc(personaDocRef, {
          ...personaData,
          lastUpdated: serverTimestamp(),
        }, { merge: true });
      } catch (e: any) {
        if (e.code === 'permission-denied') {
          throw new Error("Permission denied. Your session might be initializing, please try again.");
        }
        throw e;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USER_TRAVEL_PERSONA_QUERY_KEY, currentUser?.uid] });
    },
  });
}

export function useGetUserTravelPersona() {
  const { currentUser, loading: authLoading } = useAuth();

  return useQuery<UserTravelPersona | null, Error>({
    queryKey: [USER_TRAVEL_PERSONA_QUERY_KEY, currentUser?.uid],
    queryFn: async () => {
      const user = auth.currentUser;
      if (!user?.uid) {
        return null;
      }
      try {
        const personaDocRef = doc(firestore, 'users', user.uid, 'profile', 'travelPersona');
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
      } catch (e: any) {
        if (e.code === 'permission-denied') {
          console.warn("[useGetUserTravelPersona] Permission denied. This may be due to auth state change. Silently failing.");
          return null;
        }
        console.error("[useGetUserTravelPersona] Unexpected Firestore error: ", e);
        throw e;
      }
    },
    enabled: !authLoading && !!currentUser,
    staleTime: 1000 * 60 * 15, // 15 minutes
  });
}

// --- Saved Trip Packages Hooks ---
const SAVED_TRIP_PACKAGES_QUERY_KEY = 'savedTripPackages';

export function useAddSavedPackage() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<string, Error, TripPackageSuggestion>({ 
    mutationFn: async (packageData) => {
      try {
        const user = auth.currentUser;
        const currentUserId = user?.uid; 
        if (!currentUserId) {
          console.error("[FirestoreHooks useAddSavedPackage] User ID is missing. Cannot save package. PackageData:", packageData, "CurrentUser:", user);
          throw new Error("User not authenticated");
        }
  
        const packagesCollectionRef = collection(firestore, 'users', currentUserId, 'savedTripPackages');
        
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...dataToSaveWithoutId } = packageData; 
        
        const finalDataToSave: Omit<TripPackageSuggestion, 'id'> = {
          ...dataToSaveWithoutId,
          userId: currentUserId, 
          createdAt: serverTimestamp(),
        };
        
        if (finalDataToSave.destinationImageUri && finalDataToSave.destinationImageUri.length > MAX_IMAGE_URI_LENGTH_FIRESTORE) {
          console.warn(`[FirestoreHooks useAddSavedPackage] destinationImageUri for package ${finalDataToSave.destinationQuery} is too long (${finalDataToSave.destinationImageUri.length} bytes). Setting to undefined.`);
          finalDataToSave.destinationImageUri = undefined; 
        }
  
        console.log("[FirestoreHooks useAddSavedPackage] Attempting to save package (data as received):", JSON.stringify(finalDataToSave, null, 2).substring(0,500)+"...");
  
        const docRef = await addDoc(packagesCollectionRef, finalDataToSave as any); // Cast to any if cleaning is done higher up
        return docRef.id;
      } catch (e: any) {
        if (e.code === 'permission-denied') {
          throw new Error("Permission denied. Your session might be initializing, please try again.");
        }
        throw e;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SAVED_TRIP_PACKAGES_QUERY_KEY, currentUser?.uid] });
    },
    onError: (error) => {
        console.error("[FirestoreHooks useAddSavedPackage] Error saving package:", error.message, error);
    }
  });
}

// --- Quiz History Hooks ---
const QUIZ_HISTORY_QUERY_KEY = 'quizHistory';

// Hook to get quiz history
export function useQuizHistory() {
  const { currentUser, loading: authLoading } = useAuth();

  return useQuery<QuizResult[], Error>({
    queryKey: [QUIZ_HISTORY_QUERY_KEY, currentUser?.uid],
    queryFn: async () => {
      const user = auth.currentUser;
      if (!user?.uid) {
        return [];
      }
      try {
        const historyCollectionRef = collection(firestore, 'users', user.uid, 'quizHistory');
        const q = query(historyCollectionRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            let createdAtDate = new Date();
            if (data.createdAt instanceof Timestamp) {
                createdAtDate = data.createdAt.toDate();
            } else if (data.createdAt) {
                const parsed = new Date(data.createdAt);
                if(!isNaN(parsed.getTime())) createdAtDate = parsed;
            }
          return { ...data, id: doc.id, createdAt: createdAtDate } as QuizResult
        });
      } catch (e: any) {
        if (e.code === 'permission-denied') {
          console.warn("[useQuizHistory] Permission denied, possibly during auth state change. Silently failing.");
          return [];
        }
        console.error("[useQuizHistory] Unexpected Firestore error: ", e);
        throw e;
      }
    },
    enabled: !authLoading && !!currentUser,
  });
}

// Hook to add a quiz result
export function useAddQuizResult() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<string, Error, Omit<QuizResult, 'id' | 'createdAt' | 'userId'>>({
    mutationFn: async (quizData) => {
      try {
        const user = auth.currentUser;
        if (!user?.uid) throw new Error("User not authenticated");
        
        const historyCollectionRef = collection(firestore, 'users', user.uid, 'quizHistory');
        const dataToSave = {
          ...quizData,
          userId: user.uid,
          createdAt: serverTimestamp(),
        };
        const docRef = await addDoc(historyCollectionRef, dataToSave);
        return docRef.id;
      } catch (e: any) {
        if (e.code === 'permission-denied') {
          throw new Error("Permission denied. Your session might be initializing, please try again.");
        }
        throw e;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUIZ_HISTORY_QUERY_KEY, currentUser?.uid] });
    },
  });
}

// Hook to remove a quiz result
export function useRemoveQuizResult() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (quizResultId: string) => {
      try {
        const user = auth.currentUser;
        if (!user?.uid) throw new Error("User not authenticated");
        const resultDocRef = doc(firestore, 'users', user.uid, 'quizHistory', quizResultId);
        await deleteDoc(resultDocRef);
      } catch (e: any) {
        if (e.code === 'permission-denied') {
          throw new Error("Permission denied. Your session might be initializing, please try again.");
        }
        throw e;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUIZ_HISTORY_QUERY_KEY, currentUser?.uid] });
    },
  });
}

// --- Saved Tool Result Hooks ---

const SAVED_TOOL_RESULTS_QUERY_KEY = 'savedToolResults';

export function useAddSavedPackingList() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<string, Error, Omit<SavedPackingList, 'id' | 'createdAt' | 'userId'>>({
    mutationFn: async (listData) => {
      const user = auth.currentUser;
      if (!user?.uid) throw new Error("User not authenticated");
      const listsCollectionRef = collection(firestore, 'users', user.uid, 'savedToolResults');
      const docRef = await addDoc(listsCollectionRef, { ...listData, toolType: 'packingList', userId: user.uid, createdAt: serverTimestamp() });
      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SAVED_TOOL_RESULTS_QUERY_KEY, currentUser?.uid] });
    },
  });
}

export function useAddSavedComparison() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<string, Error, Omit<SavedComparison, 'id' | 'createdAt' | 'userId'>>({
    mutationFn: async (comparisonData) => {
      const user = auth.currentUser;
      if (!user?.uid) throw new Error("User not authenticated");
      const comparisonsCollectionRef = collection(firestore, 'users', user.uid, 'savedToolResults');
      const docRef = await addDoc(comparisonsCollectionRef, { ...comparisonData, toolType: 'comparison', userId: user.uid, createdAt: serverTimestamp() });
      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SAVED_TOOL_RESULTS_QUERY_KEY, currentUser?.uid] });
    },
  });
}

export function useAddSavedAccessibilityReport() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<string, Error, Omit<SavedAccessibilityReport, 'id' | 'createdAt' | 'userId'>>({
    mutationFn: async (reportData) => {
      const user = auth.currentUser;
      if (!user?.uid) throw new Error("User not authenticated");
      const reportsCollectionRef = collection(firestore, 'users', user.uid, 'savedToolResults');
      const docRef = await addDoc(reportsCollectionRef, { ...reportData, toolType: 'accessibilityReport', userId: user.uid, createdAt: serverTimestamp() });
      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SAVED_TOOL_RESULTS_QUERY_KEY, currentUser?.uid] });
    },
  });
}

// Hook to get all saved tool results
export function useSavedToolResults() {
  const { currentUser, loading: authLoading } = useAuth();

  return useQuery<SavedToolResult[], Error>({
    queryKey: [SAVED_TOOL_RESULTS_QUERY_KEY, currentUser?.uid],
    queryFn: async () => {
      const user = auth.currentUser;
      if (!user?.uid) return [];
      try {
        const resultsCollectionRef = collection(firestore, 'users', user.uid, 'savedToolResults');
        const q = query(resultsCollectionRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
          const data = doc.data();
          let createdAtDate = new Date();
          if (data.createdAt instanceof Timestamp) {
            createdAtDate = data.createdAt.toDate();
          } else if (data.createdAt) {
            const parsed = new Date(data.createdAt);
            if (!isNaN(parsed.getTime())) createdAtDate = parsed;
          }
          return { ...data, id: doc.id, createdAt: createdAtDate } as SavedToolResult;
        });
      } catch (e: any) {
        if (e.code === 'permission-denied') {
          console.warn("[useSavedToolResults] Permission denied. This may be due to auth state change. Silently failing.");
          return [];
        }
        console.error("[useSavedToolResults] Unexpected Firestore error: ", e);
        throw e;
      }
    },
    enabled: !authLoading && !!currentUser,
  });
}

// Hook to remove a saved tool result
export function useRemoveSavedToolResult() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (resultId: string) => {
      try {
        const user = auth.currentUser;
        if (!user?.uid) throw new Error("User not authenticated");
        const resultDocRef = doc(firestore, 'users', user.uid, 'savedToolResults', resultId);
        await deleteDoc(resultDocRef);
      } catch (e: any) {
        if (e.code === 'permission-denied') {
          throw new Error("Permission denied. Your session might be initializing, please try again.");
        }
        throw e;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SAVED_TOOL_RESULTS_QUERY_KEY, currentUser?.uid] });
    },
  });
}

// --- Saved AI Features Hooks ---

const SAVED_AI_FEATURES_QUERY_KEY = 'savedAiFeatures';

// Generic hook to add any AI feature result
export function useAddSavedAiFeature() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<string, Error, Omit<SavedAiFeatureResult, 'id' | 'createdAt' | 'userId'>>({
    mutationFn: async (featureData) => {
      const user = auth.currentUser;
      if (!user?.uid) throw new Error("User not authenticated");
      const featuresCollectionRef = collection(firestore, 'users', user.uid, 'savedAiFeatures');
      const docRef = await addDoc(featuresCollectionRef, { ...featureData, userId: user.uid, createdAt: serverTimestamp() });
      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SAVED_AI_FEATURES_QUERY_KEY, currentUser?.uid] });
    },
  });
}

// Hook to get all saved AI feature results
export function useSavedAiFeatureResults() {
  const { currentUser, loading: authLoading } = useAuth();

  return useQuery<SavedAiFeatureResult[], Error>({
    queryKey: [SAVED_AI_FEATURES_QUERY_KEY, currentUser?.uid],
    queryFn: async () => {
      const user = auth.currentUser;
      if (!user?.uid) return [];
      try {
        const resultsCollectionRef = collection(firestore, 'users', user.uid, 'savedAiFeatures');
        const q = query(resultsCollectionRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
          const data = doc.data();
          let createdAtDate = new Date();
          if (data.createdAt instanceof Timestamp) {
            createdAtDate = data.createdAt.toDate();
          } else if (data.createdAt) {
            const parsed = new Date(data.createdAt);
            if (!isNaN(parsed.getTime())) createdAtDate = parsed;
          }
          return { ...data, id: doc.id, createdAt: createdAtDate } as SavedAiFeatureResult;
        });
      } catch (e: any) {
        if (e.code === 'permission-denied') {
          console.warn("[useSavedAiFeatureResults] Permission denied. This may be due to auth state change. Silently failing.");
          return [];
        }
        console.error("[useSavedAiFeatureResults] Unexpected Firestore error: ", e);
        throw e;
      }
    },
    enabled: !authLoading && !!currentUser,
  });
}

// Hook to remove a saved AI feature result
export function useRemoveSavedAiFeatureResult() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (resultId: string) => {
      try {
        const user = auth.currentUser;
        if (!user?.uid) throw new Error("User not authenticated");
        const resultDocRef = doc(firestore, 'users', user.uid, 'savedAiFeatures', resultId);
        await deleteDoc(resultDocRef);
      } catch (e: any) {
        if (e.code === 'permission-denied') {
          throw new Error("Permission denied. Your session might be initializing, please try again.");
        }
        throw e;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SAVED_AI_FEATURES_QUERY_KEY, currentUser?.uid] });
    },
  });
}

// --- Saved Ideas Hooks ---
const SAVED_IDEAS_QUERY_KEY = 'savedIdeas';

export function useAddSavedIdea() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<string, Error, { bundle: BundleSuggestion }>({
    mutationFn: async (ideaData) => {
      const user = auth.currentUser;
      if (!user?.uid) throw new Error("User not authenticated");
      const ideasCollectionRef = collection(firestore, 'users', user.uid, 'savedIdeas');
      const docRef = await addDoc(ideasCollectionRef, { ...ideaData, userId: user.uid, createdAt: serverTimestamp() });
      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SAVED_IDEAS_QUERY_KEY, currentUser?.uid] });
    },
  });
}

export function useSavedIdeas() {
  const { currentUser, loading: authLoading } = useAuth();

  return useQuery<SavedIdea[], Error>({
    queryKey: [SAVED_IDEAS_QUERY_KEY, currentUser?.uid],
    queryFn: async () => {
      const user = auth.currentUser;
      if (!user?.uid) return [];
      try {
        const ideasCollectionRef = collection(firestore, 'users', user.uid, 'savedIdeas');
        const q = query(ideasCollectionRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
          const data = doc.data();
          return { ...data, id: doc.id } as SavedIdea;
        });
      } catch (e: any) {
        if (e.code === 'permission-denied') {
          console.warn("[useSavedIdeas] Permission denied. This may be due to auth state change. Silently failing.");
          return [];
        }
        console.error("[useSavedIdeas] Unexpected Firestore error: ", e);
        throw e;
      }
    },
    enabled: !authLoading && !!currentUser,
  });
}

export function useRemoveSavedIdea() {
    const { currentUser } = useAuth();
    const queryClient = useQueryClient();
  
    return useMutation<void, Error, string>({
      mutationFn: async (ideaId: string) => {
        const user = auth.currentUser;
        if (!user?.uid) throw new Error("User not authenticated");
        const ideaDocRef = doc(firestore, 'users', user.uid, 'savedIdeas', ideaId);
        await deleteDoc(ideaDocRef);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [SAVED_IDEAS_QUERY_KEY, currentUser?.uid] });
      },
    });
}

    