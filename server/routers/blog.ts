import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { blogPosts } from "../../drizzle/schema";
import { eq, desc, and, like, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .substring(0, 100);
}

function estimateReadingTime(content: string): number {
  const words = content.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

// ── Blog Router ───────────────────────────────────────────────────────────────

export const blogRouter = router({
  // Public: list published posts
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(12),
        offset: z.number().min(0).default(0),
        suburb: z.string().optional(),
        state: z.string().optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions: ReturnType<typeof eq>[] = [eq(blogPosts.published, 1)];

      if (input.suburb) {
        conditions.push(like(blogPosts.suburb, `%${input.suburb}%`) as any);
      }
      if (input.state) {
        conditions.push(eq(blogPosts.state, input.state) as any);
      }
      if (input.search) {
        const searchCond = or(
          like(blogPosts.title, `%${input.search}%`),
          like(blogPosts.suburb, `%${input.search}%`)
        );
        if (searchCond) conditions.push(searchCond as any);
      }

      return db
        .select({
          id: blogPosts.id,
          slug: blogPosts.slug,
          title: blogPosts.title,
          metaDescription: blogPosts.metaDescription,
          suburb: blogPosts.suburb,
          state: blogPosts.state,
          tags: blogPosts.tags,
          readingTime: blogPosts.readingTime,
          publishedAt: blogPosts.publishedAt,
        })
        .from(blogPosts)
        .where(and(...conditions))
        .orderBy(desc(blogPosts.publishedAt))
        .limit(input.limit)
        .offset(input.offset);
    }),

  // Public: get single post by slug
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [post] = await db
        .select()
        .from(blogPosts)
        .where(and(eq(blogPosts.slug, input.slug), eq(blogPosts.published, 1)))
        .limit(1);

      if (!post) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
      }
      return post;
    }),

  // Admin: list all posts (including drafts)
  adminList: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const db = await getDb();
    if (!db) return [];
    return db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));
  }),

  // Admin: generate a suburb guide using Grok
  generate: protectedProcedure
    .input(
      z.object({
        suburb: z.string().min(2),
        state: z.string().min(2),
        targetAudience: z.enum(["vendors", "buyers", "investors", "agents"]).default("agents"),
        focusAngle: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const angle = input.focusAngle || `real estate marketing strategies for ${input.suburb}`;
      const systemPrompt = `You are an expert Australian real estate marketing writer with deep knowledge of local property markets. 
Write original, high-quality suburb guides that are genuinely useful to real estate agents, vendors, buyers, and investors.
Your content must be:
- 100% original — no copying or paraphrasing from any source
- Specific to the suburb with real local insights (median prices, lifestyle, demographics, growth drivers)
- SEO-optimised with natural keyword usage (not stuffed)
- Written in a professional yet approachable Australian tone
- Structured with clear headings and actionable takeaways
- At least 800 words`;

      const userPrompt = `Write a comprehensive suburb guide for ${input.suburb}, ${input.state}, Australia.

Focus angle: ${angle}
Target audience: ${input.targetAudience}

Structure the guide with these sections:
1. Introduction — why ${input.suburb} matters for real estate professionals
2. Suburb Overview — location, character, lifestyle, demographics
3. Property Market Snapshot — typical price ranges, property types, recent trends
4. Top Reasons to Target ${input.suburb} — for ${input.targetAudience}
5. Marketing Strategies — specific tactics for winning listings/buyers in this suburb
6. Key Streets & Pockets — the most desirable areas within the suburb
7. Local Amenities & Lifestyle — schools, transport, shopping, parks
8. Market Outlook — growth drivers and future prospects
9. Conclusion — call to action for agents using Keys For Agents

Write in Markdown format. Use ## for section headings. Be specific, informative, and genuinely useful.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      const rawContent = response.choices?.[0]?.message?.content;
      const content = typeof rawContent === "string" ? rawContent : "";
      if (!content) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Grok returned empty content" });
      }

      const title = `${input.suburb} Real Estate Guide: Marketing Strategies for ${input.state} Agents`;
      const slug = slugify(`${input.suburb}-${input.state}-real-estate-guide`);
      const metaDescription = `Discover proven real estate marketing strategies for ${input.suburb}, ${input.state}. Suburb overview, property market insights, and agent tips powered by Keys For Agents.`;
      const readingTime = estimateReadingTime(content);
      const tags = JSON.stringify([input.suburb, input.state, "suburb guide", "real estate marketing", input.targetAudience]);

      // Check for duplicate slug
      const [existing] = await db
        .select({ id: blogPosts.id })
        .from(blogPosts)
        .where(eq(blogPosts.slug, slug))
        .limit(1);

      const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

      await db.insert(blogPosts).values({
        slug: finalSlug,
        title,
        metaDescription,
        content,
        suburb: input.suburb,
        state: input.state,
        tags,
        readingTime,
        published: 0,
      });

      const [post] = await db
        .select()
        .from(blogPosts)
        .where(eq(blogPosts.slug, finalSlug))
        .limit(1);

      return post;
    }),

  // Admin: publish or unpublish a post
  setPublished: protectedProcedure
    .input(z.object({ id: z.number(), published: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db
        .update(blogPosts)
        .set({
          published: input.published ? 1 : 0,
          publishedAt: input.published ? new Date() : null,
        })
        .where(eq(blogPosts.id, input.id));
      return { success: true };
    }),

  // Admin: delete a post
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db.delete(blogPosts).where(eq(blogPosts.id, input.id));
      return { success: true };
    }),
});
