import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

describe("digitalAds router", () => {
  const caller = appRouter.createCaller({
    user: { id: 1, email: "test@example.com", name: "Test User", role: "admin", openId: "test-open-id" },
    req: {} as any,
    res: {} as any,
  });

  it("listCampaigns returns an array", async () => {
    const result = await caller.digitalAds.listCampaigns();
    expect(Array.isArray(result)).toBe(true);
  });

  it("performanceSummary returns stats object", async () => {
    const result = await caller.digitalAds.performanceSummary();
    expect(result).toHaveProperty("totalCampaigns");
    expect(result).toHaveProperty("activeCampaigns");
    expect(result).toHaveProperty("totalImpressions");
    expect(result).toHaveProperty("totalClicks");
    expect(result).toHaveProperty("totalConversions");
    expect(result).toHaveProperty("avgCtr");
    expect(result).toHaveProperty("totalSpend");
    expect(result).toHaveProperty("avgRoas");
    expect(typeof result.totalCampaigns).toBe("number");
  });

  it("createCampaign creates a new campaign", async () => {
    const result = await caller.digitalAds.createCampaign({
      name: "Test Campaign",
      platform: "facebook",
      objective: "leads",
      targetSuburbs: "Bondi, Manly",
      budgetType: "daily",
      budgetAmount: 5000,
    });
    expect(result).toHaveProperty("id");
    expect(result.name).toBe("Test Campaign");
  });

  it("listAbTests returns an array", async () => {
    const result = await caller.digitalAds.listAbTests({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("generateAdCopy returns ad copy object", async () => {
    const result = await caller.digitalAds.generateAdCopy({
      platform: "facebook",
      objective: "leads",
      suburbs: "Bondi Beach",
      services: "Sales",
      agencyName: "Test Agency",
      tone: "professional",
    });
    expect(result).toBeDefined();
    // The result should be a parsed JSON object from the LLM
    expect(typeof result).toBe("object");
  }, 30000);

  it("buildAudience returns audience targeting object", async () => {
    const result = await caller.digitalAds.buildAudience({
      platform: "facebook",
      objective: "leads",
      suburbs: "Bondi Beach",
      services: "Sales",
      propertyType: "Houses",
      priceRange: "$500K-$1.5M",
    });
    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
  }, 30000);

  it("optimizeBudget returns budget recommendation", async () => {
    const result = await caller.digitalAds.optimizeBudget({
      platform: "facebook",
      objective: "leads",
      suburbs: "Bondi Beach",
      monthlyBudget: 200000,
    });
    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
  }, 30000);
});
