import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, CreditCard, Loader2, ExternalLink, Receipt, Settings } from "lucide-react";
import { ApplePayButton } from "@/components/ApplePayButton";
import { toast } from "sonner";
import { useEffect, useState } from "react";

const PLANS = [
  {
    key: "starter" as const,
    name: "Starter",
    price: "$297",
    features: [
      "1 Agency Profile",
      "5 Website Audits / month",
      "10 AI Chat Sessions / month",
      "3 Campaigns / month",
      "5 Suburb Pages / month",
      "Email Support",
    ],
  },
  {
    key: "growth" as const,
    name: "Growth",
    price: "$497",
    popular: true,
    features: [
      "3 Agency Profiles",
      "Unlimited Website Audits",
      "Unlimited AI Chat Sessions",
      "10 Campaigns / month",
      "20 Suburb Pages / month",
      "Priority Support",
      "Campaign Performance Insights",
    ],
  },
  {
    key: "dominator" as const,
    name: "Dominator",
    price: "$997",
    features: [
      "Unlimited Agency Profiles",
      "Unlimited Website Audits",
      "Unlimited AI Chat Sessions",
      "Unlimited Campaigns",
      "Unlimited Suburb Pages",
      "Dedicated Account Manager",
      "White-label Reports",
      "API Access",
    ],
  },
];

export default function Subscription() {
  const utils = trpc.useUtils();
  const subQuery = trpc.subscription.current.useQuery();
  const currentSub = subQuery.data;
  const paymentHistoryQuery = trpc.subscription.paymentHistory.useQuery();
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);
  const [paypalPlan, setPaypalPlan] = useState<string | null>(null);

  // Stripe Checkout
  const stripeCheckout = trpc.subscription.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        toast.info("Redirecting to Stripe Checkout...");
        window.open(data.checkoutUrl, "_blank");
      }
      setCheckoutPlan(null);
    },
    onError: (e: { message: string }) => {
      toast.error(e.message);
      setCheckoutPlan(null);
    },
  });

  // PayPal Checkout
  const paypalOrder = trpc.subscription.createPaypalOrder.useMutation({
    onSuccess: (data) => {
      if (data.approveUrl) {
        toast.info("Redirecting to PayPal...");
        window.open(data.approveUrl, "_blank");
      } else {
        toast.error("Could not create PayPal order");
      }
      setPaypalPlan(null);
    },
    onError: (e: { message: string }) => {
      toast.error(e.message);
      setPaypalPlan(null);
    },
  });

  // Stripe Customer Portal
  const portalMutation = trpc.subscription.createPortalSession.useMutation({
    onSuccess: (data) => {
      if (data.portalUrl) {
        window.open(data.portalUrl, "_blank");
      }
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  // Handle return from Stripe/PayPal
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      toast.success("Payment successful! Your subscription is now active.");
      utils.subscription.current.invalidate();
      utils.subscription.paymentHistory.invalidate();
      window.history.replaceState({}, "", "/subscription");
    }
    if (params.get("canceled") === "true") {
      toast.info("Checkout was canceled.");
      window.history.replaceState({}, "", "/subscription");
    }
    if (params.get("paypal_success") === "true") {
      toast.success("PayPal payment successful! Your subscription is now active.");
      utils.subscription.current.invalidate();
      window.history.replaceState({}, "", "/subscription");
    }
    if (params.get("paypal_canceled") === "true") {
      toast.info("PayPal checkout was canceled.");
      window.history.replaceState({}, "", "/subscription");
    }
  }, []);

  const handleStripeCheckout = (planKey: "starter" | "growth" | "dominator") => {
    setCheckoutPlan(planKey);
    stripeCheckout.mutate({ plan: planKey });
  };

  const handlePaypalCheckout = (planKey: "starter" | "growth" | "dominator") => {
    setPaypalPlan(planKey);
    paypalOrder.mutate({ plan: planKey });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Subscription</h1>
        <p className="text-muted-foreground mt-1">Manage your plan, billing, and payment history.</p>
      </div>

      {/* Current Plan Card */}
      {currentSub && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Plan</p>
                <h3 className="text-xl font-bold capitalize mt-1">{currentSub.plan}</h3>
                <Badge
                  variant={currentSub.status === "active" ? "default" : "destructive"}
                  className="mt-2 capitalize"
                >
                  {currentSub.status}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                {currentSub.stripeCustomerId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => portalMutation.mutate()}
                    disabled={portalMutation.isPending}
                  >
                    {portalMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Settings className="h-4 w-4 mr-2" />
                    )}
                    Manage Billing
                  </Button>
                )}
                <CreditCard className="h-10 w-10 text-primary/40" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const isCurrent = currentSub?.plan === plan.key && currentSub?.status === "active";
          return (
            <Card
              key={plan.key}
              className={`relative ${plan.popular ? "border-primary ring-1 ring-primary/20" : ""} ${isCurrent ? "border-primary/50 bg-primary/5" : ""}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="px-3 py-1">Most Popular</Badge>
                </div>
              )}
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">/mo</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <Button className="w-full" variant="outline" disabled>
                    Current Plan
                  </Button>
                ) : (
                  <div className="space-y-2">
                    {/* Stripe Button */}
                    <Button
                      className="w-full"
                      variant={plan.popular ? "default" : "outline"}
                      disabled={checkoutPlan === plan.key}
                      onClick={() => handleStripeCheckout(plan.key)}
                    >
                      {checkoutPlan === plan.key ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CreditCard className="h-4 w-4 mr-2" />
                      )}
                      Pay with Card
                    </Button>

                    {/* PayPal Button */}
                    <Button
                      className="w-full bg-[#0070ba] hover:bg-[#005ea6] text-white"
                      disabled={paypalPlan === plan.key}
                      onClick={() => handlePaypalCheckout(plan.key)}
                    >
                      {paypalPlan === plan.key ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Pay with PayPal
                    </Button>

                    {/* Apple Pay Button (only shows on supported devices) */}
                    <ApplePayButton
                      plan={plan.key}
                      disabled={checkoutPlan === plan.key || paypalPlan === plan.key}
                      onSuccess={() => {
                        utils.subscription.current.invalidate();
                        utils.subscription.paymentHistory.invalidate();
                      }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Payment History */}
      <div>
        <Separator className="mb-6" />
        <h2 className="text-xl font-bold tracking-tight mb-4 flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Payment History
        </h2>

        {paymentHistoryQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : paymentHistoryQuery.data && paymentHistoryQuery.data.length > 0 ? (
          <div className="space-y-3">
            {paymentHistoryQuery.data.map((payment) => (
              <Card key={payment.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      ${((payment.amount || 0) / 100).toFixed(2)}{" "}
                      <span className="text-muted-foreground uppercase text-xs">{payment.currency}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(payment.date).toLocaleDateString("en-AU", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={payment.status === "paid" ? "default" : "secondary"} className="capitalize">
                      {payment.status}
                    </Badge>
                    {payment.invoiceUrl && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={payment.invoiceUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Receipt className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No payment history yet.</p>
              <p className="text-sm mt-1">Payments will appear here after you subscribe.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Test Mode Notice */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-4">
          <p className="text-sm text-amber-200">
            <strong>Test Mode:</strong> Use card number <code className="bg-amber-500/10 px-1.5 py-0.5 rounded">4242 4242 4242 4242</code> with any future expiry and CVC to test Stripe payments.
            For PayPal, use sandbox test accounts. Apple Pay is available on supported Safari browsers and iOS devices.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
