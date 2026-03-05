import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
import * as db from "./db";
import { PLANS, getPlanByKey } from "./products";
import { getStripe, findOrCreateCustomer, findOrCreatePrice } from "./stripe";
import { leadsRouter, referralRouter, usageRouter, webhookRouter, appraisalLetterRouter, listingDescriptionRouter, monthlyReportRouter } from "./routers/features";
import { grokChatRouter } from "./routers/grokChat";
import { blogRouter } from "./routers/blog";
import { crmRouter, emailHubRouter, revenueRouter } from "./routers/commandCentre";
import { paypalTransactionsRouter, paypalInvoicingRouter, paypalSubscriptionsRouter, paypalPayoutsRouter } from "./routers/paypalBusiness";
import { researchRouter } from "./routers/research";
import { seoAuditPitchRouter } from "./routers/seoAuditPitch";

// ── Admin guard ──────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  return next({ ctx });
});

// ── Telegram helper ──────────────────────────────────
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

// ── Digest Email HTML Generator ───────────────────
function generateDigestEmailHtml(data: NonNullable<Awaited<ReturnType<typeof db.getMonthlyDigestData>>>, userName: string, prefs?: { showAudits?: number; showCampaigns?: number; showSuburbPages?: number; showScores?: number; showHighlights?: number; showAgencyBreakdown?: number } | null): string {
  const p = {
    showAudits: prefs?.showAudits !== 0,
    showCampaigns: prefs?.showCampaigns !== 0,
    showSuburbPages: prefs?.showSuburbPages !== 0,
    showScores: prefs?.showScores !== 0,
    showHighlights: prefs?.showHighlights !== 0,
    showAgencyBreakdown: prefs?.showAgencyBreakdown !== 0,
  };
  const agencyRows = data.agencies.map(a => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #2d3748;">${a.name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #2d3748;text-align:center;">${a.audits}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #2d3748;text-align:center;">${a.campaigns}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #2d3748;text-align:center;">${a.suburbPages}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #2d3748;text-align:center;">${a.avgSeoScore}/100</td>
      <td style="padding:8px 12px;border-bottom:1px solid #2d3748;text-align:center;">${a.avgConversionScore}/100</td>
    </tr>`).join("");

  const highlightItems = data.highlights.map(h => `<li style="margin-bottom:4px;">${h}</li>`).join("");

  // Build metric cards conditionally
  const metricCards = [];
  if (p.showAudits) metricCards.push(`<div style="flex:1;background:#1e293b;border-radius:8px;padding:16px;text-align:center;"><div style="font-size:28px;font-weight:700;color:#2dd4bf;">${data.totals.audits}</div><div style="font-size:12px;color:#94a3b8;">Audits</div></div>`);
  if (p.showCampaigns) metricCards.push(`<div style="flex:1;background:#1e293b;border-radius:8px;padding:16px;text-align:center;"><div style="font-size:28px;font-weight:700;color:#2dd4bf;">${data.totals.campaigns}</div><div style="font-size:12px;color:#94a3b8;">Campaigns</div></div>`);
  if (p.showSuburbPages) metricCards.push(`<div style="flex:1;background:#1e293b;border-radius:8px;padding:16px;text-align:center;"><div style="font-size:28px;font-weight:700;color:#2dd4bf;">${data.totals.suburbPages}</div><div style="font-size:12px;color:#94a3b8;">Suburb Pages</div></div>`);

  const scoresSection = p.showScores ? `<div style="background:#1e293b;border-radius:12px;padding:20px;margin-bottom:20px;"><h3 style="color:#f1f5f9;font-size:16px;margin:0 0 8px;">Average Scores</h3><p style="margin:4px 0;color:#94a3b8;">SEO Score: <strong style="color:#2dd4bf;">${data.totals.avgSeoScore}/100</strong></p><p style="margin:4px 0;color:#94a3b8;">Conversion Score: <strong style="color:#2dd4bf;">${data.totals.avgConversionScore}/100</strong></p></div>` : "";

  const agencySection = (p.showAgencyBreakdown && data.agencies.length > 0) ? `<div style="background:#1e293b;border-radius:12px;padding:20px;margin-bottom:20px;overflow-x:auto;"><h3 style="color:#f1f5f9;font-size:16px;margin:0 0 12px;">Agency Breakdown</h3><table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="color:#94a3b8;"><th style="padding:8px 12px;text-align:left;border-bottom:2px solid #2dd4bf;">Agency</th><th style="padding:8px 12px;text-align:center;border-bottom:2px solid #2dd4bf;">Audits</th><th style="padding:8px 12px;text-align:center;border-bottom:2px solid #2dd4bf;">Campaigns</th><th style="padding:8px 12px;text-align:center;border-bottom:2px solid #2dd4bf;">Pages</th><th style="padding:8px 12px;text-align:center;border-bottom:2px solid #2dd4bf;">SEO</th><th style="padding:8px 12px;text-align:center;border-bottom:2px solid #2dd4bf;">Conv.</th></tr></thead><tbody>${agencyRows}</tbody></table></div>` : "";

  const highlightsSection = (p.showHighlights && data.highlights.length > 0) ? `<div style="background:#1e293b;border-radius:12px;padding:20px;margin-bottom:20px;"><h3 style="color:#f1f5f9;font-size:16px;margin:0 0 8px;">Highlights</h3><ul style="margin:0;padding-left:20px;color:#94a3b8;font-size:13px;">${highlightItems}</ul></div>` : "";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:Inter,system-ui,sans-serif;color:#e2e8f0;">
<div style="max-width:640px;margin:0 auto;padding:32px 20px;">
  <div style="text-align:center;margin-bottom:24px;">
    <h1 style="color:#2dd4bf;font-size:24px;margin:0;">Keys For Agents</h1>
    <p style="color:#94a3b8;font-size:14px;margin:4px 0 0;">Monthly Activity Digest</p>
  </div>
  <div style="background:#1e293b;border-radius:12px;padding:24px;margin-bottom:20px;">
    <h2 style="color:#f1f5f9;font-size:18px;margin:0 0 4px;">Hi ${userName},</h2>
    <p style="color:#94a3b8;font-size:14px;margin:0;">Here's your activity summary for <strong style="color:#2dd4bf;">${data.period}</strong></p>
  </div>
  ${metricCards.length > 0 ? `<div style="display:flex;gap:12px;margin-bottom:20px;">${metricCards.join("")}</div>` : ""}
  ${scoresSection}
  ${agencySection}
  ${highlightsSection}
  <div style="text-align:center;padding:20px 0;border-top:1px solid #2d3748;">
    <p style="color:#64748b;font-size:12px;margin:0;">Keys For Agents &mdash; AI-Powered Real Estate Marketing</p>
  </div>
</div></body></html>`;
}

// ── LLM System Prompts ──────────────────────────────
const AUDIT_SYSTEM_PROMPT = `You are an expert real estate website auditor. Analyze the given website URL for a real estate agency and provide a comprehensive audit covering:
1. SEO performance (meta tags, headings, content quality, mobile-friendliness)
2. Conversion optimization (CTAs, forms, trust signals, user flow)
3. Lead generation effectiveness (appraisal forms, contact methods, suburb pages)

Return a JSON object with: summary (string), critical (array of issues), important (array), nice_to_have (array), seo_score (0-100), conversion_score (0-100), recommendations (array of actionable items).`;

const CHAT_SYSTEM_PROMPTS: Record<string, string> = {
  ad_strategist: "You are an expert real estate advertising strategist specializing in Facebook Ads, Google Ads, and digital marketing for Australian real estate agencies. Provide specific, actionable advice with budget recommendations, targeting strategies, and creative angles.",
  seo_architect: "You are an expert SEO architect specializing in local SEO for Australian real estate agencies. Provide technical SEO advice, content strategies, and local search optimization tactics for suburb-level targeting.",
  conversion_copywriter: "You are an expert conversion copywriter for real estate. Write compelling headlines, CTAs, email sequences, and landing page copy that converts visitors into leads for real estate agencies.",
  design_advisor: "You are a UX/UI design advisor for real estate websites. Provide specific design recommendations for improving user experience, conversion rates, and visual appeal of real estate agency websites.",
};

const CAMPAIGN_SYSTEM_PROMPT = `You are an expert real estate marketing campaign creator. Generate a complete, ready-to-use campaign based on the specified type (facebook, google, or email). Include specific copy, targeting, budget recommendations, and creative directions. Return a JSON object with all campaign details.`;

const SUBURB_PAGE_SYSTEM_PROMPT = `You are an expert SEO content writer for Australian real estate. Generate a complete, SEO-optimized suburb landing page for a real estate agency. Include: title, meta_description, h1, sections (array of {h2, content}), cta_text, cta_subtext, seo_score, conversion_score. The content should be locally relevant, keyword-rich, and conversion-focused.`;

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ── Onboarding ─────────────────────────────────────
  onboarding: router({
    status: protectedProcedure.query(({ ctx }) => db.getOnboardingStatus(ctx.user.id)),
    updateStep: protectedProcedure
      .input(z.object({ step: z.number().min(0).max(5) }))
      .mutation(({ input, ctx }) => db.updateOnboardingStep(ctx.user.id, input.step)),
    complete: protectedProcedure.mutation(async ({ ctx }) => {
      await db.completeOnboarding(ctx.user.id);
      sendTelegramNotification(`🎓 <b>Onboarding Complete</b>\nUser: ${ctx.user.name || ctx.user.email}\nThey're now fully set up!`);
      return { success: true };
    }),
    skip: protectedProcedure.mutation(async ({ ctx }) => {
      await db.completeOnboarding(ctx.user.id);
      return { success: true };
    }),
  }),

  // ── Dashboard Stats ─────────────────────────────────
  dashboard: router({
    stats: protectedProcedure.query(({ ctx }) => db.getDashboardStats(ctx.user.id)),
    recentActivity: protectedProcedure.query(({ ctx }) => db.getRecentActivity(ctx.user.id)),
    subscription: protectedProcedure.query(({ ctx }) => db.getSubscriptionByUserId(ctx.user.id)),
  }),

  // ── Welcome Email (triggered on first agency creation) ──
  // Welcome email is sent automatically in agency.create below

  // ── Agency CRUD ──────────────────────────────────────
  agency: router({
    list: protectedProcedure.query(({ ctx }) => db.getAgenciesByUserId(ctx.user.id)),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const agency = await db.getAgencyById(input.id);
        if (!agency || agency.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        return agency;
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        websiteUrl: z.string().optional(),
        primarySuburbs: z.string().optional(),
        services: z.string().optional(),
        phone: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const agency = await db.createAgency({ ...input, userId: ctx.user.id });
        sendTelegramNotification(`🏢 <b>New Agency Created</b>\nName: ${input.name}\nBy: ${ctx.user.name || ctx.user.email}`);
        notifyOwner({ title: "New Agency Created", content: `${input.name} by ${ctx.user.name || ctx.user.email}` }).catch(() => {});

        // Send welcome email notification
        const existingAgencies = await db.getAgenciesByUserId(ctx.user.id);
        if (existingAgencies.length <= 1) {
          // First agency — send welcome
          sendTelegramNotification(`🎉 <b>New User Signup Complete</b>\nName: ${ctx.user.name || "Unknown"}\nEmail: ${ctx.user.email || "N/A"}\nAgency: ${input.name}\n\nWelcome email sent!`);
          notifyOwner({
            title: `🎉 Welcome! ${ctx.user.name || ctx.user.email} just signed up`,
            content: `New user ${ctx.user.name || ctx.user.email} created their first agency "${input.name}". They're ready to start using RE Lead Doctor!\n\nNext steps for them:\n1. Run their first website audit\n2. Try the AI Lead Coach\n3. Generate a campaign\n4. Build suburb pages`,
          }).catch(() => {});
        }
        return agency;
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        websiteUrl: z.string().optional(),
        primarySuburbs: z.string().optional(),
        services: z.string().optional(),
        phone: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const existing = await db.getAgencyById(input.id);
        if (!existing || existing.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        const { id, ...data } = input;
        return db.updateAgency(id, data);
      }),
  }),

  // ── AI Website Audit ──────────────────────────────
  audit: router({
    run: protectedProcedure
      .input(z.object({ agencyId: z.number(), websiteUrl: z.string().url() }))
      .mutation(async ({ input, ctx }) => {
        const agency = await db.getAgencyById(input.agencyId);
        if (!agency || agency.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });

        const agencyContext = `Agency: ${agency.name}, Website: ${input.websiteUrl}, Suburbs: ${agency.primarySuburbs || "N/A"}, Services: ${agency.services || "N/A"}`;

        const llmResult = await invokeLLM({
          messages: [
            { role: "system", content: AUDIT_SYSTEM_PROMPT },
            { role: "user", content: `Audit this real estate agency website: ${input.websiteUrl}\n\nAgency context: ${agencyContext}` },
          ],
          response_format: { type: "json_object" },
        });

        const content = typeof llmResult.choices[0].message.content === "string"
          ? llmResult.choices[0].message.content
          : JSON.stringify(llmResult.choices[0].message.content);

        let findings: Record<string, unknown>;
        try { findings = JSON.parse(content); } catch { findings = { raw: content }; }

        const seoScore = typeof findings.seo_score === "number" ? findings.seo_score : 50;
        const conversionScore = typeof findings.conversion_score === "number" ? findings.conversion_score : 50;
        const summary = typeof findings.summary === "string" ? findings.summary : "Audit completed.";

        const audit = await db.createAudit({
          agencyId: input.agencyId,
          websiteUrl: input.websiteUrl,
          summary,
          findings,
          seoScore,
          conversionScore,
        });

        sendTelegramNotification(`🔍 <b>New Website Audit</b>\nAgency: ${agency.name}\nURL: ${input.websiteUrl}\nSEO: ${seoScore}/100 | Conversion: ${conversionScore}/100`);
        return audit;
      }),

    listByAgency: protectedProcedure
      .input(z.object({ agencyId: z.number() }))
      .query(async ({ input, ctx }) => {
        const agency = await db.getAgencyById(input.agencyId);
        if (!agency || agency.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        return db.getAuditsByAgencyId(input.agencyId);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getAuditById(input.id)),

    exportCsv: protectedProcedure
      .input(z.object({
        agencyId: z.number(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      }))
      .query(async ({ input, ctx }) => {
        const agency = await db.getAgencyById(input.agencyId);
        if (!agency || agency.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        const dateFrom = input.dateFrom ? new Date(input.dateFrom) : undefined;
        const dateTo = input.dateTo ? new Date(input.dateTo + "T23:59:59.999Z") : undefined;
        const audits = await db.getAuditsByAgencyId(input.agencyId, dateFrom, dateTo);

        const header = "ID,Website URL,SEO Score,Conversion Score,Summary,Date";
        const rows = audits.map((a) => {
          const summary = (a.summary || "").replace(/"/g, '""').replace(/[\n\r]+/g, " ");
          const date = new Date(a.createdAt).toISOString();
          return `${a.id},"${a.websiteUrl}",${a.seoScore ?? 0},${a.conversionScore ?? 0},"${summary}","${date}"`;
        });

        return { csv: [header, ...rows].join("\n"), filename: `audit-history-${agency.name.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.csv` };
      }),

    generatePdfReport: protectedProcedure
      .input(z.object({ auditId: z.number() }))
      .query(async ({ input, ctx }) => {
        const audit = await db.getAuditById(input.auditId);
        if (!audit) throw new TRPCError({ code: "NOT_FOUND" });
        const agency = await db.getAgencyById(audit.agencyId);
        if (!agency || agency.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });

        const findings = audit.findings as Record<string, unknown> | null;
        const critical = Array.isArray(findings?.critical) ? findings.critical as string[] : [];
        const important = Array.isArray(findings?.important) ? findings.important as string[] : [];
        const niceToHave = Array.isArray(findings?.nice_to_have) ? findings.nice_to_have as string[] : [];
        const recommendations = Array.isArray(findings?.recommendations) ? findings.recommendations as string[] : [];

        const seoScore = audit.seoScore ?? 0;
        const convScore = audit.conversionScore ?? 0;
        const seoColor = seoScore >= 70 ? "#10b981" : seoScore >= 40 ? "#f59e0b" : "#ef4444";
        const convColor = convScore >= 70 ? "#10b981" : convScore >= 40 ? "#f59e0b" : "#ef4444";
        const seoLabel = seoScore >= 70 ? "Good" : seoScore >= 40 ? "Needs Work" : "Critical";
        const convLabel = convScore >= 70 ? "Good" : convScore >= 40 ? "Needs Work" : "Critical";

        const esc = (s: string) => String(s).replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const listItems = (items: string[], color: string) => items.length > 0
          ? items.map(i => `<li style="margin-bottom:10px;padding:8px 12px;background:${color};border-radius:6px;color:#1f2937;font-size:13px;line-height:1.5;">${esc(i)}</li>`).join("")
          : `<li style="padding:8px 12px;color:#6b7280;font-style:italic;">None identified</li>`;

        const auditDate = new Date(audit.createdAt).toLocaleDateString("en-AU", { year: "numeric", month: "long", day: "numeric" });
        const generatedDate = new Date().toLocaleDateString("en-AU", { year: "numeric", month: "long", day: "numeric" });

        const gaugeArc = (score: number, color: string) => {
          const pct = Math.min(score, 100) / 100;
          const r = 60;
          const circ = 2 * Math.PI * r;
          const half = circ / 2;
          const offset = half - (half * pct);
          return `<svg width="160" height="100" viewBox="0 0 160 100">
            <path d="M 10 90 A 60 60 0 0 1 150 90" fill="none" stroke="#1f2937" stroke-width="12" stroke-linecap="round"/>
            <path d="M 10 90 A 60 60 0 0 1 150 90" fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${half}" stroke-dashoffset="${offset}"/>
            <text x="80" y="75" text-anchor="middle" fill="${color}" font-size="32" font-weight="700" font-family="Inter,Helvetica,sans-serif">${score}</text>
            <text x="80" y="95" text-anchor="middle" fill="#9ca3af" font-size="11" font-family="Inter,Helvetica,sans-serif">/100</text>
          </svg>`;
        };

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Audit Report — ${esc(agency.name)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    background: #ffffff;
    color: #1f2937;
    line-height: 1.6;
    font-size: 14px;
  }

  .page { max-width: 800px; margin: 0 auto; padding: 40px; }

  /* ── Print Styles ── */
  @media print {
    @page {
      size: A4;
      margin: 15mm 20mm;
    }
    body { background: #fff; font-size: 11pt; }
    .page { max-width: 100%; padding: 0; }
    .no-print { display: none !important; }
    .section { page-break-inside: avoid; }
    .page-break { page-break-before: always; }
    .header { page-break-after: avoid; }
    .scores-section { page-break-after: avoid; }
    a { text-decoration: none; color: inherit; }
    .footer-print { display: block !important; }
  }

  /* ── Screen Styles ── */
  @media screen {
    body { background: #f8fafc; }
    .page { background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-top: 20px; margin-bottom: 20px; }
    .footer-print { display: none; }
  }

  /* ── Header ── */
  .header {
    text-align: center;
    padding-bottom: 24px;
    margin-bottom: 32px;
    border-bottom: 3px solid #14b8a6;
  }
  .header .brand { color: #14b8a6; font-size: 13px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px; }
  .header h1 { font-size: 26px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
  .header .subtitle { color: #64748b; font-size: 14px; }
  .header .meta { display: flex; justify-content: center; gap: 24px; margin-top: 16px; color: #64748b; font-size: 12px; }
  .header .meta span { display: flex; align-items: center; gap: 4px; }

  /* ── Score Gauges ── */
  .scores-section { text-align: center; margin: 32px 0; }
  .scores-grid { display: flex; justify-content: center; gap: 48px; margin-top: 16px; }
  .gauge-card { text-align: center; }
  .gauge-card .gauge-label { font-size: 13px; font-weight: 600; color: #374151; margin-top: 4px; }
  .gauge-card .gauge-status { font-size: 11px; font-weight: 500; padding: 2px 10px; border-radius: 99px; display: inline-block; margin-top: 4px; }

  /* ── Summary ── */
  .summary-box {
    background: #f0fdfa;
    border: 1px solid #99f6e4;
    border-radius: 10px;
    padding: 20px 24px;
    margin: 24px 0;
    line-height: 1.7;
    color: #1f2937;
  }
  .summary-box strong { color: #0f766e; }

  /* ── Sections ── */
  .section { margin: 28px 0; }
  .section h2 {
    font-size: 16px;
    font-weight: 700;
    color: #0f172a;
    padding-bottom: 8px;
    margin-bottom: 16px;
    border-bottom: 2px solid #e2e8f0;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .section h2 .icon { width: 20px; height: 20px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; color: #fff; }
  .section ul { list-style: none; padding: 0; }

  /* ── Footer ── */
  .footer {
    text-align: center;
    margin-top: 40px;
    padding-top: 20px;
    border-top: 2px solid #e2e8f0;
    color: #94a3b8;
    font-size: 11px;
  }
  .footer .brand-footer { color: #14b8a6; font-weight: 600; }
  .footer-print {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 9pt;
    color: #94a3b8;
    padding: 8px;
    border-top: 1px solid #e2e8f0;
  }

  /* ── Print Button ── */
  .print-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #14b8a6;
    color: #fff;
    border: none;
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    margin-bottom: 24px;
  }
  .print-btn:hover { background: #0d9488; }
</style>
</head>
<body>
<div class="page">
  <!-- Print Button (hidden in print) -->
  <div class="no-print" style="text-align:center;margin-bottom:8px;">
    <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>

  <!-- Header -->
  <div class="header">
    <div class="brand">🔑 Keys For Agents</div>
    <h1>Website Audit Report</h1>
    <div class="subtitle">${esc(agency.name)}</div>
    <div class="meta">
      <span>🌐 ${esc(audit.websiteUrl)}</span>
      <span>📅 ${auditDate}</span>
    </div>
  </div>

  <!-- Score Gauges -->
  <div class="scores-section">
    <div class="scores-grid">
      <div class="gauge-card">
        ${gaugeArc(seoScore, seoColor)}
        <div class="gauge-label">SEO Score</div>
        <div class="gauge-status" style="background:${seoColor}20;color:${seoColor};">${seoLabel}</div>
      </div>
      <div class="gauge-card">
        ${gaugeArc(convScore, convColor)}
        <div class="gauge-label">Conversion Score</div>
        <div class="gauge-status" style="background:${convColor}20;color:${convColor};">${convLabel}</div>
      </div>
    </div>
  </div>

  <!-- Summary -->
  <div class="summary-box">
    <strong>Executive Summary</strong><br/>
    ${esc(audit.summary || "No summary available.")}
  </div>

  <!-- Critical Issues -->
  <div class="section">
    <h2><span class="icon" style="background:#ef4444;">!</span> Critical Issues (${critical.length})</h2>
    <ul>${listItems(critical, "#fef2f2")}</ul>
  </div>

  <!-- Important Issues -->
  <div class="section">
    <h2><span class="icon" style="background:#f59e0b;">⚠</span> Important Issues (${important.length})</h2>
    <ul>${listItems(important, "#fffbeb")}</ul>
  </div>

  <!-- Nice to Have -->
  <div class="section page-break">
    <h2><span class="icon" style="background:#3b82f6;">ℹ</span> Nice to Have (${niceToHave.length})</h2>
    <ul>${listItems(niceToHave, "#eff6ff")}</ul>
  </div>

  <!-- Recommendations -->
  <div class="section">
    <h2><span class="icon" style="background:#10b981;">✓</span> Recommendations (${recommendations.length})</h2>
    <ul>${listItems(recommendations, "#f0fdf4")}</ul>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p>Generated by <span class="brand-footer">Keys For Agents</span> — AI-Powered Marketing for Real Estate</p>
    <p style="margin-top:4px;">Report generated on ${generatedDate} • Confidential</p>
  </div>

  <!-- Fixed print footer -->
  <div class="footer-print">
    Keys For Agents — AI-Powered Marketing for Real Estate • ${generatedDate} • Confidential
  </div>
</div>
</body>
</html>`;

        return {
          html,
          filename: `audit-report-${agency.name.replace(/\s+/g, "-").toLowerCase()}-${audit.id}.html`,
          agencyName: agency.name,
          auditDate: new Date(audit.createdAt).toISOString(),
        };
      }),

    compareCompetitor: protectedProcedure
      .input(z.object({
        agencyId: z.number(),
        myUrl: z.string().url(),
        competitorUrl: z.string().url(),
      }))
      .mutation(async ({ input, ctx }) => {
        const agency = await db.getAgencyById(input.agencyId);
        if (!agency || agency.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });

        const agencyContext = `Agency: ${agency.name}, Suburbs: ${agency.primarySuburbs || "N/A"}, Services: ${agency.services || "N/A"}`;

        const llmResult = await invokeLLM({
          messages: [
            { role: "system", content: `You are a senior real estate digital marketing analyst. Compare two real estate agency websites and provide a detailed competitive analysis. Return JSON with this exact structure:\n{\n  "your_site": { "seo_score": number, "conversion_score": number, "strengths": [string], "weaknesses": [string] },\n  "competitor_site": { "seo_score": number, "conversion_score": number, "strengths": [string], "weaknesses": [string] },\n  "comparison_summary": string,\n  "action_items": [string],\n  "competitive_advantages": [string],\n  "areas_to_improve": [string]\n}\nBe specific, actionable, and focused on real estate marketing best practices.` },
            { role: "user", content: `Compare these two real estate websites:\n\nMy website: ${input.myUrl}\nCompetitor website: ${input.competitorUrl}\n\n${agencyContext}` },
          ],
          response_format: { type: "json_object" },
        });

        const content = typeof llmResult.choices[0].message.content === "string"
          ? llmResult.choices[0].message.content
          : JSON.stringify(llmResult.choices[0].message.content);

        let comparison: Record<string, unknown>;
        try { comparison = JSON.parse(content); } catch { comparison = { raw: content }; }

        sendTelegramNotification(`⚔️ <b>Competitor Audit</b>\nAgency: ${agency.name}\nYour site: ${input.myUrl}\nCompetitor: ${input.competitorUrl}`);

        return {
          myUrl: input.myUrl,
          competitorUrl: input.competitorUrl,
          comparison,
          agencyName: agency.name,
          createdAt: new Date().toISOString(),
        };
      }),
  }),

  // ── AI Lead Coach Chat ──────────────────────────────
  chat: router({
    send: protectedProcedure
      .input(z.object({
        agencyId: z.number(),
        message: z.string().min(1),
        mode: z.enum(["ad_strategist", "seo_architect", "conversion_copywriter", "design_advisor"]),
      }))
      .mutation(async ({ input, ctx }) => {
        const agency = await db.getAgencyById(input.agencyId);
        if (!agency || agency.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });

        const systemPrompt = CHAT_SYSTEM_PROMPTS[input.mode];
        const agencyContext = `\n\nAgency context: ${agency.name}, Website: ${agency.websiteUrl || "N/A"}, Suburbs: ${agency.primarySuburbs || "N/A"}, Services: ${agency.services || "N/A"}`;

        const llmResult = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt + agencyContext },
            { role: "user", content: input.message },
          ],
        });

        const reply = typeof llmResult.choices[0].message.content === "string"
          ? llmResult.choices[0].message.content
          : JSON.stringify(llmResult.choices[0].message.content);

        const saved = await db.createChatMessage({
          agencyId: input.agencyId,
          userId: ctx.user.id,
          mode: input.mode,
          userMessage: input.message,
          aiReply: reply,
        });

        return { ...saved, aiReply: reply };
      }),

    history: protectedProcedure
      .input(z.object({ agencyId: z.number(), mode: z.string().optional() }))
      .query(async ({ input, ctx }) => {
        const agency = await db.getAgencyById(input.agencyId);
        if (!agency || agency.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        return db.getChatHistoryByAgency(input.agencyId, input.mode);
      }),
  }),

  // ── AI Campaign Generator ──────────────────────────
  campaign: router({
    generate: protectedProcedure
      .input(z.object({
        agencyId: z.number(),
        campaignType: z.enum(["facebook", "google", "email"]),
        suburbs: z.string().min(1),
        services: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const agency = await db.getAgencyById(input.agencyId);
        if (!agency || agency.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });

        const llmResult = await invokeLLM({
          messages: [
            { role: "system", content: CAMPAIGN_SYSTEM_PROMPT },
            { role: "user", content: `Create a ${input.campaignType} campaign for ${agency.name}.\nSuburbs: ${input.suburbs}\nServices: ${input.services}\nWebsite: ${agency.websiteUrl || "N/A"}` },
          ],
          response_format: { type: "json_object" },
        });

        const content = typeof llmResult.choices[0].message.content === "string"
          ? llmResult.choices[0].message.content
          : JSON.stringify(llmResult.choices[0].message.content);

        let campaignContent: Record<string, unknown>;
        try { campaignContent = JSON.parse(content); } catch { campaignContent = { raw: content }; }

        const campaign = await db.createCampaign({
          agencyId: input.agencyId,
          campaignType: input.campaignType,
          suburbs: input.suburbs,
          services: input.services,
          content: campaignContent,
        });

        sendTelegramNotification(`📢 <b>New Campaign Generated</b>\nAgency: ${agency.name}\nType: ${input.campaignType}\nSuburbs: ${input.suburbs}`);
        return campaign;
      }),

    listByAgency: protectedProcedure
      .input(z.object({ agencyId: z.number() }))
      .query(async ({ input, ctx }) => {
        const agency = await db.getAgencyById(input.agencyId);
        if (!agency || agency.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        return db.getCampaignsByAgencyId(input.agencyId);
      }),

    exportCsv: protectedProcedure
      .input(z.object({
        agencyId: z.number(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      }))
      .query(async ({ input, ctx }) => {
        const agency = await db.getAgencyById(input.agencyId);
        if (!agency || agency.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        const dateFrom = input.dateFrom ? new Date(input.dateFrom) : undefined;
        const dateTo = input.dateTo ? new Date(input.dateTo + "T23:59:59.999Z") : undefined;
        const campaigns = await db.getCampaignsByAgencyId(input.agencyId, dateFrom, dateTo);

        const header = "ID,Type,Suburbs,Services,Content Summary,Date";
        const rows = campaigns.map((c) => {
          const contentStr = typeof c.content === "object" && c.content !== null
            ? JSON.stringify(c.content).replace(/"/g, '""').substring(0, 500)
            : String(c.content || "").replace(/"/g, '""');
          const date = new Date(c.createdAt).toISOString();
          return `${c.id},"${c.campaignType}","${(c.suburbs || "").replace(/"/g, '""')}","${(c.services || "").replace(/"/g, '""')}","${contentStr}","${date}"`;
        });

        return { csv: [header, ...rows].join("\n"), filename: `campaigns-${agency.name.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.csv` };
      }),
  }),

  // ── SEO Suburb Page Builder ──────────────────────────
  suburbPage: router({
    generate: protectedProcedure
      .input(z.object({
        agencyId: z.number(),
        suburb: z.string().min(1),
        service: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const agency = await db.getAgencyById(input.agencyId);
        if (!agency || agency.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });

        const llmResult = await invokeLLM({
          messages: [
            { role: "system", content: SUBURB_PAGE_SYSTEM_PROMPT },
            { role: "user", content: `Generate an SEO suburb page for ${agency.name}.\nSuburb: ${input.suburb}\nService: ${input.service}\nWebsite: ${agency.websiteUrl || "N/A"}` },
          ],
          response_format: { type: "json_object" },
        });

        const content = typeof llmResult.choices[0].message.content === "string"
          ? llmResult.choices[0].message.content
          : JSON.stringify(llmResult.choices[0].message.content);

        let pageContent: Record<string, unknown>;
        try { pageContent = JSON.parse(content); } catch { pageContent = { raw: content }; }

        const page = await db.createSuburbPage({
          agencyId: input.agencyId,
          suburb: input.suburb,
          service: input.service,
          pageContent,
        });

        sendTelegramNotification(`📄 <b>New Suburb Page</b>\nAgency: ${agency.name}\nSuburb: ${input.suburb}\nService: ${input.service}`);
        return page;
      }),

    listByAgency: protectedProcedure
      .input(z.object({ agencyId: z.number() }))
      .query(async ({ input, ctx }) => {
        const agency = await db.getAgencyById(input.agencyId);
        if (!agency || agency.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        return db.getSuburbPagesByAgencyId(input.agencyId);
      }),

    exportCsv: protectedProcedure
      .input(z.object({
        agencyId: z.number(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      }))
      .query(async ({ input, ctx }) => {
        const agency = await db.getAgencyById(input.agencyId);
        if (!agency || agency.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        const dateFrom = input.dateFrom ? new Date(input.dateFrom) : undefined;
        const dateTo = input.dateTo ? new Date(input.dateTo + "T23:59:59.999Z") : undefined;
        const pages = await db.getSuburbPagesByAgencyId(input.agencyId, dateFrom, dateTo);

        const header = "ID,Suburb,Service,Content Summary,Date";
        const rows = pages.map((p) => {
          const contentStr = typeof p.pageContent === "object" && p.pageContent !== null
            ? JSON.stringify(p.pageContent).replace(/"/g, '""').substring(0, 500)
            : String(p.pageContent || "").replace(/"/g, '""');
          const date = new Date(p.createdAt).toISOString();
          return `${p.id},"${p.suburb}","${p.service}","${contentStr}","${date}"`;
        });

        return { csv: [header, ...rows].join("\n"), filename: `suburb-pages-${agency.name.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.csv` };
      }),
  }),

  // ── Subscriptions ──────────────────────────────────
  subscription: router({
    current: protectedProcedure.query(({ ctx }) => db.getSubscriptionByUserId(ctx.user.id)),

    plans: publicProcedure.query(() => PLANS),

    createCheckout: protectedProcedure
      .input(z.object({ plan: z.enum(["starter", "growth", "dominator"]) }))
      .mutation(async ({ input, ctx }) => {
        const planConfig = getPlanByKey(input.plan);
        if (!planConfig) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid plan" });

        const stripe = getStripe();
        const customer = await findOrCreateCustomer({
          email: ctx.user.email || `user-${ctx.user.id}@releaddoctor.com`,
          name: ctx.user.name || undefined,
          userId: ctx.user.id,
        });

        // Save customer ID to subscription record
        await db.upsertSubscription({
          userId: ctx.user.id,
          plan: input.plan,
          status: "trialing",
          stripeCustomerId: customer.id,
        });

        const priceId = await findOrCreatePrice(planConfig);
        const origin = ctx.req.headers.origin || "http://localhost:3000";

        const session = await stripe.checkout.sessions.create({
          customer: customer.id,
          client_reference_id: ctx.user.id.toString(),
          mode: "subscription",
          allow_promotion_codes: true,
          line_items: [{ price: priceId, quantity: 1 }],
          success_url: `${origin}/subscription?success=true`,
          cancel_url: `${origin}/subscription?canceled=true`,
          metadata: {
            user_id: ctx.user.id.toString(),
            customer_email: ctx.user.email || "",
            customer_name: ctx.user.name || "",
            plan: input.plan,
          },
        });

        return { checkoutUrl: session.url };
      }),

    createPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
      const sub = await db.getSubscriptionByUserId(ctx.user.id);
      if (!sub?.stripeCustomerId) throw new TRPCError({ code: "NOT_FOUND", message: "No active subscription found" });

      const stripe = getStripe();
      const origin = ctx.req.headers.origin || "http://localhost:3000";
      const session = await stripe.billingPortal.sessions.create({
        customer: sub.stripeCustomerId,
        return_url: `${origin}/subscription`,
      });

      return { portalUrl: session.url };
    }),

    // ── Apple Pay / Payment Request API ──────────────
    createPaymentIntent: protectedProcedure
      .input(z.object({ plan: z.enum(["starter", "growth", "dominator"]) }))
      .mutation(async ({ input, ctx }) => {
        const planConfig = getPlanByKey(input.plan);
        if (!planConfig) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid plan" });

        const stripe = getStripe();
        const customer = await findOrCreateCustomer({
          email: ctx.user.email || "",
          name: ctx.user.name || undefined,
          userId: ctx.user.id,
        });

        // Create a PaymentIntent for the first month
        const paymentIntent = await stripe.paymentIntents.create({
          amount: planConfig.priceAud,
          currency: "aud",
          customer: customer.id,
          metadata: {
            user_id: ctx.user.id.toString(),
            plan: input.plan,
            customer_email: ctx.user.email || "",
            customer_name: ctx.user.name || "",
            payment_method: "apple_pay",
          },
          automatic_payment_methods: {
            enabled: true,
          },
        });

        // Save customer ID to subscription record
        await db.upsertSubscription({
          userId: ctx.user.id,
          plan: input.plan,
          status: "trialing",
          stripeCustomerId: customer.id,
        });

        return {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
        };
      }),

    paymentHistory: protectedProcedure.query(async ({ ctx }) => {
      const sub = await db.getSubscriptionByUserId(ctx.user.id);
      if (!sub?.stripeCustomerId) return [];

      try {
        const stripe = getStripe();
        const invoices = await stripe.invoices.list({
          customer: sub.stripeCustomerId,
          limit: 20,
        });

        return invoices.data.map((inv) => ({
          id: inv.id,
          amount: inv.amount_paid,
          currency: inv.currency,
          status: inv.status,
          date: inv.created * 1000,
          invoiceUrl: inv.hosted_invoice_url,
          pdfUrl: inv.invoice_pdf,
        }));
      } catch {
        return [];
      }
    }),

    // ── PayPal Checkout ──────────────────────────────
    createPaypalOrder: protectedProcedure
      .input(z.object({ plan: z.enum(["starter", "growth", "dominator"]) }))
      .mutation(async ({ input, ctx }) => {
        const planConfig = getPlanByKey(input.plan);
        if (!planConfig) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid plan" });

        const clientId = process.env.PAYPAL_CLIENT_ID;
        const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
        const baseUrl = process.env.PAYPAL_API_URL || "https://api-m.sandbox.paypal.com";
        if (!clientId || !clientSecret) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "PayPal not configured" });

        // Get access token
        const authRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
          },
          body: "grant_type=client_credentials",
        });
        const authData = await authRes.json() as { access_token: string };

        const origin = ctx.req.headers.origin || "http://localhost:3000";
        const displayAmount = (planConfig.priceAud / 100).toFixed(2);

        // Create subscription order
        const orderRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authData.access_token}`,
          },
          body: JSON.stringify({
            intent: "CAPTURE",
            purchase_units: [{
              reference_id: `reld_${ctx.user.id}_${input.plan}`,
              description: `RE Lead Doctor — ${planConfig.name} Plan (Monthly)`,
              amount: { currency_code: "AUD", value: displayAmount },
              custom_id: JSON.stringify({ userId: ctx.user.id, plan: input.plan }),
            }],
            application_context: {
              brand_name: "RE Lead Doctor",
              landing_page: "BILLING",
              user_action: "PAY_NOW",
              return_url: `${origin}/subscription?paypal_success=true`,
              cancel_url: `${origin}/subscription?paypal_canceled=true`,
            },
          }),
        });
        const orderData = await orderRes.json() as { id: string; links: Array<{ rel: string; href: string }> };
        const approveLink = orderData.links?.find((l: { rel: string }) => l.rel === "approve");

        return { orderId: orderData.id, approveUrl: approveLink?.href || null };
      }),

    capturePaypalOrder: protectedProcedure
      .input(z.object({ orderId: z.string(), plan: z.enum(["starter", "growth", "dominator"]) }))
      .mutation(async ({ input, ctx }) => {
        const clientId = process.env.PAYPAL_CLIENT_ID;
        const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
        const baseUrl = process.env.PAYPAL_API_URL || "https://api-m.sandbox.paypal.com";
        if (!clientId || !clientSecret) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "PayPal not configured" });

        const authRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
          },
          body: "grant_type=client_credentials",
        });
        const authData = await authRes.json() as { access_token: string };

        const captureRes = await fetch(`${baseUrl}/v2/checkout/orders/${input.orderId}/capture`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authData.access_token}`,
          },
        });
        const captureData = await captureRes.json() as { status: string; id: string };

        if (captureData.status === "COMPLETED") {
          await db.upsertSubscription({
            userId: ctx.user.id,
            plan: input.plan,
            status: "active",
          });
          sendTelegramNotification(`💰 <b>PayPal Payment Received</b>\nUser: ${ctx.user.name || ctx.user.email}\nPlan: ${input.plan.toUpperCase()}\nOrder: ${captureData.id}`);
          notifyOwner({ title: "PayPal Payment Received", content: `${ctx.user.name || ctx.user.email} subscribed to ${input.plan} via PayPal` }).catch(() => {});
          return { success: true, status: captureData.status };
        }

        throw new TRPCError({ code: "BAD_REQUEST", message: `Payment not completed. Status: ${captureData.status}` });
      }),
  }),
  // ── Monthly Digest ───────────────────────────────────────
  digest: router({
    preview: protectedProcedure
      .input(z.object({ monthsBack: z.number().min(1).max(12).optional() }).optional())
      .query(async ({ ctx, input }) => {
        const data = await db.getMonthlyDigestData(ctx.user.id, input?.monthsBack ?? 1);
        if (!data) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not generate digest" });
        const prefs = await db.getDigestPreferences(ctx.user.id);
        return { ...data, preferences: prefs };
      }),

    getPreferences: protectedProcedure.query(async ({ ctx }) => {
      return db.getDigestPreferences(ctx.user.id);
    }),

    updatePreferences: protectedProcedure
      .input(z.object({
        showAudits: z.boolean().optional(),
        showCampaigns: z.boolean().optional(),
        showSuburbPages: z.boolean().optional(),
        showScores: z.boolean().optional(),
        showHighlights: z.boolean().optional(),
        showAgencyBreakdown: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.upsertDigestPreferences(ctx.user.id, input);
      }),

    sendToMe: protectedProcedure
      .input(z.object({ monthsBack: z.number().min(1).max(12).optional() }).optional())
      .mutation(async ({ ctx, input }) => {
        const data = await db.getMonthlyDigestData(ctx.user.id, input?.monthsBack ?? 1);
        if (!data) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not generate digest" });

        const prefs = await db.getDigestPreferences(ctx.user.id);
        const emailHtml = generateDigestEmailHtml(data, ctx.user.name || ctx.user.email || "User", prefs);

        await notifyOwner({
          title: `📊 Monthly Digest for ${ctx.user.name || ctx.user.email}`,
          content: `Period: ${data.period}\nAudits: ${data.totals.audits} | Campaigns: ${data.totals.campaigns} | Suburb Pages: ${data.totals.suburbPages}\nAvg SEO: ${data.totals.avgSeoScore}/100 | Avg Conversion: ${data.totals.avgConversionScore}/100\n\nHighlights:\n${data.highlights.join("\n")}`,
        }).catch(() => {});

        sendTelegramNotification(`📊 <b>Monthly Digest Sent</b>\nUser: ${ctx.user.name || ctx.user.email}\nPeriod: ${data.period}\nAudits: ${data.totals.audits} | Campaigns: ${data.totals.campaigns} | Pages: ${data.totals.suburbPages}`);

        return { success: true, period: data.period, emailHtml };
      }),

    broadcastAll: adminProcedure.mutation(async ({ ctx }) => {
      const allUsers = await db.getAllActiveUserIds();
      let sent = 0;

      for (const user of allUsers) {
        try {
          const data = await db.getMonthlyDigestData(user.id);
          if (!data || (data.totals.audits === 0 && data.totals.campaigns === 0 && data.totals.suburbPages === 0)) continue;

          const prefs = await db.getDigestPreferences(user.id);
          const emailHtml = generateDigestEmailHtml(data, user.name || user.email || `User #${user.id}`, prefs);

          await notifyOwner({
            title: `📊 Monthly Digest for ${user.name || user.email || `User #${user.id}`}`,
            content: `Period: ${data.period}\nAudits: ${data.totals.audits} | Campaigns: ${data.totals.campaigns} | Suburb Pages: ${data.totals.suburbPages}\nAvg SEO: ${data.totals.avgSeoScore}/100 | Avg Conversion: ${data.totals.avgConversionScore}/100`,
          }).catch(() => {});
          sent++;
        } catch (e) {
          console.warn(`[Digest] Failed for user ${user.id}:`, e);
        }
      }

      sendTelegramNotification(`📨 <b>Monthly Digest Broadcast</b>\nSent to ${sent} of ${allUsers.length} users\nTriggered by: ${ctx.user.name || ctx.user.email}`);
      return { success: true, sent, total: allUsers.length };
    }),
  }),

  // ── Admin ────────────────────────────────────────────
  admin: router({    stats: adminProcedure.query(() => db.getAdminStats()),
    users: adminProcedure.query(() => db.listAllUsers()),
    agencies: adminProcedure.query(() => db.listAllAgencies()),
    audits: adminProcedure.query(() => db.listAllAudits()),
    subscriptions: adminProcedure.query(() => db.listAllSubscriptions()),
    leads: adminProcedure.query(() => db.listAllLeads()),
  }),

  // ── New Feature Routers ──────────────────────────────
  leads: leadsRouter,
  referral: referralRouter,
  usage: usageRouter,
  webhook: webhookRouter,
  appraisalLetter: appraisalLetterRouter,
  listingDescription: listingDescriptionRouter,
  monthlyReport: monthlyReportRouter,
  grokChat: grokChatRouter,
  blog: blogRouter,
  crm: crmRouter,
  emailHub: emailHubRouter,
  revenue: revenueRouter,
  paypalTransactions: paypalTransactionsRouter,
  paypalInvoicing: paypalInvoicingRouter,
  paypalSubscriptions: paypalSubscriptionsRouter,
  paypalPayouts: paypalPayoutsRouter,
  research: researchRouter,
  seoAuditPitch: seoAuditPitchRouter,
});

export type AppRouter = typeof appRouter;
