/**
 * Email Service — Grok-powered personalised offer emails + drip scheduler
 *
 * Transport priority:
 *   1. Nodemailer SMTP (when SMTP_HOST + SMTP_USER + SMTP_PASS are set)
 *   2. Telegram notification + Manus notifyOwner as fallback (log/preview only)
 *
 * Drip sequence:
 *   Day 0  — Personalised offer email (immediate on lead capture)
 *   Day 3  — Follow-up: "Did you get a chance to review?"
 *   Day 7  — Final push: limited-time discount
 */

import nodemailer from "nodemailer";
import { invokeLLM } from "./_core/llm";
import { ENV } from "./_core/env";
import { getDb } from "./db";
import { emailQueue } from "../drizzle/schema";
import { eq, and, lte } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";

// ── SMTP Transport ────────────────────────────────────────────────────────────

function createTransport() {
  if (!ENV.smtpHost || !ENV.smtpUser || !ENV.smtpPass) return null;

  return nodemailer.createTransport({
    host: ENV.smtpHost,
    port: ENV.smtpPort,
    secure: ENV.smtpPort === 465,
    auth: {
      user: ENV.smtpUser,
      pass: ENV.smtpPass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

export function isSmtpConfigured(): boolean {
  return !!(ENV.smtpHost && ENV.smtpUser && ENV.smtpPass);
}

// ── Offer Templates ───────────────────────────────────────────────────────────

const DRIP_SUBJECTS = [
  (name: string) => `${name}, here's your free AI marketing audit for your agency`,
  (name: string) => `Quick follow-up, ${name} — did you get a chance to review?`,
  (name: string) => `Last chance, ${name} — 30% off Keys For Agents this week only`,
];

// ── Grok Offer Generator ──────────────────────────────────────────────────────

export async function generatePersonalisedOffer(lead: {
  name: string;
  email: string;
  websiteUrl?: string | null;
  agencyName?: string | null;
}): Promise<{ subject: string; bodyHtml: string; bodyText: string }> {
  const agencyContext = lead.agencyName
    ? `The agency is called "${lead.agencyName}".`
    : "The agency name is unknown.";
  const websiteContext = lead.websiteUrl
    ? `Their website is ${lead.websiteUrl}.`
    : "They haven't provided a website URL yet.";

  const prompt = `You are a senior real estate marketing consultant writing a personalised cold email for an Australian real estate agency.

Lead details:
- Name: ${lead.name}
- ${agencyContext}
- ${websiteContext}

Write a compelling, personalised email offering a FREE AI website audit from Keys For Agents (keyforagents.com). The email should:
1. Open with a specific, personalised observation about their agency or market
2. Highlight 2-3 specific pain points Australian real estate agencies face (lead quality, vendor appraisals, suburb SEO)
3. Introduce Keys For Agents as the AI co-pilot that solves these problems
4. Include a clear CTA: "Claim your free audit at keyforagents.com"
5. Be warm, professional, and under 200 words
6. End with a P.S. that creates urgency (e.g., limited free audits this month)

Return a JSON object with these exact fields:
{
  "subject": "email subject line (max 60 chars)",
  "bodyText": "plain text version of the email",
  "bodyHtml": "HTML version with basic formatting (p, strong, a tags only)"
}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are an expert email copywriter for Australian real estate SaaS. Always respond with valid JSON only." },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "email_offer",
          strict: true,
          schema: {
            type: "object",
            properties: {
              subject: { type: "string" },
              bodyText: { type: "string" },
              bodyHtml: { type: "string" },
            },
            required: ["subject", "bodyText", "bodyHtml"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty LLM response");
    const parsed = typeof content === "string" ? JSON.parse(content) : content;
    return {
      subject: parsed.subject || DRIP_SUBJECTS[0](lead.name),
      bodyHtml: parsed.bodyHtml || `<p>${parsed.bodyText}</p>`,
      bodyText: parsed.bodyText || "",
    };
  } catch (err) {
    console.error("[EmailService] Grok offer generation failed:", err);
    // Fallback template
    const name = lead.name.split(" ")[0];
    return {
      subject: DRIP_SUBJECTS[0](name),
      bodyHtml: `<p>Hi ${name},</p>
<p>I noticed your agency and wanted to reach out personally. Many Australian real estate agencies are leaving leads on the table because of weak website SEO, generic ad copy, and slow appraisal follow-ups.</p>
<p><strong>Keys For Agents</strong> is the AI co-pilot that fixes all three — in minutes, not months.</p>
<p>Claim your <strong>free AI website audit</strong> at <a href="https://keyforagents.com">keyforagents.com</a> and see exactly what's costing you listings.</p>
<p>Best,<br/>The Keys For Agents Team</p>
<p><em>P.S. We're only offering 10 free audits this month — grab yours before they're gone.</em></p>`,
      bodyText: `Hi ${name},\n\nI noticed your agency and wanted to reach out personally. Many Australian real estate agencies are leaving leads on the table because of weak website SEO, generic ad copy, and slow appraisal follow-ups.\n\nKeys For Agents is the AI co-pilot that fixes all three — in minutes, not months.\n\nClaim your free AI website audit at keyforagents.com and see exactly what's costing you listings.\n\nBest,\nThe Keys For Agents Team\n\nP.S. We're only offering 10 free audits this month — grab yours before they're gone.`,
    };
  }
}

// ── Follow-up & Final Push Templates ─────────────────────────────────────────

function generateFollowUpEmail(lead: { name: string; email: string }) {
  const firstName = lead.name.split(" ")[0];
  return {
    subject: DRIP_SUBJECTS[1](firstName),
    bodyHtml: `<p>Hi ${firstName},</p>
<p>I sent you an email a few days ago about your free AI website audit from Keys For Agents — just wanted to make sure it didn't get buried.</p>
<p>Our AI analyses your agency's website in 60 seconds and gives you a specific action plan to generate more vendor leads and appraisal requests.</p>
<p>👉 <a href="https://keyforagents.com">Claim your free audit here</a></p>
<p>Takes less than 2 minutes to set up.</p>
<p>Cheers,<br/>The Keys For Agents Team</p>`,
    bodyText: `Hi ${firstName},\n\nI sent you an email a few days ago about your free AI website audit from Keys For Agents — just wanted to make sure it didn't get buried.\n\nOur AI analyses your agency's website in 60 seconds and gives you a specific action plan to generate more vendor leads and appraisal requests.\n\nClaim your free audit: keyforagents.com\n\nTakes less than 2 minutes to set up.\n\nCheers,\nThe Keys For Agents Team`,
  };
}

function generateFinalPushEmail(lead: { name: string; email: string }) {
  const firstName = lead.name.split(" ")[0];
  return {
    subject: DRIP_SUBJECTS[2](firstName),
    bodyHtml: `<p>Hi ${firstName},</p>
<p>This is my last email — I promise!</p>
<p>For the next 48 hours, we're offering <strong>30% off all Keys For Agents plans</strong> for agencies that sign up this week.</p>
<p>That's AI-powered campaigns, suburb SEO pages, appraisal letters, and website audits — all for less than the cost of a single letterbox drop.</p>
<p>👉 <a href="https://keyforagents.com">Lock in your 30% discount here</a></p>
<p>Use code: <strong>LAUNCH30</strong> at checkout.</p>
<p>Best of luck with your listings,<br/>The Keys For Agents Team</p>`,
    bodyText: `Hi ${firstName},\n\nThis is my last email — I promise!\n\nFor the next 48 hours, we're offering 30% off all Keys For Agents plans for agencies that sign up this week.\n\nThat's AI-powered campaigns, suburb SEO pages, appraisal letters, and website audits — all for less than the cost of a single letterbox drop.\n\nLock in your 30% discount: keyforagents.com\nUse code: LAUNCH30 at checkout.\n\nBest of luck with your listings,\nThe Keys For Agents Team`,
  };
}

// ── Branded HTML Email Wrapper ────────────────────────────────────────────────

function wrapInBrandedTemplate(bodyHtml: string, subject: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:Inter,system-ui,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 20px;">
    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-flex;align-items:center;gap:8px;">
        <span style="font-size:24px;font-weight:700;color:#2dd4bf;">Keys For Agents</span>
      </div>
      <p style="color:#64748b;font-size:13px;margin:4px 0 0;">AI-Powered Real Estate Marketing</p>
    </div>
    <!-- Body -->
    <div style="background:#1e293b;border-radius:12px;padding:32px;color:#e2e8f0;font-size:15px;line-height:1.7;">
      ${bodyHtml}
    </div>
    <!-- Footer -->
    <div style="text-align:center;margin-top:24px;color:#475569;font-size:12px;">
      <p>Keys For Agents · <a href="https://keyforagents.com" style="color:#2dd4bf;text-decoration:none;">keyforagents.com</a></p>
      <p>You're receiving this because you requested a free audit. <a href="https://keyforagents.com" style="color:#475569;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`;
}

// ── Email Sender ──────────────────────────────────────────────────────────────

async function sendEmail(opts: {
  to: string;
  toName: string | null;
  subject: string;
  bodyHtml: string;
  bodyText: string;
}): Promise<boolean> {
  // ── Primary: SMTP via Nodemailer ──────────────────────────────────────────
  if (isSmtpConfigured()) {
    try {
      const transport = createTransport();
      if (!transport) throw new Error("Failed to create transport");

      const fromAddress = ENV.smtpFrom || ENV.smtpUser;
      const fromName = ENV.smtpFromName || "Keys For Agents";
      const toAddress = opts.toName ? `"${opts.toName}" <${opts.to}>` : opts.to;
      const brandedHtml = wrapInBrandedTemplate(opts.bodyHtml, opts.subject);

      await transport.sendMail({
        from: `"${fromName}" <${fromAddress}>`,
        to: toAddress,
        subject: opts.subject,
        text: opts.bodyText,
        html: brandedHtml,
      });

      console.log(`[EmailService] ✅ SMTP sent to ${opts.to}: ${opts.subject}`);

      // Also notify owner via Telegram
      if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: `📧 <b>Email Sent via SMTP</b>\nTo: ${opts.to}\nSubject: ${opts.subject}`,
            parse_mode: "HTML",
          }),
        }).catch(() => {});
      }

      return true;
    } catch (err) {
      console.error("[EmailService] SMTP send failed:", err);
      // Fall through to Telegram fallback
    }
  }

  // ── Fallback: Telegram + Manus notification (preview/log only) ────────────
  try {
    const preview = `📧 <b>Email Preview (No SMTP)</b>\nTo: ${opts.toName || ""} &lt;${opts.to}&gt;\nSubject: ${opts.subject}\n\n${opts.bodyText.slice(0, 300)}...`;

    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: preview,
          parse_mode: "HTML",
        }),
      });
    }

    await notifyOwner({
      title: `Email Preview: ${opts.subject}`,
      content: `To: ${opts.to}\n\n${opts.bodyText.slice(0, 500)}`,
    }).catch(() => {});

    console.log(`[EmailService] Email preview sent to owner (no SMTP configured) for ${opts.to}`);
    return true;
  } catch (err) {
    console.error("[EmailService] Fallback send failed:", err);
    return false;
  }
}

