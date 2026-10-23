"use client";

import { useSyncExternalStore } from "react";
import { isSelectableTheme, THEME_STORAGE_KEY, type ThemeId } from "./registry";

// The active theme lives on <html data-theme>, set before paint by the boot
// script, so the DOM is the source of truth and React just subscribes to it.

const listeners = new Set<() => void>();

function readTheme(): ThemeId {
  const value = document.documentElement.dataset.theme;
  return isSelectableTheme(value) ? value : "classic";
}

export function setTheme(id: ThemeId) {
  if (id === "classic") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = id;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, id);
  } catch {
    // Private mode or blocked storage: the theme still applies for this visit.
  }
  listeners.forEach((listener) => listener());
}

/**
 * Fallback for pages where the boot script didn't run (e.g. client-resumed
 * 404s): re-apply the saved theme after mount.
 */
export function restoreSavedTheme() {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return;
  }
  if (isSelectableTheme(saved) && saved !== readTheme()) setTheme(saved);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Server and hydration render "classic"; the client then switches to the saved theme. */
export function useTheme() {
  return useSyncExternalStore(subscribe, readTheme, () => "classic" as ThemeId);
}

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
