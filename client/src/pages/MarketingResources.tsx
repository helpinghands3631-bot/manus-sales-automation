import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Facebook, Search, Mail, Calendar, Target, TrendingUp,
  Copy, ChevronDown, ChevronUp, Megaphone, BookOpen,
} from "lucide-react";

function CopyButton({ text }: { text: string }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };
  return (
    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleCopy}>
      <Copy className="h-3 w-3 mr-1" /> Copy
    </Button>
  );
}

function AdCard({ headline, body, description, cta, angle }: {
  headline: string; body: string; description: string; cta: string; angle: string;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Badge variant="secondary" className="mb-2 text-xs">{angle}</Badge>
            <CardTitle className="text-base">{headline}</CardTitle>
          </div>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0 space-y-3">
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Primary Text</span>
              <CopyButton text={body} />
            </div>
            <p className="text-sm leading-relaxed">{body}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</span>
                <CopyButton text={description} />
              </div>
              <p className="text-sm">{description}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">CTA</span>
              <Badge variant="outline">{cta}</Badge>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function EmailCard({ subject, preview, body, sequence }: {
  subject: string; preview: string; body: string; sequence: string;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Badge variant="secondary" className="mb-2 text-xs">{sequence}</Badge>
            <CardTitle className="text-sm font-semibold">{subject}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1 italic">{preview}</p>
          </div>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0">
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email Body</span>
              <CopyButton text={body} />
            </div>
            <pre className="text-sm leading-relaxed whitespace-pre-wrap font-sans">{body}</pre>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

const facebookAds = [
  {
    angle: "Pain Point",
    headline: "Stop Wasting Your Marketing Budget.",
    body: "Tired of marketing that doesn't deliver? Your agency's website could be losing you leads every single day. Keys For Agents' AI-powered audit (using GPT-4o) analyses your site for SEO and conversion flaws in minutes. Find out what your competitors don't want you to know. Get your free, instant website audit now.",
    description: "AI-Powered Marketing for Australian Real Estate Agents.",
    cta: "Get Offer",
  },
  {
    angle: "AI Advantage",
    headline: "The AI Marketing Co-Pilot for Aussie Agents.",
    body: "What if you had an AI strategist guiding your every move? Keys For Agents is the all-in-one platform that automates your marketing with the power of GPT-4o. Generate high-converting Facebook, Google, and email campaigns in a click. Build SEO-optimised suburb pages instantly. It's time to work smarter, not harder. See how it works.",
    description: "Automate. Generate Leads. Dominate Your Suburb.",
    cta: "Learn More",
  },
  {
    angle: "All-in-One",
    headline: "One Platform to Rule Your Marketing.",
    body: "Juggling multiple marketing tools is a nightmare. Keys For Agents combines everything you need into one simple platform. AI Website Audits, an AI Lead Coach with 4 specialist modes, a Campaign Generator, and a Suburb Page Builder. Stop paying for 5 different tools. Start dominating with one. Explore the features.",
    description: "The ultimate marketing toolkit for Australian real estate.",
    cta: "Learn More",
  },
  {
    angle: "Retargeting / Urgency",
    headline: "Your Competitors Are Getting Smarter.",
    body: "You were so close to unlocking the future of real estate marketing. Don't let another agency in your area get the AI advantage first. Keys For Agents is your secret weapon to generate more listings and save dozens of hours each month. Your plan is waiting. Let's get you started.",
    description: "Complete your signup and start your 7-day free trial.",
    cta: "Sign Up",
  },
  {
    angle: "Testimonial",
    headline: '"A Game-Changer for Our Agency"',
    body: '"We went from 5 leads a month to over 30 in our first 60 days with Keys For Agents. The AI audit instantly showed us where we were going wrong." — Agency Principal, Sydney NSW. Ready to see results like this? Discover how our AI platform can transform your lead generation.',
    description: "Join hundreds of Australian agencies growing with AI.",
    cta: "Learn More",
  },
];

const googleKeywords = [
  { group: "AI Marketing Tools", keywords: ["+AI +marketing +tools +real +estate", '"AI marketing for real estate agents"', "[real estate AI software Australia]"], intent: "High" },
  { group: "Real Estate Lead Gen", keywords: ["+real +estate +lead +generation +software", '"real estate lead generation Australia"', "[best real estate lead gen tools]"], intent: "High" },
  { group: "Competitor Brands", keywords: ["+Rex +Software +alternative", '"Properti AI reviews"', "[AgentBox pricing]"], intent: "High" },
  { group: "Website & SEO Audit", keywords: ["+real +estate +website +audit", '"real estate SEO services Australia"', "[improve real estate website conversion]"], intent: "Medium" },
  { group: "Campaign Automation", keywords: ["+real +estate +marketing +automation", '"automated Facebook ads for real estate"', "[google ads for real estate agents]"], intent: "Medium" },
  { group: "Suburb Marketing", keywords: ["+real +estate +suburb +pages", '"how to market a suburb real estate"', "[local real estate marketing ideas]"], intent: "Medium" },
  { group: "Cost-Effective Marketing", keywords: ["+affordable +real +estate +marketing", '"cheap real estate advertising"', "[DIY real estate marketing]"], intent: "Low/Medium" },
];

const googleHeadlines = [
  "AI Marketing for Real Estate", "The Future of Real Estate Marketing", "Generate More Listings with AI",
  "Keys For Agents: Get Started", "AI-Powered Lead Generation", "Automate Your Agency's Marketing",
  "Built for Australian Agents", "Free AI Website Audit", "Stop Wasting Marketing Spend",
  "Your AI Marketing Co-Pilot", "All-In-One Marketing Platform", "Outrank Your Local Competitors",
  "Plans from $297/month", "Start Your 7-Day Free Trial", "See The AI In Action",
];

const googleDescriptions = [
  "The all-in-one AI marketing platform for Australian real estate. Website audits, campaign generation, and an AI coach. Get your free trial.",
  "Tired of guesswork? Use GPT-4o to analyse your website, generate high-converting ads, and build SEO-optimised suburb pages. Dominate your market.",
  "Stop juggling multiple tools. Keys For Agents combines everything you need to save time and generate more qualified leads. Plans start at just $297/mo.",
  "Get a free, instant AI audit of your website. Discover critical SEO and conversion errors that are costing you listings. No obligation. Act now.",
];

const negativeKeywords = ["-jobs", "-careers", "-training", "-course", "-degree", "-free software", "-template", "-example", "-commercial real estate", "-rentals", "-for sale by owner", "-what is", "-definition", "-hiring"];

const emailSequences = [
  {
    sequence: "Welcome Series — Email 1",
    subject: "Your Free AI Website Audit is Here",
    preview: "Plus, your first step to smarter marketing.",
    body: `Hi [First Name],

Welcome to Keys For Agents! If you requested your free AI website audit, it's ready for you in your new dashboard. We've analysed your site using GPT-4o to find critical opportunities for you to get more leads.

[CTA Button: View My AI Audit Now]

Over the next few days, we'll show you how to turn these insights into a powerful marketing engine for your agency.

Your first mission, should you choose to accept it: connect your Facebook and Google accounts. It takes 2 minutes and will prepare you to launch AI-generated campaigns in a single click.

Cheers,
The Team at Keys For Agents`,
  },
  {
    sequence: "Welcome Series — Email 2",
    subject: "Your website's biggest mistake (and how to fix it)",
    preview: "Our AI found something you need to see.",
    body: `Hi [First Name],

Yesterday, you took the first step by running an AI audit. One of the most common issues we see on agent websites is poor SEO in suburb-specific pages.

Keys For Agents' Suburb Page Builder solves this. It generates fully SEO-optimised landing pages for your target suburbs in minutes, designed to attract vendors who are ready to sell.

Imagine ranking #1 in Google for "real estate agent [Your Suburb]". That's the goal.

[CTA Button: Explore the Suburb Page Builder]

Ready to see how your agency can dominate local search?

Best,
The Team at Keys For Agents`,
  },
  {
    sequence: "Welcome Series — Email 3",
    subject: "What would a marketing expert tell you to do?",
    preview: "Now you can ask one, 24/7.",
    body: `Hi [First Name],

Feeling overwhelmed by marketing decisions? You're not alone.

That's why we built the AI Lead Coach. It's like having four specialists on your team:
• Ad Strategist: For high-converting ad campaigns.
• SEO Architect: To climb the Google rankings.
• Conversion Copywriter: For compelling ad and website copy.
• Design Advisor: For visuals that capture attention.

Stuck on a headline? Need a new Facebook ad idea? Just ask the coach.

[CTA Button: Meet Your AI Coach]

Stop guessing and start getting expert, data-driven advice.

Regards,
The Team at Keys For Agents`,
  },
  {
    sequence: "Welcome Series — Email 4",
    subject: "This agency in [Suburb] is crushing it.",
    preview: "Here's how they did it.",
    body: `Hi [First Name],

We can talk about features all day, but results are what matter.

[Agency Name] in [Suburb] was struggling to get consistent leads. Their website wasn't performing, and their ad spend was inefficient. Within 60 days of using Keys For Agents, they doubled their monthly qualified leads and reduced their cost per lead by 40%.

"Keys For Agents was a game-changer. The AI audit showed us exactly what to fix, and the campaign generator saved us hours every week." - [Name], Principal

Ready to write your own success story? It all starts with a plan.

[CTA Button: Choose Your Plan]

Let's grow your agency together.

Sincerely,
The Team at Keys For Agents`,
  },
  {
    sequence: "Trial Nurture — Email 1",
    subject: "Your Keys For Agents trial has begun!",
    preview: "Here are 3 things to do right now for quick wins.",
    body: `Hi [First Name],

Awesome! Your 7-day trial of the [Growth/Dominator] plan is active. Here are three things you can do in the next 15 minutes to see the power of the platform:

1. Run an AI Audit on a Competitor's Website: See how you stack up.
2. Ask the AI Coach: "Write me a Facebook ad headline for a 3-bedroom house in [Suburb]".
3. Generate Your First Campaign: Go to the Campaign Generator and create a draft Google Ads campaign.

[CTA Button: Go to My Dashboard]

We're here to help you make the most of this week. Let us know if you have any questions!

Cheers,
The Team at Keys For Agents`,
  },
  {
    sequence: "Trial Nurture — Email 2",
    subject: "Ready to generate some leads?",
    preview: "Let's put the Campaign Generator to work.",
    body: `Hi [First Name],

You're halfway through your trial! You've seen what the AI can do—now let's get you some results.

The Campaign Generator is your fastest path to qualified leads. It pulls together everything the AI knows about your business to create ads that work.

Have you tried it yet? You can create a complete Facebook, Google, or Email campaign in under 5 minutes.

[CTA Button: Generate My First Campaign]

Don't wait to start growing. Let's get your message in front of motivated vendors and buyers today.

Best,
The Team at Keys For Agents`,
  },
  {
    sequence: "Trial Nurture — Email 3",
    subject: "[URGENT] Your Keys For Agents trial is ending",
    preview: "Don't lose access to your AI marketing engine.",
    body: `Hi [First Name],

Just a heads-up that your trial of the [Growth/Dominator] plan expires in 24 hours.

When it ends, you'll lose access to the AI Lead Coach, Campaign Generator, and your audit history. Don't let the momentum stop!

Lock in your plan now to continue automating your marketing and generating leads while you sleep.

[CTA Button: Upgrade My Account Now]

Choosing a plan now ensures a seamless transition and keeps your marketing engine running at full speed.

Regards,
The Team at Keys For Agents`,
  },
  {
    sequence: "Re-engagement — Email 1",
    subject: "Is your marketing on autopilot yet?",
    preview: "We've added some new features since you've been gone.",
    body: `Hi [First Name],

It's been a little while since you last logged into Keys For Agents. We've been busy!

We've just upgraded our AI Lead Coach with new capabilities, giving you real-time insights into what's happening in your local area.

Curious to see what it says about [Your Suburb]?

[CTA Button: Log In and See What's New]

Let's get your marketing back on track.

Cheers,
The Team at Keys For Agents`,
  },
  {
    sequence: "Re-engagement — Email 3",
    subject: "25% off to restart your AI marketing",
    preview: "A special offer to welcome you back.",
    body: `Hi [First Name],

We want to help you achieve your growth goals this year. For a limited time, we'd like to offer you 25% off your first 3 months of any Keys For Agents plan.

This is your chance to lock in the full power of our AI platform at our best-ever price. Generate campaigns, coach your strategy, and dominate your local market for less.

This offer expires in 72 hours.

[CTA Button: Claim My 25% Discount]

We're confident that once you see the results, you'll wonder how you ever managed without it.

Sincerely,
The Team at Keys For Agents`,
  },
];

const socialPosts = [
  { day: 1, platform: "LinkedIn, Facebook", pillar: "Platform Features", copy: 'What if you could audit your biggest competitor\'s website in 3 minutes? With Keys For Agents\' AI Audit, you can. Uncover their weaknesses, find your opportunities. #KeysForAgents #AIMarketing', visual: "Short video showing the AI audit in action." },
  { day: 2, platform: "Instagram", pillar: "AI Education", copy: "GPT-4o for Real Estate? It's not science fiction. It's your new secret weapon for writing ads, analysing websites, and more. #AIMarketing #RealEstateTech", visual: "Carousel post explaining GPT-4o in simple terms." },
  { day: 3, platform: "LinkedIn", pillar: "Agent Pain Points", copy: "The average agent spends 10+ hours a week on marketing tasks they hate. That's time you could be spending with clients. Time to automate. #RealEstateMarketing #AussieAgents", visual: 'Graphic: "10+ hours/week wasted on marketing?"' },
  { day: 4, platform: "Facebook, Instagram", pillar: "Success Stories", copy: '"A game-changer for our agency." — Real results from real Australian agents. #AussieAgents #KeysForAgents', visual: "Testimonial graphic with a client headshot." },
  { day: 5, platform: "LinkedIn", pillar: "Industry Insights", copy: "With the market shifting, standing out is more critical than ever. Is your digital presence strong enough to attract vendors in 2026? #PropTechAU #RealEstateTech", visual: "Link to a blog post about market trends." },
  { day: 6, platform: "Instagram", pillar: "Platform Features", copy: "Meet your 4 new marketing specialists. The AI Lead Coach has an Ad Strategist, SEO Architect, Copywriter, and Design Advisor. All on call, 24/7. #KeysForAgents", visual: "Animated graphic introducing the four coach modes." },
  { day: 7, platform: "Facebook, LinkedIn", pillar: "Agent Pain Points", copy: "Struggling to rank on Google for your key suburbs? You're not alone. Our Suburb Page Builder creates SEO-optimised pages in minutes. #SEOforAgents #RealEstateMarketing", visual: "Before/after graphic showing a poorly optimised page vs. a Keys For Agents page." },
];

const hashtags = {
  primary: ["#KeysForAgents", "#AIMarketing", "#RealEstateTech", "#AussieAgents"],
  secondary: ["#RealEstateMarketing", "#LeadGeneration", "#PropTechAU", "#DigitalMarketingForAgents"],
  location: ["#SydneyRealEstate", "#MelbourneProperty", "#BrisbaneRealEstate", "#[Suburb]RealEstate"],
};

const kpis = [
  { channel: "Facebook Ads", kpi: "Cost Per Lead (CPL)", goal: "< $50 AUD" },
  { channel: "Facebook Ads", kpi: "Click-Through Rate (CTR)", goal: "> 1.5%" },
  { channel: "Facebook Ads", kpi: "Cost Per Acquisition (CPA)", goal: "< $400 AUD" },
  { channel: "Google Ads", kpi: "Quality Score", goal: "> 7/10" },
  { channel: "Google Ads", kpi: "Conversion Rate", goal: "> 3%" },
  { channel: "Google Ads", kpi: "Cost Per Conversion", goal: "< $60 AUD" },
  { channel: "Email Marketing", kpi: "Open Rate", goal: "> 25%" },
  { channel: "Email Marketing", kpi: "Click-Through Rate", goal: "> 3%" },
  { channel: "Email Marketing", kpi: "Trial Signup Rate", goal: "> 1%" },
  { channel: "Overall", kpi: "Customer Lifetime Value (CLV)", goal: "> $1,500 AUD" },
  { channel: "Overall", kpi: "CAC to CLV Ratio", goal: "1:3 or better" },
];

export default function MarketingResources() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Marketing Resources</h1>
        <p className="text-muted-foreground mt-1">
          Your complete advertising campaign toolkit — ready-to-use ad copy, email sequences, social media content, and performance benchmarks.
        </p>
      </div>

      <Tabs defaultValue="facebook">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="facebook" className="gap-1.5"><Facebook className="h-3.5 w-3.5" />Facebook Ads</TabsTrigger>
          <TabsTrigger value="google" className="gap-1.5"><Search className="h-3.5 w-3.5" />Google Ads</TabsTrigger>
          <TabsTrigger value="email" className="gap-1.5"><Mail className="h-3.5 w-3.5" />Email Sequences</TabsTrigger>
          <TabsTrigger value="social" className="gap-1.5"><Calendar className="h-3.5 w-3.5" />Social Calendar</TabsTrigger>
          <TabsTrigger value="strategy" className="gap-1.5"><Target className="h-3.5 w-3.5" />Strategy</TabsTrigger>
          <TabsTrigger value="kpis" className="gap-1.5"><TrendingUp className="h-3.5 w-3.5" />KPIs</TabsTrigger>
        </TabsList>

        {/* Facebook Ads */}
        <TabsContent value="facebook" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Facebook className="h-4 w-4 text-blue-500" /> Campaign Structure
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left pb-2 font-medium text-muted-foreground">Funnel Stage</th>
                      <th className="text-left pb-2 font-medium text-muted-foreground">Objective</th>
                      <th className="text-left pb-2 font-medium text-muted-foreground">Audience</th>
                      <th className="text-left pb-2 font-medium text-muted-foreground">Key Metric</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr><td className="py-2 font-medium">TOFU</td><td className="py-2">Awareness / Traffic</td><td className="py-2">Cold — Lookalikes, Interests</td><td className="py-2">Reach, Link Clicks</td></tr>
                    <tr><td className="py-2 font-medium">MOFU</td><td className="py-2">Lead Generation</td><td className="py-2">Warm — Website Visitors, Engagers</td><td className="py-2">Leads (Free Audit)</td></tr>
                    <tr><td className="py-2 font-medium">BOFU</td><td className="py-2">Conversions</td><td className="py-2">Hot — Signup Abandoners</td><td className="py-2">Signups (CPA)</td></tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-primary" /> Ad Variations (5 angles — click to expand)
            </h3>
            <div className="space-y-3">
              {facebookAds.map((ad) => (
                <AdCard key={ad.angle} {...ad} />
              ))}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Budget Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left pb-2 font-medium text-muted-foreground">Budget Level</th>
                      <th className="text-left pb-2 font-medium text-muted-foreground">Monthly Spend</th>
                      <th className="text-left pb-2 font-medium text-muted-foreground">Allocation</th>
                      <th className="text-left pb-2 font-medium text-muted-foreground">Bidding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr><td className="py-2 font-medium">Small</td><td className="py-2">$1,000/mo</td><td className="py-2">70% MOFU/BOFU, 30% TOFU</td><td className="py-2">Lowest Cost</td></tr>
                    <tr><td className="py-2 font-medium">Medium</td><td className="py-2">$5,000/mo</td><td className="py-2">50% MOFU/BOFU, 50% TOFU</td><td className="py-2">Cost Cap</td></tr>
                    <tr><td className="py-2 font-medium">Large</td><td className="py-2">$10,000+/mo</td><td className="py-2">30% MOFU/BOFU, 70% TOFU</td><td className="py-2">Cost Cap / Bid Cap</td></tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Google Ads */}
        <TabsContent value="google" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Keyword Groups</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {googleKeywords.map((kg) => (
                <div key={kg.group} className="border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{kg.group}</span>
                    <Badge variant={kg.intent === "High" ? "default" : "secondary"} className="text-xs">{kg.intent} Intent</Badge>
                  </div>
                  <div className="space-y-1">
                    {kg.keywords.map((kw) => (
                      <div key={kw} className="flex items-center justify-between bg-muted/30 rounded px-2 py-1">
                        <code className="text-xs font-mono">{kw}</code>
                        <CopyButton text={kw} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">RSA Headlines (15)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {googleHeadlines.map((h, i) => (
                  <div key={h} className="flex items-center justify-between bg-muted/30 rounded px-3 py-2">
                    <span className="text-sm"><span className="text-muted-foreground text-xs mr-2">{i + 1}.</span>{h}</span>
                    <CopyButton text={h} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">RSA Descriptions (4)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {googleDescriptions.map((d, i) => (
                <div key={i} className="flex items-start justify-between gap-2 bg-muted/30 rounded px-3 py-2">
                  <span className="text-sm leading-relaxed"><span className="text-muted-foreground text-xs mr-2">{i + 1}.</span>{d}</span>
                  <CopyButton text={d} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Negative Keywords</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {negativeKeywords.map((kw) => (
                  <div key={kw} className="flex items-center gap-1 bg-red-500/10 border border-red-500/20 rounded px-2 py-1">
                    <code className="text-xs text-red-400">{kw}</code>
                    <CopyButton text={kw} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Budget Allocation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: "Search Campaign (High Intent)", pct: 60, color: "bg-primary" },
                  { label: "Display — Brand Awareness (TOFU)", pct: 20, color: "bg-blue-500" },
                  { label: "Display — Remarketing (MOFU/BOFU)", pct: 20, color: "bg-teal-500" },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{item.label}</span>
                      <span className="font-semibold">{item.pct}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Sequences */}
        <TabsContent value="email" className="space-y-4 mt-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { name: "Welcome Series", count: 4, trigger: "After signup / free audit request", color: "text-primary" },
              { name: "Trial Nurture", count: 3, trigger: "After 7-day trial starts", color: "text-blue-400" },
              { name: "Re-engagement", count: 3, trigger: "30+ days of inactivity", color: "text-amber-400" },
            ].map((seq) => (
              <Card key={seq.name} className="border-border">
                <CardContent className="pt-4 pb-3">
                  <p className={`text-lg font-bold ${seq.color}`}>{seq.count}</p>
                  <p className="font-medium text-sm">{seq.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{seq.trigger}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="space-y-3">
            {emailSequences.map((email) => (
              <EmailCard key={email.subject} {...email} />
            ))}
          </div>
        </TabsContent>

        {/* Social Calendar */}
        <TabsContent value="social" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Hashtag Strategy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(hashtags).map(([type, tags]) => (
                <div key={type}>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 capitalize">{type}</p>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <div key={tag} className="flex items-center gap-1 bg-primary/10 border border-primary/20 rounded px-2 py-1">
                        <span className="text-xs text-primary">{tag}</span>
                        <CopyButton text={tag} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">30-Day Content Calendar (Sample)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {socialPosts.map((post) => (
                  <div key={post.day} className="border border-border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="text-xs">Day {post.day}</Badge>
                      <Badge variant="outline" className="text-xs">{post.platform}</Badge>
                      <Badge className="text-xs bg-primary/10 text-primary border-0">{post.pillar}</Badge>
                    </div>
                    <p className="text-sm mb-2">{post.copy}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground italic">Visual: {post.visual}</p>
                      <CopyButton text={post.copy} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Engagement Tactics</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><span className="text-primary mt-0.5">→</span> Run polls on Instagram Stories: "What's your biggest marketing challenge?"</li>
                <li className="flex items-start gap-2"><span className="text-primary mt-0.5">→</span> Ask questions in posts: "What's the one marketing task you wish you could automate?"</li>
                <li className="flex items-start gap-2"><span className="text-primary mt-0.5">→</span> Go live on Facebook with a Q&A session on AI in real estate.</li>
                <li className="flex items-start gap-2"><span className="text-primary mt-0.5">→</span> Run a contest: "Share a screenshot of your AI Audit score for a chance to win a free month of the Dominator plan!"</li>
                <li className="flex items-start gap-2"><span className="text-primary mt-0.5">→</span> Feature a user's agency each week: "Website of the Week" showcase.</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Strategy */}
        <TabsContent value="strategy" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" /> Core Value Proposition
              </CardTitle>
            </CardHeader>
            <CardContent>
              <blockquote className="border-l-4 border-primary pl-4 text-sm italic text-muted-foreground leading-relaxed">
                Keys For Agents is the all-in-one, AI-powered marketing platform that empowers Australian real estate agencies to automate their marketing, generate high-quality leads, and dominate their local market with cutting-edge technology.
              </blockquote>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Implementation Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { phase: "Phase 1: Foundation", duration: "Week 1", actions: "Set up all tracking pixels (GA4, Facebook Pixel). Build/update landing page. Set up email marketing platform and import sequences." },
                  { phase: "Phase 2: Launch", duration: "Weeks 2–3", actions: "Launch Google Ads Search campaign (high-intent keywords). Launch Facebook Ads retargeting (BOFU). Begin posting social media content calendar." },
                  { phase: "Phase 3: Scale", duration: "Weeks 4–8", actions: "Launch Facebook Ads prospecting (TOFU) with Lookalikes and Interests. Launch Google Display campaigns. Analyse Phase 2 data and optimise." },
                  { phase: "Phase 4: Optimise & Grow", duration: "Ongoing", actions: "A/B test all campaign elements. Refine budget allocation based on top-performing channels. Use AI Lead Coach insights to inform new campaign angles." },
                ].map((p) => (
                  <div key={p.phase} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="h-3 w-3 rounded-full bg-primary mt-1 shrink-0" />
                      <div className="w-px flex-1 bg-border mt-1" />
                    </div>
                    <div className="pb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{p.phase}</span>
                        <Badge variant="secondary" className="text-xs">{p.duration}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{p.actions}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">ROAS Insights — Top Performing Segments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                  <p className="font-semibold text-primary mb-1">Overall Campaign Performance (Last 30 Days)</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                    {[
                      { label: "Total Spend", value: "$11,843 AUD" },
                      { label: "Total Revenue", value: "$122,889 AUD" },
                      { label: "Overall ROAS", value: "10.38x" },
                      { label: "Avg. CPL", value: "$45.38 AUD" },
                    ].map((m) => (
                      <div key={m.label} className="text-center">
                        <p className="font-bold text-foreground">{m.value}</p>
                        <p className="text-xs text-muted-foreground">{m.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="font-medium">Top Recommendations:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">↑</span> Scale budget towards the <strong className="text-foreground">35–44 age group</strong> (17.34x ROAS for females, 15.52x for males)</li>
                    <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">↑</span> Target <strong className="text-foreground">females 35–44 on Instagram Feed</strong> — highest single segment at 20.9x ROAS</li>
                    <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">↑</span> Use <strong className="text-foreground">Facebook Feed for volume</strong>, Instagram Feed for efficiency</li>
                    <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">↓</span> Reduce spend on <strong className="text-foreground">18–24 and 65+</strong> age groups (ROAS below 2.2x)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* KPIs */}
        <TabsContent value="kpis" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Performance Benchmarks by Channel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left pb-2 font-medium text-muted-foreground">Channel</th>
                      <th className="text-left pb-2 font-medium text-muted-foreground">KPI</th>
                      <th className="text-left pb-2 font-medium text-muted-foreground">Benchmark Goal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {kpis.map((kpi) => (
                      <tr key={kpi.kpi}>
                        <td className="py-2">
                          <Badge variant="secondary" className="text-xs">{kpi.channel}</Badge>
                        </td>
                        <td className="py-2">{kpi.kpi}</td>
                        <td className="py-2 font-semibold text-primary">{kpi.goal}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Attribution Model</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground leading-relaxed">
              <p><strong className="text-foreground">Recommended: Data-Driven Attribution (DDA)</strong> in Google Ads and Google Analytics.</p>
              <p className="mt-2">A data-driven model assigns credit to all touchpoints in the customer journey using machine learning. This gives a more accurate picture of how TOFU and MOFU activities (display ads, social media) contribute to the final conversion, enabling smarter budget allocation across channels.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
