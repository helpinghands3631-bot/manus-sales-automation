/**
 * Feature Routers — Keys For Agents
 * Leads, Referrals, Usage Analytics, Webhooks, Appraisal Letters,
 * Listing Descriptions, Monthly Performance Reports
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { notifyOwner } from "../_core/notification";
import * as db from "../db";
import { queueEmailForLead } from "../emailService";

// ── Telegram helper (local) ──────────────────────────
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";

async function sendTelegram(text: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: "HTML" }),
    });
  } catch (e) {
    console.warn("[Telegram] Failed:", e);
  }
}

// ── Zapier webhook dispatcher ────────────────────────
async function fireWebhooks(userId: number, eventName: string, payload: Record<string, unknown>) {
  try {
    const hooks = await db.getActiveWebhooksByUser(userId);
    for (const hook of hooks) {
      const events = Array.isArray(hook.events) ? hook.events : [];
      if (!events.includes(eventName) && !events.includes("*")) continue;
      fetch(hook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(hook.secret ? { "X-KFA-Signature": hook.secret } : {}),
        },
        body: JSON.stringify({ event: eventName, timestamp: new Date().toISOString(), data: payload }),
      }).catch((e) => console.warn(`[Webhook] Failed to fire ${hook.url}:`, e));
      db.updateWebhookLastFired(hook.id).catch(() => {});
    }
  } catch (e) {
    console.warn("[Webhook] Dispatch error:", e);
  }
}

// ── Plan usage limits ────────────────────────────────
const PLAN_LIMITS: Record<string, { audits: number; campaigns: number; suburbPages: number; appraisalLetters: number; listingDescriptions: number }> = {
  starter: { audits: 10, campaigns: 5, suburbPages: 10, appraisalLetters: 10, listingDescriptions: 10 },
  growth: { audits: 50, campaigns: 25, suburbPages: 50, appraisalLetters: 50, listingDescriptions: 50 },
  dominator: { audits: 999, campaigns: 999, suburbPages: 999, appraisalLetters: 999, listingDescriptions: 999 },
  free: { audits: 3, campaigns: 1, suburbPages: 3, appraisalLetters: 3, listingDescriptions: 3 },
};

// ── Referral code generator ──────────────────────────
function generateReferralCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

// ═══════════════════════════════════════════════════════════════════════════
// LEADS ROUTER
// ═══════════════════════════════════════════════════════════════════════════
export const leadsRouter = router({
  // Public: submit a lead from the landing page
  submit: publicProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      email: z.string().email(),
      websiteUrl: z.string().url().optional(),
      agencyName: z.string().max(255).optional(),
      source: z.string().max(64).optional(),
    }))
    .mutation(async ({ input }) => {
      const lead = await db.createLead({
        name: input.name,
        email: input.email,
        websiteUrl: input.websiteUrl,
        agencyName: input.agencyName,
        source: input.source || "landing_page",
      });

      // Notify owner via Telegram + notification system
      sendTelegram(`🎯 <b>New Lead Captured!</b>\n━━━━━━━━━━━━━━━━━━\n👤 Name: ${input.name}\n📧 Email: ${input.email}\n🌐 Website: ${input.websiteUrl || "N/A"}\n🏢 Agency: ${input.agencyName || "N/A"}\n📍 Source: ${input.source || "landing_page"}`);
      notifyOwner({
        title: `🎯 New Lead: ${input.name}`,
        content: `Email: ${input.email}\nWebsite: ${input.websiteUrl || "N/A"}\nAgency: ${input.agencyName || "N/A"}`,
      }).catch(() => {});

      // Queue Grok-personalised email drip sequence (Day 0, Day 3, Day 7)
      queueEmailForLead({
        id: lead.id,
        name: input.name,
        email: input.email,
        websiteUrl: input.websiteUrl,
        agencyName: input.agencyName,
      }).catch((e) => console.warn("[EmailService] Queue failed:", e));

      // Also attempt external drip integration (Mailchimp/ActiveCampaign)
      const drip_url = process.env.EMAIL_DRIP_WEBHOOK_URL;
      if (drip_url) {
        fetch(drip_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: input.email, name: input.name, tags: ["lead", "landing-page"] }),
        }).catch(() => {});
      }

      return { success: true, id: lead.id };
    }),

  // Public: teaser audit for landing page CTA
  teaserAudit: publicProcedure
    .input(z.object({
      name: z.string().min(1),
      email: z.string().email(),
      websiteUrl: z.string().url(),
      agencyName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // Run a quick teaser audit (fewer tokens, faster)
      const llmResult = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a real estate website auditor. Give a brief teaser audit with 3 quick wins and 2 critical issues. Return JSON: { seo_score: number, conversion_score: number, quick_wins: string[], critical_issues: string[], teaser_message: string }`,
          },
          { role: "user", content: `Quick audit of: ${input.websiteUrl}` },
        ],
        response_format: { type: "json_object" },
      });

      const content = typeof llmResult.choices[0].message.content === "string"
        ? llmResult.choices[0].message.content : "{}";
      let result: Record<string, unknown> = {};
      try { result = JSON.parse(content); } catch { result = {}; }

      // Save lead with teaser result
      await db.createLead({
        name: input.name,
        email: input.email,
        websiteUrl: input.websiteUrl,
        agencyName: input.agencyName,
        source: "free_audit_cta",
        teaserAuditResult: result,
      });

      sendTelegram(`🔍 <b>Free Audit CTA Lead</b>\n👤 ${input.name} | 📧 ${input.email}\n🌐 ${input.websiteUrl}\nSEO: ${result.seo_score ?? "?"}/100 | Conv: ${result.conversion_score ?? "?"}/100`);

      return {
        seoScore: result.seo_score ?? 0,
        conversionScore: result.conversion_score ?? 0,
        quickWins: result.quick_wins ?? [],
        criticalIssues: result.critical_issues ?? [],
        teaserMessage: result.teaser_message ?? "Sign up to see your full audit report.",
      };
    }),

  // Admin: list all leads
  list: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    return db.listAllLeads();
  }),

  // Admin: email queue statistics
  emailQueueStats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    return db.getEmailQueueStats();
  }),
});

// ═══════════════════════════════════════════════════════════════════════════
// REFERRAL ROUTER
// ═══════════════════════════════════════════════════════════════════════════
export const referralRouter = router({
  // Get or create the user's referral code
  getMyCode: protectedProcedure.query(async ({ ctx }) => {
    let user = await db.getUserById(ctx.user.id);
    if (!user) throw new TRPCError({ code: "NOT_FOUND" });
    if (!user.referralCode) {
      const code = generateReferralCode();
      await db.setUserReferralCode(ctx.user.id, code);
      user = await db.getUserById(ctx.user.id);
    }
    return {
      code: user!.referralCode,
      link: `https://keyforagents.com?ref=${user!.referralCode}`,
    };
  }),

  // Get referral stats for the current user
  getStats: protectedProcedure.query(async ({ ctx }) => {
    return db.getReferralStats(ctx.user.id);
  }),

  // List all referrals made by the current user
  listMine: protectedProcedure.query(async ({ ctx }) => {
    return db.getReferralsByReferrer(ctx.user.id);
  }),

  // Track a referral when a new user signs up with a referral code
  trackSignup: protectedProcedure
    .input(z.object({ referralCode: z.string().length(8) }))
    .mutation(async ({ input, ctx }) => {
      const referrer = await db.getUserByReferralCode(input.referralCode);
      if (!referrer || referrer.id === ctx.user.id) return { success: false };
      await db.createReferral({
        referrerId: referrer.id,
        referredUserId: ctx.user.id,
        referralCode: input.referralCode,
        status: "signed_up",
      });
      await db.setUserReferredByCode(ctx.user.id, input.referralCode);
      sendTelegram(`🤝 <b>New Referral Signup!</b>\nReferred by: ${referrer.name || referrer.email}\nNew user: ${ctx.user.name || ctx.user.email}`);
      return { success: true };
    }),
});

// ═══════════════════════════════════════════════════════════════════════════
// USAGE ANALYTICS ROUTER
// ═══════════════════════════════════════════════════════════════════════════
export const usageRouter = router({
  getUsage: protectedProcedure.query(async ({ ctx }) => {
    const [stats, subscription] = await Promise.all([
      db.getDashboardStats(ctx.user.id),
      db.getSubscriptionByUserId(ctx.user.id),
    ]);
    const plan = (subscription?.plan || "free") as keyof typeof PLAN_LIMITS;
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
    const appraisalCount = await db.countAppraisalLettersByUser(ctx.user.id);
    const listingCount = await db.countListingDescriptionsByUser(ctx.user.id);

    return {
      plan,
      usage: {
        audits: stats.audits,
        campaigns: stats.campaigns,
        suburbPages: stats.suburbPages,
        appraisalLetters: appraisalCount,
        listingDescriptions: listingCount,
      },
      limits,
      percentages: {
        audits: Math.min(100, Math.round((stats.audits / limits.audits) * 100)),
        campaigns: Math.min(100, Math.round((stats.campaigns / limits.campaigns) * 100)),
        suburbPages: Math.min(100, Math.round((stats.suburbPages / limits.suburbPages) * 100)),
        appraisalLetters: Math.min(100, Math.round((appraisalCount / limits.appraisalLetters) * 100)),
        listingDescriptions: Math.min(100, Math.round((listingCount / limits.listingDescriptions) * 100)),
      },
    };
  }),
});

// ═══════════════════════════════════════════════════════════════════════════
// WEBHOOK ROUTER
// ═══════════════════════════════════════════════════════════════════════════
export const webhookRouter = router({
  list: protectedProcedure.query(({ ctx }) => db.getWebhooksByUser(ctx.user.id)),

  create: protectedProcedure
    .input(z.object({
      url: z.string().url(),
      events: z.array(z.string()).min(1),
      secret: z.string().max(64).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const existing = await db.getWebhooksByUser(ctx.user.id);
      if (existing.length >= 10) throw new TRPCError({ code: "BAD_REQUEST", message: "Maximum 10 webhooks allowed" });
      return db.createWebhook({
        userId: ctx.user.id,
        url: input.url,
        events: input.events,
        secret: input.secret,
        active: 1,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const hook = await db.getWebhookById(input.id);
      if (!hook || hook.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      await db.deleteWebhook(input.id);
      return { success: true };
    }),

  toggle: protectedProcedure
    .input(z.object({ id: z.number(), active: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const hook = await db.getWebhookById(input.id);
      if (!hook || hook.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      await db.updateWebhookActive(input.id, input.active ? 1 : 0);
      return { success: true };
    }),

  test: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const hook = await db.getWebhookById(input.id);
      if (!hook || hook.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      try {
        const res = await fetch(hook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(hook.secret ? { "X-KFA-Signature": hook.secret } : {}),
          },
          body: JSON.stringify({
            event: "test",
            timestamp: new Date().toISOString(),
            data: { message: "Test webhook from Keys For Agents", userId: ctx.user.id },
          }),
        });
        await db.updateWebhookLastFired(hook.id);
        return { success: true, status: res.status };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        return { success: false, error: msg };
      }
    }),

  // Available event types
  eventTypes: publicProcedure.query(() => [
    { value: "*", label: "All Events" },
    { value: "audit.completed", label: "Audit Completed" },
    { value: "campaign.generated", label: "Campaign Generated" },
    { value: "suburb_page.generated", label: "Suburb Page Generated" },
    { value: "user.signup", label: "User Signup" },
    { value: "subscription.activated", label: "Subscription Activated" },
    { value: "appraisal_letter.generated", label: "Appraisal Letter Generated" },
    { value: "listing_description.generated", label: "Listing Description Generated" },
  ]),
});

// ═══════════════════════════════════════════════════════════════════════════
// APPRAISAL LETTER ROUTER
// ═══════════════════════════════════════════════════════════════════════════
const APPRAISAL_SYSTEM_PROMPT = `You are an expert real estate copywriter specialising in Australian property appraisal letters. Write a professional, personalised appraisal letter for a real estate agency. The letter should be warm, authoritative, and persuasive. Include: a personalised greeting, market context for the suburb, the agency's unique value proposition, a clear call to action for a free appraisal meeting, and a professional sign-off. Return a JSON object with: subject (email subject line), letter (full letter text in HTML format with proper paragraphs), key_selling_points (array of 3-5 bullet points).`;

export const appraisalLetterRouter = router({
  generate: protectedProcedure
    .input(z.object({
      agencyId: z.number(),
      suburb: z.string().min(1),
      propertyType: z.enum(["house", "apartment", "townhouse", "land", "commercial"]),
      ownerName: z.string().optional(),
      propertyAddress: z.string().optional(),
      keyFeatures: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const agency = await db.getAgencyById(input.agencyId);
      if (!agency || agency.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });

      const prompt = `Write an appraisal letter for:
Agency: ${agency.name}
Suburb: ${input.suburb}
Property Type: ${input.propertyType}
Owner Name: ${input.ownerName || "Homeowner"}
Property Address: ${input.propertyAddress || `${input.suburb} property`}
Key Features: ${input.keyFeatures || "Standard features"}
Agency Services: ${agency.services || "Residential sales and property management"}`;

      const llmResult = await invokeLLM({
        messages: [
          { role: "system", content: APPRAISAL_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      });

      const content = typeof llmResult.choices[0].message.content === "string"
        ? llmResult.choices[0].message.content : "{}";
      let result: Record<string, unknown> = {};
      try { result = JSON.parse(content); } catch { result = { letter: content }; }

      const letter = await db.createAppraisalLetter({
        agencyId: input.agencyId,
        userId: ctx.user.id,
        suburb: input.suburb,
        propertyType: input.propertyType,
        ownerName: input.ownerName,
        propertyAddress: input.propertyAddress,
        keyFeatures: input.keyFeatures,
        content: typeof result.letter === "string" ? result.letter : JSON.stringify(result),
      });

      // Fire webhooks
      fireWebhooks(ctx.user.id, "appraisal_letter.generated", {
        agencyId: input.agencyId,
        suburb: input.suburb,
        propertyType: input.propertyType,
      });

      return { ...letter, subject: result.subject, keySellingPoints: result.key_selling_points };
    }),

  list: protectedProcedure
    .input(z.object({ agencyId: z.number() }))
    .query(async ({ input, ctx }) => {
      const agency = await db.getAgencyById(input.agencyId);
      if (!agency || agency.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      return db.getAppraisalLettersByAgency(input.agencyId);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const letter = await db.getAppraisalLetterById(input.id);
      if (!letter || letter.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      await db.deleteAppraisalLetter(input.id);
      return { success: true };
    }),
});

// ═══════════════════════════════════════════════════════════════════════════
// LISTING DESCRIPTION ROUTER
// ═══════════════════════════════════════════════════════════════════════════
const LISTING_SYSTEM_PROMPT = `You are an expert real estate copywriter specialising in Australian property listings. Write a compelling, SEO-optimised property listing description. The description should be engaging, highlight key features, appeal to the target buyer, and include a strong call to action. Return a JSON object with: headline (string, 10-15 words), description (string, 150-250 words), key_features (array of 5-8 bullet points), seo_tags (array of 5 relevant keywords).`;

export const listingDescriptionRouter = router({
  generate: protectedProcedure
    .input(z.object({
      agencyId: z.number(),
      propertyAddress: z.string().min(1),
      suburb: z.string().min(1),
      propertyType: z.enum(["house", "apartment", "townhouse", "land", "commercial"]),
      bedrooms: z.number().min(0).max(20).optional(),
      bathrooms: z.number().min(0).max(20).optional(),
      keyFeatures: z.string().optional(),
      targetBuyer: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const agency = await db.getAgencyById(input.agencyId);
      if (!agency || agency.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });

      const prompt = `Write a listing description for:
Agency: ${agency.name}
Address: ${input.propertyAddress}
Suburb: ${input.suburb}
Type: ${input.propertyType}
Bedrooms: ${input.bedrooms ?? "N/A"} | Bathrooms: ${input.bathrooms ?? "N/A"}
Key Features: ${input.keyFeatures || "Modern finishes, great location"}
Target Buyer: ${input.targetBuyer || "Families and investors"}`;

      const llmResult = await invokeLLM({
        messages: [
          { role: "system", content: LISTING_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      });

      const content = typeof llmResult.choices[0].message.content === "string"
        ? llmResult.choices[0].message.content : "{}";
      let result: Record<string, unknown> = {};
      try { result = JSON.parse(content); } catch { result = { description: content }; }

      const listing = await db.createListingDescription({
        agencyId: input.agencyId,
        userId: ctx.user.id,
        propertyAddress: input.propertyAddress,
        suburb: input.suburb,
        propertyType: input.propertyType,
        bedrooms: input.bedrooms,
        bathrooms: input.bathrooms,
        keyFeatures: input.keyFeatures,
        targetBuyer: input.targetBuyer,
        content: typeof result.description === "string" ? result.description : JSON.stringify(result),
      });

      fireWebhooks(ctx.user.id, "listing_description.generated", {
        agencyId: input.agencyId,
        suburb: input.suburb,
        propertyType: input.propertyType,
      });

      return { ...listing, headline: result.headline, keyFeatures: result.key_features, seoTags: result.seo_tags };
    }),

  list: protectedProcedure
    .input(z.object({ agencyId: z.number() }))
    .query(async ({ input, ctx }) => {
      const agency = await db.getAgencyById(input.agencyId);
      if (!agency || agency.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      return db.getListingDescriptionsByAgency(input.agencyId);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const listing = await db.getListingDescriptionById(input.id);
      if (!listing || listing.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      await db.deleteListingDescription(input.id);
      return { success: true };
    }),
});

// ═══════════════════════════════════════════════════════════════════════════
// MONTHLY PERFORMANCE REPORT ROUTER
// ═══════════════════════════════════════════════════════════════════════════
export const monthlyReportRouter = router({
  preview: protectedProcedure.query(async ({ ctx }) => {
    const [stats, agencies, subscription] = await Promise.all([
      db.getDashboardStats(ctx.user.id),
      db.getAgenciesByUserId(ctx.user.id),
      db.getSubscriptionByUserId(ctx.user.id),
    ]);
    const digestData = await db.getMonthlyDigestData(ctx.user.id);
    return {
      period: digestData?.period || new Date().toLocaleDateString("en-AU", { month: "long", year: "numeric" }),
      totals: digestData?.totals || { audits: 0, campaigns: 0, suburbPages: 0, avgSeoScore: 0, avgConversionScore: 0 },
      agencies: digestData?.agencies || [],
      highlights: digestData?.highlights || [],
      plan: subscription?.plan || "free",
      totalAgencies: agencies.length,
    };
  }),

  generatePdf: protectedProcedure.mutation(async ({ ctx }) => {
    const [digestData, user, subscription] = await Promise.all([
      db.getMonthlyDigestData(ctx.user.id),
      db.getUserById(ctx.user.id),
      db.getSubscriptionByUserId(ctx.user.id),
    ]);

    const period = digestData?.period || new Date().toLocaleDateString("en-AU", { month: "long", year: "numeric" });
    const totals = digestData?.totals || { audits: 0, campaigns: 0, suburbPages: 0, avgSeoScore: 0, avgConversionScore: 0 };
    const agencies = digestData?.agencies || [];
    const highlights = digestData?.highlights || [];
    const userName = user?.name || user?.email || "Valued Client";
    const plan = subscription?.plan || "free";

    const agencyRows = agencies.map((a: { name: string; audits: number; campaigns: number; suburbPages: number; avgSeoScore: number; avgConversionScore: number }) => `
      <tr>
        <td>${a.name}</td>
        <td style="text-align:center;">${a.audits}</td>
        <td style="text-align:center;">${a.campaigns}</td>
        <td style="text-align:center;">${a.suburbPages}</td>
        <td style="text-align:center;">${a.avgSeoScore}/100</td>
        <td style="text-align:center;">${a.avgConversionScore}/100</td>
      </tr>`).join("");

    const highlightItems = highlights.map((h: string) => `<li>${h}</li>`).join("");

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Inter, system-ui, sans-serif; background: #fff; color: #1a202c; padding: 40px; }
  .header { text-align: center; padding: 32px 0 24px; border-bottom: 3px solid #0d9488; margin-bottom: 32px; }
  .header h1 { font-size: 28px; color: #0d9488; font-weight: 700; }
  .header p { color: #64748b; font-size: 14px; margin-top: 4px; }
  .greeting { background: #f0fdf4; border-left: 4px solid #0d9488; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 24px; }
  .greeting h2 { font-size: 18px; color: #1a202c; font-weight: 600; }
  .greeting p { font-size: 14px; color: #64748b; margin-top: 4px; }
  .metrics { display: flex; gap: 16px; margin-bottom: 24px; }
  .metric { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; }
  .metric .value { font-size: 36px; font-weight: 700; color: #0d9488; }
  .metric .label { font-size: 12px; color: #64748b; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
  .section { margin-bottom: 24px; }
  .section h3 { font-size: 16px; font-weight: 600; color: #1a202c; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #0d9488; color: white; padding: 10px 12px; text-align: left; font-weight: 600; }
  td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
  tr:nth-child(even) { background: #f8fafc; }
  .scores { display: flex; gap: 16px; }
  .score-card { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
  .score-card .score { font-size: 28px; font-weight: 700; color: #0d9488; }
  .score-card .label { font-size: 12px; color: #64748b; }
  ul { padding-left: 20px; }
  li { margin-bottom: 6px; font-size: 13px; color: #475569; }
  .footer { text-align: center; padding: 24px 0 0; border-top: 1px solid #e2e8f0; margin-top: 32px; }
  .footer p { font-size: 12px; color: #94a3b8; }
  .plan-badge { display: inline-block; background: #0d9488; color: white; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
  @media print {
    body { padding: 20px; }
    @page { margin: 15mm 20mm; size: A4; }
  }
</style>
</head>
<body>
  <div class="header">
    <h1>Keys For Agents</h1>
    <p>Monthly Performance Report — ${period}</p>
  </div>

  <div class="greeting">
    <h2>Hi ${userName},</h2>
    <p>Here is your monthly performance summary for <strong>${period}</strong>. Plan: <span class="plan-badge">${plan}</span></p>
  </div>

  <div class="metrics">
    <div class="metric"><div class="value">${totals.audits}</div><div class="label">Audits Run</div></div>
    <div class="metric"><div class="value">${totals.campaigns}</div><div class="label">Campaigns</div></div>
    <div class="metric"><div class="value">${totals.suburbPages}</div><div class="label">Suburb Pages</div></div>
  </div>

  <div class="section">
    <h3>Average Scores</h3>
    <div class="scores">
      <div class="score-card"><div class="score">${totals.avgSeoScore}/100</div><div class="label">SEO Score</div></div>
      <div class="score-card"><div class="score">${totals.avgConversionScore}/100</div><div class="label">Conversion Score</div></div>
    </div>
  </div>

  ${agencies.length > 0 ? `
  <div class="section">
    <h3>Agency Breakdown</h3>
    <table>
      <thead><tr><th>Agency</th><th>Audits</th><th>Campaigns</th><th>Pages</th><th>SEO</th><th>Conv.</th></tr></thead>
      <tbody>${agencyRows}</tbody>
    </table>
  </div>` : ""}

  ${highlights.length > 0 ? `
  <div class="section">
    <h3>Highlights</h3>
    <ul>${highlightItems}</ul>
  </div>` : ""}

  <div class="footer">
    <p>Keys For Agents — AI-Powered Real Estate Marketing | keyforagents.com</p>
    <p style="margin-top:4px;">Generated on ${new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}</p>
  </div>
</body>
</html>`;

    return { html, period };
  }),
});
