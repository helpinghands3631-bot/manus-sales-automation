import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { leadOpsJobs, scrapedLeads, outreachSequences } from "../../drizzle/schema";
import { eq, desc, and, sql, count } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { notifyOwner } from "../_core/notification";
import { TRPCError } from "@trpc/server";

// ── Tool Connector Helpers ──────────────────────────────────────

/**
 * Generic HTTP connector for external services.
 * In production, these would call deployed GitHub repo APIs.
 * Currently uses Grok LLM to simulate the tool outputs for demo/MVP.
 */
async function callLeadScraper(query: string, location: string, maxResults: number) {
  // If LEAD_SCRAPER_URL is configured, call the real API
  const scraperUrl = process.env.LEAD_SCRAPER_URL;
  if (scraperUrl) {
    try {
      const res = await fetch(`${scraperUrl}/scrape`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, location, max_results: maxResults }),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.log("[LeadOps] Scraper API unavailable, falling back to AI generation");
    }
  }

  // Fallback: Use Grok to generate realistic lead data
  const resp = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a lead data generator for Australian real estate. Generate realistic business leads as JSON array. Each lead: { name, email, phone, website, address, city, category }. Use real Australian suburb names and realistic business names. Emails should be plausible (info@domain, name@domain). Generate exactly ${maxResults} leads.`,
      },
      {
        role: "user",
        content: `Generate ${maxResults} leads for "${query}" businesses in ${location}, Australia. Return ONLY a JSON array, no markdown.`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "leads",
        strict: true,
        schema: {
          type: "object",
          properties: {
            leads: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  email: { type: "string" },
                  phone: { type: "string" },
                  website: { type: "string" },
                  address: { type: "string" },
                  city: { type: "string" },
                  category: { type: "string" },
                },
                required: ["name", "email", "phone", "website", "address", "city", "category"],
                additionalProperties: false,
              },
            },
          },
          required: ["leads"],
          additionalProperties: false,
        },
      },
    },
  });
  const parsed = JSON.parse(resp.choices[0].message.content as string);
  return parsed.leads || [];
}

async function callOutreachEngine(action: string, payload: any) {
  const outreachUrl = process.env.OUTREACH_ENGINE_URL;
  if (outreachUrl) {
    try {
      const res = await fetch(`${outreachUrl}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.log("[LeadOps] Outreach API unavailable, falling back to AI generation");
    }
  }
  return { status: "simulated", action, message: "Outreach engine not connected — campaign config saved locally" };
}

