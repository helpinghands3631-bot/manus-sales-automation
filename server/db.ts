import { eq, desc, sql, and, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  agencies, InsertAgency, Agency,
  audits, InsertAudit,
  campaigns, InsertCampaign,
  suburbPages, InsertSuburbPage,
  chatMessages, InsertChatMessage,
  subscriptions, InsertSubscription,
  digestPreferences, InsertDigestPreferences,
  leads, InsertLead,
  referrals, InsertReferral,
  webhooks, InsertWebhook,
  appraisalLetters, InsertAppraisalLetter,
  listingDescriptions, InsertListingDescription,
  emailQueue,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ── Users ──────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function listAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

// ── Agencies ──────────────────────────────────────────
export async function createAgency(data: InsertAgency) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(agencies).values(data).$returningId();
  return getAgencyById(result.id);
}

export async function updateAgency(id: number, data: Partial<InsertAgency>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(agencies).set(data).where(eq(agencies.id, id));
  return getAgencyById(id);
}

export async function getAgencyById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(agencies).where(eq(agencies.id, id)).limit(1);
  return result[0];
}

export async function getAgenciesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agencies).where(eq(agencies.userId, userId)).orderBy(desc(agencies.createdAt));
}

export async function listAllAgencies() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agencies).orderBy(desc(agencies.createdAt));
}

// ── Audits ──────────────────────────────────────────
export async function createAudit(data: InsertAudit) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(audits).values(data).$returningId();
  return getAuditById(result.id);
}

export async function getAuditById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(audits).where(eq(audits.id, id)).limit(1);
  return result[0];
}

export async function getAuditsByAgencyId(agencyId: number, dateFrom?: Date, dateTo?: Date) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(audits.agencyId, agencyId)];
  if (dateFrom) conditions.push(gte(audits.createdAt, dateFrom));
  if (dateTo) conditions.push(lte(audits.createdAt, dateTo));
  return db.select().from(audits).where(and(...conditions)).orderBy(desc(audits.createdAt));
}

export async function listAllAudits() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(audits).orderBy(desc(audits.createdAt));
}

// ── Campaigns ──────────────────────────────────────────
export async function createCampaign(data: InsertCampaign) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(campaigns).values(data).$returningId();
  return getCampaignById(result.id);
}

export async function getCampaignById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
  return result[0];
}

export async function getCampaignsByAgencyId(agencyId: number, dateFrom?: Date, dateTo?: Date) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(campaigns.agencyId, agencyId)];
  if (dateFrom) conditions.push(gte(campaigns.createdAt, dateFrom));
  if (dateTo) conditions.push(lte(campaigns.createdAt, dateTo));
  return db.select().from(campaigns).where(and(...conditions)).orderBy(desc(campaigns.createdAt));
}

// ── Suburb Pages ──────────────────────────────────────
export async function createSuburbPage(data: InsertSuburbPage) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(suburbPages).values(data).$returningId();
  return getSuburbPageById(result.id);
}

export async function getSuburbPageById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(suburbPages).where(eq(suburbPages.id, id)).limit(1);
  return result[0];
}

export async function getSuburbPagesByAgencyId(agencyId: number, dateFrom?: Date, dateTo?: Date) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(suburbPages.agencyId, agencyId)];
  if (dateFrom) conditions.push(gte(suburbPages.createdAt, dateFrom));
  if (dateTo) conditions.push(lte(suburbPages.createdAt, dateTo));
  return db.select().from(suburbPages).where(and(...conditions)).orderBy(desc(suburbPages.createdAt));
}

// ── Chat Messages ──────────────────────────────────────
export async function createChatMessage(data: InsertChatMessage) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(chatMessages).values(data).$returningId();
  return getChatMessageById(result.id);
}

export async function getChatMessageById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(chatMessages).where(eq(chatMessages.id, id)).limit(1);
  return result[0];
}

