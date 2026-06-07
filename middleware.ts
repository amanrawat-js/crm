import { NextRequest, NextResponse } from "next/server";

/**
 * Lightweight middleware that checks for an auth session cookie
 * WITHOUT importing the full NextAuth/Prisma/bcrypt stack.
 *
 * This avoids the Edge Function size limit (1 MB) on Vercel.
 * The actual session validation still happens server-side in API routes via auth().
 */

// next-auth v5 JWT session cookie name
const SESSION_COOKIE = "authjs.session-token";
const SESSION_COOKIE_SECURE = "__Secure-authjs.session-token";

function hasSessionCookie(req: NextRequest): boolean {
  return !!(
    req.cookies.get(SESSION_COOKIE)?.value ||
    req.cookies.get(SESSION_COOKIE_SECURE)?.value
  );
}

/**
 * Decode the JWT payload (middle segment) without verification.
 * We only use this for the admin role check on /users routes.
 * Actual auth is still validated server-side by next-auth in API routes.
 */
function getTokenPayload(req: NextRequest): Record<string, unknown> | null {
  const token =
    req.cookies.get(SESSION_COOKIE)?.value ||
    req.cookies.get(SESSION_COOKIE_SECURE)?.value;

  if (!token) return null;

  try {
    // next-auth v5 with JWT strategy stores a JWE (5 parts) or JWS (3 parts)
    const parts = token.split(".");
    if (parts.length === 3) {
      // Standard JWT — decode the payload (part[1])
      const payload = JSON.parse(atob(parts[1]));
      return payload;
    }
    // JWE (encrypted) — can't decode without the secret, so skip role check
    return null;
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public routes
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/register") ||
    pathname.startsWith("/api/leads/external") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users to login
  if (!hasSessionCookie(req)) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Restrict /users route to admins only
  if (pathname.startsWith("/users") || pathname.startsWith("/api/users")) {
    const payload = getTokenPayload(req);
    // If we can read the role and it's not ADMIN, redirect
    // If we can't read it (JWE), let the server-side auth handle it
    if (payload && payload.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.nextUrl.origin));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
