import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import { adCampaigns, adCreatives, abTests } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

// ── AI Ad Copy Generator System Prompts ──────────────────
const AD_COPY_SYSTEM = `You are an expert digital advertising copywriter specialising in Australian real estate marketing. Generate high-converting ad copy tailored to the specified platform and objective. Return a JSON object with:
{
  "headlines": [array of 5 headline variations, max 30 chars for Google, 40 for Facebook/Instagram],
  "descriptions": [array of 3 description variations],
  "primaryText": "main ad body text (Facebook/Instagram)",
  "callToAction": "recommended CTA button text",
  "hashtags": [array of relevant hashtags for social],
  "tips": [array of 3 platform-specific optimisation tips]
}`;

const AUDIENCE_SYSTEM = `You are an expert digital advertising audience strategist for Australian real estate. Based on the campaign details, generate a comprehensive targeting recommendation. Return a JSON object with:
{
  "demographics": { "ageRange": "25-65", "gender": "all", "income": "above average", "education": "any" },
  "interests": [array of 10 interest targeting keywords],
  "behaviours": [array of 5 behavioural targeting options],
  "lookalike": { "source": "description of seed audience", "percentage": "1-3%" },
  "exclusions": [array of audiences to exclude],
  "geoTargeting": { "radius": "10km", "suburbs": [array], "states": [array] },
  "customAudiences": [array of custom audience suggestions],
  "estimatedReach": "500K-1M",
  "tips": [array of 3 targeting tips]
}`;

const BUDGET_SYSTEM = `You are an expert digital advertising budget strategist for Australian real estate. Based on the campaign objective, platform, and targeting, recommend an optimal budget. Return a JSON object with:
{
  "recommendedDaily": number in AUD cents,
  "recommendedLifetime": number in AUD cents,
  "minimumDaily": number in AUD cents,
  "estimatedCPC": "range string e.g. $0.80-$1.50",
  "estimatedCPM": "range string e.g. $8-$15",
  "estimatedCTR": "range string e.g. 1.5%-3.0%",
  "estimatedConversions": "range string per month",
  "estimatedROAS": "range string e.g. 3x-8x",
  "budgetBreakdown": { "testing": "20%", "scaling": "50%", "retargeting": "30%" },
  "timeline": "recommended campaign duration",
  "tips": [array of 3 budget optimisation tips]
}`;

