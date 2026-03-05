import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStripeWebhook } from "../stripeWebhook";
import { registerSeoRoutes } from "../seo";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { processPendingEmails, isSmtpConfigured } from "../emailService";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

// ── Email Queue Worker ────────────────────────────────────────────────────────

function startEmailWorker() {
  const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  if (isSmtpConfigured()) {
    console.log("[EmailWorker] SMTP configured — email queue worker starting (every 5 min)");
  } else {
    console.log("[EmailWorker] No SMTP configured — running in preview mode (Telegram notifications only)");
  }

  // Run immediately on startup, then every 5 minutes
  processPendingEmails().catch((err) =>
    console.error("[EmailWorker] Initial run failed:", err)
  );

  setInterval(() => {
    processPendingEmails().catch((err) =>
      console.error("[EmailWorker] Interval run failed:", err)
    );
  }, INTERVAL_MS);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Stripe webhook MUST be registered BEFORE express.json()
  registerStripeWebhook(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // SEO routes: sitemap.xml, robots.txt, webhook health
  registerSeoRoutes(app);
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    // Start email queue worker after server is up
    startEmailWorker();
  });
}

startServer().catch(console.error);
