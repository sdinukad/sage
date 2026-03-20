import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * A hook that manages a loading state with a minimum display time
 * to prevent annoying rapid "blinks" or flickers in the UI.
 * 
 * @param initialValue - Initial loading state
 * @param minTime - Minimum time (ms) to keep the loading state active
 * @returns [isLoading, setLoading]
 */
export function useDelayedLoading(initialValue: boolean = false, minTime: number = 600) {
  const [loading, setLoadingState] = useState(initialValue);
  const startTimeRef = useRef<number>(initialValue ? Date.now() : 0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setLoading = useCallback((value: boolean) => {
    if (value) {
      // Starting to load
      startTimeRef.current = Date.now();
      setLoadingState(true);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    } else {
      // Finished loading
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, minTime - elapsed);

      if (remaining > 0) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          setLoadingState(false);
          timeoutRef.current = null;
        }, remaining);
      } else {
        setLoadingState(false);
      }
    }
  }, [minTime]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return [loading, setLoading] as const;
}
