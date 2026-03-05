import type { Express } from "express";

const BASE_URL = "https://keyforagents.com";

const STATIC_PAGES = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/#pricing", priority: "0.9", changefreq: "monthly" },
  { path: "/#features", priority: "0.8", changefreq: "monthly" },
  { path: "/#testimonials", priority: "0.7", changefreq: "monthly" },
  { path: "/#faq", priority: "0.7", changefreq: "monthly" },
];

export function registerSeoRoutes(app: Express) {
  // Dynamic sitemap.xml
  app.get("/sitemap.xml", (_req, res) => {
    const now = new Date().toISOString().split("T")[0];

    const urls = STATIC_PAGES.map(
      (page) => `
  <url>
    <loc>${BASE_URL}${page.path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
    ).join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urls}
</urlset>`;

    res.set("Content-Type", "application/xml");
    res.set("Cache-Control", "public, max-age=86400"); // 24h cache
    res.send(xml);
  });

  // Webhook health check endpoint
  app.get("/api/webhooks/status", (_req, res) => {
    res.json({
      status: "ok",
      endpoints: {
        stripe: "/api/stripe/webhook",
        trpc: "/api/trpc",
        oauth: "/api/oauth/callback",
      },
      timestamp: new Date().toISOString(),
    });
  });
}
