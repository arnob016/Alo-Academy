"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * The current time in epoch ms, refreshed every `stepMs`. `null` on the server
 * and during hydration, so static pages never bake in a build-time clock.
 */
export function useNow(stepMs = 15_000) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const timer = setInterval(onChange, stepMs);
      return () => clearInterval(timer);
    },
    [stepMs],
  );
  return useSyncExternalStore(
    subscribe,
    // Rounded, so repeated reads between ticks return the same snapshot.
    () => Math.floor(Date.now() / stepMs) * stepMs,
    () => null,
  );
}
