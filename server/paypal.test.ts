import { describe, it, expect } from "vitest";

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET;
const PAYPAL_BASE = "https://api-m.paypal.com";

async function getPayPalAccessToken(): Promise<string> {
  const credentials = Buffer.from(
    `${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`
  ).toString("base64");

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal auth failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as { access_token: string; token_type: string };
  return data.access_token;
}

describe("PayPal Live Credentials", () => {
  it("should have PAYPAL_CLIENT_ID set", () => {
    expect(PAYPAL_CLIENT_ID).toBeTruthy();
    expect(PAYPAL_CLIENT_ID!.length).toBeGreaterThan(20);
  });

  it("should have PAYPAL_SECRET set", () => {
    expect(PAYPAL_SECRET).toBeTruthy();
    expect(PAYPAL_SECRET!.length).toBeGreaterThan(20);
  });

  it("should successfully obtain a PayPal access token (live)", async () => {
    const token = await getPayPalAccessToken();
    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(10);
    console.log("[PayPal] Access token obtained successfully (live mode)");
  }, 15000);
});