export async function getChatHistoryByAgency(agencyId: number, mode?: string) {
  const db = await getDb();
  if (!db) return [];
  if (mode) {
    return db.select().from(chatMessages)
      .where(sql`${chatMessages.agencyId} = ${agencyId} AND ${chatMessages.mode} = ${mode}`)
      .orderBy(desc(chatMessages.createdAt))
      .limit(50);
  }
  return db.select().from(chatMessages)
    .where(eq(chatMessages.agencyId, agencyId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(50);
}

// ── Subscriptions ──────────────────────────────────────
export async function upsertSubscription(data: InsertSubscription) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const existing = await db.select().from(subscriptions).where(eq(subscriptions.userId, data.userId)).limit(1);
  if (existing.length > 0) {
    await db.update(subscriptions).set(data).where(eq(subscriptions.userId, data.userId));
    const updated = await db.select().from(subscriptions).where(eq(subscriptions.userId, data.userId)).limit(1);
    return updated[0];
  }
  const [result] = await db.insert(subscriptions).values(data).$returningId();
  return getSubscriptionById(result.id);
}

export async function getSubscriptionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(subscriptions).where(eq(subscriptions.id, id)).limit(1);
  return result[0];
}

export async function getSubscriptionByUserId(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  return result[0] ?? null;
}

export async function listAllSubscriptions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt));
}

// ── Dashboard Stats ──────────────────────────────────
export async function getDashboardStats(userId: number) {
  const db = await getDb();
  if (!db) return { agencies: 0, audits: 0, campaigns: 0, suburbPages: 0, avgSeoScore: 0, avgConversionScore: 0 };

  const userAgencies = await db.select().from(agencies).where(eq(agencies.userId, userId));
  const agencyIds = userAgencies.map(a => a.id);
  if (agencyIds.length === 0) return { agencies: 0, audits: 0, campaigns: 0, suburbPages: 0, avgSeoScore: 0, avgConversionScore: 0 };

  let totalAudits = 0, totalCampaigns = 0, totalSuburbPages = 0;
  let seoSum = 0, convSum = 0, auditCount = 0;

  for (const agencyId of agencyIds) {
    const agencyAudits = await db.select().from(audits).where(eq(audits.agencyId, agencyId));
    totalAudits += agencyAudits.length;
    for (const a of agencyAudits) {
      if (a.seoScore != null) { seoSum += a.seoScore; auditCount++; }
      if (a.conversionScore != null) { convSum += a.conversionScore; }
    }
    const agencyCampaigns = await db.select().from(campaigns).where(eq(campaigns.agencyId, agencyId));
    totalCampaigns += agencyCampaigns.length;
    const agencyPages = await db.select().from(suburbPages).where(eq(suburbPages.agencyId, agencyId));
    totalSuburbPages += agencyPages.length;
  }

  return {
    agencies: userAgencies.length,
    audits: totalAudits,
    campaigns: totalCampaigns,
    suburbPages: totalSuburbPages,
    avgSeoScore: auditCount > 0 ? Math.round(seoSum / auditCount) : 0,
    avgConversionScore: auditCount > 0 ? Math.round(convSum / auditCount) : 0,
  };
}

export async function getRecentActivity(userId: number, limit = 10) {
  const db = await getDb();
  if (!db) return [];

  const userAgencies = await db.select().from(agencies).where(eq(agencies.userId, userId));
  const agencyIds = userAgencies.map(a => a.id);
  if (agencyIds.length === 0) return [];

  const activities: Array<{ type: string; title: string; description: string; date: Date }> = [];

  for (const agencyId of agencyIds) {
    const recentAudits = await db.select().from(audits).where(eq(audits.agencyId, agencyId)).orderBy(desc(audits.createdAt)).limit(5);
    for (const a of recentAudits) {
      activities.push({ type: "audit", title: "Website Audit", description: `Audited ${a.websiteUrl} — SEO: ${a.seoScore}/100`, date: a.createdAt });
    }
    const recentCampaigns = await db.select().from(campaigns).where(eq(campaigns.agencyId, agencyId)).orderBy(desc(campaigns.createdAt)).limit(5);
    for (const c of recentCampaigns) {
      activities.push({ type: "campaign", title: `${c.campaignType} Campaign`, description: `Created ${c.campaignType} campaign`, date: c.createdAt });
    }
    const recentPages = await db.select().from(suburbPages).where(eq(suburbPages.agencyId, agencyId)).orderBy(desc(suburbPages.createdAt)).limit(5);
    for (const p of recentPages) {
      activities.push({ type: "suburb_page", title: "Suburb Page", description: `Built page for ${p.suburb} — ${p.service}`, date: p.createdAt });
    }
  }

  activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return activities.slice(0, limit);
}

