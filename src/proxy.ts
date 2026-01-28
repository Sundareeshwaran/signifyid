/**
 * Client Auth Middleware
 *
 * Next.js Edge Middleware for enforcing client authentication
 * on protected routes. Redirects unauthenticated requests to login.
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/middleware
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Routes that don't require client authentication */
const PUBLIC_PATHS = [
  "/client/login",
  "/client/callback",
  "/login",
  "/register",
  "/invite",
  "/verify",
  "/mfa",
  "/oauth",
  "/authorize",
  "/callback",
  "/api",
  "/_next",
  "/favicon.ico",
  "/assets",
  "/health",
];

/** Check if path is public (no auth required) */
function isPublicPath(pathname: string): boolean {
  // Exact match for root
  if (pathname === "/") {
    return true;
  }

  // Check against public paths
  return PUBLIC_PATHS.some((path) => {
    return pathname === path || pathname.startsWith(path + "/");
  });
}

/** Check if path is a client-protected route */
function isClientProtectedPath(pathname: string): boolean {
  // Only protect routes under /client/* that aren't public
  return pathname.startsWith("/client/") && !isPublicPath(pathname);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Check for client session cookie
  const clientSession = request.cookies.get("clientSession");

  // For client-protected routes, validate session
  if (isClientProtectedPath(pathname)) {
    if (!clientSession?.value) {
      // No session - redirect to login with return URL
      const loginUrl = new URL("/client/login", request.url);
      loginUrl.searchParams.set("redirect", request.url);
      loginUrl.searchParams.set("error", "no_session");

      console.log(
        `[ClientAuth] No session, redirecting: ${pathname} -> /client/login`,
      );

      return NextResponse.redirect(loginUrl);
    }

    // Session cookie exists - validate with backend
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const validateResponse = await fetch(
        `${apiUrl}/client-auth/session/validate`,
        {
          method: "GET",
          headers: {
            Cookie: `clientSession=${clientSession.value}`,
            "Content-Type": "application/json",
            Origin: request.nextUrl.origin,
          },
        },
      );

      const validationResult = await validateResponse.json();

      if (!validationResult.valid) {
        // Session invalid - clear cookie and redirect to login
        const loginUrl = new URL("/client/login", request.url);
        loginUrl.searchParams.set("redirect", request.url);
        loginUrl.searchParams.set(
          "error",
          validationResult.error || "invalid_session",
        );

        console.log(
          `[ClientAuth] Invalid session (${validationResult.error}), redirecting: ${pathname}`,
        );

        const response = NextResponse.redirect(loginUrl);
        response.cookies.delete("clientSession");
        return response;
      }

      // Session valid - allow request
      console.log(`[ClientAuth] Valid session, allowing: ${pathname}`);
      return NextResponse.next();
    } catch (error) {
      // API error - fail closed for security (redirect to login)
      console.error(
        `[ClientAuth] Validation API error for ${pathname}:`,
        error,
      );

      const loginUrl = new URL("/client/login", request.url);
      loginUrl.searchParams.set("redirect", request.url);
      loginUrl.searchParams.set("error", "validation_failed");

      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete("clientSession");
      return response;
    }
  }

  // Non-client routes - let them through
  return NextResponse.next();
}

// Configure which routes trigger the middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
