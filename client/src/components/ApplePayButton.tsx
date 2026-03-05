import { useState, useEffect, useCallback } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";

// Plan price mapping (in cents AUD)
const PLAN_PRICES: Record<string, { amount: number; label: string }> = {
  starter: { amount: 29700, label: "Starter Plan — $297/mo" },
  growth: { amount: 49700, label: "Growth Plan — $497/mo" },
  dominator: { amount: 99700, label: "Dominator Plan — $997/mo" },
};

interface ApplePayButtonProps {
  plan: "starter" | "growth" | "dominator";
  disabled?: boolean;
  onSuccess?: () => void;
}

export function ApplePayButton({ plan, disabled, onSuccess }: ApplePayButtonProps) {
  const [stripe, setStripe] = useState<Stripe | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [paymentRequest, setPaymentRequest] = useState<any>(null);
  const [canMakePayment, setCanMakePayment] = useState<boolean | null>(null);
  const [processing, setProcessing] = useState(false);

  const utils = trpc.useUtils();

  const createPaymentIntent = trpc.subscription.createPaymentIntent.useMutation({
    onError: (e: { message: string }) => {
      toast.error(e.message);
      setProcessing(false);
    },
  });

  // Initialize Stripe
  useEffect(() => {
    if (!STRIPE_PK) return;
    loadStripe(STRIPE_PK).then((s) => {
      if (s) setStripe(s);
    });
  }, []);

  // Create Payment Request
  useEffect(() => {
    if (!stripe) return;

    const planInfo = PLAN_PRICES[plan];
    if (!planInfo) return;

    const pr = stripe.paymentRequest({
      country: "AU",
      currency: "aud",
      total: {
        label: planInfo.label,
        amount: planInfo.amount,
      },
      requestPayerName: true,
      requestPayerEmail: true,
    });

    pr.canMakePayment().then((result) => {
      setCanMakePayment(!!result);
      if (result) {
        setPaymentRequest(pr);
      }
    });

    return () => {
      // Cleanup: abort any pending payment request
      pr.abort?.();
    };
  }, [stripe, plan]);

  // Handle payment request token
  useEffect(() => {
    if (!paymentRequest) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handlePaymentMethod = async (ev: any) => {
      setProcessing(true);

      try {
        // Create PaymentIntent on server
        const result = await createPaymentIntent.mutateAsync({ plan });

        if (!result.clientSecret || !stripe) {
          ev.complete("fail");
          toast.error("Failed to create payment. Please try again.");
          setProcessing(false);
          return;
        }

        // Confirm the payment with the payment method from Apple Pay
        const { error, paymentIntent } = await stripe.confirmCardPayment(
          result.clientSecret,
          { payment_method: ev.paymentMethod.id },
          { handleActions: false }
        );

        if (error) {
          ev.complete("fail");
          toast.error(error.message || "Payment failed");
          setProcessing(false);
          return;
        }

        if (paymentIntent?.status === "requires_action") {
          // Handle 3D Secure if needed
          const { error: actionError } = await stripe.confirmCardPayment(result.clientSecret);
          if (actionError) {
            ev.complete("fail");
            toast.error(actionError.message || "Authentication failed");
            setProcessing(false);
            return;
          }
        }

        ev.complete("success");
        toast.success("Apple Pay payment successful! Your subscription is now active.");
        utils.subscription.current.invalidate();
        utils.subscription.paymentHistory.invalidate();
        onSuccess?.();
      } catch {
        ev.complete("fail");
        toast.error("Payment failed. Please try again.");
      } finally {
        setProcessing(false);
      }
    };

    paymentRequest.on("paymentmethod" as any, handlePaymentMethod);

    return () => {
      paymentRequest.off("paymentmethod" as any, handlePaymentMethod);
    };
  }, [paymentRequest, stripe, plan]);

  // Update payment request amount when plan changes
  useEffect(() => {
    if (!paymentRequest) return;
    const planInfo = PLAN_PRICES[plan];
    if (!planInfo) return;

    paymentRequest.update({
      total: {
        label: planInfo.label,
        amount: planInfo.amount,
      },
    });
  }, [paymentRequest, plan]);

  const handleClick = useCallback(() => {
    if (!paymentRequest) return;
    paymentRequest.show();
  }, [paymentRequest]);

  // Apple Pay not available — don't render anything
  if (canMakePayment === false || !STRIPE_PK) {
    return null;
  }

  // Still checking availability
  if (canMakePayment === null) {
    return null;
  }

  return (
    <Button
      className="w-full bg-black hover:bg-gray-900 text-white border border-gray-700"
      disabled={disabled || processing}
      onClick={handleClick}
    >
      {processing ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.72 7.56c-.94-1.18-2.23-1.87-3.17-1.87-1.49 0-2.13.72-3.17.72-1.07 0-1.88-.71-3.17-.71-1.06 0-2.48.82-3.42 2.22-1.32 1.97-.97 5.67.93 8.85.68 1.14 1.59 2.42 2.77 2.43 1.05.01 1.35-.68 2.78-.69 1.43-.01 1.7.7 2.76.69 1.18-.01 2.14-1.43 2.82-2.57.48-.81.66-1.22 1.04-2.14-2.73-1.04-3.17-4.91-.47-6.38-.72-.88-1.76-1.39-2.7-1.55zM14.75 2c-.78.05-1.69.53-2.22 1.16-.48.57-.88 1.42-.72 2.24.85.03 1.73-.47 2.23-1.1.47-.6.82-1.44.71-2.3z"/>
        </svg>
      )}
      {processing ? "Processing..." : "Pay with Apple Pay"}
    </Button>
  );
}
