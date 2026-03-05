import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { ENV } from "../_core/env";

const SONAR_API_URL = "https://api.perplexity.ai/chat/completions";

interface SonarMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface SonarResponse {
  id: string;
  model: string;
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  citations?: string[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

async function sonarSearch(messages: SonarMessage[], model = "sonar-pro"): Promise<SonarResponse> {
  const apiKey = ENV.sonarApiKey;
  if (!apiKey) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Perplexity API key not configured" });

  const res = await fetch(SONAR_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 2000,
      temperature: 0.2,
      return_citations: true,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Perplexity API error: ${text}` });
  }

  return res.json() as Promise<SonarResponse>;
}

export const researchRouter = router({
  // ── Suburb Market Research ──────────────────────────────────────────────────
  suburbTrends: protectedProcedure
    .input(z.object({
      suburb: z.string(),
      state: z.string().default("NSW"),
      propertyType: z.enum(["house", "unit", "land", "commercial"]).default("house"),
    }))
    .query(async ({ input }) => {
      const response = await sonarSearch([
        {
          role: "system",
          content: "You are an Australian real estate market analyst. Provide concise, data-driven insights with specific numbers where available. Focus on actionable information for real estate agents.",
        },
        {
          role: "user",
          content: `Provide a current market analysis for ${input.suburb}, ${input.state}, Australia for ${input.propertyType}s. Include:
1. Current median price and recent price growth (%)
2. Days on market average
3. Rental yield (if applicable)
4. Supply vs demand indicators
5. Key buyer demographics
6. Top 3 selling points of the suburb
7. Any upcoming infrastructure or development projects
8. Market outlook for the next 6-12 months

Keep it concise and data-focused.`,
        },
      ]);

      return {
        suburb: input.suburb,
        state: input.state,
        propertyType: input.propertyType,
        analysis: response.choices[0]?.message.content || "",
        citations: response.citations || [],
        model: response.model,
        tokensUsed: response.usage?.total_tokens || 0,
        generatedAt: new Date().toISOString(),
      };
    }),

  // ── Competitor Intelligence ─────────────────────────────────────────────────
  competitorIntel: protectedProcedure
    .input(z.object({
      agencyName: z.string(),
      suburb: z.string().optional(),
      state: z.string().default("NSW"),
    }))
    .query(async ({ input }) => {
      const locationContext = input.suburb ? `in ${input.suburb}, ${input.state}` : `in ${input.state}, Australia`;
      const response = await sonarSearch([
        {
          role: "system",
          content: "You are a competitive intelligence analyst specialising in Australian real estate agencies. Provide factual, publicly available information only.",
        },
        {
          role: "user",
          content: `Research the real estate agency "${input.agencyName}" ${locationContext}. Provide:
1. Agency overview (size, years in operation, specialties)
2. Market presence and listings volume (if available)
3. Key marketing strategies they use
4. Online reputation and review scores
5. Their main competitive advantages
6. Areas where they appear weak or vulnerable
7. Recent news or notable sales

Focus on publicly available information only.`,
        },
      ]);

      return {
        agencyName: input.agencyName,
        location: input.suburb ? `${input.suburb}, ${input.state}` : input.state,
        intel: response.choices[0]?.message.content || "",
        citations: response.citations || [],
        generatedAt: new Date().toISOString(),
      };
    }),

  // ── Ad Insights & Campaign Research ────────────────────────────────────────
  adInsights: protectedProcedure
    .input(z.object({
      topic: z.string(), // e.g. "Facebook ads for real estate agents in Sydney"
      platform: z.enum(["facebook", "google", "instagram", "linkedin", "all"]).default("all"),
    }))
    .query(async ({ input }) => {
      const platformContext = input.platform === "all" ? "across Facebook, Google, and Instagram" : `on ${input.platform}`;
      const response = await sonarSearch([
        {
          role: "system",
          content: "You are a digital marketing expert specialising in real estate advertising in Australia. Provide current, actionable advertising insights.",
        },
        {
          role: "user",
          content: `Research current best practices and insights for: "${input.topic}" ${platformContext} for Australian real estate agents. Include:
1. Current average CPL (cost per lead) benchmarks
2. Best performing ad formats and creative approaches
3. Top targeting strategies
4. Seasonal trends and timing recommendations
5. Budget allocation recommendations
6. Common mistakes to avoid
7. 3 specific ad copy angles that are working well right now

Provide specific, actionable advice with numbers where possible.`,
        },
      ]);

      return {
        topic: input.topic,
        platform: input.platform,
        insights: response.choices[0]?.message.content || "",
        citations: response.citations || [],
        generatedAt: new Date().toISOString(),
      };
    }),

  // ── General Market Research ─────────────────────────────────────────────────
  search: protectedProcedure
    .input(z.object({
      query: z.string().min(5).max(500),
      context: z.string().optional(), // additional context for the system prompt
    }))
    .query(async ({ input }) => {
      const response = await sonarSearch([
        {
          role: "system",
          content: input.context || "You are a research assistant for Australian real estate marketing professionals. Provide accurate, current, and actionable information with citations.",
        },
        {
          role: "user",
          content: input.query,
        },
      ]);

      return {
        query: input.query,
        answer: response.choices[0]?.message.content || "",
        citations: response.citations || [],
        model: response.model,
        tokensUsed: response.usage?.total_tokens || 0,
        generatedAt: new Date().toISOString(),
      };
    }),

  // ── Australian Property Market Overview ────────────────────────────────────
  marketOverview: protectedProcedure
    .input(z.object({
      state: z.enum(["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT", "all"]).default("all"),
    }))
    .query(async ({ input }) => {
      const locationContext = input.state === "all" ? "Australia nationally" : `${input.state}, Australia`;
      const response = await sonarSearch([
        {
          role: "system",
          content: "You are an Australian property market economist. Provide current market data and trends.",
        },
        {
          role: "user",
          content: `Provide a current Australian property market overview for ${locationContext}. Include:
1. Current market conditions (buyer's vs seller's market)
2. Interest rate environment and impact
3. Median house and unit prices (latest available)
4. Price growth/decline trends (YoY)
5. Auction clearance rates
6. New listings volume vs historical
7. Top performing suburbs/regions
8. Key risks and opportunities for agents in the next quarter`,
        },
      ]);

      return {
        state: input.state,
        overview: response.choices[0]?.message.content || "",
        citations: response.citations || [],
        generatedAt: new Date().toISOString(),
      };
    }),
});
