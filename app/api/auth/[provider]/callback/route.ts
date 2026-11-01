import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { completeOAuth, fetchProfile, isProvider } from "@/lib/oauth";
import { safeNext } from "@/lib/session-token";
import { OAUTH_COOKIE, type OAuthCookie } from "../oauth-cookie";

/** Where Google / Facebook send the visitor back to. */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/auth/[provider]/callback">) {
  const { provider } = await ctx.params;
  if (!isProvider(provider)) return new NextResponse("Not found", { status: 404 });

  const jar = await cookies();
  let saved: OAuthCookie | null = null;
  try {
    saved = JSON.parse(jar.get(OAUTH_COOKIE)?.value ?? "null");
  } catch {
    saved = null;
  }
  jar.delete({ name: OAUTH_COOKIE, path: "/api/auth" });

  const locale = saved?.locale === "en" ? "en" : "bn";
  const fail = (error: string, page: "login" | "account" = "login") =>
    NextResponse.redirect(new URL(`/${locale}/${page}?error=${error}&provider=${provider}`, request.url));

  const params = request.nextUrl.searchParams;
  // The person pressed "Cancel" at Google/Facebook.
  if (params.get("error")) return fail("oauth_cancelled", saved?.link ? "account" : "login");

  const code = params.get("code");
  const state = params.get("state");
  if (!saved || saved.provider !== provider || !code || !state || state !== saved.state) return fail("oauth_failed");

  let outcome;
  try {
    const profile = await fetchProfile(provider, code, saved.codeVerifier);
    outcome = await completeOAuth(provider, profile, saved.link);
  } catch (error) {
    console.error(`[oauth] ${provider} sign-in failed`, error);
    return fail("oauth_failed", saved.link ? "account" : "login");
  }
  if (!outcome.ok) return fail(outcome.error, saved.link ? "account" : "login");

  if (outcome.mode === "link") {
    return NextResponse.redirect(new URL(`/${locale}/account?connected=${provider}`, request.url));
  }
  const home = outcome.user.role === "staff" ? `/${locale}/dashboard` : `/${locale}/account`;
  return NextResponse.redirect(new URL(safeNext(saved.next) ?? home, request.url));
}
