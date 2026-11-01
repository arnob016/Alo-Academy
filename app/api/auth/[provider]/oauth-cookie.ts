/** Holds the OAuth state and PKCE verifier between the start and callback routes. */
export const OAUTH_COOKIE = "alo_oauth";

export type OAuthCookie = {
  provider: string;
  state: string;
  codeVerifier: string;
  locale: "bn" | "en";
  next: string | null;
  link: boolean;
};
