import type { Express, Request, Response } from "express";
import express from "express";
import { getStripe } from "./stripe";
import * as db from "./db";
import { notifyOwner } from "./_core/notification";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";

async function sendTelegramNotification(text: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: "HTML" }),
    });
  } catch (e) {
    console.warn("[Telegram] Failed to send:", e);
  }
}

export function registerStripeWebhook(app: Express) {
  // MUST be registered BEFORE express.json() middleware
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      const stripe = getStripe();
      const sig = req.headers["stripe-signature"] as string;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!webhookSecret) {
        console.error("[Stripe Webhook] STRIPE_WEBHOOK_SECRET not set");
        res.status(500).json({ error: "Webhook secret not configured" });
        return;
      }

      let event;
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("[Stripe Webhook] Signature verification failed:", message);
        res.status(400).json({ error: `Webhook Error: ${message}` });
        return;
      }

      // Handle test events
      if (event.id.startsWith("evt_test_")) {
        console.log("[Stripe Webhook] Test event detected, returning verification response");
        res.json({ verified: true });
        return;
      }

      console.log(`[Stripe Webhook] Received event: ${event.type} (${event.id})`);

      try {
        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data.object as { 
              metadata?: Record<string, string>;
              customer?: string;
              subscription?: string;
            };
            const userId = parseInt(session.metadata?.user_id || "0");
            const plan = session.metadata?.plan as "starter" | "growth" | "dominator" | undefined;

            if (userId && plan) {
              await db.upsertSubscription({
                userId,
                plan,
                status: "active",
                stripeCustomerId: typeof session.customer === "string" ? session.customer : undefined,
                stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : undefined,
              });

              sendTelegramNotification(
                `💳 <b>Stripe Subscription Activated</b>\nUser ID: ${userId}\nPlan: ${plan.toUpperCase()}\nCustomer: ${session.customer}`
              );
              notifyOwner({
                title: "New Stripe Subscription",
                content: `User ${userId} subscribed to ${plan} plan`,
              }).catch(() => {});
            }
            break;
          }

          case "invoice.paid": {
            const invoice = event.data.object as { customer?: string; amount_paid?: number };
            const customerId = typeof invoice.customer === "string" ? invoice.customer : undefined;
            if (customerId) {
              sendTelegramNotification(
                `✅ <b>Invoice Paid</b>\nCustomer: ${customerId}\nAmount: $${((invoice.amount_paid || 0) / 100).toFixed(2)} AUD`
              );
            }
            break;
          }

          case "customer.subscription.updated": {
            const subscription = event.data.object as {
              customer?: string;
              status?: string;
              metadata?: Record<string, string>;
            };
            const customerId = typeof subscription.customer === "string" ? subscription.customer : undefined;
            if (customerId && subscription.status) {
              // Update subscription status in DB
              const dbInstance = await db.getDb();
              if (dbInstance) {
                const { subscriptions } = await import("../drizzle/schema");
                const { eq } = await import("drizzle-orm");
                await dbInstance
                  .update(subscriptions)
                  .set({
                    status: subscription.status === "active" ? "active"
                      : subscription.status === "past_due" ? "past_due"
                      : subscription.status === "canceled" ? "canceled"
                      : "active",
                  })
                  .where(eq(subscriptions.stripeCustomerId, customerId));
              }

              sendTelegramNotification(
                `🔄 <b>Subscription Updated</b>\nCustomer: ${customerId}\nStatus: ${subscription.status}`
              );
            }
            break;
          }

          case "payment_intent.succeeded": {
            const paymentIntent = event.data.object as {
              metadata?: Record<string, string>;
              customer?: string;
              amount?: number;
              currency?: string;
            };
            const piUserId = parseInt(paymentIntent.metadata?.user_id || "0");
            const piPlan = paymentIntent.metadata?.plan as "starter" | "growth" | "dominator" | undefined;
            const piMethod = paymentIntent.metadata?.payment_method;

            if (piUserId && piPlan && piMethod === "apple_pay") {
              await db.upsertSubscription({
                userId: piUserId,
                plan: piPlan,
                status: "active",
                stripeCustomerId: typeof paymentIntent.customer === "string" ? paymentIntent.customer : undefined,
              });

              const amountStr = ((paymentIntent.amount || 0) / 100).toFixed(2);
              sendTelegramNotification(
                `🍎 <b>Apple Pay Payment Succeeded</b>\nUser ID: ${piUserId}\nPlan: ${piPlan.toUpperCase()}\nAmount: $${amountStr} ${(paymentIntent.currency || "aud").toUpperCase()}`
              );
              notifyOwner({
                title: "Apple Pay Payment",
                content: `User ${piUserId} paid $${amountStr} via Apple Pay for ${piPlan} plan`,
              }).catch(() => {});
            }
            break;
          }

          case "customer.subscription.deleted": {
            const subscription = event.data.object as { customer?: string };
            const customerId = typeof subscription.customer === "string" ? subscription.customer : undefined;
            if (customerId) {
              const dbInstance = await db.getDb();
              if (dbInstance) {
                const { subscriptions } = await import("../drizzle/schema");
                const { eq } = await import("drizzle-orm");
                await dbInstance
                  .update(subscriptions)
                  .set({ status: "canceled" })
                  .where(eq(subscriptions.stripeCustomerId, customerId));
              }

              sendTelegramNotification(
                `❌ <b>Subscription Canceled</b>\nCustomer: ${customerId}`
              );
            }
            break;
          }

          default:
            console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
        }
      } catch (err) {
        console.error("[Stripe Webhook] Error processing event:", err);
      }

      res.json({ received: true });
    }
  );
}
