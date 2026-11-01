import { jwtVerify, SignJWT } from "jose";

/*
 * Signed session tokens. No `server-only` / `next/headers` here, so proxy.ts
 * can verify a token too (for redirects only; server actions re-check access).
 */

export { SESSION_COOKIE, WHO_COOKIE } from "./auth-cookies";
export const SESSION_DAYS = 30;

export const roles = ["parent", "staff"] as const;
export type Role = (typeof roles)[number];
export type SessionClaims = { sub: string; role: Role; name: string };

const DEV_SECRET = "alo-academy-dev-only-secret-never-use-in-production";

/** The server's signing key (AUTH_SECRET). Also keys other server-side hashes, e.g. contact message IDs. */
export function authSecret() {
  const value = process.env.AUTH_SECRET;
  if (value && value.length >= 32) return new TextEncoder().encode(value);
  if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET must be set (32+ characters)");
  return new TextEncoder().encode(DEV_SECRET);
}

export async function signSession(claims: SessionClaims) {
  return new SignJWT({ role: claims.role, name: claims.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(authSecret());
}

/** The claims of a valid, unexpired token, else null. */
export async function verifySession(token: string | undefined): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, authSecret(), { algorithms: ["HS256"] });
    const role = roles.find((r) => r === payload.role);
    if (!payload.sub || !role || typeof payload.name !== "string") return null;
    return { sub: payload.sub, role, name: payload.name };
  } catch {
    return null;
  }
}

/**
 * A same-site path to return to after sign-in, or null. Blocks "//evil.com", "/\evil.com" and
 * "/<tab>/evil.com" (URL parsers drop tabs and newlines, which turns it into "//evil.com").
 */
export function safeNext(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  const unsafe = [...value].some((c) => c === "\\" || c.charCodeAt(0) < 0x20 || c.charCodeAt(0) === 0x7f);
  return unsafe ? null : value;
}