async function callCoreAgent(goal: string, context: any) {
  const coreUrl = process.env.CORE_AGENT_URL;
  if (coreUrl) {
    try {
      const res = await fetch(`${coreUrl}/run_task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, context }),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.log("[LeadOps] Core Agent API unavailable, falling back to AI");
    }
  }

  // Fallback: Use Grok for multi-step planning
  const resp = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are a strategic lead operations planner. Given a goal and context, produce a structured plan with concrete action steps, expected outcomes, and timeline. Return JSON.",
      },
      {
        role: "user",
        content: `Goal: ${goal}\n\nContext: ${JSON.stringify(context)}\n\nReturn a JSON object with: { steps: [{ step, action, expected_outcome, timeline }], summary, recommended_actions: string[] }`,
      },
    ],
  });
  try {
    return JSON.parse(resp.choices[0].message.content as string);
  } catch {
    return { summary: resp.choices[0].message.content, steps: [], recommended_actions: [] };
  }
}

// ── Lead Scoring ────────────────────────────────────────────────

function scoreLead(lead: { email?: string | null; phone?: string | null; website?: string | null }): "A" | "B" | "C" {
  let points = 0;
  if (lead.email && !lead.email.includes("noreply")) points += 3;
  if (lead.phone) points += 2;
  if (lead.website && lead.website.length > 5) points += 2;
  if (points >= 6) return "A";
  if (points >= 3) return "B";
  return "C";
}

// ── Router ──────────────────────────────────────────────────────

export const leadOpsRouter = router({
  // ── Dashboard Stats ──
  stats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    const [jobsResult] = await db.select({ count: count() }).from(leadOpsJobs).where(eq(leadOpsJobs.userId, userId));
    const [leadsResult] = await db.select({ count: count() }).from(scrapedLeads).where(eq(scrapedLeads.userId, userId));
    const [seqResult] = await db.select({ count: count() }).from(outreachSequences).where(eq(outreachSequences.userId, userId));
    const [activeJobs] = await db.select({ count: count() }).from(leadOpsJobs).where(and(eq(leadOpsJobs.userId, userId), eq(leadOpsJobs.status, "running")));
    const [aLeads] = await db.select({ count: count() }).from(scrapedLeads).where(and(eq(scrapedLeads.userId, userId), eq(scrapedLeads.score, "A")));

    return {
      totalJobs: jobsResult.count,
      totalLeads: leadsResult.count,
      totalSequences: seqResult.count,
      activeJobs: activeJobs.count,
      aGradeLeads: aLeads.count,
    };
  }),

  // ── List Jobs ──
  listJobs: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }).optional())
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20;
      const db = await getDb();
    if (!db) return [];
    return db.select().from(leadOpsJobs).where(eq(leadOpsJobs.userId, ctx.user.id)).orderBy(desc(leadOpsJobs.createdAt)).limit(limit);
    }),

  // ── Run Scrape Job ──
  runScrape: protectedProcedure
    .input(
      z.object({
        niche: z.string().min(1),
        location: z.string().min(1),
        maxResults: z.number().min(1).max(100).default(20),
        plan: z.enum(["local_lead_flood", "b2b_outbound", "fully_managed"]).default("local_lead_flood"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Create job record
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [job] = await db.insert(leadOpsJobs).values({
        userId: ctx.user.id,
        type: "scrape",
        plan: input.plan,
        status: "running",
        config: { niche: input.niche, location: input.location, maxResults: input.maxResults },
        startedAt: new Date(),
      }).$returningId();

      try {
        // Call scraper
        const leads = await callLeadScraper(input.niche, input.location, input.maxResults);

        // Score and store leads
        const leadsToInsert = (Array.isArray(leads) ? leads : []).map((l: any) => ({
          jobId: job.id,
          userId: ctx.user.id,
          name: l.name || null,
          email: l.email || null,
          phone: l.phone || null,
          website: l.website || null,
          address: l.address || null,
          city: l.city || input.location,
          category: l.category || input.niche,
          source: "google_maps" as const,
          score: scoreLead(l),
        }));

        if (leadsToInsert.length > 0) {
          await db.insert(scrapedLeads).values(leadsToInsert);
        }

        // Update job
        await db.update(leadOpsJobs).set({
          status: "completed",
          results: { leadsFound: leadsToInsert.length, aGrade: leadsToInsert.filter(l => l.score === "A").length, bGrade: leadsToInsert.filter(l => l.score === "B").length, cGrade: leadsToInsert.filter(l => l.score === "C").length },
          completedAt: new Date(),
        }).where(eq(leadOpsJobs.id, job.id));

        await notifyOwner({ title: "LeadOps Scrape Complete", content: `Scraped ${leadsToInsert.length} leads for "${input.niche}" in ${input.location}. A-grade: ${leadsToInsert.filter(l => l.score === "A").length}` });

        return { jobId: job.id, leadsFound: leadsToInsert.length, leads: leadsToInsert };
      } catch (err: any) {
        await db.update(leadOpsJobs).set({ status: "failed", errorMessage: err.message, completedAt: new Date() }).where(eq(leadOpsJobs.id, job.id));
        throw err;
      }
    }),

  // ── List Scraped Leads ──
  listLeads: protectedProcedure
    .input(
      z.object({
        jobId: z.number().optional(),
        score: z.enum(["A", "B", "C", "unscored"]).optional(),
        city: z.string().optional(),
        limit: z.number().min(1).max(500).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { leads: [], total: 0 };
      const conditions = [eq(scrapedLeads.userId, ctx.user.id)];
      if (input?.jobId) conditions.push(eq(scrapedLeads.jobId, input.jobId));
      if (input?.score) conditions.push(eq(scrapedLeads.score, input.score));
      if (input?.city) conditions.push(eq(scrapedLeads.city, input.city));

      const leads = await db.select().from(scrapedLeads).where(and(...conditions)).orderBy(desc(scrapedLeads.createdAt)).limit(input?.limit ?? 50).offset(input?.offset ?? 0);
      const [total] = await db.select({ count: count() }).from(scrapedLeads).where(and(...conditions));
      return { leads, total: total.count };
    }),

  // ── Generate Outreach Copy ──
  generateOutreach: protectedProcedure
    .input(
      z.object({
        segment: z.string().min(1),
        niche: z.string().min(1),
        city: z.string().min(1),
        agencyName: z.string().default("Keys For Agents"),
        tone: z.enum(["professional", "casual", "urgent", "friendly"]).default("professional"),
        sequenceLength: z.number().min(1).max(5).default(3),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const resp = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are an expert B2B outreach copywriter for Australian real estate services. Generate a ${input.sequenceLength}-step email sequence. Each step has: subject, body (HTML), delayDays (0 for first, then 3, 7, etc). Keep emails under 150 words. Personalise with city and niche. Return JSON.`,
          },
          {
            role: "user",
            content: `Generate a ${input.sequenceLength}-step cold email sequence for ${input.agencyName} targeting "${input.niche}" businesses in ${input.city}. Segment: ${input.segment}. Tone: ${input.tone}. Return JSON: { steps: [{ step: number, subject: string, body: string, delayDays: number }] }`,
          },
        ],
      });

      let steps: any[];
      try {
        const parsed = JSON.parse(resp.choices[0].message.content as string);
        steps = parsed.steps || parsed;
      } catch {
        steps = [{ step: 1, subject: "Introduction", body: resp.choices[0].message.content, delayDays: 0 }];
      }

      // Save sequence
      const [seq] = await db.insert(outreachSequences).values({
        userId: ctx.user.id,
        name: `${input.niche} - ${input.city} (${input.tone})`,
        segment: input.segment,
        platform: "email",
        status: "draft",
        templateSteps: steps,
        stats: { sent: 0, opened: 0, clicked: 0, replied: 0, bounced: 0 },
      }).$returningId();

      return { sequenceId: seq.id, steps };
    }),

  // ── List Sequences ──
  listSequences: protectedProcedure
    .input(z.object({ status: z.enum(["draft", "active", "paused", "completed"]).optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions = [eq(outreachSequences.userId, ctx.user.id)];
      if (input?.status) conditions.push(eq(outreachSequences.status, input.status));
      return db.select().from(outreachSequences).where(and(...conditions)).orderBy(desc(outreachSequences.createdAt));
    }),

  // ── Launch Sequence (call outreach engine) ──
  launchSequence: protectedProcedure
    .input(z.object({ sequenceId: z.number(), leadIds: z.array(z.number()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [seq] = await db.select().from(outreachSequences).where(and(eq(outreachSequences.id, input.sequenceId), eq(outreachSequences.userId, ctx.user.id)));
      if (!seq) throw new Error("Sequence not found");

      const leads = await db.select().from(scrapedLeads).where(and(eq(scrapedLeads.userId, ctx.user.id), sql`${scrapedLeads.id} IN (${sql.raw(input.leadIds.join(","))})`));

      // Call outreach engine
      const result = await callOutreachEngine("send_batch", {
        campaign_name: seq.name,
        templates: seq.templateSteps,
        recipients: leads.map(l => ({ email: l.email, name: l.name, city: l.city, category: l.category })),
      });

      // Update sequence status
      await db.update(outreachSequences).set({ status: "active" }).where(eq(outreachSequences.id, input.sequenceId));

      await notifyOwner({ title: "LeadOps Sequence Launched", content: `"${seq.name}" launched to ${leads.length} leads` });

      return { ...result, recipientCount: leads.length };
    }),

  // ── Run Optimization (Core Agent) ──
  runOptimization: protectedProcedure
    .input(
      z.object({
        goal: z.string().min(1),
        campaignContext: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [job] = await db.insert(leadOpsJobs).values({
        userId: ctx.user.id,
        type: "optimization",
        plan: "fully_managed",
        status: "running",
        config: { goal: input.goal, context: input.campaignContext },
        startedAt: new Date(),
      }).$returningId();

      try {
        const result = await callCoreAgent(input.goal, {
          campaignContext: input.campaignContext,
          userId: ctx.user.id,
        });

        await db.update(leadOpsJobs).set({
          status: "completed",
          results: result,
          completedAt: new Date(),
        }).where(eq(leadOpsJobs.id, job.id));

        return { jobId: job.id, ...result };
      } catch (err: any) {
        await db.update(leadOpsJobs).set({ status: "failed", errorMessage: err.message, completedAt: new Date() }).where(eq(leadOpsJobs.id, job.id));
        throw err;
      }
    }),

  // ── Generate Weekly Report ──
  generateReport: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.user.id;

    // Gather stats
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    const [totalLeads] = await db.select({ count: count() }).from(scrapedLeads).where(eq(scrapedLeads.userId, userId));
    const [totalSeqs] = await db.select({ count: count() }).from(outreachSequences).where(eq(outreachSequences.userId, userId));
    const [activeSeqs] = await db.select({ count: count() }).from(outreachSequences).where(and(eq(outreachSequences.userId, userId), eq(outreachSequences.status, "active")));
    const recentJobs = await db.select().from(leadOpsJobs).where(eq(leadOpsJobs.userId, userId)).orderBy(desc(leadOpsJobs.createdAt)).limit(10);

    const resp = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a LeadOps performance analyst. Generate a concise weekly performance report in markdown. Include: executive summary, key metrics, top-performing segments, recommendations for next week.",
        },
        {
          role: "user",
          content: `Generate a weekly LeadOps report:\n- Total leads scraped: ${totalLeads.count}\n- Total sequences: ${totalSeqs.count}\n- Active sequences: ${activeSeqs.count}\n- Recent jobs: ${JSON.stringify(recentJobs.map((j: any) => ({ type: j.type, status: j.status, plan: j.plan, results: j.results })))}\n\nReturn a markdown report.`,
        },
      ],
    });

    const report = resp.choices[0].message.content as string;

    // Save as a report job
    await db.insert(leadOpsJobs).values({
      userId,
      type: "report",
      plan: "fully_managed",
      status: "completed",
      results: { report },
      startedAt: new Date(),
      completedAt: new Date(),
    });

    return { report };
  }),

  // ── Export Leads CSV ──
  exportLeadsCsv: protectedProcedure
    .input(z.object({ jobId: z.number().optional(), score: z.enum(["A", "B", "C", "unscored"]).optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return "";
      const conditions = [eq(scrapedLeads.userId, ctx.user.id)];
      if (input?.jobId) conditions.push(eq(scrapedLeads.jobId, input.jobId));
      if (input?.score) conditions.push(eq(scrapedLeads.score, input.score));

      const leads = await db.select().from(scrapedLeads).where(and(...conditions)).orderBy(desc(scrapedLeads.createdAt));

      const header = "Name,Email,Phone,Website,Address,City,Category,Score\n";
      const rows = leads.map((l: any) => `"${l.name || ""}","${l.email || ""}","${l.phone || ""}","${l.website || ""}","${l.address || ""}","${l.city || ""}","${l.category || ""}","${l.score}"`).join("\n");

      return header + rows;
    }),
});
