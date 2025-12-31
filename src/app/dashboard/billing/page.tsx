"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  Check,
  Zap,
  Building2,
  Loader2,
  ExternalLink,
  AlertCircle,
  Users,
  Shield,
  Clock,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { billingApi, type SubscriptionData } from "@/lib/api";

// Plan price IDs - these should match your Stripe Dashboard
const PLAN_PRICES = {
  starter: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || "",
  professional: process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID || "",
};

/**
 * Get status badge variant and label
 */
function getStatusBadge(status: string | undefined): {
  variant: "default" | "secondary" | "destructive" | "outline";
  label: string;
} {
  switch (status) {
    case "active":
      return { variant: "default", label: "Active" };
    case "trialing":
      return { variant: "outline", label: "Trial" };
    case "past_due":
      return { variant: "destructive", label: "Past Due" };
    case "canceled":
      return { variant: "secondary", label: "Canceled" };
    case "inactive":
      return { variant: "secondary", label: "Inactive" };
    default:
      return { variant: "secondary", label: status || "Free" };
  }
}

/**
 * Billing Page
 */
export default function BillingPage() {
  const [subscriptionData, setSubscriptionData] =
    useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    try {
      setLoading(true);
      const response = await billingApi.getSubscription();
      if (response.data) {
        setSubscriptionData(response.data);
      } else {
        setError(response.error || "Failed to load subscription");
      }
    } catch (e) {
      console.error("Billing fetch exception:", e);
      setError("Failed to load subscription data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const handleUpgrade = async (planKey: string) => {
    const priceId = PLAN_PRICES[planKey as keyof typeof PLAN_PRICES];
    if (!priceId) {
      setError(`Price ID not configured for ${planKey} plan.`);
      return;
    }
    try {
      setCheckoutLoading(planKey);
      const response = await billingApi.createCheckoutSession(priceId);
      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        setError(response.error || "Failed to create checkout session");
      }
    } catch {
      setError("Failed to start checkout");
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setPortalLoading(true);
      const response = await billingApi.createPortalSession();
      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        setError(response.error || "Failed to open billing portal");
      }
    } catch {
      setError("Failed to open billing portal");
    } finally {
      setPortalLoading(false);
    }
  };

  const currentPlan = subscriptionData?.organization?.plan || "free";
  const subscription = subscriptionData?.subscription;
  const features = subscriptionData?.features;
  const organization = subscriptionData?.organization;
  const statusBadge = getStatusBadge(subscription?.status);

  const plans = [
    {
      key: "starter",
      name: "Starter",
      price: "$29",
      period: "/month",
      description: "For small teams getting started",
      features: [
        "Up to 50 users",
        "10 OAuth clients",
        "MFA (TOTP + WebAuthn)",
        "30-day audit logs",
        "Email support",
        "Custom branding",
      ],
      popular: false,
    },
    {
      key: "professional",
      name: "Professional",
      price: "$99",
      period: "/month",
      description: "For growing organizations",
      features: [
        "Up to 500 users",
        "Unlimited OAuth clients",
        "Advanced MFA",
        "1-year audit logs",
        "Priority support",
        "SSO integrations",
        "API access",
      ],
      popular: true,
    },
    {
      key: "enterprise",
      name: "Enterprise",
      price: "Custom",
      period: "",
      description: "For large organizations",
      features: [
        "Unlimited users",
        "Unlimited clients",
        "Custom MFA policies",
        "Unlimited audit logs",
        "24/7 support",
        "SLA guarantee",
        "On-premise option",
        "Dedicated success manager",
      ],
      popular: false,
    },
  ];

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Billing & Plans</h1>
          <p className="text-muted-foreground">
            Manage your subscription for{" "}
            {organization?.name || "your organization"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchSubscription}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
          <p className="text-destructive flex-1">{error}</p>
          <Button variant="ghost" size="sm" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* Current Plan Card */}
      <Card className="mb-8">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Current Plan</CardTitle>
                <CardDescription>Your subscription details</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="text-lg px-4 py-1.5 capitalize font-semibold">
                {currentPlan}
              </Badge>
              {subscription && (
                <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
              )}
              {subscription?.cancelAtPeriodEnd && (
                <Badge variant="destructive">Canceling</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Pricing */}
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold">
              {currentPlan === "free"
                ? "$0"
                : currentPlan === "starter"
                ? "$29"
                : currentPlan === "professional"
                ? "$99"
                : "Custom"}
            </span>
            <span className="text-lg text-muted-foreground">
              {currentPlan === "free" ? "forever" : "/month"}
            </span>
          </div>

          {/* Subscription Status Messages */}
          {subscription && (
            <div className="space-y-2">
              {subscription.status === "active" &&
                subscription.currentPeriodEnd && (
                  <p className="text-sm text-muted-foreground">
                    {subscription.cancelAtPeriodEnd
                      ? `Your subscription ends on ${new Date(
                          subscription.currentPeriodEnd
                        ).toLocaleDateString()}`
                      : `Next billing date: ${new Date(
                          subscription.currentPeriodEnd
                        ).toLocaleDateString()}`}
                  </p>
                )}
              {subscription.status === "inactive" &&
                subscriptionData?.hasPaymentMethod && (
                  <p className="text-sm text-amber-600 dark:text-amber-500">
                    ⚠️ Your subscription is inactive. Complete checkout or
                    manage your subscription to activate.
                  </p>
                )}
              {subscription.status === "past_due" && (
                <p className="text-sm text-destructive font-medium">
                  ⚠️ Payment past due - please update your payment method to
                  avoid service interruption.
                </p>
              )}
            </div>
          )}

          {/* Current Plan Usage */}
          {subscriptionData?.usage && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Current Usage
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Users Usage */}
                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">Users</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {subscriptionData.usage.users.current} of{" "}
                      {subscriptionData.usage.users.max === -1
                        ? "∞"
                        : subscriptionData.usage.users.max}
                    </span>
                  </div>
                  {subscriptionData.usage.users.max !== -1 && (
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          subscriptionData.usage.users.current /
                            subscriptionData.usage.users.max >=
                          0.9
                            ? "bg-red-500"
                            : subscriptionData.usage.users.current /
                                subscriptionData.usage.users.max >=
                              0.7
                            ? "bg-yellow-500"
                            : "bg-blue-500"
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            (subscriptionData.usage.users.current /
                              subscriptionData.usage.users.max) *
                              100
                          )}%`,
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Clients Usage */}
                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">OAuth Clients</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {subscriptionData.usage.clients.current} of{" "}
                      {subscriptionData.usage.clients.max === -1
                        ? "∞"
                        : subscriptionData.usage.clients.max}
                    </span>
                  </div>
                  {subscriptionData.usage.clients.max !== -1 && (
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          subscriptionData.usage.clients.current /
                            subscriptionData.usage.clients.max >=
                          0.9
                            ? "bg-red-500"
                            : subscriptionData.usage.clients.current /
                                subscriptionData.usage.clients.max >=
                              0.7
                            ? "bg-yellow-500"
                            : "bg-green-500"
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            (subscriptionData.usage.clients.current /
                              subscriptionData.usage.clients.max) *
                              100
                          )}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Features */}
              {features && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-purple-500" />
                    <span className="text-muted-foreground">Audit Logs:</span>
                    <span className="font-medium">
                      {features.auditLogDays === -1
                        ? "∞"
                        : `${features.auditLogDays}d`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Zap className="h-4 w-4 text-orange-500" />
                    <span className="text-muted-foreground">MFA:</span>
                    <span className="font-medium">
                      {features.mfaTypes?.length || 0} types
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check
                      className={`h-4 w-4 ${
                        features.ssoEnabled ? "text-green-500" : "text-muted"
                      }`}
                    />
                    <span className="text-muted-foreground">SSO</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check
                      className={`h-4 w-4 ${
                        features.customBranding
                          ? "text-green-500"
                          : "text-muted"
                      }`}
                    />
                    <span className="text-muted-foreground">Branding</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            {subscriptionData?.hasPaymentMethod && (
              <Button
                variant="outline"
                onClick={handleManageSubscription}
                disabled={portalLoading}
              >
                {portalLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Opening Portal...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Manage Subscription
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <h2 className="text-lg font-semibold mb-4">
        {currentPlan === "free" ? "Upgrade Your Plan" : "Available Plans"}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrentPlan = plan.key === currentPlan;
          const canUpgrade = plan.key !== "enterprise" && !isCurrentPlan;

          return (
            <Card
              key={plan.name}
              className={`relative ${
                plan.popular
                  ? "border-primary shadow-lg ring-1 ring-primary"
                  : ""
              } ${isCurrentPlan ? "bg-muted/30" : ""}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="shadow-lg">Most Popular</Badge>
                </div>
              )}
              <CardHeader className={plan.popular ? "pt-6" : ""}>
                <CardTitle className="flex items-center gap-2">
                  {plan.name === "Enterprise" ? (
                    <Building2 className="h-5 w-5" />
                  ) : (
                    <Zap className="h-5 w-5" />
                  )}
                  {plan.name}
                  {isCurrentPlan && (
                    <Badge variant="secondary" className="ml-auto">
                      Current
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  disabled={isCurrentPlan || checkoutLoading !== null}
                  onClick={() => {
                    if (plan.name === "Enterprise") {
                      window.location.href =
                        "/contact?subject=Enterprise%20Plan%20Inquiry";
                    } else if (canUpgrade) {
                      handleUpgrade(plan.key);
                    }
                  }}
                >
                  {checkoutLoading === plan.key ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Redirecting...
                    </>
                  ) : isCurrentPlan ? (
                    "Current Plan"
                  ) : plan.name === "Enterprise" ? (
                    "Contact Sales"
                  ) : (
                    "Upgrade"
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* No Payment Method Notice */}
      {!subscriptionData?.hasPaymentMethod && (
        <Card className="mt-8 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <CreditCard className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground font-medium">
              No payment method on file
            </p>
            <p className="text-sm text-muted-foreground">
              Upgrade to a paid plan to add a payment method
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