// ── Onboarding ──────────────────────────────────────
export async function getOnboardingStatus(userId: number) {
  const db = await getDb();
  if (!db) return { onboardingComplete: 0, onboardingStep: 0 };
  const result = await db.select({ onboardingComplete: users.onboardingComplete, onboardingStep: users.onboardingStep }).from(users).where(eq(users.id, userId)).limit(1);
  return result[0] || { onboardingComplete: 0, onboardingStep: 0 };
}

export async function updateOnboardingStep(userId: number, step: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ onboardingStep: step }).where(eq(users.id, userId));
}

export async function completeOnboarding(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ onboardingComplete: 1, onboardingStep: 5 }).where(eq(users.id, userId));
}

// ── Monthly Digest ──────────────────────────────────
export async function getMonthlyDigestData(userId: number, monthsBack = 1) {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  const dateFrom = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  const dateTo = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const periodLabel = dateFrom.toLocaleDateString("en-AU", { month: "long", year: "numeric" });

  const userAgencies = await db.select().from(agencies).where(eq(agencies.userId, userId));
  const agencyIds = userAgencies.map(a => a.id);

  if (agencyIds.length === 0) {
    return {
      period: periodLabel,
      dateFrom: dateFrom.toISOString(),
      dateTo: dateTo.toISOString(),
      agencies: [],
      totals: { audits: 0, campaigns: 0, suburbPages: 0, avgSeoScore: 0, avgConversionScore: 0 },
      highlights: [],
    };
  }

  let totalAudits = 0, totalCampaigns = 0, totalSuburbPages = 0;
  let seoSum = 0, convSum = 0, auditCount = 0;
  const agencyDigests: Array<{
    name: string; audits: number; campaigns: number; suburbPages: number;
    avgSeoScore: number; avgConversionScore: number;
    topAudit: { url: string; seoScore: number; conversionScore: number } | null;
  }> = [];
  const highlights: string[] = [];

  for (const agency of userAgencies) {
    const agencyAudits = await db.select().from(audits)
      .where(and(eq(audits.agencyId, agency.id), gte(audits.createdAt, dateFrom), lte(audits.createdAt, dateTo)))
      .orderBy(desc(audits.seoScore));
    const agencyCampaigns = await db.select().from(campaigns)
      .where(and(eq(campaigns.agencyId, agency.id), gte(campaigns.createdAt, dateFrom), lte(campaigns.createdAt, dateTo)));
    const agencyPages = await db.select().from(suburbPages)
      .where(and(eq(suburbPages.agencyId, agency.id), gte(suburbPages.createdAt, dateFrom), lte(suburbPages.createdAt, dateTo)));

    totalAudits += agencyAudits.length;
    totalCampaigns += agencyCampaigns.length;
    totalSuburbPages += agencyPages.length;

    let agSeoSum = 0, agConvSum = 0;
    for (const a of agencyAudits) {
      if (a.seoScore != null) { seoSum += a.seoScore; agSeoSum += a.seoScore; auditCount++; }
      if (a.conversionScore != null) { convSum += a.conversionScore; agConvSum += a.conversionScore; }
    }

    const topAudit = agencyAudits.length > 0
      ? { url: agencyAudits[0].websiteUrl, seoScore: agencyAudits[0].seoScore ?? 0, conversionScore: agencyAudits[0].conversionScore ?? 0 }
      : null;

    agencyDigests.push({
      name: agency.name,
      audits: agencyAudits.length,
      campaigns: agencyCampaigns.length,
      suburbPages: agencyPages.length,
      avgSeoScore: agencyAudits.length > 0 ? Math.round(agSeoSum / agencyAudits.length) : 0,
      avgConversionScore: agencyAudits.length > 0 ? Math.round(agConvSum / agencyAudits.length) : 0,
      topAudit,
    });

    if (agencyAudits.length > 0) highlights.push(`${agency.name}: ${agencyAudits.length} audit(s) completed`);
    if (agencyCampaigns.length > 0) highlights.push(`${agency.name}: ${agencyCampaigns.length} campaign(s) generated`);
    if (agencyPages.length > 0) highlights.push(`${agency.name}: ${agencyPages.length} suburb page(s) built`);
  }

  return {
    period: periodLabel,
    dateFrom: dateFrom.toISOString(),
    dateTo: dateTo.toISOString(),
    agencies: agencyDigests,
    totals: {
      audits: totalAudits,
      campaigns: totalCampaigns,
      suburbPages: totalSuburbPages,
      avgSeoScore: auditCount > 0 ? Math.round(seoSum / auditCount) : 0,
      avgConversionScore: auditCount > 0 ? Math.round(convSum / auditCount) : 0,
    },
    highlights,
  };
}

