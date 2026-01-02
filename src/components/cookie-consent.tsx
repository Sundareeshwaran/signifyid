"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Cookie, ExternalLink } from "lucide-react";

/**
 * Cookie Consent Banner
 *
 * Informs users about third-party cookies needed for authentication
 * when frontend and API are on different domains.
 */
export function CookieConsent() {
  // Use callback ref pattern to check localStorage after hydration
  const [showBanner, setShowBanner] = useState<boolean | null>(null);

  const bannerRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node && showBanner === null) {
        // Check localStorage only after component mounts
        const consent = localStorage.getItem("cookie-consent");
        setShowBanner(!consent);
      }
    },
    [showBanner]
  );

  const acceptCookies = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setShowBanner(false);
  };

  const openCookieSettings = () => {
    // Show instructions for enabling cookies
    const instructions = `To enable cookies for this site:

Chrome: Settings → Privacy and security → Cookies → Add "signifyid-api.vercel.app" to "Sites that can always use cookies"

Firefox: Settings → Privacy & Security → Cookies → Add exception for "signifyid-api.vercel.app"

Safari: Preferences → Privacy → Uncheck "Prevent cross-site tracking"

Edge: Settings → Cookies → Allow "signifyid-api.vercel.app"`;

    alert(instructions);
  };

  // Don't render during SSR or if consent already given
  if (showBanner === null || showBanner === false)
    return <div ref={bannerRef} style={{ display: "none" }} />;

  return (
    <div
      ref={bannerRef}
      className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-lg"
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Cookie className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-sm">Cookie Notice</h3>
              <p className="text-sm text-muted-foreground mt-1">
                This site uses cookies for secure authentication. Your browser
                may block these cookies by default.{" "}
                <button
                  onClick={openCookieSettings}
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  Enable cookies
                  <ExternalLink className="h-3 w-3" />
                </button>{" "}
                if you experience login issues.
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={openCookieSettings}>
              How to Enable
            </Button>
            <Button size="sm" onClick={acceptCookies}>
              I Understand
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
