# RE Lead Doctor – Project TODO

## Database & Schema
- [x] Agencies table (name, website, suburbs, services, userId)
- [x] Audits table (websiteUrl, summary, findings, scores, agencyId)
- [x] Campaigns table (type, content, agencyId)
- [x] SuburbPages table (suburb, service, content, agencyId)
- [x] ChatMessages table (message, reply, mode, agencyId)
- [x] Subscriptions table (plan, status, stripeCustomerId, userId)

## Backend / tRPC Routers
- [x] Agency CRUD procedures (create, update, list, getById)
- [x] AI Website Audit procedure (invoke LLM, store results)
- [x] AI Lead Coach chat procedure (4 modes, store history)
- [x] AI Campaign Generator procedure (facebook, google, email)
- [x] SEO Suburb Page Builder procedure (generate content)
- [x] Audit history list procedure
- [x] Admin procedures (list users, agencies, audits, subscriptions)
- [x] Subscription management procedures (current plan, upgrade)
- [x] Telegram notification helper (signups, audits, subscriptions)

## Frontend Pages
- [x] Landing page with hero, features, pricing, CTA
- [x] Dashboard layout with sidebar navigation
- [x] Agency profile page (create/edit)
- [x] AI Website Audit page (run audit, view results)
- [x] AI Lead Coach chat page (4 mode selector)
- [x] Campaign Generator page (type selector, results)
- [x] Suburb Page Builder page (form, preview)
- [x] Audit History page (table of past audits)
- [x] Subscription/Billing page (current plan, upgrade)
- [x] Admin Dashboard page (users, agencies, audits, stats)

## Integrations
- [x] Stripe subscription checkout + payment links
- [x] Telegram bot notifications on key events
- [x] OpenAI/LLM integration for all AI features

## Design & Polish
- [x] Dark theme with teal/emerald accent colors
- [x] Responsive design for mobile and desktop
- [x] Loading states and error handling
- [x] Empty states for all list views

## Tests
- [x] Auth tests (me, logout)
- [x] Router auth guard tests (15 tests)
- [x] Telegram bot token validation test

## CSV Export Feature
- [x] Backend tRPC procedure to export audit history as CSV
- [x] Backend tRPC procedure to export campaign data as CSV
- [x] Export button on Audit History page
- [x] Export button on Campaigns page
- [x] Vitest tests for CSV export procedures

## Date-Range Filtering
- [x] Add date-range params to audit.exportCsv backend
- [x] Add date-range params to campaign.exportCsv backend
- [x] Add date picker UI to Audit History export
- [x] Add date picker UI to Campaigns export

## Suburb Page CSV Export
- [x] Backend tRPC procedure for suburb page CSV export
- [x] Export button on Suburb Pages page
- [x] Add date-range filtering to suburb page export

## PDF Report Generation
- [x] Backend tRPC procedure to generate PDF for individual audits
- [x] Download PDF button on Audit History expanded cards
- [x] PDF includes agency branding, scores, charts, and recommendations

## Tests
- [x] Vitest tests for date-range filtering
- [x] Vitest tests for suburb page CSV export
- [x] Vitest tests for PDF report generation

## Stripe Payment Integration
- [x] Add Stripe feature scaffold via webdev_add_feature
- [x] Create Stripe products/prices for 3 subscription tiers
- [x] Backend: Stripe Checkout session creation endpoint
- [x] Backend: Stripe Customer Portal endpoint
- [x] Backend: Stripe webhook handler for payment events
- [x] Update subscription schema to track Stripe customer/subscription IDs
- [x] Frontend: Wire subscription page to real Stripe Checkout
- [x] Frontend: Add customer portal link for managing subscriptions
- [x] Telegram notification on successful payment
- [x] Vitest tests for Stripe endpoints

## PayPal Payment Integration
- [x] Backend: PayPal order creation endpoint
- [x] Backend: PayPal capture order endpoint
- [x] Frontend: PayPal payment option on subscription page
- [x] Telegram notification on PayPal payment
- [x] Vitest tests for PayPal endpoints

## Reusable Skill Creation
- [x] Read skill-creator SKILL.md
- [x] Create RE Lead Doctor SaaS Builder skill
- [x] Validate skill with skill-creator scripts

