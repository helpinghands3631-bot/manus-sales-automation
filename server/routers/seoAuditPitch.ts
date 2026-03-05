/**
 * SEO Audit & Pitch Router — Full 7-Step Spec
 *
 * Pipeline:
 *   1. Scrape website (title, meta, H1/H2, body, sitemap, robots)
 *   2. Grok scores SEO (0–100 across 4 dimensions)
 *   3. Qualify: seoScore < 60 AND big_capital
 *   4. Generate before/after comparison demo HTML → upload to S3
 *   5. Dynamic pricing with adjustments (issues, industry, multi-site)
 *   6. Grok writes tailored pitch email with impact estimates
 *   7. Send via SMTP, notify via Telegram, log to DB
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "../_core/llm";
import { ENV } from "../_core/env";
import { getDb } from "../db";
import { seoAuditPitches, crmContacts } from "../../drizzle/schema";
import { eq, desc, inArray } from "drizzle-orm";
import nodemailer from "nodemailer";
import { notifyOwner } from "../_core/notification";
import { storagePut } from "../storage";

// ── Plan Pricing Logic (with Enterprise + Dynamic Adjustments) ───────────────

interface PlanTier {
  name: string;
  basePrice: number;
  maxRevenue: number;
  description: string;
  deliverables: string[];
  timeline: string;
  support: string;
}

const PLAN_TIERS: PlanTier[] = [
  {
    name: "Starter",
    basePrice: 1500,
    maxRevenue: 1_000_000,
    description: "Complete on-page SEO optimisation for boutique agencies",
    deliverables: [
      "Complete on-page SEO optimisation",
      "Title & meta tag rewrites for 10 pages",
      "Content audit & recommendations",
      "1-month support",
    ],
    timeline: "4-6 weeks to completion",
    support: "1-month support",
  },
  {
    name: "Growth",
    basePrice: 3000,
    maxRevenue: 5_000_000,
    description: "For growing agencies ready to scale their digital presence",
    deliverables: [
      "Everything in Starter",
      "Title & meta for 25 pages",
      "Content rewrites for 5 key pages",
      "Technical SEO audit with fixes",
      "Monthly analytics & performance reports",
      "3-month support & optimisation",
    ],
    timeline: "6-8 weeks to completion, results visible in 60-90 days",
    support: "3-month support",
  },
  {
    name: "Scale",
    basePrice: 5000,
    maxRevenue: 20_000_000,
    description: "Enterprise-grade AI marketing for high-volume agencies",
    deliverables: [
      "Everything in Growth",
      "Unlimited pages",
      "Content strategy & calendar",
      "Link building campaign (10 high-quality links)",
      "Conversion rate optimisation",
      "6-month support + quarterly reviews",
    ],
    timeline: "8-12 weeks, ongoing quarterly reviews",
    support: "6-month support + quarterly reviews",
  },
  {
    name: "Enterprise",
    basePrice: 8000,
    maxRevenue: Infinity,
    description: "Dedicated SEO strategist for multi-site, high-revenue agencies",
    deliverables: [
      "Everything in Scale",
      "Dedicated SEO strategist",
      "Custom content creation (4 pieces/month)",
      "Advanced technical optimisations",
      "Multi-site coordination",
      "12-month partnership",
    ],
    timeline: "Ongoing 12-month partnership",
    support: "12-month dedicated partnership",
  },
];

interface PricingResult {
  tier: PlanTier;
  adjustments: { reason: string; amount: number }[];
  finalPrice: number;
  expectedOutcomes: string[];
}

function calculatePricing(opts: {
  annualRevenue: number;
  issueCount: number;
  industry?: string;
  siteCount?: number;
}): PricingResult {
  const tier = PLAN_TIERS.find((p) => opts.annualRevenue < p.maxRevenue) ?? PLAN_TIERS[PLAN_TIERS.length - 1];
  const adjustments: { reason: string; amount: number }[] = [];

  // +$500 per major issue beyond 3
  if (opts.issueCount > 3) {
    const extra = (opts.issueCount - 3) * 500;
    adjustments.push({ reason: `${opts.issueCount - 3} major issues beyond baseline`, amount: extra });
  }

  // Industry premium (finance, healthcare, legal): +20%
  const premiumIndustries = ["finance", "healthcare", "legal", "insurance", "banking"];
  if (opts.industry && premiumIndustries.some((i) => opts.industry!.toLowerCase().includes(i))) {
    const premium = Math.round(tier.basePrice * 0.2);
    adjustments.push({ reason: `${opts.industry} industry premium`, amount: premium });
  }

  // Multi-site: +$1000 per additional site
  if (opts.siteCount && opts.siteCount > 1) {
    const extra = (opts.siteCount - 1) * 1000;
    adjustments.push({ reason: `${opts.siteCount - 1} additional site(s)`, amount: extra });
  }

  const finalPrice = tier.basePrice + adjustments.reduce((sum, a) => sum + a.amount, 0);

  const expectedOutcomes = [
    "30-50% increase in organic traffic within 6 months",
    "15-25% improvement in conversion rate",
    `3-5x ROI within 6 months ($${Math.round(finalPrice * 3).toLocaleString()}-$${Math.round(finalPrice * 5).toLocaleString()} estimated return)`,
  ];

  return { tier, adjustments, finalPrice, expectedOutcomes };
}

function isBigCapital(annualRevenue: number, employeeCount: number): boolean {
  return annualRevenue >= 2_000_000 || employeeCount >= 20;
}

// ── Website Scraper ───────────────────────────────────────────────────────────

interface ScrapedContent {
  url: string;
  title: string;
  metaDescription: string;
  h1: string;
  h2s: string[];
  bodyText: string;
  wordCount: number;
  hasSitemap: boolean;
  hasRobots: boolean;
}

async function scrapeWebsite(url: string): Promise<ScrapedContent> {
  const normalised = url.startsWith("http") ? url : `https://${url}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  let html = "";
  try {
    const res = await fetch(normalised, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; KeysForAgents/1.0; +https://keyforagents.com)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    html = await res.text();
  } finally {
    clearTimeout(timeout);
  }

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const metaMatch =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const h2Matches = Array.from(html.matchAll(/<h2[^>]*>([^<]+)<\/h2>/gi))
    .map((m) => m[1].trim())
    .slice(0, 8);

  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const bodyText = stripped.slice(0, 3000);
  const wordCount = stripped.split(/\s+/).length;

  const baseUrl = new URL(normalised).origin;
  const [sitemapRes, robotsRes] = await Promise.allSettled([
    fetch(`${baseUrl}/sitemap.xml`, { signal: AbortSignal.timeout(5000) }),
    fetch(`${baseUrl}/robots.txt`, { signal: AbortSignal.timeout(5000) }),
  ]);
  const hasSitemap = sitemapRes.status === "fulfilled" && sitemapRes.value.ok;
  const hasRobots = robotsRes.status === "fulfilled" && robotsRes.value.ok;

  return { url: normalised, title: titleMatch?.[1]?.trim() ?? "", metaDescription: metaMatch?.[1]?.trim() ?? "", h1: h1Match?.[1]?.trim() ?? "", h2s: h2Matches, bodyText, wordCount, hasSitemap, hasRobots };
}

// ── Grok SEO Scorer ───────────────────────────────────────────────────────────

interface SeoScoreResult {
  overall: number;
  onPage: number;
  content: number;
  technical: number;
  trust: number;
  topIssues: string[];
  quickWins: string[];
}

async function scoreSeo(scraped: ScrapedContent): Promise<SeoScoreResult> {
  const prompt = `You are a senior SEO strategist auditing a real estate agency website.

Website: ${scraped.url}
Title tag: "${scraped.title}"
Meta description: "${scraped.metaDescription}"
H1: "${scraped.h1}"
H2 headings: ${scraped.h2s.length > 0 ? scraped.h2s.map((h) => `"${h}"`).join(", ") : "None found"}
Body text sample: "${scraped.bodyText.slice(0, 1500)}"
Word count: ~${scraped.wordCount}
Has sitemap.xml: ${scraped.hasSitemap}
Has robots.txt: ${scraped.hasRobots}

Score this website's SEO across 4 dimensions:

**On-Page SEO (40 points):**
- Title tag quality (10): Clear? Keyword-rich? Under 60 chars?
- Meta description (10): Compelling? 120-160 chars? Includes CTA?
- Heading structure (10): One H1? Logical H2 hierarchy? Keyword usage?
- Keyword focus (10): Clear topic? Semantic relevance? Avoids stuffing?

**Content Quality (25 points):**
- Depth & usefulness (10): Solves problems? Comprehensive?
- Originality (5): Unique angle? Not generic?
- Readability (5): Scannable? Short paragraphs? Good formatting?
- Engagement (5): Clear CTAs? Examples? Visual hooks?

**Technical & UX (20 points):**
- Mobile-friendly (5): Responsive? No horizontal scroll?
- Performance (5): Fast load? Optimised images?
- URL structure (5): Clean? Descriptive?
- Internal linking (5): Links to related pages?

**Trust & Conversion (15 points):**
- Brand clarity (5): Clear value proposition?
- Proof elements (5): Testimonials? Data? Examples?
- Clear next step (5): Obvious CTA? Contact info?

Return JSON:
{
  "overall": <total 0-100>,
  "on_page": <0-40>,
  "content": <0-25>,
  "technical": <0-20>,
  "trust": <0-15>,
  "top_issues": ["issue 1", "issue 2", "issue 3", "issue 4", "issue 5"],
  "quick_wins": ["win 1", "win 2", "win 3"]
}`;

  const response = await invokeLLM({
    messages: [
      { role: "system" as const, content: "You are an expert SEO auditor. Always respond with valid JSON only." },
      { role: "user" as const, content: prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "seo_score",
        strict: true,
        schema: {
          type: "object",
          properties: {
            overall: { type: "integer" },
            on_page: { type: "integer" },
            content: { type: "integer" },
            technical: { type: "integer" },
            trust: { type: "integer" },
            top_issues: { type: "array", items: { type: "string" } },
            quick_wins: { type: "array", items: { type: "string" } },
          },
          required: ["overall", "on_page", "content", "technical", "trust", "top_issues", "quick_wins"],
          additionalProperties: false,
        },
      },
    },
  });

  const raw = response.choices?.[0]?.message?.content;
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;

  return {
    overall: Math.min(100, Math.max(0, parsed.overall ?? 50)),
    onPage: parsed.on_page ?? 0,
    content: parsed.content ?? 0,
    technical: parsed.technical ?? 0,
    trust: parsed.trust ?? 0,
    topIssues: parsed.top_issues ?? [],
    quickWins: parsed.quick_wins ?? [],
  };
}

// ── Grok Demo Generator (Before/After Comparison) ────────────────────────────

async function generateComparisonDemo(scraped: ScrapedContent, issues: string[], companyName: string): Promise<string> {
  const prompt = `Act as a conversion-focused SEO copywriter for Australian real estate agencies.

Company: ${companyName}
Website: ${scraped.url}
Current title: "${scraped.title}"
Current meta description: "${scraped.metaDescription}"
Current H1: "${scraped.h1}"
Current H2s: ${scraped.h2s.join(", ") || "None"}
Top SEO issues: ${issues.join("; ")}

Generate a complete, self-contained HTML page that shows a before/after comparison.
The page should be styled with inline CSS and look professional.

Include these sections:
1. **Header** with company name and "SEO Improvement Preview" title
2. **Before vs After Table** comparing: Title Tag, Meta Description, H1, H2 Structure
3. **Rewritten Hero Section** with: Headline (H1), Subheadline, 3-4 bullet benefits, Primary CTA
4. **Business Impact Analysis** (5-7 sentences on traffic, leads, revenue impact)
5. **Footer** with "Prepared by Keys For Agents" and a CTA to book a call

Use a dark theme (bg #0f172a, text #e2e8f0, accent #2dd4bf) to match our brand.
Include the full <!DOCTYPE html> wrapper. Make it mobile-responsive.
Write in Australian English. Be specific to real estate.`;

  const response = await invokeLLM({
    messages: [
      { role: "system" as const, content: "You are an expert SEO copywriter. Return a complete, self-contained HTML page only. No markdown fences." },
      { role: "user" as const, content: prompt },
    ],
  });

  let content = response.choices?.[0]?.message?.content;
  if (typeof content !== "string") return "<html><body><p>Demo generation failed.</p></body></html>";
  // Strip markdown code fences if present
  content = content.replace(/^```html?\s*/i, "").replace(/\s*```\s*$/, "");
  return content;
}

// ── Upload Demo to S3 ────────────────────────────────────────────────────────

async function uploadDemoToS3(pitchId: number, html: string): Promise<string> {
  const key = `seo-demos/pitch-${pitchId}-${Date.now()}.html`;
  const { url } = await storagePut(key, Buffer.from(html, "utf-8"), "text/html");
  return url;
}

// ── Grok Email Writer (Enhanced with Impact Estimates) ───────────────────────

async function generatePitchEmail(opts: {
  contactName: string;
  companyName: string;
  websiteUrl: string;
  seoScore: number;
  topIssues: string[];
  planName: string;
  planPrice: number;
  deliverables: string[];
  timeline: string;
  expectedOutcomes: string[];
  adjustments: { reason: string; amount: number }[];
  demoUrl: string;
  annualRevenue: number;
  employeeCount: number;
}): Promise<{ subject: string; bodyHtml: string; bodyText: string }> {
  const firstName = opts.contactName.split(" ")[0] || opts.contactName;

  // Estimate monthly leads lost based on SEO score gap
  const gapPercent = Math.max(0, 100 - opts.seoScore);
  const estimatedMonthlyLeads = Math.round((gapPercent / 100) * 50); // rough estimate
  const estimatedPipelineValue = estimatedMonthlyLeads * 5000; // $5K per lead avg

  const prompt = `You are a sales copywriter for Keys For Agents, an AI-powered real estate marketing platform.

Target: ${opts.contactName} at ${opts.companyName} (${opts.websiteUrl})
SEO score: ${opts.seoScore}/100
Top issues: ${opts.topIssues.join("; ")}
Estimated monthly leads being lost: ~${estimatedMonthlyLeads}
Estimated pipeline value lost: ~$${estimatedPipelineValue.toLocaleString()} AUD/month
Annual revenue: $${opts.annualRevenue.toLocaleString()}
Employees: ${opts.employeeCount}

Recommended plan: ${opts.planName} at $${opts.planPrice.toLocaleString()} AUD/month
${opts.adjustments.length > 0 ? `Price adjustments: ${opts.adjustments.map((a) => `${a.reason}: +$${a.amount}`).join(", ")}` : ""}
Timeline: ${opts.timeline}
Expected outcomes: ${opts.expectedOutcomes.join("; ")}

Deliverables:
${opts.deliverables.map((d) => `- ${d}`).join("\n")}

Demo URL: ${opts.demoUrl}

Write a personalised outreach email following this structure:

**Subject line options** (pick the best one):
1. "[Company Name]: Your site is losing $[X]K in leads"
2. "Quick SEO audit results for [Company Name]"
3. "[Name], spotted ${opts.topIssues.length} quick wins for [Company Name]"
4. "[Company Name] SEO: ${opts.seoScore}/100 (here's how to fix it)"

**Email body:**
- Opening: personalised observation about their agency/website
- What we found: score, top issues with business impact
- What that means: estimated leads and pipeline value being lost
- What we built: link to the demo showing improvements
- Deliverables: bullet list of what's included
- Next step: soft CTA (15-min call or view demo)
- Investment: price with expected outcomes
- P.S.: "The demo link expires in 7 days, so take a look when you have a moment."

Tone: confident, helpful, not pushy. Australian English.
Sign off as: "The Team at Keys For Agents"

Return JSON:
{
  "subject": "...",
  "bodyHtml": "...",
  "bodyText": "..."
}`;

  const response = await invokeLLM({
    messages: [
      { role: "system" as const, content: "You are an expert B2B email copywriter. Always respond with valid JSON only." },
      { role: "user" as const, content: prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "pitch_email",
        strict: true,
        schema: {
          type: "object",
          properties: {
            subject: { type: "string" },
            bodyHtml: { type: "string" },
            bodyText: { type: "string" },
          },
          required: ["subject", "bodyHtml", "bodyText"],
          additionalProperties: false,
        },
      },
    },
  });

  const raw = response.choices?.[0]?.message?.content;
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  return { subject: parsed.subject, bodyHtml: parsed.bodyHtml, bodyText: parsed.bodyText };
}

// ── Email Sender ──────────────────────────────────────────────────────────────

async function sendPitchEmail(opts: {
  to: string;
  toName: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
}): Promise<boolean> {
  if (!ENV.smtpHost || !ENV.smtpUser || !ENV.smtpPass) {
    console.warn("[SeoAuditPitch] No SMTP configured — logging email only");
    await notifyOwner({
      title: `[SEO Pitch Preview] ${opts.subject}`,
      content: `To: ${opts.to}\n\n${opts.bodyText.slice(0, 500)}`,
    }).catch(() => {});
    return true;
  }

  try {
    const transport = nodemailer.createTransport({
      host: ENV.smtpHost,
      port: ENV.smtpPort,
      secure: ENV.smtpPort === 465,
      auth: { user: ENV.smtpUser, pass: ENV.smtpPass },
      tls: { rejectUnauthorized: false },
    });

    const fromName = ENV.smtpFromName || "Keys For Agents";
    const fromAddress = ENV.smtpFrom || ENV.smtpUser;

    const wrappedHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${opts.subject}</title></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:Inter,system-ui,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 20px;">
    <div style="text-align:center;margin-bottom:24px;">
      <span style="font-size:22px;font-weight:700;color:#2dd4bf;">Keys For Agents</span>
      <p style="color:#64748b;font-size:12px;margin:4px 0 0;">AI-Powered Real Estate Marketing</p>
    </div>
    <div style="background:#1e293b;border-radius:12px;padding:28px;color:#e2e8f0;font-size:15px;line-height:1.7;">
      ${opts.bodyHtml}
    </div>
    <div style="text-align:center;margin-top:20px;color:#475569;font-size:11px;">
      <p>Keys For Agents · <a href="https://keyforagents.com" style="color:#2dd4bf;">keyforagents.com</a></p>
    </div>
  </div>
</body>
</html>`;

    await transport.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: `"${opts.toName}" <${opts.to}>`,
      subject: opts.subject,
      text: opts.bodyText,
      html: wrappedHtml,
    });

    // Telegram notification
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: `🎯 <b>SEO Pitch Email Sent</b>\nTo: ${opts.to}\nSubject: ${opts.subject}`,
          parse_mode: "HTML",
        }),
      }).catch(() => {});
    }

    return true;
  } catch (err) {
    console.error("[SeoAuditPitch] Email send failed:", err);
    return false;
  }
}

