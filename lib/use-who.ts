"use client";

import { useMemo, useSyncExternalStore } from "react";
import { WHO_COOKIE } from "./auth-cookies";

/*
 * Who is signed in, for display only (the header chip). Read from a
 * non-secret cookie, so static pages can show it without a server round trip.
 * Access is always decided on the server.
 */

const EVENT = "alo-auth-change";

/** Call after signing in or out, so every useWho() re-reads the cookie. */
export function notifyAuthChange() {
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  // Another tab may have signed in or out.
  window.addEventListener("focus", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("focus", onChange);
  };
}

function readCookie() {
  const entry = document.cookie.split("; ").find((c) => c.startsWith(`${WHO_COOKIE}=`));
  return entry ? entry.slice(WHO_COOKIE.length + 1) : "";
}

export type Who = { name: string; role: "parent" | "staff" };

export function useWho(): Who | null {
  // "" on the server and during hydration, so static HTML always matches.
  const raw = useSyncExternalStore(subscribe, readCookie, () => "");
  return useMemo(() => {
    if (!raw) return null;
    try {
      const value = JSON.parse(decodeURIComponent(raw)) as Partial<Who>;
      return typeof value.name === "string" ? { name: value.name, role: value.role === "staff" ? "staff" : "parent" } : null;
    } catch {
      return null;
    }
  }, [raw]);
}
