
// This file is for server-side Firestore utility functions.
// It should NOT have "use client" or "use server" at the top,
// so it can be imported by both server components and server actions.

import { firestore } from './firebase';
import { collection, getDocs, doc, getDoc, query, orderBy, limit, Timestamp, updateDoc } from 'firebase/firestore';
import type { Itinerary, SearchHistoryEntry, UserTravelPersona, PriceTrackerEntry } from './types';
import type { AITripPlannerInput } from '@/ai/types/trip-planner-types';

export async function getUsers(): Promise<{id: string, email: string | null}[]> {
  console.log(`[FirestoreServer] getUsers called.`);
  if (!firestore) {
    console.error("[FirestoreServer] Firestore instance is undefined in getUsers.");
    return [];
  }
  try {
    const usersCollectionRef = collection(firestore, 'users');
    const querySnapshot = await getDocs(usersCollectionRef);
    const users = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        email: data.email || null // Assuming email is stored at the root of the user doc
      };
    });
    console.log(`[FirestoreServer] Found ${users.length} users.`);
    return users;
  } catch (error: any) {
    console.error(`[FirestoreServer] CRITICAL ERROR in getUsers:`, error.message, error);
    return [];
  }
}

export async function getTrackedItemsForUser(userId: string): Promise<PriceTrackerEntry[]> {
  console.log(`[FirestoreServer] getTrackedItemsForUser called for userId: ${userId}`);
  if (!userId) {
    console.error("[FirestoreServer] getTrackedItemsForUser: userId is required.");
    return [];
  }
  if (!firestore) {
    console.error("[FirestoreServer] Firestore instance is undefined in getTrackedItemsForUser.");
    return [];
  }
  try {
    const itemsCollectionRef = collection(firestore, 'users', userId, 'trackedItems');
    const q = query(itemsCollectionRef);
    const querySnapshot = await getDocs(q);
    const items = querySnapshot.docs.map(doc => ({ ...doc.data() as Omit<PriceTrackerEntry, 'id'>, id: doc.id }));
    console.log(`[FirestoreServer] Fetched ${items.length} tracked items for user ${userId}.`);
    return items;
  } catch (error: any) {
    console.error(`[FirestoreServer] CRITICAL ERROR in getTrackedItemsForUser for user ${userId}:`, error.message, error);
    return [];
  }
}

export async function updateTrackedItemInFirestore(userId: string, itemId: string, dataToUpdate: Partial<Omit<PriceTrackerEntry, 'id'>>) {
    console.log(`[FirestoreServer] updateTrackedItemInFirestore called for userId: ${userId}, itemId: ${itemId}`);
    if (!userId || !itemId) {
        console.error("[FirestoreServer] updateTrackedItemInFirestore: userId and itemId are required.");
        return;
    }
    if (!firestore) {
        console.error("[FirestoreServer] Firestore instance is undefined in updateTrackedItemInFirestore.");
        return;
    }
    try {
        const itemDocRef = doc(firestore, 'users', userId, 'trackedItems', itemId);
        await updateDoc(itemDocRef, dataToUpdate);
        console.log(`[FirestoreServer] Successfully updated tracked item ${itemId} for user ${userId}.`);
    } catch (error: any) {
        console.error(`[FirestoreServer] CRITICAL ERROR in updateTrackedItemInFirestore for user ${userId}, item ${itemId}:`, error.message, error);
        throw error; // Re-throw to be handled by the flow
    }
}


