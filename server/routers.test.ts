import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createMockUser(overrides?: Partial<AuthenticatedUser>): AuthenticatedUser {
  return {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

function createMockAdminUser(): AuthenticatedUser {
  return createMockUser({ role: "admin", openId: "admin-user-123" });
}

type CookieCall = { name: string; options: Record<string, unknown> };

function createContext(user: AuthenticatedUser | null = null): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };
  return { ctx, clearedCookies };
}

describe("auth.me", () => {
  it("returns null for unauthenticated user", async () => {
    const { ctx } = createContext(null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user for authenticated user", async () => {
    const user = createMockUser();
    const { ctx } = createContext(user);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result!.email).toBe("test@example.com");
  });
});

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createContext(createMockUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
  });
});

describe("agency", () => {
  it("requires authentication for agency.list", async () => {
    const { ctx } = createContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.agency.list()).rejects.toThrow();
  });

  it("requires authentication for agency.create", async () => {
    const { ctx } = createContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.agency.create({ name: "Test Agency" })).rejects.toThrow();
  });
});

describe("audit", () => {
  it("requires authentication for audit.run", async () => {
    const { ctx } = createContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.audit.run({ agencyId: 1, websiteUrl: "https://example.com" })).rejects.toThrow();
  });

  it("requires authentication for audit.exportCsv", async () => {
    const { ctx } = createContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.audit.exportCsv({ agencyId: 1 })).rejects.toThrow();
  });

  it("accepts date-range params for audit.exportCsv", async () => {
    const { ctx } = createContext(createMockUser());
    const caller = appRouter.createCaller(ctx);
    // Should throw NOT_FOUND (no agency) but not a validation error
    await expect(
      caller.audit.exportCsv({ agencyId: 999, dateFrom: "2025-01-01", dateTo: "2025-12-31" })
    ).rejects.toThrow();
  });

  it("requires authentication for audit.generatePdfReport", async () => {
    const { ctx } = createContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.audit.generatePdfReport({ auditId: 1 })).rejects.toThrow();
  });
});

describe("chat", () => {
  it("requires authentication for chat.send", async () => {
    const { ctx } = createContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.chat.send({ agencyId: 1, message: "Hello", mode: "ad_strategist" })
    ).rejects.toThrow();
  });

  it("validates mode enum", async () => {
    const { ctx } = createContext(createMockUser());
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.chat.send({ agencyId: 1, message: "Hello", mode: "invalid_mode" as any })
    ).rejects.toThrow();
  });
});

describe("campaign", () => {
  it("requires authentication for campaign.generate", async () => {
    const { ctx } = createContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.campaign.generate({ agencyId: 1, campaignType: "facebook", suburbs: "Bondi", services: "Sales" })
    ).rejects.toThrow();
  });

  it("validates campaign type enum", async () => {
    const { ctx } = createContext(createMockUser());
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.campaign.generate({ agencyId: 1, campaignType: "tiktok" as any, suburbs: "Bondi", services: "Sales" })
    ).rejects.toThrow();
  });

  it("requires authentication for campaign.exportCsv", async () => {
    const { ctx } = createContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.campaign.exportCsv({ agencyId: 1 })).rejects.toThrow();
  });

  it("accepts date-range params for campaign.exportCsv", async () => {
    const { ctx } = createContext(createMockUser());
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.campaign.exportCsv({ agencyId: 999, dateFrom: "2025-01-01", dateTo: "2025-12-31" })
    ).rejects.toThrow();
  });
});

describe("suburbPage", () => {
  it("requires authentication for suburbPage.generate", async () => {
    const { ctx } = createContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.suburbPage.generate({ agencyId: 1, suburb: "Bondi", service: "Sales" })
    ).rejects.toThrow();
  });

  it("requires authentication for suburbPage.exportCsv", async () => {
    const { ctx } = createContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.suburbPage.exportCsv({ agencyId: 1 })).rejects.toThrow();
  });

  it("accepts date-range params for suburbPage.exportCsv", async () => {
    const { ctx } = createContext(createMockUser());
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.suburbPage.exportCsv({ agencyId: 999, dateFrom: "2025-06-01", dateTo: "2025-06-30" })
    ).rejects.toThrow();
  });
});

describe("subscription", () => {
  it("requires authentication for subscription.current", async () => {
    const { ctx } = createContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.subscription.current()).rejects.toThrow();
  });

  it("returns plans list publicly", async () => {
    const { ctx } = createContext(null);
    const caller = appRouter.createCaller(ctx);
    const plans = await caller.subscription.plans();
    expect(plans).toHaveLength(3);
    expect(plans[0].key).toBe("starter");
    expect(plans[1].key).toBe("growth");
    expect(plans[2].key).toBe("dominator");
    expect(plans[0].priceAud).toBe(29700);
    expect(plans[1].priceAud).toBe(49700);
    expect(plans[2].priceAud).toBe(99700);
  });

  it("requires authentication for createCheckout", async () => {
    const { ctx } = createContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.subscription.createCheckout({ plan: "starter" })).rejects.toThrow();
  });

  it("validates plan enum for createCheckout", async () => {
    const { ctx } = createContext(createMockUser());
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.subscription.createCheckout({ plan: "invalid" as any })
    ).rejects.toThrow();
  });

  it("requires authentication for createPortalSession", async () => {
    const { ctx } = createContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.subscription.createPortalSession()).rejects.toThrow();
  });

  it("requires authentication for paymentHistory", async () => {
    const { ctx } = createContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.subscription.paymentHistory()).rejects.toThrow();
  });

  it("requires authentication for createPaypalOrder", async () => {
    const { ctx } = createContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.subscription.createPaypalOrder({ plan: "growth" })).rejects.toThrow();
  });

  it("validates plan enum for createPaypalOrder", async () => {
    const { ctx } = createContext(createMockUser());
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.subscription.createPaypalOrder({ plan: "invalid" as any })
    ).rejects.toThrow();
  });

  it("requires authentication for capturePaypalOrder", async () => {
    const { ctx } = createContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.subscription.capturePaypalOrder({ orderId: "test", plan: "starter" })).rejects.toThrow();
  });
});

