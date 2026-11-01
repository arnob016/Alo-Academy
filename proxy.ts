import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { SESSION_COOKIE, verifySession } from "./lib/session-token";

const intl = createMiddleware(routing);

// "/bn/account" → needs any account; "/en/dashboard" → needs staff.
const protectedPage = /^\/(bn|en)\/(account|dashboard)(?:\/|$)/;

/**
 * Sends signed-out visitors to the login page before a protected page loads.
 * This is only for a smooth experience: the Server Actions behind those pages
 * check the session and role again on every call.
 */
export default async function proxy(request: NextRequest) {
  const match = request.nextUrl.pathname.match(protectedPage);
  if (match) {
    const [, locale, page] = match;
    const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
    if (!session || (page === "dashboard" && session.role !== "staff")) {
      const login = new URL(`/${locale}/login`, request.url);
      login.searchParams.set("next", request.nextUrl.pathname);
      if (session) login.searchParams.set("staff", "1");
      return NextResponse.redirect(login);
    }
  }
  return intl(request);
}

export const config = {
  // Skip API routes, Next internals, and files with an extension.
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
