import { boolean, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  onboardingComplete: int("onboardingComplete").default(0).notNull(),
  onboardingStep: int("onboardingStep").default(0).notNull(),
  referralCode: varchar("referralCode", { length: 16 }).unique(),
  referredByCode: varchar("referredByCode", { length: 16 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const agencies = mysqlTable("agencies", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  websiteUrl: varchar("websiteUrl", { length: 512 }),
  primarySuburbs: text("primarySuburbs"),
  services: text("services"),
  phone: varchar("phone", { length: 32 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const audits = mysqlTable("audits", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  websiteUrl: varchar("websiteUrl", { length: 512 }).notNull(),
  summary: text("summary"),
  findings: json("findings"),
  seoScore: int("seoScore"),
  conversionScore: int("conversionScore"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const campaigns = mysqlTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  campaignType: varchar("campaignType", { length: 32 }).notNull(),
  suburbs: text("suburbs"),
  services: text("services"),
  content: json("content"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const suburbPages = mysqlTable("suburb_pages", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  suburb: varchar("suburb", { length: 128 }).notNull(),
  service: varchar("service", { length: 128 }).notNull(),
  pageContent: json("pageContent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  userId: int("userId").notNull(),
  mode: varchar("mode", { length: 32 }).notNull(),
  userMessage: text("userMessage").notNull(),
  aiReply: text("aiReply"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  plan: mysqlEnum("plan", ["starter", "growth", "dominator"]).notNull(),
  status: mysqlEnum("status", ["active", "canceled", "past_due", "trialing"]).default("active").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 128 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 128 }),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const digestPreferences = mysqlTable("digest_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  showAudits: int("showAudits").default(1).notNull(),
  showCampaigns: int("showCampaigns").default(1).notNull(),
  showSuburbPages: int("showSuburbPages").default(1).notNull(),
  showScores: int("showScores").default(1).notNull(),
  showHighlights: int("showHighlights").default(1).notNull(),
  showAgencyBreakdown: int("showAgencyBreakdown").default(1).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ── New Tables ────────────────────────────────────────────────────────────────

export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  websiteUrl: varchar("websiteUrl", { length: 512 }),
  agencyName: varchar("agencyName", { length: 255 }),
  source: varchar("source", { length: 64 }).default("landing_page").notNull(),
  teaserAuditResult: json("teaserAuditResult"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const referrals = mysqlTable("referrals", {
  id: int("id").autoincrement().primaryKey(),
  referrerId: int("referrerId").notNull(),
  referredUserId: int("referredUserId"),
  referralCode: varchar("referralCode", { length: 16 }).notNull(),
  status: mysqlEnum("status", ["pending", "signed_up", "subscribed", "rewarded"]).default("pending").notNull(),
  rewardPaid: int("rewardPaid").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const webhooks = mysqlTable("webhooks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  url: varchar("url", { length: 512 }).notNull(),
  events: json("events").notNull(), // array of event names
  secret: varchar("secret", { length: 64 }),
  active: int("active").default(1).notNull(),
  lastFiredAt: timestamp("lastFiredAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const appraisalLetters = mysqlTable("appraisal_letters", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  userId: int("userId").notNull(),
  suburb: varchar("suburb", { length: 128 }).notNull(),
  propertyType: varchar("propertyType", { length: 64 }).notNull(),
  ownerName: varchar("ownerName", { length: 255 }),
  propertyAddress: varchar("propertyAddress", { length: 512 }),
  keyFeatures: text("keyFeatures"),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const listingDescriptions = mysqlTable("listing_descriptions", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  userId: int("userId").notNull(),
  propertyAddress: varchar("propertyAddress", { length: 512 }).notNull(),
  suburb: varchar("suburb", { length: 128 }).notNull(),
  propertyType: varchar("propertyType", { length: 64 }).notNull(),
  bedrooms: int("bedrooms"),
  bathrooms: int("bathrooms"),
  keyFeatures: text("keyFeatures"),
  targetBuyer: varchar("targetBuyer", { length: 128 }),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const emailQueue = mysqlTable("email_queue", {
  id: int("id").autoincrement().primaryKey(),
  recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
  recipientName: varchar("recipientName", { length: 255 }),
  subject: varchar("subject", { length: 512 }).notNull(),
  bodyHtml: text("bodyHtml").notNull(),
  bodyText: text("bodyText"),
  emailType: varchar("emailType", { length: 64 }).default("offer").notNull(), // offer | followup | final_push
  drip: int("drip").default(0).notNull(), // 0=immediate, 1=day3, 2=day7
  status: mysqlEnum("status", ["pending", "sent", "failed", "skipped"]).default("pending").notNull(),
  leadId: int("leadId"),
  scheduledAt: timestamp("scheduledAt").defaultNow().notNull(),
  sentAt: timestamp("sentAt"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const crmContacts = mysqlTable("crmContacts", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  company: varchar("company", { length: 255 }),
  suburb: varchar("suburb", { length: 128 }),
  state: varchar("state", { length: 64 }),
  source: varchar("source", { length: 64 }).default("manual"),
  status: mysqlEnum("status", ["new", "contacted", "qualified", "proposal", "won", "lost"]).default("new").notNull(),
  websiteUrl: varchar("websiteUrl", { length: 512 }),
  auditScore: int("auditScore"),
  notes: text("notes"),
  lastContactedAt: timestamp("lastContactedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const emailThreads = mysqlTable("emailThreads", {
  id: int("id").autoincrement().primaryKey(),
  contactId: int("contactId"),
  contactEmail: varchar("contactEmail", { length: 320 }).notNull(),
  contactName: varchar("contactName", { length: 255 }),
  subject: varchar("subject", { length: 512 }).notNull(),
  body: text("body").notNull(),
  direction: mysqlEnum("direction", ["outbound", "inbound"]).default("outbound").notNull(),
  status: mysqlEnum("status", ["queued", "sent", "delivered", "replied", "bounced", "failed"]).default("queued").notNull(),
  offerType: varchar("offerType", { length: 64 }),
  sentAt: timestamp("sentAt"),
  repliedAt: timestamp("repliedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const revenueRecords = mysqlTable("revenueRecords", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["stripe", "paypal", "apple_pay", "manual", "refund"]).default("stripe").notNull(),
  amount: int("amount").notNull(),
  currency: varchar("currency", { length: 8 }).default("AUD").notNull(),
  description: varchar("description", { length: 512 }),
  planName: varchar("planName", { length: 64 }),
  customerEmail: varchar("customerEmail", { length: 320 }),
  customerName: varchar("customerName", { length: 255 }),
  stripePaymentId: varchar("stripePaymentId", { length: 255 }),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const blogPosts = mysqlTable("blogPosts", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 512 }).notNull(),
  metaDescription: varchar("metaDescription", { length: 320 }),
  content: text("content").notNull(),
  suburb: varchar("suburb", { length: 128 }),
  state: varchar("state", { length: 64 }),
  tags: text("tags"),
  readingTime: int("readingTime").default(5),
  published: int("published").default(0).notNull(),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ── Types ─────────────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Agency = typeof agencies.$inferSelect;
export type InsertAgency = typeof agencies.$inferInsert;
export type Audit = typeof audits.$inferSelect;
export type InsertAudit = typeof audits.$inferInsert;
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;
export type SuburbPage = typeof suburbPages.$inferSelect;
export type InsertSuburbPage = typeof suburbPages.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;
export type DigestPreferences = typeof digestPreferences.$inferSelect;
export type InsertDigestPreferences = typeof digestPreferences.$inferInsert;
export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;
export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = typeof referrals.$inferInsert;
export type Webhook = typeof webhooks.$inferSelect;
export type InsertWebhook = typeof webhooks.$inferInsert;
export type AppraisalLetter = typeof appraisalLetters.$inferSelect;
export type InsertAppraisalLetter = typeof appraisalLetters.$inferInsert;
export type ListingDescription = typeof listingDescriptions.$inferSelect;
export type InsertListingDescription = typeof listingDescriptions.$inferInsert;
export type EmailQueue = typeof emailQueue.$inferSelect;
export type InsertEmailQueue = typeof emailQueue.$inferInsert;
export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = typeof blogPosts.$inferInsert;
export type CrmContact = typeof crmContacts.$inferSelect;
export type InsertCrmContact = typeof crmContacts.$inferInsert;
export type EmailThread = typeof emailThreads.$inferSelect;
export type InsertEmailThread = typeof emailThreads.$inferInsert;
export type RevenueRecord = typeof revenueRecords.$inferSelect;
export type InsertRevenueRecord = typeof revenueRecords.$inferInsert;

export const seoAuditPitches = mysqlTable("seoAuditPitches", {
  id: int("id").autoincrement().primaryKey(),
  contactId: int("contactId"),
  companyName: varchar("companyName", { length: 255 }),
  websiteUrl: varchar("websiteUrl", { length: 512 }).notNull(),
  contactEmail: varchar("contactEmail", { length: 320 }),
  contactName: varchar("contactName", { length: 255 }),
  seoScore: int("seoScore"),
  seoOnPage: int("seoOnPage"),
  seoContent: int("seoContent"),
  seoTechnical: int("seoTechnical"),
  seoTrust: int("seoTrust"),
  topIssues: text("topIssues"),
  quickWins: text("quickWins"),
  qualified: int("qualified").default(0).notNull(),
  disqualifyReason: varchar("disqualifyReason", { length: 255 }),
  annualRevenue: int("annualRevenue"),
  employeeCount: int("employeeCount"),
  planName: varchar("planName", { length: 64 }),
  planPrice: int("planPrice"),
  demoHtml: text("demoHtml"),
  emailSubject: varchar("emailSubject", { length: 512 }),
  emailBodyHtml: text("emailBodyHtml"),
  emailBodyText: text("emailBodyText"),
  status: mysqlEnum("status", ["pending", "running", "qualified", "not_qualified", "email_sent", "failed"]).default("pending").notNull(),
  emailSentAt: timestamp("emailSentAt"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SeoAuditPitch = typeof seoAuditPitches.$inferSelect;
export type InsertSeoAuditPitch = typeof seoAuditPitches.$inferInsert;

// ── Digital Advertising ─────────────────────────────────────
export const adCampaigns = mysqlTable("ad_campaigns", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  agencyId: int("agencyId"),
  name: varchar("name", { length: 255 }).notNull(),
  platform: mysqlEnum("platform", ["facebook", "google", "instagram", "linkedin", "tiktok"]).notNull(),
  objective: mysqlEnum("objective", ["awareness", "traffic", "leads", "conversions", "sales"]).notNull(),
  status: mysqlEnum("status", ["draft", "active", "paused", "completed", "archived"]).default("draft").notNull(),
  // Targeting
  targetSuburbs: text("targetSuburbs"),
  targetDemographics: json("targetDemographics"),
  targetInterests: json("targetInterests"),
  targetAudience: json("targetAudience"),
  // Budget
  budgetType: mysqlEnum("budgetType", ["daily", "lifetime"]).default("daily"),
  budgetAmount: int("budgetAmount"),
  currency: varchar("currency", { length: 3 }).default("AUD"),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  // AI-generated content
  aiCopy: json("aiCopy"),
  // Performance metrics (cached from platform or manual entry)
  impressions: int("impressions").default(0),
  clicks: int("clicks").default(0),
  conversions: int("conversions").default(0),
  spend: int("spend").default(0),
  revenue: int("revenue").default(0),
  ctr: varchar("ctr", { length: 10 }),
  cpc: varchar("cpc", { length: 10 }),
  roas: varchar("roas", { length: 10 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AdCampaign = typeof adCampaigns.$inferSelect;
export type InsertAdCampaign = typeof adCampaigns.$inferInsert;

export const adCreatives = mysqlTable("ad_creatives", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  userId: int("userId").notNull(),
  platform: mysqlEnum("platform", ["facebook", "google", "instagram", "linkedin", "tiktok"]).notNull(),
  type: mysqlEnum("type", ["image", "video", "carousel", "text"]).default("text").notNull(),
  headline: varchar("headline", { length: 255 }),
  description: text("description"),
  primaryText: text("primaryText"),
  callToAction: varchar("callToAction", { length: 64 }),
  imageUrl: varchar("imageUrl", { length: 1024 }),
  landingUrl: varchar("landingUrl", { length: 1024 }),
  isSaved: boolean("isSaved").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AdCreative = typeof adCreatives.$inferSelect;
export type InsertAdCreative = typeof adCreatives.$inferInsert;

export const abTests = mysqlTable("ab_tests", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["running", "completed", "cancelled"]).default("running").notNull(),
  variantAId: int("variantAId").notNull(),
  variantBId: int("variantBId").notNull(),
  variantAMetrics: json("variantAMetrics"),
  variantBMetrics: json("variantBMetrics"),
  winner: mysqlEnum("winner", ["A", "B", "none"]),
  winnerReason: text("winnerReason"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AbTest = typeof abTests.$inferSelect;
export type InsertAbTest = typeof abTests.$inferInsert;

// ── LeadOps Platform ──────────────────────────────────────────────

export const leadOpsJobs = mysqlTable("leadops_jobs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["scrape", "outreach", "full_campaign", "optimization", "report"]).notNull(),
  plan: mysqlEnum("plan", ["local_lead_flood", "b2b_outbound", "fully_managed"]).default("local_lead_flood").notNull(),
  status: mysqlEnum("status", ["pending", "running", "completed", "failed", "cancelled"]).default("pending").notNull(),
  config: json("config"), // niche, geo, ICP, templates, schedule
  results: json("results"), // summary stats, logs, recommendations
  errorMessage: text("errorMessage"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type LeadOpsJob = typeof leadOpsJobs.$inferSelect;
export type InsertLeadOpsJob = typeof leadOpsJobs.$inferInsert;

export const scrapedLeads = mysqlTable("scraped_leads", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").notNull(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 64 }),
  website: varchar("website", { length: 1024 }),
  address: varchar("address", { length: 512 }),
  city: varchar("city", { length: 128 }),
  category: varchar("category", { length: 128 }),
  source: varchar("source", { length: 64 }).default("google_maps"),
  score: mysqlEnum("score", ["A", "B", "C", "unscored"]).default("unscored"),
  extraMeta: json("extraMeta"), // any additional fields from scraper
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ScrapedLead = typeof scrapedLeads.$inferSelect;
export type InsertScrapedLead = typeof scrapedLeads.$inferInsert;

export const outreachSequences = mysqlTable("outreach_sequences", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId"),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  segment: varchar("segment", { length: 255 }),
  platform: mysqlEnum("platform", ["email", "linkedin", "sms", "multi"]).default("email").notNull(),
  status: mysqlEnum("status", ["draft", "active", "paused", "completed"]).default("draft").notNull(),
  templateSteps: json("templateSteps"), // array of { step, subject, body, delayDays }
  stats: json("stats"), // { sent, opened, clicked, replied, bounced }
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type OutreachSequence = typeof outreachSequences.$inferSelect;
export type InsertOutreachSequence = typeof outreachSequences.$inferInsert;