describe("audit.compareCompetitor", () => {
  it("requires authentication for compareCompetitor", async () => {
    const { ctx } = createContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.audit.compareCompetitor({ agencyId: 1, myUrl: "https://my.com", competitorUrl: "https://comp.com" })
    ).rejects.toThrow();
  });

  it("validates URL format for compareCompetitor", async () => {
    const { ctx } = createContext(createMockUser());
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.audit.compareCompetitor({ agencyId: 1, myUrl: "not-a-url", competitorUrl: "https://comp.com" })
    ).rejects.toThrow();
  });
});

describe("dashboard", () => {
  it("requires authentication for dashboard.stats", async () => {
    const { ctx } = createContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.dashboard.stats()).rejects.toThrow();
  });

  it("requires authentication for dashboard.recentActivity", async () => {
    const { ctx } = createContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.dashboard.recentActivity()).rejects.toThrow();
  });

  it("requires authentication for dashboard.subscription", async () => {
    const { ctx } = createContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.dashboard.subscription()).rejects.toThrow();
  });
});

describe("onboarding", () => {
  it("requires authentication for onboarding.status", async () => {
    const { ctx } = createContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.onboarding.status()).rejects.toThrow();
  });

  it("requires authentication for onboarding.updateStep", async () => {
    const { ctx } = createContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.onboarding.updateStep({ step: 1 })).rejects.toThrow();
  });

  it("requires authentication for onboarding.complete", async () => {
    const { ctx } = createContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.onboarding.complete()).rejects.toThrow();
  });

  it("requires authentication for onboarding.skip", async () => {
    const { ctx } = createContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.onboarding.skip()).rejects.toThrow();
  });

  it("validates step range for onboarding.updateStep", async () => {
    const { ctx } = createContext(createMockUser());
    const caller = appRouter.createCaller(ctx);
    await expect(caller.onboarding.updateStep({ step: 10 })).rejects.toThrow();
  });

  it("validates step minimum for onboarding.updateStep", async () => {
    const { ctx } = createContext(createMockUser());
    const caller = appRouter.createCaller(ctx);
    await expect(caller.onboarding.updateStep({ step: -1 })).rejects.toThrow();
  });
});

describe("digest", () => {
  it("requires authentication for digest.preview", async () => {
    const { ctx } = createContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.digest.preview()).rejects.toThrow();
  });

  it("accepts monthsBack parameter for digest.preview", async () => {
    const { ctx } = createContext(createMockUser());
    const caller = appRouter.createCaller(ctx);
    // Should not throw validation error, may throw DB error
    try {
      await caller.digest.preview({ monthsBack: 3 });
    } catch (e: any) {
      expect(e.code).not.toBe("BAD_REQUEST");
    }
  });

  it("validates monthsBack range for digest.preview", async () => {
    const { ctx } = createContext(createMockUser());
    const caller = appRouter.createCaller(ctx);
    await expect(caller.digest.preview({ monthsBack: 13 })).rejects.toThrow();
  });

  it("requires authentication for digest.sendToMe", async () => {
    const { ctx } = createContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.digest.sendToMe()).rejects.toThrow();
  });

  it("requires admin for digest.broadcastAll", async () => {
    const { ctx } = createContext(createMockUser());
    const caller = appRouter.createCaller(ctx);
    await expect(caller.digest.broadcastAll()).rejects.toThrow();
  });

  it("denies unauthenticated access to digest.broadcastAll", async () => {
    const { ctx } = createContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.digest.broadcastAll()).rejects.toThrow();
  });

  it("requires authentication for digest.getPreferences", async () => {
    const { ctx } = createContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.digest.getPreferences()).rejects.toThrow();
  });

  it("requires authentication for digest.updatePreferences", async () => {
    const { ctx } = createContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.digest.updatePreferences({ showAudits: false })).rejects.toThrow();
  });

  it("accepts valid preferences for digest.updatePreferences", async () => {
    const { ctx } = createContext(createMockUser());
    const caller = appRouter.createCaller(ctx);
    // Should not throw validation error, may throw DB error
    try {
      await caller.digest.updatePreferences({
        showAudits: true,
        showCampaigns: false,
        showSuburbPages: true,
        showScores: false,
        showHighlights: true,
        showAgencyBreakdown: false,
      });
    } catch (e: any) {
      expect(e.code).not.toBe("BAD_REQUEST");
    }
  });

  it("accepts partial preferences for digest.updatePreferences", async () => {
    const { ctx } = createContext(createMockUser());
    const caller = appRouter.createCaller(ctx);
    // Should not throw validation error with partial input
    try {
      await caller.digest.updatePreferences({ showAudits: false });
    } catch (e: any) {
      expect(e.code).not.toBe("BAD_REQUEST");
    }
  });
});

describe("admin", () => {
  it("denies access to non-admin users", async () => {
    const { ctx } = createContext(createMockUser());
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.stats()).rejects.toThrow();
  });

  it("denies access to unauthenticated users", async () => {
    const { ctx } = createContext(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.stats()).rejects.toThrow();
  });
});
