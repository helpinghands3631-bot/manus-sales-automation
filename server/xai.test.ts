import { describe, it, expect } from "vitest";

/**
 * Validates that the XAI_API_KEY is set and the xAI API is reachable.
 * Uses the /v1/models endpoint which is lightweight and does not consume tokens.
 */
describe("xAI API Key", () => {
  it("XAI_API_KEY is set in the environment", () => {
    const key = process.env.XAI_API_KEY;
    expect(key, "XAI_API_KEY must be set").toBeTruthy();
    expect(key?.startsWith("xai-"), "XAI_API_KEY must start with xai-").toBe(true);
  });

  it("xAI API is reachable and key is valid", async () => {
    const key = process.env.XAI_API_KEY;
    if (!key) {
      throw new Error("XAI_API_KEY is not set — cannot validate");
    }

    const response = await fetch("https://api.x.ai/v1/models", {
      headers: {
        authorization: `Bearer ${key}`,
      },
    });

    expect(response.status, `xAI API returned ${response.status}`).toBe(200);

    const data = await response.json() as { data: Array<{ id: string }> };
    expect(Array.isArray(data.data)).toBe(true);

    const modelIds = data.data.map((m) => m.id);
    const hasGrok = modelIds.some((id) => id.includes("grok"));
    expect(hasGrok, `Expected at least one grok model, got: ${modelIds.join(", ")}`).toBe(true);
  }, 15000);
});
