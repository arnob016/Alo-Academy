import "server-only";
import { decodeIdToken, Facebook, Google } from "arctic";
import { site } from "@/config/site";
import { startSession, currentUser } from "./session";
import {
  createUser,
  findUserByEmail,
  findUserByProvider,
  isStaffEmail,
  updateUser,
  type Provider,
  type User,
} from "./users";

export const providers = ["google", "facebook"] as const satisfies readonly Provider[];

export const isProvider = (value: string): value is Provider => (providers as readonly string[]).includes(value);

// Register exactly these redirect URIs with Google and Facebook.
const callbackUrl = (provider: Provider) => `${site.url}/api/auth/${provider}/callback`;

export function googleClient() {
  const id = process.env.AUTH_GOOGLE_ID;
  const secret = process.env.AUTH_GOOGLE_SECRET;
  return id && secret ? new Google(id, secret, callbackUrl("google")) : null;
}

export function facebookClient() {
  const id = process.env.AUTH_FACEBOOK_ID;
  const secret = process.env.AUTH_FACEBOOK_SECRET;
  return id && secret ? new Facebook(id, secret, callbackUrl("facebook")) : null;
}

/** Which social sign-ins have their keys set. */
export function availableProviders(): Record<Provider, boolean> {
  return { google: googleClient() !== null, facebook: facebookClient() !== null };
}

export type Profile = { id: string; name: string; email: string; emailVerified: boolean };

/** Trades the authorization code for the person's profile. */
export async function fetchProfile(provider: Provider, code: string, codeVerifier: string): Promise<Profile> {
  if (provider === "google") {
    const client = googleClient();
    if (!client) throw new Error("Google sign-in is not configured");
    const tokens = await client.validateAuthorizationCode(code, codeVerifier);
    // Came straight from Google's token endpoint over TLS, so no signature check is needed.
    const claims = decodeIdToken(tokens.idToken()) as {
      sub?: string;
      name?: string;
      email?: string;
      email_verified?: boolean;
    };
    if (!claims.sub) throw new Error("Google returned no user id");
    return {
      id: claims.sub,
      name: claims.name?.trim() || claims.email?.split("@")[0] || "Google user",
      email: (claims.email ?? "").toLowerCase(),
      emailVerified: claims.email_verified === true,
    };
  }

  const client = facebookClient();
  if (!client) throw new Error("Facebook sign-in is not configured");
  const tokens = await client.validateAuthorizationCode(code);
  const url = new URL("https://graph.facebook.com/v16.0/me");
  url.searchParams.set("fields", "id,name,email");
  url.searchParams.set("access_token", tokens.accessToken());
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Facebook profile request failed: ${res.status}`);
  const data = (await res.json()) as { id?: string; name?: string; email?: string };
  if (!data.id) throw new Error("Facebook returned no user id");
  return {
    id: data.id,
    name: data.name?.trim() || "Facebook user",
    email: (data.email ?? "").toLowerCase(),
    // Facebook only shares an email the person has confirmed.
    emailVerified: Boolean(data.email),
  };
}

export type OAuthOutcome =
  | { ok: true; user: User; mode: "signIn" | "link" }
  | { ok: false; error: "oauth_email_exists" | "oauth_in_use" | "oauth_failed" };

const providerKey = (provider: Provider) => (provider === "google" ? "googleId" : "facebookId");

/**
 * Signs in (or connects, when `link` and already signed in) with a provider
 * profile. Never merges into an account whose email nobody has verified: that
 * would let someone pre-register a victim's email and take over their account.
 */
export async function completeOAuth(provider: Provider, profile: Profile, link: boolean): Promise<OAuthOutcome> {
  const key = providerKey(provider);
  const owner = await findUserByProvider(provider, profile.id);
  const current = link ? await currentUser() : null;

  if (current) {
    if (owner && owner.id !== current.id) return { ok: false, error: "oauth_in_use" };
    // The demo accounts are shared by every visitor; a linked Google/Facebook login would land others in them.
    if (current.demo) return { ok: false, error: "oauth_failed" };
    const verified = profile.emailVerified && Boolean(profile.email);
    const emailFree = verified && !(await findUserByEmail(profile.email));
    const updated = await updateUser(current.id, (u) => {
      const next: User = { ...u, [key]: profile.id };
      if (verified && u.email === profile.email) next.emailVerified = true;
      else if (emailFree && !u.email) {
        next.email = profile.email;
        next.emailVerified = true;
      }
      return next;
    });
    return { ok: true, user: updated, mode: "link" };
  }

  let user = owner;
  if (!user && profile.email) {
    const byEmail = await findUserByEmail(profile.email);
    if (byEmail) {
      if (!(byEmail.emailVerified && profile.emailVerified)) return { ok: false, error: "oauth_email_exists" };
      user = byEmail;
    }
  }

  const staff = profile.emailVerified && Boolean(profile.email) && isStaffEmail(profile.email);
  if (!user) {
    user = await createUser({
      name: profile.name,
      // Only keep an email the provider vouched for.
      email: profile.emailVerified ? profile.email : "",
      emailVerified: profile.emailVerified && Boolean(profile.email),
      phone: "",
      passwordHash: "",
      role: staff ? "staff" : "parent",
      googleId: provider === "google" ? profile.id : "",
      facebookId: provider === "facebook" ? profile.id : "",
    });
  } else {
    // Sets the provider ID too, for an account matched by its verified email.
    user = await updateUser(user.id, (u) => ({ ...u, [key]: profile.id, lastLogin: Date.now(), role: staff ? "staff" : u.role }));
  }

  await startSession(user);
  return { ok: true, user, mode: "signIn" };
}
