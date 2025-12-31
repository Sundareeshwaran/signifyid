import type { Metadata } from "next";
import { CodeBlock, Callout } from "@/components/docs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "FAQ & Troubleshooting | Signify iD Docs",
  description:
    "Answers to frequently asked questions and troubleshooting guides for common Signify iD integration issues.",
};

const faqs = [
  {
    question: "How do I get my Client ID and Client Secret?",
    answer:
      "Log into the Signify iD dashboard, navigate to Clients, and create a new client application. Your credentials will be displayed upon creation. The Client Secret is only shown once—store it securely.",
  },
  {
    question: "Can I use Signify iD with mobile apps?",
    answer:
      "Yes! Signify iD supports OAuth2 PKCE (Proof Key for Code Exchange) for mobile and single-page applications. Use the PKCE flow when you cannot securely store a Client Secret.",
  },
  {
    question: "What OAuth scopes are available?",
    answer:
      "Available scopes include: openid (required), profile (name, avatar), email (email address), and offline_access (refresh tokens). Request only the scopes you need.",
  },
  {
    question: "How long do sessions last?",
    answer:
      "Default session duration is 24 hours with a 30-minute idle timeout. These can be configured per organization in the dashboard settings.",
  },
  {
    question: "Is Signify iD SOC 2 compliant?",
    answer:
      "Yes, Signify iD is SOC 2 Type II certified. Contact our security team for compliance documentation.",
  },
  {
    question: "Can I customize the login page?",
    answer:
      "Enterprise plans support custom branding including logo, colors, and custom domain for the authentication pages.",
  },
];

export default function FaqPage() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">
          FAQ & Troubleshooting
        </h1>
        <p className="text-xl text-muted-foreground">
          Answers to common questions and solutions to frequent issues.
        </p>
      </div>

      {/* FAQ Accordion */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Frequently Asked Questions</h2>
        <Card>
          <CardHeader>
            <CardTitle>General Questions</CardTitle>
            <CardDescription>
              Common questions about using Signify iD for authentication
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </section>

      {/* Troubleshooting */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">Troubleshooting</h2>

        {/* Redirect Issues */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Redirect URI Mismatch</h3>
          <Callout variant="danger" title="Error: redirect_uri_mismatch">
            <p>
              This error occurs when the redirect URI in your request
              doesn&apos;t match any registered URIs for your client.
            </p>
          </Callout>
          <p className="text-muted-foreground">
            <strong>Solution:</strong> Ensure the redirect URI in your
            authorization request exactly matches one registered in your client
            settings, including protocol, domain, port, and path.
          </p>
          <CodeBlock
            code={`// Check your redirect URI matches exactly
const REDIRECT_URI = 'http://localhost:3000/callback';  // ✅
const REDIRECT_URI = 'http://localhost:3000/callback/'; // ❌ Trailing slash
const REDIRECT_URI = 'https://localhost:3000/callback'; // ❌ Wrong protocol`}
            language="typescript"
          />
        </div>

        {/* Token Expired */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Access Token Expired</h3>
          <Callout variant="warning" title="Error: token_expired">
            <p>The access token has expired and needs to be refreshed.</p>
          </Callout>
          <p className="text-muted-foreground">
            <strong>Solution:</strong> Use your refresh token to obtain a new
            access token before it expires.
          </p>
          <CodeBlock
            code={`// Implement automatic token refresh
async function fetchWithAuth(url: string, options: RequestInit) {
  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: \`Bearer \${accessToken}\`,
    },
  });

  if (response.status === 401) {
    // Token expired, refresh it
    accessToken = await refreshAccessToken();
    
    // Retry the request
    response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: \`Bearer \${accessToken}\`,
      },
    });
  }

  return response;
}`}
            language="typescript"
            showLineNumbers
          />
        </div>

        {/* Invalid State */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Invalid State Parameter</h3>
          <Callout variant="danger" title="Error: invalid_state">
            <p>
              The state parameter in the callback doesn&apos;t match the one
              sent in the authorization request.
            </p>
          </Callout>
          <p className="text-muted-foreground">
            <strong>Solution:</strong> Store the state parameter before
            redirecting to OAuth, then validate it on callback.
          </p>
          <CodeBlock
            code={`// Generate and store state before OAuth redirect
const state = crypto.randomUUID();
sessionStorage.setItem('oauth_state', state);

// On callback, validate the state
const callbackState = new URLSearchParams(window.location.search).get('state');
const storedState = sessionStorage.getItem('oauth_state');

if (callbackState !== storedState) {
  throw new Error('Invalid state - possible CSRF attack');
}

sessionStorage.removeItem('oauth_state');`}
            language="typescript"
            showLineNumbers
          />
        </div>

        {/* Session Not Found */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Session Not Found</h3>
          <Callout variant="warning" title="Error: session_not_found">
            <p>The session has been revoked, expired, or never existed.</p>
          </Callout>
          <p className="text-muted-foreground">
            <strong>Possible causes:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>User logged out from another device</li>
            <li>Session expired due to inactivity</li>
            <li>Administrator revoked the session</li>
            <li>Cookies were cleared</li>
          </ul>
          <p className="text-muted-foreground mt-2">
            <strong>Solution:</strong> Redirect the user to login to create a
            new session.
          </p>
        </div>

        {/* CORS Issues */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">CORS Errors</h3>
          <Callout variant="danger" title="Error: CORS policy blocked request">
            <p>
              Cross-Origin Resource Sharing (CORS) is blocking your API
              requests.
            </p>
          </Callout>
          <p className="text-muted-foreground">
            <strong>Solution:</strong> Ensure your domain is added to the
            allowed origins in your client settings. Token exchange should
            happen server-side, not from the browser.
          </p>
        </div>
      </section>

      {/* Debugging Tips */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Debugging Tips</h2>

        <div className="space-y-4">
          <div className="rounded-xl border p-4">
            <h3 className="font-medium mb-2">Check Network Requests</h3>
            <p className="text-sm text-muted-foreground">
              Use browser DevTools → Network tab to inspect OAuth redirects and
              API calls. Look for error responses and verify request parameters.
            </p>
          </div>

          <div className="rounded-xl border p-4">
            <h3 className="font-medium mb-2">Verify Environment Variables</h3>
            <p className="text-sm text-muted-foreground">
              Double-check that your Client ID, Client Secret, and Redirect URI
              are correctly set in your environment configuration.
            </p>
          </div>

          <div className="rounded-xl border p-4">
            <h3 className="font-medium mb-2">Check Console Logs</h3>
            <p className="text-sm text-muted-foreground">
              The Signify iD SDK logs helpful debugging information to the
              console in development mode.
            </p>
          </div>

          <div className="rounded-xl border p-4">
            <h3 className="font-medium mb-2">Review Audit Logs</h3>
            <p className="text-sm text-muted-foreground">
              Check the Audit Logs in your Signify iD dashboard for detailed
              information about authentication attempts and errors.
            </p>
          </div>
        </div>
      </section>

      {/* Getting Help */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Getting Help</h2>
        <Callout variant="info" title="Need more help?">
          <p>
            If you&apos;re still having issues after reviewing this
            documentation, you can:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Check our GitHub repository for known issues</li>
            <li>Join our Discord community for peer support</li>
            <li>Contact support@signifyid.com for direct assistance</li>
          </ul>
        </Callout>
      </section>
    </div>
  );
}
