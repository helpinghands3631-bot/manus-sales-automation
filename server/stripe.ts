import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
    _stripe = new Stripe(key, { apiVersion: "2025-04-30.basil" as Stripe.LatestApiVersion });
  }
  return _stripe;
}

/**
 * Find or create a Stripe customer for a given user.
 */
export async function findOrCreateCustomer(opts: {
  email: string;
  name?: string;
  userId: number;
}): Promise<Stripe.Customer> {
  const stripe = getStripe();

  // Search for existing customer by email
  const existing = await stripe.customers.list({ email: opts.email, limit: 1 });
  if (existing.data.length > 0) {
    return existing.data[0];
  }

  // Create new customer
  return stripe.customers.create({
    email: opts.email,
    name: opts.name || undefined,
    metadata: { user_id: opts.userId.toString() },
  });
}

/**
 * Find or create a Stripe price for a plan using lookup_key.
 */
export async function findOrCreatePrice(plan: {
  lookupKey: string;
  name: string;
  priceAud: number;
}): Promise<string> {
  const stripe = getStripe();

  // Try to find existing price by lookup key
  const prices = await stripe.prices.list({ lookup_keys: [plan.lookupKey], limit: 1 });
  if (prices.data.length > 0) {
    return prices.data[0].id;
  }

  // Create product and price
  const product = await stripe.products.create({
    name: `RE Lead Doctor — ${plan.name}`,
    metadata: { lookup_key: plan.lookupKey },
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: plan.priceAud,
    currency: "aud",
    recurring: { interval: "month" },
    lookup_key: plan.lookupKey,
  });

  return price.id;
}