// ── Digest Preferences ──────────────────────────────
export async function getDigestPreferences(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(digestPreferences).where(eq(digestPreferences.userId, userId)).limit(1);
  if (rows.length > 0) return rows[0];
  // Return defaults if no preferences saved yet
  return {
    userId,
    showAudits: 1,
    showCampaigns: 1,
    showSuburbPages: 1,
    showScores: 1,
    showHighlights: 1,
    showAgencyBreakdown: 1,
  };
}

export async function upsertDigestPreferences(userId: number, prefs: {
  showAudits?: boolean;
  showCampaigns?: boolean;
  showSuburbPages?: boolean;
  showScores?: boolean;
  showHighlights?: boolean;
  showAgencyBreakdown?: boolean;
}) {
  const db = await getDb();
  if (!db) return null;

  const values: InsertDigestPreferences = {
    userId,
    showAudits: prefs.showAudits === false ? 0 : 1,
    showCampaigns: prefs.showCampaigns === false ? 0 : 1,
    showSuburbPages: prefs.showSuburbPages === false ? 0 : 1,
    showScores: prefs.showScores === false ? 0 : 1,
    showHighlights: prefs.showHighlights === false ? 0 : 1,
    showAgencyBreakdown: prefs.showAgencyBreakdown === false ? 0 : 1,
  };

  await db.insert(digestPreferences).values(values).onDuplicateKeyUpdate({
    set: {
      showAudits: values.showAudits,
      showCampaigns: values.showCampaigns,
      showSuburbPages: values.showSuburbPages,
      showScores: values.showScores,
      showHighlights: values.showHighlights,
      showAgencyBreakdown: values.showAgencyBreakdown,
    },
  });

  return getDigestPreferences(userId);
}

export async function getAllActiveUserIds() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({ id: users.id, name: users.name, email: users.email }).from(users).orderBy(desc(users.lastSignedIn));
  return result;
}

// ── Admin Stats ──────────────────────────────────────
export async function getAdminStats() {
  const db = await getDb();
  if (!db) return { users: 0, agencies: 0, audits: 0, campaigns: 0, subscriptions: 0 };
  const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
  const [agencyCount] = await db.select({ count: sql<number>`count(*)` }).from(agencies);
  const [auditCount] = await db.select({ count: sql<number>`count(*)` }).from(audits);
  const [campaignCount] = await db.select({ count: sql<number>`count(*)` }).from(campaigns);
  const [subCount] = await db.select({ count: sql<number>`count(*)` }).from(subscriptions);
  return {
    users: userCount.count,
    agencies: agencyCount.count,
    audits: auditCount.count,
    campaigns: campaignCount.count,
    subscriptions: subCount.count,
  };
}

// ── Users (extended) ──────────────────────────────────
export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result[0];
}

export async function setUserReferralCode(userId: number, code: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ referralCode: code }).where(eq(users.id, userId));
}

export async function setUserReferredByCode(userId: number, code: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ referredByCode: code }).where(eq(users.id, userId));
}

export async function getUserByReferralCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.referralCode, code)).limit(1);
  return result[0];
}

// ── Leads ──────────────────────────────────────────────
export async function createLead(data: InsertLead) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(leads).values(data).$returningId();
  const rows = await db.select().from(leads).where(eq(leads.id, result.id)).limit(1);
  return rows[0];
}

export async function listAllLeads() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(leads).orderBy(desc(leads.createdAt));
}

// ── Referrals ──────────────────────────────────────────
export async function createReferral(data: InsertReferral) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(referrals).values(data).$returningId();
  const rows = await db.select().from(referrals).where(eq(referrals.id, result.id)).limit(1);
  return rows[0];
}

export async function getReferralsByReferrer(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(referrals).where(eq(referrals.referrerId, userId)).orderBy(desc(referrals.createdAt));
}

