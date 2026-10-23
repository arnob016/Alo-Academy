"use client";

import type { ComponentType } from "react";
import type { ThemeId } from "./registry";
import type { ThemeProps } from "./types";

type ThemeModule = {
  default: ComponentType<ThemeProps>;
  /** Fetches whatever the first render needs (messages, data) so it won't suspend. */
  prepare?: (locale: string) => Promise<unknown>;
};

// Each theme is its own chunk (code, CSS, fonts, animation libraries), fetched
// only when that theme is selected.
const loaders: Partial<Record<ThemeId, () => Promise<ThemeModule>>> = {
  pixel: () => import("./pixel"),
  cinema: () => import("./cinema"),
  hud: () => import("./hud"),
  sketch: () => import("./sketch"),
  editorial: () => import("./editorial"),
};

const loaded = new Map<ThemeId, ComponentType<ThemeProps>>();
const pending = new Map<ThemeId, Promise<ComponentType<ThemeProps>>>();

export function loadTheme(id: ThemeId, locale?: string): Promise<ComponentType<ThemeProps>> {
  const cached = pending.get(id);
  if (cached) return cached;
  const loader = loaders[id];
  if (!loader) return Promise.reject(new Error(`Theme "${id}" has no loader`));
  const promise = loader().then(async (mod) => {
    if (locale) await mod.prepare?.(locale);
    loaded.set(id, mod.default);
    return mod.default;
  });
  // Don't cache a failed chunk load (e.g. flaky network), so picking the theme again retries.
  promise.catch(() => pending.delete(id));
  pending.set(id, promise);
  return promise;
}

/** The theme component if its chunk has already arrived, so switching can render synchronously. */
export function getLoadedTheme(id: ThemeId) {
  return loaded.get(id);
}
