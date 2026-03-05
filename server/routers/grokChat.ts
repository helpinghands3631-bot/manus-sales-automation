import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";

const GROK_SYSTEM_PROMPT = `You are Grok, an AI assistant built into the Keys For Agents platform — an AI-powered marketing tool for Australian real estate agencies.

You are an expert in:
- Australian real estate marketing and lead generation
- Digital advertising (Facebook Ads, Google Ads, Meta campaigns)
- SEO for real estate websites and suburb pages
- Copywriting for property listings, appraisal letters, and email campaigns
- Real estate industry trends in Australia
- Conversion rate optimisation for agency websites
- Social media strategy for real estate agents

You help real estate agents and agency principals:
- Craft high-converting ad copy and campaign strategies
- Improve their website SEO and lead capture
- Write compelling suburb pages, property descriptions, and appraisal letters
- Understand their marketing performance data
- Plan and execute digital marketing campaigns

Tone: Professional, direct, and practical. Provide specific, actionable advice. When relevant, reference Australian market context (suburbs, state-based regulations, REIV, REA, Domain, etc.).

Always be helpful, concise, and focused on driving real results for Australian real estate agencies.`;

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

export const grokChatRouter = router({
  /**
   * Send a message to Grok and get a response.
   * Accepts full conversation history for multi-turn chat.
   */
  chat: protectedProcedure
    .input(
      z.object({
        messages: z.array(messageSchema).min(1).max(50),
      })
    )
    .mutation(async ({ input }) => {
      const llmMessages = [
        { role: "system" as const, content: GROK_SYSTEM_PROMPT },
        ...input.messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      const result = await invokeLLM({ messages: llmMessages });

      const content = result.choices?.[0]?.message?.content;
      if (!content || typeof content !== "string") {
        throw new Error("Grok returned an empty response");
      }

      return {
        content,
        model: result.model,
        usage: result.usage,
      };
    }),

  /**
   * Public chat endpoint for the landing page widget.
   * Rate-limited to 5 messages per session (enforced client-side via session count).
   * No auth required — used to demo Grok to potential customers.
   */
  publicChat: publicProcedure
    .input(
      z.object({
        messages: z.array(messageSchema).min(1).max(10),
      })
    )
    .mutation(async ({ input }) => {
      const PUBLIC_SYSTEM_PROMPT = `You are Grok, an AI real estate marketing assistant for Australian real estate agencies. You are a demo on the Keys For Agents website.

You help real estate agents with:
- Writing Facebook and Google ad copy
- SEO tips for their agency website
- Suburb page content ideas
- Email campaign subject lines and copy
- Appraisal letter writing
- Lead generation strategies

Tone: Friendly, practical, and concise. Keep responses to 2-3 short paragraphs max.

Always end with a subtle CTA like: "Want the full Keys For Agents toolkit? Start your free trial today."`;

      const llmMessages = [
        { role: "system" as const, content: PUBLIC_SYSTEM_PROMPT },
        ...input.messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      const result = await invokeLLM({ messages: llmMessages });

      const content = result.choices?.[0]?.message?.content;
      if (!content || typeof content !== "string") {
        throw new Error("Grok returned an empty response");
      }

      return { content };
    }),

  /**
   * Get suggested starter prompts for the chat interface.
   */
  suggestedPrompts: protectedProcedure.query(() => {
    return [
      "Write a Facebook ad for a free property appraisal in [suburb]",
      "How do I improve my agency website's SEO for local searches?",
      "Write a subject line for a vendor nurture email campaign",
      "What's the best way to generate buyer leads on a $50/day budget?",
      "Review my Google Ads headline and suggest improvements",
      "Write a compelling suburb page intro for [suburb name]",
      "How do I reduce my cost per lead from Facebook Ads?",
      "Write an appraisal letter for a 4-bed house in a competitive market",
    ];
  }),
});
