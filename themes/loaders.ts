"use client";

import type { ComponentType } from "react";
import type { ThemeId } from "./registry";
import type { FrameProps, ThemeProps } from "./types";

type ThemeModule = {
  /** Renders the marketing pages (home, courses…) entirely in the theme. */
  default: ComponentType<ThemeProps>;
  /** Wraps the classic markup of the tool pages in the theme's header, footer and effects. */
  Frame: ComponentType<FrameProps>;
  /** Fetches whatever the first render needs (messages, data) so it won't suspend. */
  prepare?: (locale: string) => Promise<unknown>;
};

export type LoadedTheme = { Theme: ComponentType<ThemeProps>; Frame: ComponentType<FrameProps> };

// Each theme is its own chunk (code, CSS, fonts, animation libraries), fetched
// only when that theme is selected.
const loaders: Partial<Record<ThemeId, () => Promise<ThemeModule>>> = {
  pixel: () => import("./pixel"),
  cinema: () => import("./cinema"),
  hud: () => import("./hud"),
  sketch: () => import("./sketch"),
  editorial: () => import("./editorial"),
};

const loaded = new Map<ThemeId, LoadedTheme>();
const pending = new Map<ThemeId, Promise<LoadedTheme>>();

export function loadTheme(id: ThemeId, locale?: string): Promise<LoadedTheme> {
  const cached = pending.get(id);
  if (cached) return cached;
  const loader = loaders[id];
  if (!loader) return Promise.reject(new Error(`Theme "${id}" has no loader`));
  const promise = loader().then(async (mod) => {
    if (locale) await mod.prepare?.(locale);
    const theme = { Theme: mod.default, Frame: mod.Frame };
    loaded.set(id, theme);
    return theme;
  });
  // Don't cache a failed chunk load (e.g. flaky network), so picking the theme again retries.
  promise.catch(() => pending.delete(id));
  pending.set(id, promise);
  return promise;
}

/** The theme's components if its chunk has already arrived, so switching can render synchronously. */
export function getLoadedTheme(id: ThemeId) {
  return loaded.get(id);
}
