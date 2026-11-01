import "server-only";
import { cookies, headers } from "next/headers";
import { SESSION_COOKIE, SESSION_DAYS, signSession, verifySession, WHO_COOKIE } from "./session-token";
import { findUserById, type User } from "./users";

const cookieBase = {
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: SESSION_DAYS * 24 * 60 * 60,
};

/** Starts a session for `user` (in a Server Action or Route Handler). */
export async function startSession(user: User) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signSession({ sub: user.id, role: user.role, name: user.name }), {
    ...cookieBase,
    httpOnly: true,
  });
  // Next URL-encodes cookie values itself; the browser side decodes once.
  jar.set(WHO_COOKIE, JSON.stringify({ name: user.name, role: user.role }), cookieBase);
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(WHO_COOKIE);
}

/**
 * The signed-in user, read fresh from the store so a role change or a deleted
 * account takes effect immediately. Use this for every access decision.
 */
export async function currentUser(): Promise<User | null> {
  const claims = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!claims) return null;
  return (await findUserById(claims.sub)) ?? null;
}

export async function requireStaff() {
  const user = await currentUser();
  return user?.role === "staff" ? user : null;
}

/*
 * Sign-in attempt limiter, per login ID and per IP. In memory, so it is per
 * server instance: it slows guessing down rather than being a hard wall.
 * The IP limit is loose on purpose: mobile carriers and office Wi-Fi put many
 * people behind one address, and one person's typos mustn't lock out the rest.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_ID = 8;
const MAX_PER_IP = 60;
const store = globalThis as typeof globalThis & { __aloAttempts?: Map<string, number[]> };
const attempts: Map<string, number[]> = (store.__aloAttempts ??= new Map<string, number[]>());

/** The visitor's IP as the host reports it, for attempt limits ("unknown" if it doesn't). */
export async function clientIp() {
  const forwarded = (await headers()).get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

export function tooManyAttempts(keys: string[]) {
  const now = Date.now();
  return keys.some(
    (key) =>
      (attempts.get(key) ?? []).filter((t) => now - t < WINDOW_MS).length >= (key.startsWith("ip:") ? MAX_PER_IP : MAX_PER_ID),
  );
}

export function recordFailedAttempt(keys: string[]) {
  const now = Date.now();
  // Now and then drop keys with no recent misses, so the map can't grow forever.
  if (attempts.size > 5000) {
    for (const [key, times] of attempts) {
      if (!times.some((t) => now - t < WINDOW_MS)) attempts.delete(key);
    }
  }
  for (const key of keys) {
    attempts.set(key, [...(attempts.get(key) ?? []).filter((t) => now - t < WINDOW_MS), now]);
  }
}

export function clearAttempts(keys: string[]) {
  for (const key of keys) attempts.delete(key);
}