export const digitalAdsRouter = router({
  // ── Create Campaign ──────────────────────────────────
  createCampaign: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      platform: z.enum(["facebook", "google", "instagram", "linkedin", "tiktok"]),
      objective: z.enum(["awareness", "traffic", "leads", "conversions", "sales"]),
      agencyId: z.number().optional(),
      targetSuburbs: z.string().optional(),
      budgetType: z.enum(["daily", "lifetime"]).optional(),
      budgetAmount: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const result = await db.insert(adCampaigns).values({
        userId: ctx.user.id,
        agencyId: input.agencyId ?? null,
        name: input.name,
        platform: input.platform,
        objective: input.objective,
        targetSuburbs: input.targetSuburbs ?? null,
        budgetType: input.budgetType ?? "daily",
        budgetAmount: input.budgetAmount ?? null,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
      });

      notifyOwner({ title: "New Ad Campaign Created", content: `Name: ${input.name}\nPlatform: ${input.platform}\nObjective: ${input.objective}\nUser: ${ctx.user.name || ctx.user.email}` });

      return { id: result[0].insertId, name: input.name };
    }),

  // ── List Campaigns ──────────────────────────────────
  listCampaigns: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(adCampaigns).where(eq(adCampaigns.userId, ctx.user.id)).orderBy(desc(adCampaigns.createdAt));
  }),

  // ── Get Campaign ──────────────────────────────────
  getCampaign: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select().from(adCampaigns).where(and(eq(adCampaigns.id, input.id), eq(adCampaigns.userId, ctx.user.id)));
      return rows[0] ?? null;
    }),

  // ── Update Campaign Status ──────────────────────────
  updateStatus: protectedProcedure
    .input(z.object({ id: z.number(), status: z.enum(["draft", "active", "paused", "completed", "archived"]) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(adCampaigns).set({ status: input.status }).where(and(eq(adCampaigns.id, input.id), eq(adCampaigns.userId, ctx.user.id)));
      return { success: true };
    }),

  // ── Update Campaign Metrics ──────────────────────────
  updateMetrics: protectedProcedure
    .input(z.object({
      id: z.number(),
      impressions: z.number().optional(),
      clicks: z.number().optional(),
      conversions: z.number().optional(),
      spend: z.number().optional(),
      revenue: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...metrics } = input;
      const updates: Record<string, any> = {};
      if (metrics.impressions !== undefined) updates.impressions = metrics.impressions;
      if (metrics.clicks !== undefined) updates.clicks = metrics.clicks;
      if (metrics.conversions !== undefined) updates.conversions = metrics.conversions;
      if (metrics.spend !== undefined) updates.spend = metrics.spend;
      if (metrics.revenue !== undefined) updates.revenue = metrics.revenue;
      if (metrics.clicks && metrics.impressions) updates.ctr = ((metrics.clicks / metrics.impressions) * 100).toFixed(2);
      if (metrics.spend && metrics.clicks) updates.cpc = (metrics.spend / metrics.clicks / 100).toFixed(2);
      if (metrics.revenue && metrics.spend && metrics.spend > 0) updates.roas = (metrics.revenue / metrics.spend).toFixed(2);
      await db.update(adCampaigns).set(updates).where(and(eq(adCampaigns.id, id), eq(adCampaigns.userId, ctx.user.id)));
      return { success: true };
    }),

  // ── Delete Campaign ──────────────────────────────────
  deleteCampaign: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(adCreatives).where(eq(adCreatives.campaignId, input.id));
      await db.delete(abTests).where(eq(abTests.campaignId, input.id));
      await db.delete(adCampaigns).where(and(eq(adCampaigns.id, input.id), eq(adCampaigns.userId, ctx.user.id)));
      return { success: true };
    }),

  // ── AI Generate Ad Copy ──────────────────────────────
  generateAdCopy: protectedProcedure
    .input(z.object({
      platform: z.enum(["facebook", "google", "instagram", "linkedin", "tiktok"]),
      objective: z.enum(["awareness", "traffic", "leads", "conversions", "sales"]),
      suburbs: z.string().optional(),
      services: z.string().optional(),
      agencyName: z.string().optional(),
      tone: z.string().optional(),
      campaignId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: AD_COPY_SYSTEM },
          { role: "user", content: `Generate ad copy for a ${input.platform} campaign.\nObjective: ${input.objective}\nAgency: ${input.agencyName || "Real estate agency"}\nSuburbs: ${input.suburbs || "Australian suburbs"}\nServices: ${input.services || "Sales, property management, rentals"}\nTone: ${input.tone || "Professional, trustworthy, results-driven"}` },
        ],
      });
      const content = response.choices?.[0]?.message?.content as string || "{}";
      let parsed: any;
      try { parsed = JSON.parse(content); } catch { parsed = { raw: content }; }

      // Save creatives to DB if campaignId provided
      if (input.campaignId) {
        const db = await getDb();
        if (db && parsed.headlines) {
          for (let i = 0; i < Math.min(parsed.headlines.length, 3); i++) {
            await db.insert(adCreatives).values({
              campaignId: input.campaignId,
              userId: ctx.user.id,
              platform: input.platform,
              type: "text",
              headline: parsed.headlines[i],
              description: parsed.descriptions?.[i] || null,
              primaryText: parsed.primaryText || null,
              callToAction: parsed.callToAction || null,
            });
          }
        }
      }

      return parsed;
    }),

  // ── AI Audience Builder ──────────────────────────────
  buildAudience: protectedProcedure
    .input(z.object({
      platform: z.enum(["facebook", "google", "instagram", "linkedin", "tiktok"]),
      objective: z.enum(["awareness", "traffic", "leads", "conversions", "sales"]),
      suburbs: z.string().optional(),
      services: z.string().optional(),
      propertyType: z.string().optional(),
      priceRange: z.string().optional(),
      campaignId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: AUDIENCE_SYSTEM },
          { role: "user", content: `Build targeting audience for a ${input.platform} ${input.objective} campaign.\nSuburbs: ${input.suburbs || "Australian suburbs"}\nServices: ${input.services || "Real estate sales and management"}\nProperty type: ${input.propertyType || "Residential"}\nPrice range: ${input.priceRange || "Any"}` },
        ],
      });
      const content = response.choices?.[0]?.message?.content as string || "{}";
      let parsed: any;
      try { parsed = JSON.parse(content); } catch { parsed = { raw: content }; }

      // Save audience to campaign if campaignId provided
      if (input.campaignId) {
        const db = await getDb();
        if (db) {
          await db.update(adCampaigns).set({
            targetAudience: parsed,
            targetDemographics: parsed.demographics || null,
            targetInterests: parsed.interests || null,
          }).where(and(eq(adCampaigns.id, input.campaignId), eq(adCampaigns.userId, ctx.user.id)));
        }
      }

      return parsed;
    }),

  // ── AI Budget Optimizer ──────────────────────────────
  optimizeBudget: protectedProcedure
    .input(z.object({
      platform: z.enum(["facebook", "google", "instagram", "linkedin", "tiktok"]),
      objective: z.enum(["awareness", "traffic", "leads", "conversions", "sales"]),
      suburbs: z.string().optional(),
      monthlyBudget: z.number().optional(),
      campaignId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: BUDGET_SYSTEM },
          { role: "user", content: `Optimize budget for a ${input.platform} ${input.objective} campaign.\nSuburbs: ${input.suburbs || "Australian suburbs"}\nMonthly budget available: ${input.monthlyBudget ? `$${(input.monthlyBudget / 100).toFixed(0)} AUD` : "Flexible"}` },
        ],
      });
      const content = response.choices?.[0]?.message?.content as string || "{}";
      let parsed: any;
      try { parsed = JSON.parse(content); } catch { parsed = { raw: content }; }
      return parsed;
    }),

  // ── List Creatives ──────────────────────────────────
  listCreatives: protectedProcedure
    .input(z.object({ campaignId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      if (input.campaignId) {
        return db.select().from(adCreatives).where(and(eq(adCreatives.campaignId, input.campaignId), eq(adCreatives.userId, ctx.user.id))).orderBy(desc(adCreatives.createdAt));
      }
      return db.select().from(adCreatives).where(eq(adCreatives.userId, ctx.user.id)).orderBy(desc(adCreatives.createdAt));
    }),

  // ── Save Creative ──────────────────────────────────
  saveCreative: protectedProcedure
    .input(z.object({
      campaignId: z.number(),
      platform: z.enum(["facebook", "google", "instagram", "linkedin", "tiktok"]),
      type: z.enum(["image", "video", "carousel", "text"]).optional(),
      headline: z.string().optional(),
      description: z.string().optional(),
      primaryText: z.string().optional(),
      callToAction: z.string().optional(),
      landingUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const result = await db.insert(adCreatives).values({
        campaignId: input.campaignId,
        userId: ctx.user.id,
        platform: input.platform,
        type: input.type ?? "text",
        headline: input.headline ?? null,
        description: input.description ?? null,
        primaryText: input.primaryText ?? null,
        callToAction: input.callToAction ?? null,
        landingUrl: input.landingUrl ?? null,
        isSaved: true,
      });
      return { id: result[0].insertId };
    }),

  // ── Toggle Save Creative ──────────────────────────────
  toggleSaveCreative: protectedProcedure
    .input(z.object({ id: z.number(), isSaved: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(adCreatives).set({ isSaved: input.isSaved }).where(and(eq(adCreatives.id, input.id), eq(adCreatives.userId, ctx.user.id)));
      return { success: true };
    }),

  // ── A/B Tests ──────────────────────────────────
  createAbTest: protectedProcedure
    .input(z.object({
      campaignId: z.number(),
      name: z.string().min(1),
      variantAId: z.number(),
      variantBId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const result = await db.insert(abTests).values({
        campaignId: input.campaignId,
        userId: ctx.user.id,
        name: input.name,
        variantAId: input.variantAId,
        variantBId: input.variantBId,
      });
      return { id: result[0].insertId };
    }),

  listAbTests: protectedProcedure
    .input(z.object({ campaignId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      if (input.campaignId) {
        return db.select().from(abTests).where(and(eq(abTests.campaignId, input.campaignId), eq(abTests.userId, ctx.user.id))).orderBy(desc(abTests.createdAt));
      }
      return db.select().from(abTests).where(eq(abTests.userId, ctx.user.id)).orderBy(desc(abTests.createdAt));
    }),

  updateAbTestMetrics: protectedProcedure
    .input(z.object({
      id: z.number(),
      variantAMetrics: z.any().optional(),
      variantBMetrics: z.any().optional(),
      winner: z.enum(["A", "B", "none"]).optional(),
      winnerReason: z.string().optional(),
      status: z.enum(["running", "completed", "cancelled"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...updates } = input;
      const setData: Record<string, any> = {};
      if (updates.variantAMetrics !== undefined) setData.variantAMetrics = updates.variantAMetrics;
      if (updates.variantBMetrics !== undefined) setData.variantBMetrics = updates.variantBMetrics;
      if (updates.winner) setData.winner = updates.winner;
      if (updates.winnerReason) setData.winnerReason = updates.winnerReason;
      if (updates.status) {
        setData.status = updates.status;
        if (updates.status === "completed") setData.completedAt = new Date();
      }
      await db.update(abTests).set(setData).where(and(eq(abTests.id, id), eq(abTests.userId, ctx.user.id)));
      return { success: true };
    }),

  // ── Performance Summary ──────────────────────────────
  performanceSummary: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { totalCampaigns: 0, activeCampaigns: 0, totalSpend: 0, totalRevenue: 0, totalImpressions: 0, totalClicks: 0, totalConversions: 0, avgCtr: "0", avgRoas: "0" };
    const all = await db.select().from(adCampaigns).where(eq(adCampaigns.userId, ctx.user.id));
    const active = all.filter(c => c.status === "active");
    const totalSpend = all.reduce((s, c) => s + (c.spend || 0), 0);
    const totalRevenue = all.reduce((s, c) => s + (c.revenue || 0), 0);
    const totalImpressions = all.reduce((s, c) => s + (c.impressions || 0), 0);
    const totalClicks = all.reduce((s, c) => s + (c.clicks || 0), 0);
    const totalConversions = all.reduce((s, c) => s + (c.conversions || 0), 0);
    const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0";
    const avgRoas = totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : "0";
    return { totalCampaigns: all.length, activeCampaigns: active.length, totalSpend, totalRevenue, totalImpressions, totalClicks, totalConversions, avgCtr, avgRoas };
  }),
});