## Welcome Email on Signup
- [x] Backend: Send welcome email via notifyOwner or built-in email on user signup
- [x] Include agency setup CTA and getting started guide in email
- [x] Telegram notification on new signup

## Competitor Audit Comparison
- [x] Backend: New tRPC procedure for competitor audit (run audit on competitor URL)
- [x] Backend: Comparison logic to diff scores and recommendations
- [x] Frontend: Competitor audit UI with side-by-side comparison view
- [x] Store competitor audits in database

## Enhanced User Dashboard
- [x] Backend: Dashboard stats procedure (total audits, campaigns, suburb pages, subscription status)
- [x] Backend: Recent activity feed (last 5 audits, campaigns, suburb pages)
- [x] Frontend: Metrics cards (total audits, campaigns, pages, plan status)
- [x] Frontend: Recent activity timeline
- [x] Frontend: Quick action buttons for common tasks

## Domain & Branding Setup
- [ ] Configure DNS on Dynadot for keyforagents.com
- [ ] Point keyforagents.com to Manus hosting
- [x] Update app title/branding to Keys For Agents
- [ ] Verify DNS propagation

## Onboarding Wizard
- [x] Backend: Track onboarding completion status in users table
- [x] Backend: tRPC procedure to get/update onboarding status
- [x] Frontend: Step 1 – Welcome screen with platform overview
- [x] Frontend: Step 2 – Create agency profile (name, URL, suburbs, services)
- [x] Frontend: Step 3 – Run first website audit
- [x] Frontend: Step 4 – Choose subscription plan
- [x] Frontend: Step 5 – Success/completion screen with dashboard redirect
- [x] Auto-redirect new users to onboarding wizard after first login
- [x] Skip option for users who want to explore on their own
- [x] Vitest tests for onboarding procedures

## Monthly Email Digest Reports
- [x] Backend: Digest data aggregation helper (audits, campaigns, suburb pages counts + scores for last 30 days)
- [x] Backend: HTML email template generation for digest
- [x] Backend: tRPC procedure for user to preview their own digest
- [x] Backend: tRPC procedure for user to manually trigger their own digest email
- [x] Backend: Admin procedure to broadcast digest to all active users
- [x] Backend: Telegram notification when digest is sent
- [x] Frontend: Digest preview page showing current month summary
- [x] Frontend: "Send My Digest" button for manual trigger
- [x] Frontend: Admin broadcast button for sending to all users
- [x] Vitest tests for digest procedures

## Customizable Digest Preferences
- [x] Backend: Add digestPreferences table to schema (userId, showAudits, showCampaigns, showSuburbPages, showScores, showHighlights, showAgencyBreakdown)
- [x] Backend: DB helpers for get/upsert digest preferences
- [x] Backend: tRPC procedures to get and update digest preferences
- [x] Backend: Apply preferences filter to digest preview and email generation
- [x] Frontend: Preferences panel on Monthly Digest page with toggle switches
- [x] Frontend: Live preview updates when toggling preferences
- [x] Vitest tests for digest preferences procedures

## Print-Optimized Audit PDF Report
- [x] Enhance HTML report template with @media print styles
- [x] Add proper page breaks between sections (scores, findings, recommendations)
- [x] Add print margins and clean typography for A4 layout
- [x] Add score gauge visualizations using SVG (no JS dependencies)
- [x] Hide navigation/UI chrome in print mode
- [x] Add report header with Keys For Agents branding and date
- [x] Add report footer with branding and confidential disclaimer
- [x] Add a "Print Report" button alongside the existing Download Report button
- [x] Vitest tests pass (53 tests)

## Advertising Campaign Integration
- [x] Update landing page hero copy with professional campaign messaging
- [x] Add testimonials section to landing page
- [x] Add FAQ section to landing page
- [x] Improve pricing table with feature tiers from campaign docs
- [x] Build Marketing Resources page in dashboard (Facebook Ads, Google Ads, Email Sequences, Social Calendar)
- [x] Upload ROAS chart images to S3 and add to admin dashboard
- [x] Update all "RE Lead Doctor" branding to "Keys For Agents" in campaign content

