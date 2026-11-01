import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { generateCodeVerifier, generateState } from "arctic";
import { facebookClient, googleClient, isProvider } from "@/lib/oauth";
import { safeNext } from "@/lib/session-token";
import { OAUTH_COOKIE } from "./oauth-cookie";

/** Starts Google / Facebook sign-in: /api/auth/google?locale=bn&next=/bn/account[&link=1] */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/auth/[provider]">) {
  const { provider } = await ctx.params;
  if (!isProvider(provider)) return new NextResponse("Not found", { status: 404 });

  const params = request.nextUrl.searchParams;
  const locale = params.get("locale") === "en" ? "en" : "bn";
  const state = generateState();
  const codeVerifier = generateCodeVerifier();

  const google = provider === "google" ? googleClient() : null;
  const facebook = provider === "facebook" ? facebookClient() : null;
  const url = google
    ? google.createAuthorizationURL(state, codeVerifier, ["openid", "profile", "email"])
    : facebook?.createAuthorizationURL(state, ["public_profile", "email"]);
  if (!url) {
    return NextResponse.redirect(new URL(`/${locale}/login?error=provider_unavailable&provider=${provider}`, request.url));
  }

  // Ten minutes to finish at Google/Facebook; checked and deleted by the callback.
  (await cookies()).set(
    OAUTH_COOKIE,
    JSON.stringify({ provider, state, codeVerifier, locale, next: safeNext(params.get("next")), link: params.get("link") === "1" }),
    { path: "/api/auth", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 600 },
  );
  return NextResponse.redirect(url);
}