export async function getReferralStats(userId: number) {
  const db = await getDb();
  if (!db) return { totalReferrals: 0, signedUp: 0, subscribed: 0, rewarded: 0 };
  const allRefs = await db.select().from(referrals).where(eq(referrals.referrerId, userId));
  return {
    totalReferrals: allRefs.length,
    signedUp: allRefs.filter(r => r.status === "signed_up" || r.status === "subscribed" || r.status === "rewarded").length,
    subscribed: allRefs.filter(r => r.status === "subscribed" || r.status === "rewarded").length,
    rewarded: allRefs.filter(r => r.status === "rewarded").length,
  };
}

// ── Webhooks ──────────────────────────────────────────
export async function createWebhook(data: InsertWebhook) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(webhooks).values(data).$returningId();
  const rows = await db.select().from(webhooks).where(eq(webhooks.id, result.id)).limit(1);
  return rows[0];
}

export async function getWebhooksByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(webhooks).where(eq(webhooks.userId, userId)).orderBy(desc(webhooks.createdAt));
}

export async function getActiveWebhooksByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(webhooks).where(and(eq(webhooks.userId, userId), eq(webhooks.active, 1)));
}

export async function getWebhookById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(webhooks).where(eq(webhooks.id, id)).limit(1);
  return result[0];
}

export async function deleteWebhook(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(webhooks).where(eq(webhooks.id, id));
}

export async function updateWebhookActive(id: number, active: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(webhooks).set({ active }).where(eq(webhooks.id, id));
}

export async function updateWebhookLastFired(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(webhooks).set({ lastFiredAt: new Date() }).where(eq(webhooks.id, id));
}

// ── Appraisal Letters ──────────────────────────────────
export async function createAppraisalLetter(data: InsertAppraisalLetter) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(appraisalLetters).values(data).$returningId();
  const rows = await db.select().from(appraisalLetters).where(eq(appraisalLetters.id, result.id)).limit(1);
  return rows[0];
}

export async function getAppraisalLettersByAgency(agencyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(appraisalLetters).where(eq(appraisalLetters.agencyId, agencyId)).orderBy(desc(appraisalLetters.createdAt));
}

export async function getAppraisalLetterById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(appraisalLetters).where(eq(appraisalLetters.id, id)).limit(1);
  return result[0];
}

export async function deleteAppraisalLetter(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(appraisalLetters).where(eq(appraisalLetters.id, id));
}

export async function countAppraisalLettersByUser(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const [result] = await db.select({ count: sql<number>`count(*)` }).from(appraisalLetters).where(eq(appraisalLetters.userId, userId));
  return result.count;
}

// ── Listing Descriptions ──────────────────────────────
export async function createListingDescription(data: InsertListingDescription) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(listingDescriptions).values(data).$returningId();
  const rows = await db.select().from(listingDescriptions).where(eq(listingDescriptions.id, result.id)).limit(1);
  return rows[0];
}

export async function getListingDescriptionsByAgency(agencyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(listingDescriptions).where(eq(listingDescriptions.agencyId, agencyId)).orderBy(desc(listingDescriptions.createdAt));
}

export async function getListingDescriptionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(listingDescriptions).where(eq(listingDescriptions.id, id)).limit(1);
  return result[0];
}

export async function deleteListingDescription(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(listingDescriptions).where(eq(listingDescriptions.id, id));
}

export async function countListingDescriptionsByUser(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const [result] = await db.select({ count: sql<number>`count(*)` }).from(listingDescriptions).where(eq(listingDescriptions.userId, userId));
  return result.count;
}

// ── Email Queue ───────────────────────────────────────
export async function getEmailQueueStats() {
  const db = await getDb();
  if (!db) return { pending: 0, sent: 0, failed: 0, skipped: 0, total: 0 };
  const rows = await db
    .select({ status: emailQueue.status, count: sql<number>`count(*)` })
    .from(emailQueue)
    .groupBy(emailQueue.status);
  const stats = { pending: 0, sent: 0, failed: 0, skipped: 0, total: 0 };
  for (const row of rows) {
    const count = Number(row.count);
    stats.total += count;
    if (row.status === "pending") stats.pending = count;
    else if (row.status === "sent") stats.sent = count;
    else if (row.status === "failed") stats.failed = count;
    else if (row.status === "skipped") stats.skipped = count;
  }
  return stats;
}