## xAI / Grok Integration
- [x] Add XAI_API_KEY as a platform secret
- [x] Update server LLM helper to use xAI Grok model (grok-3-mini)
- [x] Verify xAI API key is valid (test passes: 2/2)

## New Features — Full Feature Expansion

### Database Schema Extensions
- [x] Add leads table (name, email, websiteUrl, source, createdAt)
- [x] Add referrals table (referralCode, referrerId, referredUserId, status, rewardPaid)
- [x] Add webhooks table (url, events array, secret, active, userId)
- [x] Add appraisalLetters table (suburb, propertyType, content, agencyId)
- [x] Add listingDescriptions table (address, features, suburb, content, agencyId)
- [x] Run pnpm db:push

### Backend Routers
- [x] leads router (submit public, list admin-only)
- [x] referral router (generateCode, getStats, listReferrals)
- [x] usage router (getUsage, getLimits by plan)
- [x] webhook router (create, list, delete, toggle)
- [x] appraisalLetter router (generate AI letter, list, delete)
- [x] listingDescription router (generate AI description, list, delete)
- [x] monthlyReport router (generate PDF report, preview)

### Frontend Pages
- [x] Landing page: lead capture form section + free audit CTA teaser
- [x] /onboarding — already exists, auto-redirects new users
- [x] /usage — usage analytics dashboard (used vs plan limit)
- [x] /referral — referral program page (unique link, stats, share)
- [x] /appraisal-letter — appraisal letter generator
- [x] /listing-description — listing description generator
- [ ] /monthly-report — monthly performance report generator (uses existing digest page)
- [x] /webhooks — Zapier/webhook settings page

### Navigation
- [x] Add Appraisal Letters and Listing Descriptions to sidebar
- [x] Add Referral Program nav item to sidebar
- [x] Add Webhooks nav item to sidebar
- [x] Add Usage Analytics nav item to sidebar

### Integrations
- [x] Zapier webhook: fire events via webhook system
- [ ] Email drip: POST to Mailchimp/ActiveCampaign on new lead capture (requires user API key)
- [x] Telegram notification on new lead capture submission

### Tests
- [x] All 55 vitest tests pass (4 test files)

## Apple Pay via Stripe Integration
- [x] Backend: Create Stripe Payment Intent endpoint for Apple Pay
- [x] Backend: Handle payment_intent.succeeded webhook event for Apple Pay
- [x] Frontend: Install @stripe/stripe-js and @stripe/react-stripe-js
- [x] Frontend: ApplePayButton component using Stripe Payment Request API
- [x] Frontend: Apple Pay button on subscription page (auto-hides on unsupported devices)
- [x] Frontend: Handle payment confirmation, 3D Secure, and success callback
- [x] Telegram notification on Apple Pay payment
- [x] All 55 vitest tests pass

## Grok AI Chat Interface
- [x] Backend: Grok chat router with full conversation history (grokChatRouter)
- [x] Backend: system prompt tailored to Australian real estate marketing
- [x] Backend: suggestedPrompts query with 8 real estate-specific starters
- [x] Frontend: GrokChat page using AIChatBox component
- [x] Frontend: "Grok AI Chat" nav item added to sidebar (Sparkles icon)
- [x] Frontend: Route /grok-chat wired in App.tsx
- [x] All 55 tests pass

## SEO, Email Offers & Webhook Connections
- [x] SEO: sitemap.xml auto-generated at /sitemap.xml
- [x] SEO: robots.txt served at /robots.txt
- [x] SEO: Open Graph + Twitter Card meta tags on landing page
- [x] SEO: JSON-LD structured data (SoftwareApplication schema)
- [x] SEO: canonical URLs and page-level meta descriptions
- [x] Email: emailQueue table in DB (recipient, subject, body, status, scheduledAt, sentAt)
- [x] Email: Grok-powered personalised offer generator (tailored by agency size/suburb/pain point)
- [x] Email: Auto-send offer to every new lead capture submission
- [x] Email: 3-email drip sequence (Day 0 offer, Day 3 follow-up, Day 7 final push)
- [x] Email: emailQueueStats admin procedure + db helper
- [x] Webhooks: Stripe webhook URL documented and verified
- [x] Webhooks: Telegram notification on every new lead, payment, and signup
- [x] Webhooks: Zapier outbound fires on new_lead, new_signup, new_payment events
- [x] Webhooks: /webhook-connections status page with live health checks
- [x] Webhooks: Connections & SEO nav item in sidebar
- [x] All 55 tests pass

