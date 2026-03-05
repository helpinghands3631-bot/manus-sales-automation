/**
 * Seed 10 more Grok-written suburb guide blog posts (Batch 2).
 * Run: node scripts/seed-blog-batch2.mjs
 */
import { createConnection } from "mysql2/promise";
import { config } from "dotenv";
config();

const XAI_API_KEY = process.env.XAI_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!XAI_API_KEY) throw new Error("XAI_API_KEY not set");
if (!DATABASE_URL) throw new Error("DATABASE_URL not set");

const suburbs = [
  { name: "Surry Hills", state: "NSW", city: "Sydney" },
  { name: "Double Bay", state: "NSW", city: "Sydney" },
  { name: "South Yarra", state: "VIC", city: "Melbourne" },
  { name: "Subiaco", state: "WA", city: "Perth" },
  { name: "Noosa Heads", state: "QLD", city: "Noosa" },
  { name: "Neutral Bay", state: "NSW", city: "Sydney" },
  { name: "Prahran", state: "VIC", city: "Melbourne" },
  { name: "Applecross", state: "WA", city: "Perth" },
  { name: "Ascot", state: "QLD", city: "Brisbane" },
  { name: "Unley", state: "SA", city: "Adelaide" },
];

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function generatePost(suburb) {
  const prompt = `Write a comprehensive, original real estate suburb guide for ${suburb.name}, ${suburb.state}, Australia.

This guide is for real estate agents using Keys For Agents (keyforagents.com) to market properties in this suburb.

Include these sections with proper markdown headings:
## Overview
A compelling 2-paragraph introduction to ${suburb.name} covering its character, lifestyle, and appeal to buyers.

## Property Market
Current market conditions, typical property types (houses, apartments, townhouses), median price ranges, and recent trends. Be specific and realistic for ${suburb.name}.

## Who's Buying
Demographic breakdown of typical buyers: first home buyers, families, investors, downsizers, professionals. What draws them to ${suburb.name}?

## Lifestyle & Amenities
Key lifestyle features: cafes, restaurants, parks, beaches, schools, transport links, shopping. What makes ${suburb.name} special?

## Investment Potential
Rental yields, vacancy rates, capital growth trends, infrastructure projects, and why investors are interested in ${suburb.name}.

## Marketing Tips for Agents
5 specific, actionable tips for real estate agents marketing properties in ${suburb.name}. Include advice on targeting the right buyer demographic, key selling points to highlight, and digital marketing strategies.

## Key Selling Points
A bullet list of the top 8 selling points agents should emphasise when listing properties in ${suburb.name}.

Write in a professional but engaging tone. Be specific to ${suburb.name} — avoid generic content. Aim for 800-1000 words total.`;

  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${XAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "grok-3-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an expert Australian real estate marketing consultant and content writer. You write detailed, accurate, and engaging suburb guides for real estate agents. Your content is original, SEO-friendly, and genuinely useful for agents.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`xAI API error: ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function main() {
  // Parse DATABASE_URL: mysql://user:pass@host:port/dbname
  const url = new URL(DATABASE_URL);
  const conn = await createConnection({
    host: url.hostname,
    port: parseInt(url.port) || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    ssl: { rejectUnauthorized: false },
  });

  console.log("Connected to database.");

  for (const suburb of suburbs) {
    const slug = slugify(`${suburb.name}-real-estate-guide-${suburb.state.toLowerCase()}`);

    // Check if post already exists
    const [existing] = await conn.execute("SELECT id FROM blogPosts WHERE slug = ?", [slug]);
    if (existing.length > 0) {
      console.log(`⏭  Skipping ${suburb.name} — already exists`);
      continue;
    }

    console.log(`✍  Generating: ${suburb.name}, ${suburb.state}...`);
    const content = await generatePost(suburb);

    const title = `${suburb.name} Real Estate Guide: Market Insights for Agents`;
    const metaDescription = `Real estate agent guide to ${suburb.name}, ${suburb.state}. Median prices, buyer demographics, investment potential, and marketing tips for agents in ${suburb.city}.`;
    const tags = JSON.stringify([
      suburb.name,
      suburb.state,
      suburb.city,
      "real estate",
      "suburb guide",
      "property market",
      "agent marketing",
    ]);
    const readingTime = Math.ceil(content.split(/\s+/).length / 200);
    const now = new Date();

    await conn.execute(
      `INSERT INTO blogPosts (title, slug, metaDescription, content, suburb, state, tags, readingTime, published, publishedAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      [title, slug, metaDescription, content, suburb.name, suburb.state, tags, readingTime, now, now, now]
    );

    console.log(`✅  Published: ${title}`);

    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 2000));
  }

  await conn.end();
  console.log("\n🎉 Batch 2 blog seeding complete! 10 more suburb guides published.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
