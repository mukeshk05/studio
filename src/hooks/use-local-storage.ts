
"use client";

import { useState, useEffect, useCallback } from 'react';

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // Initialize state with initialValue. This ensures server and initial client render match.
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // Effect to read from localStorage on the client after mounting
  useEffect(() => {
    // Ensure this only runs on the client
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const item = window.localStorage.getItem(key);
      // If item exists in localStorage, update the state
      if (item) {
        setStoredValue(JSON.parse(item) as T);
      } else {
        // If no item, and initialValue might have changed (e.g., if it's a prop to the component using the hook),
        // ensure state reflects the current initialValue.
        // useState(initialValue) would have set it if the hook re-ran due to initialValue prop change.
        // This explicit setStoredValue(initialValue) ensures consistency if initialValue changed
        // and there's nothing in localStorage for this key.
        setStoredValue(initialValue);
      }
    } catch (error) {
      console.warn(`Error reading localStorage key “${key}” on mount:`, error);
      // Fallback to initialValue on error
      setStoredValue(initialValue);
    }
  }, [key, initialValue]);

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    if (typeof window === 'undefined') {
      console.warn(
        `Tried setting localStorage key “${key}” even though environment is not a client`
      );
      return;
    }
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      // Save state
      setStoredValue(valueToStore);
      // Save to local storage
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
      // We dispatch a custom event so other instances of the hook are notified of the change
      window.dispatchEvent(new StorageEvent('local-storage', { key }));
    } catch (error) {
      console.warn(`Error setting localStorage key “${key}”:`, error);
    }
  }, [key, storedValue]); // storedValue is needed for the functional update `value(storedValue)`

  // Effect for listening to storage changes from other tabs/windows or localStorage.clear()
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleStorageChange = (event: StorageEvent) => {
      // Check if the event is for the specific key, or if event.key is null (e.g. localStorage.clear())
      // and the event is on our localStorage.
      if (event.key === key || (event.key === null && event.storageArea === window.localStorage)) {
        try {
          const item = window.localStorage.getItem(key);
          // Update state if the key matches or if all localStorage was cleared (item would be null)
          setStoredValue(item ? (JSON.parse(item) as T) : initialValue);
        } catch (error) {
          console.warn(`Error reading localStorage key “${key}” on storage event:`, error);
          setStoredValue(initialValue); // Fallback to initialValue on error
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    // The custom 'local-storage' event is for changes within the same page by other instances of the hook
    window.addEventListener('local-storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage', handleStorageChange);
    };
  }, [key, initialValue]); // initialValue is needed: if storage clears, fall back to current initialValue

  return [storedValue, setValue];
}

export default useLocalStorage;