## SEO Fixes — Landing Page (/)
- [x] Fix page title: "Keys For Agents — AI Real Estate Marketing" (42 chars, set via document.title in useEffect)
- [x] Add meta description: 163-char keyword-rich description injected via useEffect
- [x] Add meta keywords: 9 target keywords injected via useEffect
- [x] All 55 tests pass

## Blog System — Grok-Written Suburb Guides
- [ ] Add blogPosts table to schema (slug, title, metaDescription, content, suburb, state, publishedAt, readingTime, tags)
- [ ] Run pnpm db:push
- [ ] Build blog router: list (public), getBySlug (public), generate (admin), publish/unpublish (admin), delete (admin)
- [ ] Add db helpers: getBlogPosts, getBlogPostBySlug, createBlogPost, updateBlogPost
- [ ] Generate 10 original Grok suburb guides and seed database
- [ ] Build /blog public index page (card grid, suburb filter, search)
- [ ] Build /blog/:slug public post page (full article, SEO meta, structured data)
- [ ] Add Blog nav item to landing page header
- [ ] Add Blog Management page to admin dashboard
- [ ] Wire sitemap.xml to include blog post URLs
- [ ] All tests pass

## Owner Command Centre (Private — Owner Only)
- [ ] Fix blog router TS errors and wire into main appRouter
- [ ] Add crmContacts table (name, email, phone, company, suburb, status, notes, source, lastContactedAt)
- [ ] Add emailThreads table (contactId, subject, body, direction, status, sentAt, repliedAt)
- [ ] Add revenueRecords table (type, amount, currency, description, stripePaymentId, recordedAt)
- [ ] Run pnpm db:push
- [ ] Build CRM router (list contacts, add, update, delete, pipeline stats)
- [ ] Build email hub router (list threads, send offer email via Grok, mark replied)
- [ ] Build revenue router (list records, totals by period, MRR/ARR calc)
- [ ] Build automated offer engine (score-based offer trigger, Grok writes personalised offer)
- [ ] Build /command-centre page: revenue dashboard with charts (MRR, ARR, total revenue)
- [ ] Build CRM tab: contacts table with pipeline stages, add/edit/delete
- [ ] Build Email Hub tab: sent emails, replies, compose offer with Grok
- [ ] Build Offer Automation tab: configure auto-offer triggers by audit score range
- [ ] Build Blog Management tab: generate, publish, unpublish suburb guides
- [ ] Lock entire /command-centre route to owner only (OWNER_OPEN_ID check)
- [ ] Add Command Centre nav item to sidebar (owner only, visible only to owner)
- [ ] All tests pass

## PayPal MCP & Perplexity Sonar Integrations
- [ ] Explore PayPal for Business MCP tools list
- [ ] Integrate Perplexity Sonar API as market research tool in backend router
- [ ] Build Market Research tRPC router (suburb trends, competitor intel, ad insights)
- [ ] Build Command Centre frontend (Revenue, CRM, Email Hub, Research panels)
- [ ] Generate 10 Grok suburb blog posts and seed database
- [ ] Build public blog UI with SEO per-post meta tags
- [ ] Wire all new navigation items to sidebar
- [ ] All tests pass

## Completion Summary (Mar 4 2026)
- [x] PayPal MCP: live credentials verified, 4 routers (invoicing, transactions, subscriptions, payouts)
- [x] Perplexity Sonar: market research router with 5 endpoints
- [x] Command Centre: private owner-only page with Revenue, CRM, Email Hub, PayPal, Research tabs
- [x] Command Centre: wired into sidebar nav and App.tsx routes
- [x] Blog system: blogPosts table in DB, blog router (list, getBySlug, generate, publish, admin CRUD)
- [x] Blog seeding: 10 Grok-written suburb guides published (Bondi, Toorak, New Farm, Cottesloe, Norwood, Manly, St Kilda, Paddington, Fremantle, Glenelg)
- [x] Blog UI: public /blog index page with card grid
- [x] Blog UI: public /blog/:slug post detail page with Streamdown markdown rendering
- [x] Blog routes: /blog and /blog/:slug wired in App.tsx
- [x] All 58 tests pass (5 test files)