// ── Queue Email ───────────────────────────────────────────────────────────────

export async function queueEmailForLead(lead: {
  id: number;
  name: string;
  email: string;
  websiteUrl?: string | null;
  agencyName?: string | null;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const now = new Date();
  const day3 = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const day7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Generate personalised Day 0 offer via Grok
  const offer = await generatePersonalisedOffer(lead);
  const followUp = generateFollowUpEmail(lead);
  const finalPush = generateFinalPushEmail(lead);

  await db.insert(emailQueue).values([
    {
      recipientEmail: lead.email,
      recipientName: lead.name,
      subject: offer.subject,
      bodyHtml: offer.bodyHtml,
      bodyText: offer.bodyText || "",
      emailType: "offer",
      drip: 0,
      status: "pending",
      leadId: lead.id,
      scheduledAt: now,
    },
    {
      recipientEmail: lead.email,
      recipientName: lead.name,
      subject: followUp.subject,
      bodyHtml: followUp.bodyHtml,
      bodyText: followUp.bodyText,
      emailType: "followup",
      drip: 1,
      status: "pending",
      leadId: lead.id,
      scheduledAt: day3,
    },
    {
      recipientEmail: lead.email,
      recipientName: lead.name,
      subject: finalPush.subject,
      bodyHtml: finalPush.bodyHtml,
      bodyText: finalPush.bodyText,
      emailType: "final_push",
      drip: 2,
      status: "pending",
      leadId: lead.id,
      scheduledAt: day7,
    },
  ]);

  // Immediately send the Day 0 offer
  const success = await sendEmail({
    to: lead.email,
    toName: lead.name,
    subject: offer.subject,
    bodyHtml: offer.bodyHtml,
    bodyText: offer.bodyText || "",
  });

  // Mark Day 0 as sent
  await db
    .update(emailQueue)
    .set({
      status: success ? "sent" : "failed",
      sentAt: success ? new Date() : undefined,
    })
    .where(
      and(
        eq(emailQueue.leadId, lead.id),
        eq(emailQueue.drip, 0)
      )
    );
}

// ── Process Pending Queue ─────────────────────────────────────────────────────

export async function processPendingEmails(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const now = new Date();
  let pending;
  try {
    pending = await db
      .select()
      .from(emailQueue)
      .where(
        and(
          eq(emailQueue.status, "pending"),
          lte(emailQueue.scheduledAt, now)
        )
      )
      .limit(50);
  } catch (err: any) {
    // Transient DB connection reset — retry once after a short delay
    if (err?.message?.includes("ECONNRESET") || err?.cause?.message?.includes("ECONNRESET")) {
      console.log("[EmailWorker] DB connection reset, retrying in 3s...");
      await new Promise((r) => setTimeout(r, 3000));
      pending = await db
        .select()
        .from(emailQueue)
        .where(
          and(
            eq(emailQueue.status, "pending"),
            lte(emailQueue.scheduledAt, now)
          )
        )
        .limit(50);
    } else {
      throw err;
    }
  }

  let sent = 0;
  for (const email of pending) {
    const success = await sendEmail({
      to: email.recipientEmail,
      toName: email.recipientName,
      subject: email.subject,
      bodyHtml: email.bodyHtml,
      bodyText: email.bodyText || "",
    });

    await db
      .update(emailQueue)
      .set({
        status: success ? "sent" : "failed",
        sentAt: success ? new Date() : undefined,
        errorMessage: success ? undefined : "Send failed",
      })
      .where(eq(emailQueue.id, email.id));

    if (success) sent++;
  }

  if (sent > 0) {
    console.log(`[EmailService] Processed ${sent}/${pending.length} pending emails`);
  }

  return sent;
}