// ── Router ────────────────────────────────────────────────────────────────────

export const seoAuditPitchRouter = router({
  // ── Run the full 7-step pipeline ──────────────────────────────────────────
  runAuditAndPitch: protectedProcedure
    .input(
      z.object({
        contactId: z.number().optional(),
        companyName: z.string().optional(),
        websiteUrl: z.string().min(4),
        contactEmail: z.string().email().optional(),
        contactName: z.string().optional(),
        annualRevenue: z.number().min(0).default(0),
        employeeCount: z.number().min(0).default(0),
        industry: z.string().optional(),
        siteCount: z.number().min(1).default(1),
        sendEmail: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Create initial record
      const [insertResult] = await db.insert(seoAuditPitches).values({
        contactId: input.contactId,
        companyName: input.companyName,
        websiteUrl: input.websiteUrl,
        contactEmail: input.contactEmail,
        contactName: input.contactName,
        annualRevenue: input.annualRevenue,
        employeeCount: input.employeeCount,
        status: "running",
      });
      const pitchId = (insertResult as any).insertId as number;

      try {
        // Step 1: Scrape
        let scraped: ScrapedContent;
        try {
          scraped = await scrapeWebsite(input.websiteUrl);
        } catch (err) {
          await db.update(seoAuditPitches)
            .set({ status: "failed", errorMessage: `Scrape failed: ${String(err)}` })
            .where(eq(seoAuditPitches.id, pitchId));
          throw new TRPCError({ code: "BAD_REQUEST", message: `Could not scrape website: ${String(err)}` });
        }

        // Step 2: Score SEO
        const seoResult = await scoreSeo(scraped);

        // Step 3: Qualify
        const qualified = seoResult.overall < 60 && isBigCapital(input.annualRevenue, input.employeeCount);
        const disqualifyReason = !qualified
          ? seoResult.overall >= 60
            ? `SEO score ${seoResult.overall}/100 is acceptable (threshold: <60)`
            : `Capital too small (revenue: $${input.annualRevenue.toLocaleString()}, employees: ${input.employeeCount})`
          : undefined;

        if (!qualified) {
          await db.update(seoAuditPitches)
            .set({
              seoScore: seoResult.overall,
              seoOnPage: seoResult.onPage,
              seoContent: seoResult.content,
              seoTechnical: seoResult.technical,
              seoTrust: seoResult.trust,
              topIssues: JSON.stringify(seoResult.topIssues),
              quickWins: JSON.stringify(seoResult.quickWins),
              qualified: 0,
              disqualifyReason,
              status: "not_qualified",
            })
            .where(eq(seoAuditPitches.id, pitchId));

          if (input.contactId) {
            await db.update(crmContacts)
              .set({ auditScore: seoResult.overall })
              .where(eq(crmContacts.id, input.contactId));
          }

          return {
            pitchId,
            qualified: false,
            seoScore: seoResult.overall,
            topIssues: seoResult.topIssues,
            quickWins: seoResult.quickWins,
            disqualifyReason,
          };
        }

        // Step 4: Generate comparison demo + upload to S3
        const demoHtml = await generateComparisonDemo(scraped, seoResult.topIssues, input.companyName || "Your Agency");
        let demoUrl = "";
        try {
          demoUrl = await uploadDemoToS3(pitchId, demoHtml);
        } catch (err) {
          console.warn("[SeoAuditPitch] S3 upload failed, using inline demo:", err);
        }

        // Step 5: Dynamic pricing
        const pricing = calculatePricing({
          annualRevenue: input.annualRevenue,
          issueCount: seoResult.topIssues.length,
          industry: input.industry,
          siteCount: input.siteCount,
        });

        // Step 6: Generate email with impact estimates
        const email = await generatePitchEmail({
          contactName: input.contactName || "there",
          companyName: input.companyName || "your agency",
          websiteUrl: input.websiteUrl,
          seoScore: seoResult.overall,
          topIssues: seoResult.topIssues,
          planName: pricing.tier.name,
          planPrice: pricing.finalPrice,
          deliverables: pricing.tier.deliverables,
          timeline: pricing.tier.timeline,
          expectedOutcomes: pricing.expectedOutcomes,
          adjustments: pricing.adjustments,
          demoUrl: demoUrl || `${ctx.req.headers.origin || "https://keyforagents.com"}/demo/${pitchId}`,
          annualRevenue: input.annualRevenue,
          employeeCount: input.employeeCount,
        });

        // Step 7: Send email
        let emailSent = false;
        if (input.sendEmail && input.contactEmail) {
          emailSent = await sendPitchEmail({
            to: input.contactEmail,
            toName: input.contactName || input.companyName || "there",
            subject: email.subject,
            bodyHtml: email.bodyHtml,
            bodyText: email.bodyText,
          });
        }

        // Save everything
        await db.update(seoAuditPitches)
          .set({
            seoScore: seoResult.overall,
            seoOnPage: seoResult.onPage,
            seoContent: seoResult.content,
            seoTechnical: seoResult.technical,
            seoTrust: seoResult.trust,
            topIssues: JSON.stringify(seoResult.topIssues),
            quickWins: JSON.stringify(seoResult.quickWins),
            qualified: 1,
            planName: pricing.tier.name,
            planPrice: pricing.finalPrice,
            demoHtml,
            emailSubject: email.subject,
            emailBodyHtml: email.bodyHtml,
            emailBodyText: email.bodyText,
            status: emailSent ? "email_sent" : "qualified",
            emailSentAt: emailSent ? new Date() : undefined,
          })
          .where(eq(seoAuditPitches.id, pitchId));

        if (input.contactId) {
          await db.update(crmContacts)
            .set({ auditScore: seoResult.overall, status: "qualified", lastContactedAt: new Date() })
            .where(eq(crmContacts.id, input.contactId));
        }

        return {
          pitchId,
          qualified: true,
          seoScore: seoResult.overall,
          seoBreakdown: { onPage: seoResult.onPage, content: seoResult.content, technical: seoResult.technical, trust: seoResult.trust },
          topIssues: seoResult.topIssues,
          quickWins: seoResult.quickWins,
          planName: pricing.tier.name,
          planPrice: pricing.finalPrice,
          adjustments: pricing.adjustments,
          deliverables: pricing.tier.deliverables,
          timeline: pricing.tier.timeline,
          expectedOutcomes: pricing.expectedOutcomes,
          demoHtml,
          demoUrl,
          emailSubject: email.subject,
          emailBodyText: email.bodyText,
          emailSent,
        };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        await db.update(seoAuditPitches)
          .set({ status: "failed", errorMessage: String(err) })
          .where(eq(seoAuditPitches.id, pitchId));
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Pipeline failed: ${String(err)}` });
      }
    }),

  // ── Batch audit: run multiple contacts ──────────────────────────────────
  batchAudit: protectedProcedure
    .input(
      z.object({
        contactIds: z.array(z.number()).min(1).max(10),
        sendEmail: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Fetch contacts
      const contacts = await db.select().from(crmContacts).where(inArray(crmContacts.id, input.contactIds));
      if (contacts.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "No contacts found" });

      // Run audits sequentially (to avoid rate limits)
      const results: Array<{ contactId: number; name: string; status: string; seoScore?: number; qualified?: boolean; error?: string }> = [];

      for (const contact of contacts) {
        try {
          // Use the same caller context to invoke runAuditAndPitch
          const caller = seoAuditPitchRouter.createCaller(ctx);
          const result = await caller.runAuditAndPitch({
            contactId: contact.id,
            companyName: contact.company || undefined,
            websiteUrl: contact.websiteUrl || "",
            contactEmail: contact.email || undefined,
            contactName: contact.name,
            annualRevenue: 0,
            employeeCount: 0,
            sendEmail: input.sendEmail,
          });
          results.push({
            contactId: contact.id,
            name: contact.name,
            status: result.qualified ? "qualified" : "not_qualified",
            seoScore: result.seoScore,
            qualified: result.qualified,
          });
        } catch (err) {
          results.push({
            contactId: contact.id,
            name: contact.name,
            status: "failed",
            error: String(err),
          });
        }
      }

      // Telegram summary
      const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
      const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";
      if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
        const summary = results.map((r) => `${r.qualified ? "✅" : "❌"} ${r.name}: ${r.seoScore ?? "N/A"}/100 — ${r.status}`).join("\n");
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: `📊 <b>Batch SEO Audit Complete</b>\n${results.length} contacts processed:\n\n${summary}`,
            parse_mode: "HTML",
          }),
        }).catch(() => {});
      }

      return { total: results.length, results };
    }),

  // ── List all audit pitches (admin) ──────────────────────────────────────
  list: protectedProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(seoAuditPitches).orderBy(desc(seoAuditPitches.createdAt)).limit(50);
    }),

  // ── Get single pitch by ID (protected) ─────────────────────────────────
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db.select().from(seoAuditPitches).where(eq(seoAuditPitches.id, input.id));
      return rows[0] ?? null;
    }),

  // ── Public demo page (no auth required) ─────────────────────────────────
  getDemo: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db.select({
        id: seoAuditPitches.id,
        companyName: seoAuditPitches.companyName,
        seoScore: seoAuditPitches.seoScore,
        demoHtml: seoAuditPitches.demoHtml,
        planName: seoAuditPitches.planName,
        planPrice: seoAuditPitches.planPrice,
        createdAt: seoAuditPitches.createdAt,
      }).from(seoAuditPitches).where(eq(seoAuditPitches.id, input.id));
      const row = rows[0];
      if (!row || !row.demoHtml) return null;
      return row;
    }),
});
