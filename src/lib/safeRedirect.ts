/**
 * Safe Redirect Utility
 *
 * Prevents open redirect attacks by validating redirect URLs
 * against allowed patterns and origins.
 */

/** Allowed redirect patterns */
const ALLOWED_PROTOCOLS = ["http:", "https:"];

/** Check if a URL is a relative path (starts with / but not //) */
export function isRelativePath(url: string): boolean {
  return url.startsWith("/") && !url.startsWith("//");
}

/** Check if a URL is safe to redirect to */
export function isSafeRedirectUrl(
  url: string,
  allowedOrigins: string[] = []
): boolean {
  // Allow relative paths
  if (isRelativePath(url)) {
    // Block path traversal attempts
    if (url.includes("..") || url.includes("//")) {
      return false;
    }
    return true;
  }

  // Parse URL for validation
  try {
    const parsedUrl = new URL(url);

    // Must be HTTP or HTTPS
    if (!ALLOWED_PROTOCOLS.includes(parsedUrl.protocol)) {
      return false;
    }

    // Check against allowed origins
    if (allowedOrigins.length > 0) {
      return allowedOrigins.some((origin) => {
        try {
          const allowedUrl = new URL(origin);
          return parsedUrl.origin === allowedUrl.origin;
        } catch {
          return false;
        }
      });
    }

    // If no allowed origins specified, only allow same-origin
    if (typeof window !== "undefined") {
      return parsedUrl.origin === window.location.origin;
    }

    return false;
  } catch {
    // Invalid URL format
    return false;
  }
}

/** Get a safe redirect URL or fallback to default */
export function getSafeRedirectUrl(
  url: string | null | undefined,
  defaultUrl: string = "/",
  allowedOrigins: string[] = []
): string {
  if (!url) {
    return defaultUrl;
  }

  if (isSafeRedirectUrl(url, allowedOrigins)) {
    return url;
  }

  console.warn(`[SafeRedirect] Blocked unsafe redirect URL: ${url}`);
  return defaultUrl;
}

/** Extract redirect parameter from URL search params */
export function getRedirectParam(
  searchParams: URLSearchParams | null,
  paramName: string = "redirect"
): string | null {
  if (!searchParams) {
    return null;
  }

  const redirect = searchParams.get(paramName);

  // Also check redirect_uri for compatibility
  if (!redirect) {
    return searchParams.get("redirect_uri");
  }

  return redirect;
}

/** Build login URL with redirect parameter */
export function buildLoginUrl(
  loginPath: string,
  currentUrl: string,
  baseUrl?: string
): string {
  try {
    const base =
      baseUrl || (typeof window !== "undefined" ? window.location.origin : "");
    const loginUrl = new URL(loginPath, base);
    loginUrl.searchParams.set("redirect", currentUrl);
    return loginUrl.toString();
  } catch {
    return loginPath;
  }
}

/**
 * Server-side safe redirect validation (for backend use)
 * Validates a redirect URI against a list of registered URIs
 */
export function validateRedirectUri(
  redirectUri: string,
  registeredUris: string[],
  options: { allowSameOrigin?: boolean; strictMode?: boolean } = {}
): { valid: boolean; matchedUri?: string; error?: string } {
  const { allowSameOrigin = true, strictMode = false } = options;

  // Empty redirect is invalid
  if (!redirectUri) {
    return { valid: false, error: "No redirect URI provided" };
  }

  // Allow relative paths if same-origin is allowed
  if (allowSameOrigin && isRelativePath(redirectUri)) {
    if (redirectUri.includes("..") || redirectUri.includes("//")) {
      return { valid: false, error: "Path traversal detected" };
    }
    return { valid: true, matchedUri: redirectUri };
  }

  // Parse the redirect URI
  let parsedRedirect: URL;
  try {
    parsedRedirect = new URL(redirectUri);
  } catch {
    return { valid: false, error: "Invalid redirect URI format" };
  }

  // Must be HTTP or HTTPS
  if (!ALLOWED_PROTOCOLS.includes(parsedRedirect.protocol)) {
    return { valid: false, error: "Invalid protocol" };
  }

  // Check against registered URIs
  for (const registeredUri of registeredUris) {
    try {
      const parsedRegistered = new URL(registeredUri);

      if (strictMode) {
        // Strict mode: exact match only
        if (redirectUri === registeredUri) {
          return { valid: true, matchedUri: registeredUri };
        }
      } else {
        // Relaxed mode: origin match or prefix match
        if (
          parsedRedirect.origin === parsedRegistered.origin ||
          redirectUri.startsWith(registeredUri.replace(/\/$/, ""))
        ) {
          return { valid: true, matchedUri: registeredUri };
        }
      }
    } catch {
      // Skip invalid registered URIs
      continue;
    }
  }

  return { valid: false, error: "Redirect URI not registered" };
}

export default {
  isRelativePath,
  isSafeRedirectUrl,
  getSafeRedirectUrl,
  getRedirectParam,
  buildLoginUrl,
  validateRedirectUri,
};