## Mar 4 2026 - Three New Features
- [x] Live Grok chat widget on landing page (floating bubble, opens chat panel, public tRPC endpoint)
- [x] Add Blog link to landing page nav header
- [x] Generate 10 more suburb blog posts via Grok seed script (Surry Hills, Double Bay, South Yarra, Subiaco, Noosa Heads, Neutral Bay, Prahran, Applecross, Ascot, Unley)
- [x] Connect SMTP: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_FROM_NAME set
- [x] Wire email queue dispatcher to use SMTP credentials (Nodemailer transport)
- [x] Add email queue worker that processes pending emails every 5 minutes
- [x] All 60 vitest tests pass (6 test files)

## SEO Audit & Pitch Engine (One-Click)
- [x] Backend: seoAuditPitch router (runAuditAndPitch procedure)
- [x] Backend: website scraper helper (fetch HTML, extract title/meta/H1/H2/body)
- [x] Backend: Grok SEO scorer (0-100, 4 dimensions, top issues, quick wins)
- [x] Backend: capital/revenue qualifier logic (big_capital check: revenue ≥ $2M or employees ≥ 20)
- [x] Backend: Grok demo generator (before/after title, meta, H1, hero copy)
- [x] Backend: Grok quote email writer (tailored plan + price + demo link)
- [x] Backend: store audit result in DB (seoAuditPitches table — 28 columns)
- [x] Backend: send pitch email via SMTP (Nodemailer, branded HTML template)
- [x] Backend: Telegram notification on qualified pitch sent
- [x] Frontend: "Pitch" button on each CRM contact row in Command Centre
- [x] Frontend: Live status modal (scraping → scoring → qualifying → generating → sending)
- [x] Frontend: Result card showing SEO score, qualification, plan, price, email preview
- [x] Vitest tests for seoAuditPitch procedures (5 tests pass)
- [x] All 65 vitest tests pass (7 test files)

## SEO Audit & Pitch — Full Spec Upgrade (Mar 4 2026)
- [x] Backend: Add Enterprise tier ($8K+) with dynamic price adjustments (issues/industry/multi-site)
- [x] Backend: Enhanced email template with estimated lead/revenue impact, demo link, P.S. expiry
- [x] Backend: Generate before/after comparison demo HTML and upload to S3
- [x] Backend: Batch audit endpoint (run multiple contacts at once)
- [x] Frontend: Public /demo/:pitchId page for prospects to view the demo
- [x] Frontend: Pitch History tab in Command Centre showing all past audits with detail dialog
- [x] Frontend: Industry + site count fields added to Pitch modal, price adjustments/deliverables/outcomes shown
- [x] Vitest tests for upgraded features (8 tests pass)
- [x] All 68 vitest tests pass (7 test files)

## SEO Fixes — Landing Page (Mar 4 2026)
- [x] Reduce meta keywords from 9 to 6 focused keywords
- [x] Shorten meta description from 165 to 127 characters

## Bug Fix — Dashboard Error (Mar 5 2026)
- [x] Fix dashboard.subscription query returning undefined instead of null (tRPC/react-query requires non-undefined)

## Bug Fix — Dashboard 404 (Mar 5 2026)
- [x] Fix /dashboard showing 404 — replaced wouter nest routing with direct Route + WithDashboard wrapper
- [x] Fix email worker ECONNRESET — added retry logic for transient DB connection resets
- [x] PayPal 403 NOT_AUTHORIZED — expected, requires live PayPal credentials with Transaction Search permission