export async function getRecentUserSearchHistory(userId: string, count: number = 5): Promise<SearchHistoryEntry[]> {
  console.log(`[FirestoreServer] getRecentUserSearchHistory: Called for userId: ${userId}, count: ${count}`);
  if (!userId) {
    console.error("[FirestoreServer] getRecentUserSearchHistory: userId is required. Returning empty array.");
    return [];
  }
  if (!firestore) {
    console.error("[FirestoreServer] Firestore instance is undefined in getRecentUserSearchHistory. Cannot fetch history. Returning empty array.");
    return [];
  }
  try {
    console.log(`[FirestoreServer] getRecentUserSearchHistory: Attempting query for user ${userId}.`);
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
             if(!isNaN(parsed.getTime())) searchedAtDate = parsed;
             else console.warn(`[FirestoreServer] Could not parse searchedAt for doc ${docSnapshot.id}:`, data.searchedAt);
          }
        } else if (data.searchedAt) {
            console.warn(`[FirestoreServer] Unexpected searchedAt format for doc ${docSnapshot.id}:`, data.searchedAt);
        }

        return {
            id: docSnapshot.id,
            destination: data.destination || data.userInput?.destination || "Unknown Destination",
            travelDates: data.travelDates || data.userInput?.travelDates || "Unknown Dates",
            budget: typeof data.budget === 'number' ? data.budget : (data.userInput?.budget || 0),
            userInput: data.userInput || {} as AITripPlannerInput,
            flightResults: data.flightResults || null,
            hotelResults: data.hotelResults || null,
            aiItineraries: data.aiItineraries || null,
            tripPackages: data.tripPackages || null,
            searchedAt: searchedAtDate,
        } as SearchHistoryEntry;
    });
    console.log(`[FirestoreServer] getRecentUserSearchHistory: Fetched ${history.length} entries for userId ${userId}.`);
    return history;
  } catch (error: any) {
    console.error(`[FirestoreServer] CRITICAL ERROR in getRecentUserSearchHistory for user ${userId}:`, error.message);
    console.error(`[FirestoreServer] Full error object:`, error);
    if(error.stack) console.error(`[FirestoreServer] Error stack:`, error.stack);
    return [];
  }
}

export async function getUserTravelPersona(userId: string): Promise<UserTravelPersona | null> {
  console.log(`[FirestoreServer] getUserTravelPersona called for userId: ${userId}`);
  if (!userId) {
    console.error("[FirestoreServer] getUserTravelPersona: userId is required.");
    return null;
  }
   if (!firestore) {
    console.error("[FirestoreServer] Firestore instance is undefined in getUserTravelPersona. Returning null.");
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
      console.log(`[FirestoreServer] Found travel persona for userId ${userId}:`, data.name);
      return {
          name: data.name || "Traveler",
          description: data.description || "Enjoys exploring new places.",
          lastUpdated: lastUpdatedDate,
      } as UserTravelPersona;
    }
    console.log(`[FirestoreServer] No travel persona found for userId ${userId}.`);
    return null;
  } catch (error: any) {
    console.error(`[FirestoreServer] CRITICAL ERROR fetching travel persona for user ${userId}:`, error.message, error.stack, error);
    return null;
  }
}

export async function getAllUserSavedTrips(userId: string): Promise<Itinerary[]> {
  console.log(`[FirestoreServer] getAllUserSavedTrips called for userId: ${userId}`);
  if (!userId) {
    console.error("[FirestoreServer] getAllUserSavedTrips: userId is required.");
    return [];
  }
  if (!firestore) {
    console.error("[FirestoreServer] Firestore instance is undefined in getAllUserSavedTrips. Returning empty array.");
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
    console.log(`[FirestoreServer] Fetched ${trips.length} saved trips for userId ${userId}.`);
    return trips;
  } catch (error: any) {
    console.error(`[FirestoreServer] Error fetching all saved trips for user ${userId}:`, error.message, error.stack);
    return [];
  }
}

export async function getSingleUserSavedTrip(userId: string, tripId: string): Promise<Itinerary | null> {
  console.log(`[FirestoreServer] getSingleUserSavedTrip called for userId: ${userId}, tripId: ${tripId}`);
  if (!userId || !tripId) {
    console.error("[FirestoreServer] getSingleUserSavedTrip: userId and tripId are required.");
    return null;
  }
  if (!firestore) {
    console.error("[FirestoreServer] Firestore instance is undefined in getSingleUserSavedTrip. Returning null.");
    return null;
  }
  try {
    const tripDocRef = doc(firestore, 'users', userId, 'savedTrips', tripId);
    const docSnap = await getDoc(tripDocRef);
    if (docSnap.exists()) {
      const tripData = { ...docSnap.data() as Omit<Itinerary, 'id'>, id: docSnap.id };
      console.log(`[FirestoreServer] Fetched single saved trip for userId ${userId}, tripId: ${tripId}.`);
      return tripData as Itinerary;
    } else {
      console.log(`[FirestoreServer] No saved trip found for userId ${userId}, tripId: ${tripId}.`);
      return null;
    }
  } catch (error: any) {
    console.error(`[FirestoreServer] Error fetching single saved trip for user ${userId}, tripId: ${tripId}:`, error.message, error.stack, error);
    return null;
  }
}

    
