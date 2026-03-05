import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { crmContacts, emailThreads, revenueRecords } from "../../drizzle/schema";
import { eq, desc, and, like, sql, gte, lte, count } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { ENV } from "../_core/env";

// ── Owner-only guard ──────────────────────────────────────────────────────────
function assertOwner(userId: string) {
  const ownerOpenId = ENV.ownerOpenId;
  if (!ownerOpenId || userId !== ownerOpenId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Owner access only" });
  }
}

// ── CRM Router ────────────────────────────────────────────────────────────────
export const crmRouter = router({
  list: protectedProcedure
    .input(z.object({
      status: z.enum(["new", "contacted", "qualified", "proposal", "won", "lost", "all"]).default("all"),
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      assertOwner(ctx.user.openId);
      const db = await getDb();
      if (!db) return { contacts: [], total: 0 };

      const conditions: any[] = [];
      if (input.status !== "all") conditions.push(eq(crmContacts.status, input.status));
      if (input.search) {
        conditions.push(
          sql`(${crmContacts.name} LIKE ${`%${input.search}%`} OR ${crmContacts.email} LIKE ${`%${input.search}%`} OR ${crmContacts.company} LIKE ${`%${input.search}%`})`
        );
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const contacts = await db
        .select()
        .from(crmContacts)
        .where(where)
        .orderBy(desc(crmContacts.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const [{ total }] = await db
        .select({ total: count() })
        .from(crmContacts)
        .where(where);

      return { contacts, total };
    }),

  pipelineStats: protectedProcedure.query(async ({ ctx }) => {
    assertOwner(ctx.user.openId);
    const db = await getDb();
    if (!db) return {};

    const stats = await db
      .select({ status: crmContacts.status, count: count() })
      .from(crmContacts)
      .groupBy(crmContacts.status);

    return Object.fromEntries(stats.map(s => [s.status, s.count]));
  }),

  add: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      company: z.string().optional(),
      suburb: z.string().optional(),
      state: z.string().optional(),
      websiteUrl: z.string().url().optional(),
      auditScore: z.number().min(0).max(100).optional(),
      notes: z.string().optional(),
      source: z.string().optional(),
      status: z.enum(["new", "contacted", "qualified", "proposal", "won", "lost"]).default("new"),
    }))
    .mutation(async ({ ctx, input }) => {
      assertOwner(ctx.user.openId);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db.insert(crmContacts).values({
        name: input.name,
        email: input.email,
        phone: input.phone,
        company: input.company,
        suburb: input.suburb,
        state: input.state,
        websiteUrl: input.websiteUrl,
        auditScore: input.auditScore,
        notes: input.notes,
        source: input.source ?? "manual",
        status: input.status,
      });
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      company: z.string().optional(),
      suburb: z.string().optional(),
      state: z.string().optional(),
      websiteUrl: z.string().optional(),
      auditScore: z.number().optional(),
      notes: z.string().optional(),
      status: z.enum(["new", "contacted", "qualified", "proposal", "won", "lost"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      assertOwner(ctx.user.openId);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { id, ...updates } = input;
      await db.update(crmContacts).set({ ...updates, lastContactedAt: new Date() }).where(eq(crmContacts.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      assertOwner(ctx.user.openId);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(crmContacts).where(eq(crmContacts.id, input.id));
      return { success: true };
    }),
});

// ── Email Hub Router ──────────────────────────────────────────────────────────
export const emailHubRouter = router({
  list: protectedProcedure
    .input(z.object({
      direction: z.enum(["outbound", "inbound", "all"]).default("all"),
      status: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      assertOwner(ctx.user.openId);
      const db = await getDb();
      if (!db) return [];

      const conditions: any[] = [];
      if (input.direction !== "all") conditions.push(eq(emailThreads.direction, input.direction));

      return db
        .select()
        .from(emailThreads)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(emailThreads.createdAt))
        .limit(input.limit)
        .offset(input.offset);
    }),

  composeOffer: protectedProcedure
    .input(z.object({
      contactId: z.number().optional(),
      contactEmail: z.string().email(),
      contactName: z.string(),
      websiteUrl: z.string().optional(),
      auditScore: z.number().optional(),
      offerType: z.enum(["free_audit", "starter_plan", "professional_plan", "enterprise_plan", "custom"]).default("free_audit"),
      customContext: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      assertOwner(ctx.user.openId);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const scoreContext = input.auditScore
        ? `Their website audit score is ${input.auditScore}/100 — ${input.auditScore < 50 ? "critically low, they urgently need help" : input.auditScore < 70 ? "below average, significant improvements needed" : "decent but room for improvement"}.`
        : "";

      const offerMap: Record<string, string> = {
        free_audit: "a complimentary website audit showing exactly what's holding back their lead generation",
        starter_plan: "our Starter Plan at $197/month — website audit, AI campaign generator, and 5 suburb pages",
        professional_plan: "our Professional Plan at $397/month — unlimited audits, campaigns, suburb pages, and priority support",
        enterprise_plan: "our Enterprise Plan at $797/month — everything in Professional plus white-label reports and dedicated account management",
        custom: input.customContext || "a tailored solution for their specific needs",
      };

      const systemPrompt = `You are the founder of Keys For Agents, an AI-powered real estate marketing platform for Australian real estate agencies. 
Write personalised, compelling sales emails that feel genuine and human — not templated or spammy.
Your tone is confident, knowledgeable, and helpful. You understand the real estate industry deeply.
Keep emails concise (150-200 words), with a clear value proposition and a single call to action.`;

      const userPrompt = `Write a personalised sales email to ${input.contactName} at ${input.websiteUrl || "their agency"}.

Offer: ${offerMap[input.offerType]}
${scoreContext}
${input.customContext ? `Additional context: ${input.customContext}` : ""}

The email should:
1. Open with a specific, personalised observation about their business (not generic flattery)
2. Present the offer clearly with the key benefit
3. Include a specific, low-friction call to action (e.g., "Reply to this email" or "Book a 15-min call")
4. Sign off as "Keys For Agents Team"

Return ONLY the email in this format:
Subject: [subject line]

[email body]`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      const rawContent = response.choices?.[0]?.message?.content;
      const fullEmail = typeof rawContent === "string" ? rawContent : "";

      // Parse subject and body
      const subjectMatch = fullEmail.match(/^Subject:\s*(.+)$/m);
      const subject = subjectMatch ? subjectMatch[1].trim() : `A quick note for ${input.contactName}`;
      const body = fullEmail.replace(/^Subject:.+\n\n?/m, "").trim();

      // Save to email threads
      await db.insert(emailThreads).values({
        contactId: input.contactId,
        contactEmail: input.contactEmail,
        contactName: input.contactName,
        subject,
        body,
        direction: "outbound",
        status: "queued",
        offerType: input.offerType,
      });

      return { subject, body };
    }),

  markSent: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      assertOwner(ctx.user.openId);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(emailThreads).set({ status: "sent", sentAt: new Date() }).where(eq(emailThreads.id, input.id));
      return { success: true };
    }),

  markReplied: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      assertOwner(ctx.user.openId);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(emailThreads).set({ status: "replied", repliedAt: new Date() }).where(eq(emailThreads.id, input.id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      assertOwner(ctx.user.openId);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(emailThreads).where(eq(emailThreads.id, input.id));
      return { success: true };
    }),
});

// ── Revenue Router ────────────────────────────────────────────────────────────
export const revenueRouter = router({
  list: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      assertOwner(ctx.user.openId);
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(revenueRecords)
        .orderBy(desc(revenueRecords.recordedAt))
        .limit(input.limit)
        .offset(input.offset);
    }),

  stats: protectedProcedure.query(async ({ ctx }) => {
    assertOwner(ctx.user.openId);
    const db = await getDb();
    if (!db) return { totalRevenue: 0, mrr: 0, arr: 0, totalTransactions: 0, recentMonths: [] };

    // Total revenue (excluding refunds)
    const [totalResult] = await db
      .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
      .from(revenueRecords)
      .where(sql`type != 'refund'`);

    // This month's revenue
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [mrrResult] = await db
      .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
      .from(revenueRecords)
      .where(and(sql`type != 'refund'`, gte(revenueRecords.recordedAt, startOfMonth)));

    // Last 6 months breakdown
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const recentMonths = await db
      .select({
        month: sql<string>`DATE_FORMAT(recorded_at, '%Y-%m')`,
        revenue: sql<number>`COALESCE(SUM(amount), 0)`,
        transactions: count(),
      })
      .from(revenueRecords)
      .where(and(sql`type != 'refund'`, gte(revenueRecords.recordedAt, sixMonthsAgo)))
      .groupBy(sql`DATE_FORMAT(recorded_at, '%Y-%m')`)
      .orderBy(sql`DATE_FORMAT(recorded_at, '%Y-%m')`);

    const mrr = Number(mrrResult?.total ?? 0) / 100;
    const arr = mrr * 12;
    const totalRevenue = Number(totalResult?.total ?? 0) / 100;

    const [{ total: totalTransactions }] = await db
      .select({ total: count() })
      .from(revenueRecords)
      .where(sql`type != 'refund'`);

    return {
      totalRevenue,
      mrr,
      arr,
      totalTransactions,
      recentMonths: recentMonths.map(m => ({
        month: m.month,
        revenue: Number(m.revenue) / 100,
        transactions: m.transactions,
      })),
    };
  }),

  addManual: protectedProcedure
    .input(z.object({
      amount: z.number().min(0),
      currency: z.string().default("AUD"),
      description: z.string(),
      planName: z.string().optional(),
      customerEmail: z.string().email().optional(),
      customerName: z.string().optional(),
      type: z.enum(["stripe", "paypal", "apple_pay", "manual", "refund"]).default("manual"),
    }))
    .mutation(async ({ ctx, input }) => {
      assertOwner(ctx.user.openId);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db.insert(revenueRecords).values({
        type: input.type,
        amount: Math.round(input.amount * 100), // store in cents
        currency: input.currency,
        description: input.description,
        planName: input.planName,
        customerEmail: input.customerEmail,
        customerName: input.customerName,
      });
      return { success: true };
    }),
});