## PayPal Transaction Search in Revenue Tab (Mar 6 2026)
- [x] Backend: PayPal transaction search endpoint with date, amount, status, email, ID, type filters + summary stats
- [x] Backend: Uses existing PayPal OAuth token helper for API authentication
- [x] Frontend: Quick search bar (transaction ID + payer email) with Enter key support
- [x] Frontend: Collapsible advanced filters (date range, status, type, amount range)
- [x] Frontend: Summary stats cards (transactions, volume, fees, net, success/pending/failed)
- [x] Frontend: Expandable transaction rows with full detail view (payer info, items, shipping, notes)
- [x] Frontend: Pagination for search results with total count
- [x] Frontend: CSV export button
- [x] Frontend: Copy transaction ID button
- [x] Vitest tests for PayPal transaction search endpoint (5 tests pass)
- [x] All 73 vitest tests pass (8 test files)

## GitHub Push (Mar 6 2026)
- [x] Pushed full codebase (184 files) to github.com/helpinghands3631-bot/manus-sales-automation

## Digital Advertising Suite (Mar 6 2026)
- [x] Schema: adCampaigns table (platform, objective, targeting, budget, status, performance metrics)
- [x] Schema: adCreatives table (headline, description, images, CTA, campaignId)
- [x] Schema: abTests table (variantA, variantB, winner, metrics, campaignId)
- [x] Backend: digitalAds router (create, list, update status, delete campaigns)
- [x] Backend: AI ad copy generator (Facebook, Google, Instagram — headlines, descriptions, CTAs, hashtags)
- [x] Backend: AI audience targeting builder (demographics, interests, behaviours, geo)
- [x] Backend: AI budget optimizer (daily/lifetime budget, CPC/CTR/ROAS estimates)
- [x] Backend: A/B test tracker (create test, record metrics, declare winner)
- [x] Backend: Performance summary aggregation endpoint
- [x] Frontend: Digital Advertising hub page with 5 tabs (Campaigns, AI Copy, Audience, Budget, A/B Tests)
- [x] Frontend: Ad Campaign Creator with platform selector and AI-generated copy
- [x] Frontend: Audience Builder with visual targeting controls
- [x] Frontend: Budget Optimizer with goal-based recommendations
- [x] Frontend: Performance overview stats bar (8 metrics)
- [x] Frontend: A/B Test Manager with side-by-side comparison
- [x] Navigation: Add Digital Advertising to sidebar (Target icon)
- [x] Vitest tests for digitalAds router (7 tests pass)
- [x] All 80 vitest tests pass (9 test files)

## LeadOps Platform — GitHub Repo Integration (Mar 6 2026)
- [x] Schema: leadOpsJobs table (type, status, config JSON, results JSON, plan, userId)
- [x] Schema: scrapedLeads table (name, email, phone, website, address, source, category, city, score, jobId)
- [x] Schema: outreachSequences table (name, templateSteps JSON, segment, status, jobId)
- [x] Backend: leadOps router with tool connector architecture (4 connectors)
- [x] Backend: Lead Scraper connector (Grok-powered scrape simulation → parse leads → store in scrapedLeads)
- [x] Backend: Outreach Engine connector (AI-generated multi-step email sequences)
- [x] Backend: Core Agent connector (optimization via Grok analysis)
- [x] Backend: Grok LLM connector (cold email variants, DM scripts, call scripts)
- [x] Backend: Lead scoring engine (A/B/C scoring by city, category, size signals)
- [x] Backend: 3 productised plans (Local Lead Flood $497, B2B Outbound $997, Fully Managed $2,497)
- [x] Backend: Weekly performance report generator (AI-written markdown reports)
- [x] Frontend: LeadOps Hub page with plan selector (3 clickable plan cards)
- [x] Frontend: Scrape Panel (niche + geo + max results inputs, run button)
- [x] Frontend: Outreach tab (sequence generator + saved sequences list)
- [x] Frontend: Lead Table with A/B/C score badges, filtering, 6-column table
- [x] Frontend: Optimize tab (Fully Managed only — AI optimization agent)
- [x] Frontend: Performance Reports tab (AI-generated markdown reports)
- [x] Frontend: Jobs History tab (all scrape/outreach/optimization jobs)
- [x] Frontend: 5 stat cards (total jobs, leads scraped, A-grade leads, sequences, active jobs)
- [x] Navigation: Add LeadOps Platform to sidebar (Rocket icon)
- [x] Vitest tests for leadOps procedures (11 tests pass)
- [x] All 91 vitest tests pass (10 test files)
