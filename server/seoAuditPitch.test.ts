/**
 * SEO Audit & Pitch Router Tests — Full Spec
 */
import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeUser(overrides?: Partial<AuthenticatedUser>): AuthenticatedUser {
  return {
    id: 1,
    openId: "test-owner",
    name: "Test Owner",
    email: "test@example.com",
    loginMethod: "manus",
    role: "admin",
    onboardingComplete: 1,
    onboardingStep: 5,
    referralCode: null,
    referredByCode: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

function makeCtx(user: AuthenticatedUser | null) {
  return {
    user,
    req: { headers: { origin: "http://localhost:3000" } } as any,
    res: {} as any,
  };
}

describe("seoAuditPitch router", () => {
  it("requires authentication for list", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.seoAuditPitch.list({ limit: 10 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("requires authentication for runAuditAndPitch", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(
      caller.seoAuditPitch.runAuditAndPitch({ websiteUrl: "https://example.com", annualRevenue: 0, employeeCount: 0, sendEmail: false })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("list returns an array for authenticated users", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.seoAuditPitch.list({ limit: 10 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("getById returns null for non-existent id", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.seoAuditPitch.getById({ id: 999999 });
    expect(result).toBeNull();
  });

  it("getDemo is public and returns null for non-existent id", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    const result = await caller.seoAuditPitch.getDemo({ id: 999999 });
    expect(result).toBeNull();
  });

  it("runAuditAndPitch marks as not_qualified when capital is too small", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.seoAuditPitch.runAuditAndPitch({
      websiteUrl: "https://example.com",
      annualRevenue: 100_000,   // below $2M threshold
      employeeCount: 5,          // below 20 threshold
      sendEmail: false,
    });
    expect(result).toHaveProperty("seoScore");
    expect(result).toHaveProperty("qualified");
    expect(result.qualified).toBe(false);
  }, 60_000);

  it("runAuditAndPitch accepts industry and siteCount params", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.seoAuditPitch.runAuditAndPitch({
      websiteUrl: "https://example.com",
      annualRevenue: 5_000_000,
      employeeCount: 50,
      industry: "Real Estate",
      siteCount: 3,
      sendEmail: false,
    });
    expect(result).toHaveProperty("seoScore");
    expect(result).toHaveProperty("qualified");
    expect(typeof result.seoScore).toBe("number");
    // With high revenue + employees, should qualify (unless SEO score is already high)
    if (result.seoScore < 60) {
      expect(result.qualified).toBe(true);
      expect(result.planName).toBeDefined();
      expect(result.planPrice).toBeGreaterThan(0);
    }
  }, 90_000);

  it("runAuditAndPitch returns topIssues and quickWins arrays", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.seoAuditPitch.runAuditAndPitch({
      websiteUrl: "https://example.com",
      annualRevenue: 0,
      employeeCount: 0,
      sendEmail: false,
    });
    expect(Array.isArray(result.topIssues)).toBe(true);
    expect(Array.isArray(result.quickWins)).toBe(true);
  }, 60_000);
});
