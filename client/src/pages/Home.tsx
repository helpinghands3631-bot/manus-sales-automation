import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";
import {
  KeyRound, Search, MessageSquare, Megaphone, MapPin, ArrowRight,
  Check, Zap, Shield, BarChart3, Star, ChevronDown, ChevronUp, BookOpen,
} from "lucide-react";
import { useLocation, Link } from "wouter";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import LiveChatWidget from "@/components/LiveChatWidget";

const features = [
  {
    icon: Search,
    title: "AI Website Audit",
    desc: "Uncover the hidden SEO and conversion mistakes costing you listings. Our GPT-4o powered audit analyses any real estate website in minutes and delivers a clear, actionable plan to fix them.",
  },
  {
    icon: MessageSquare,
    title: "AI Lead Coach",
    desc: "Get 24/7 strategic advice from four specialist AI modes: Ad Strategist, SEO Architect, Conversion Copywriter, and Design Advisor. Eliminate marketing overwhelm without the agency price tag.",
  },
  {
    icon: Megaphone,
    title: "Campaign Generator",
    desc: "Generate complete, high-converting ad campaigns for Facebook, Google, and email in a single click. Save dozens of hours a month and launch professional-grade marketing from day one.",
  },
  {
    icon: MapPin,
    title: "Suburb Page Builder",
    desc: "Create beautiful, SEO-optimised landing pages for your target suburbs in minutes. Dominate local search results and attract high-intent vendors actively looking for an agent in their area.",
  },
  {
    icon: BarChart3,
    title: "Audit History & Analytics",
    desc: "Track your progress with a full history of audits, scores, and recommendations over time. Export detailed CSV reports with date-range filtering for complete marketing accountability.",
  },
  {
    icon: Shield,
    title: "Admin Dashboard",
    desc: "Monitor all users, agencies, audits, campaigns, and subscription status in one place. Full oversight of your platform with real-time Telegram notifications on key events.",
  },
];

const plans = [
  {
    name: "Starter",
    price: "$297",
    period: "/mo",
    badge: null,
    tagline: "Perfect for individual agents and small agencies getting started.",
    features: [
      "AI Website Audits (5/mo)",
      "AI Lead Coach Access",
      "Campaign Generator (2/mo)",
      "Suburb Page Builder (3 pages)",
      "Audit History",
      "Email Support",
    ],
  },
  {
    name: "Growth",
    price: "$497",
    period: "/mo",
    badge: "Most Popular",
    tagline: "For growing agencies ready to scale their lead generation.",
    features: [
      "AI Website Audits (15/mo)",
      "AI Lead Coach Access",
      "Campaign Generator (10/mo)",
      "Suburb Page Builder (10 pages)",
      "Audit History",
      "Admin Dashboard",
      "Priority Support",
    ],
  },
  {
    name: "Dominator",
    price: "$997",
    period: "/mo",
    badge: "Best Value",
    tagline: "The ultimate toolkit for agencies aiming to dominate their market.",
    features: [
      "Unlimited Website Audits",
      "AI Lead Coach Access",
      "Unlimited Campaigns",
      "Unlimited Suburb Pages",
      "Audit History",
      "Admin Dashboard",
      "Priority Support",
      "Dedicated Account Manager",
    ],
  },
];

const testimonials = [
  {
    quote: "The AI audit was a huge eye-opener. We implemented the changes and saw a 50% increase in organic traffic within a month. Keys For Agents is a non-negotiable tool for us now.",
    name: "Sarah M.",
    title: "Principal",
    location: "Sydney, NSW",
    rating: 5,
  },
  {
    quote: "I'm not a marketer, I'm a real estate agent. This platform lets me focus on selling. We generated 30+ vendor leads in our first two months. It's paid for itself ten times over.",
    name: "James R.",
    title: "Director",
    location: "Melbourne, VIC",
    rating: 5,
  },
  {
    quote: "We were quoted $8,000 for a new website. The Suburb Page Builder gave us 10 high-performing landing pages for a fraction of the cost. The ROI is undeniable.",
    name: "Lisa K.",
    title: "Owner",
    location: "Brisbane, QLD",
    rating: 5,
  },
];

const faqs = [
  {
    q: "Is this only for Australian real estate agents?",
    a: "Yes. Our platform is specifically designed and trained on the Australian real estate market, using local terminology, data, and strategies that resonate with Australian vendors and buyers.",
  },
  {
    q: "Do I need to be a tech expert to use this?",
    a: "Not at all. Keys For Agents is designed to be incredibly user-friendly. If you can use Facebook, you can use our platform. The AI does all the heavy lifting for you.",
  },
  {
    q: "What kind of results can I expect?",
    a: "While results vary, our users typically report a significant increase in qualified leads within the first 60 days, along with massive time savings on their marketing tasks. Our ROAS data shows an average of 10x return on ad spend for agencies using our campaign strategies.",
  },
  {
    q: "Is there a long-term contract?",
    a: "No. All our plans are month-to-month, and you can cancel at any time. We're confident you'll want to stay once you see the results.",
  },
  {
    q: "What if I need help?",
    a: "We offer comprehensive email support to all customers. Dominator plan users receive priority support with a dedicated account manager to ensure you get the most out of the platform.",
  },
  {
    q: "How does the AI Website Audit work?",
    a: "Our audit uses GPT-4o to analyse your website's SEO structure, conversion elements, content quality, and technical performance. It then generates a detailed report with prioritised recommendations — critical issues, important improvements, and nice-to-have enhancements.",
  },
];

const stats = [
  { value: "10x", label: "Average ROAS" },
  { value: "60 days", label: "Avg. time to first results" },
  { value: "$45", label: "Avg. cost per lead" },
  { value: "500+", label: "Australian agencies" },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        className="w-full flex items-center justify-between py-5 text-left gap-4 hover:text-primary transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="font-medium text-sm md:text-base">{q}</span>
        {open ? <ChevronUp className="h-4 w-4 shrink-0 text-primary" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>
      {open && (
        <p className="text-muted-foreground text-sm pb-5 leading-relaxed">{a}</p>
      )}
    </div>
  );
}

function LeadCaptureForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const capture = trpc.leads.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Thank you! We'll send your free audit report shortly.");
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !website.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    capture.mutate({ name, email, websiteUrl: website, source: "landing_page_audit_cta" });
  };

  if (submitted) {
    return (
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-2xl font-bold mb-2">You're In!</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            We've received your details. Our AI is preparing your free website audit report. Check your inbox shortly!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardContent className="pt-8 pb-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Get Your Free Website Audit</h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Enter your details below and our AI will analyse your agency website — completely free, no credit card required.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-4">
          <Input
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            className="h-12 bg-background"
          />
          <Input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="h-12 bg-background"
          />
          <Input
            placeholder="https://youragency.com.au"
            value={website}
            onChange={e => setWebsite(e.target.value)}
            className="h-12 bg-background"
          />
          <Button type="submit" size="lg" className="w-full h-12 text-base" disabled={capture.isPending}>
            {capture.isPending ? "Analysing..." : "Get My Free Audit"} <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            No spam. No credit card. Just actionable insights for your agency.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // SEO: set keyword-rich title (30-60 chars)
    document.title = "Keys For Agents — AI Real Estate Marketing";

    // SEO: set meta description (50-160 chars)
    let descMeta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!descMeta) {
      descMeta = document.createElement("meta");
      descMeta.name = "description";
      document.head.appendChild(descMeta);
    }
    descMeta.content =
      "AI marketing co-pilot for Australian real estate agencies. Generate ad campaigns, suburb pages, and website audits with Grok AI.";

    // SEO: set meta keywords
    let kwMeta = document.querySelector('meta[name="keywords"]') as HTMLMetaElement | null;
    if (!kwMeta) {
      kwMeta = document.createElement("meta");
      kwMeta.name = "keywords";
      document.head.appendChild(kwMeta);
    }
    kwMeta.content =
      "AI real estate marketing, real estate lead generation Australia, suburb SEO pages, real estate ad campaigns, website audit real estate, Grok AI tools";

    return () => {
      // Restore default title when navigating away
      document.title = "Keys For Agents";
    };
  }, []);

  const handleCTA = () => {
    if (user) setLocation("/dashboard");
    else window.location.href = getLoginUrl();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold">Keys For Agents</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
              onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
            >
              Pricing
            </button>
            <button
              className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
              onClick={() => document.getElementById("faq")?.scrollIntoView({ behavior: "smooth" })}
            >
              FAQ
            </button>
            <Link
              href="/blog"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:flex items-center gap-1"
            >
              <BookOpen className="h-3.5 w-3.5" /> Blog
            </Link>
            <Button onClick={handleCTA} size="sm">
              {user ? "Dashboard" : "Start Free Trial"} <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
        <div className="container relative py-24 md:py-32 lg:py-40">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm">
              <Zap className="mr-1.5 h-3.5 w-3.5" /> AI-Powered Marketing for Real Estate
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-6">
              The AI Co-Pilot for Australian Agents Who Want to{" "}
              <span className="text-primary">Dominate Their Market</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-4 max-w-2xl mx-auto leading-relaxed">
              Stop guessing. Start generating high-quality vendor and buyer leads with the power of AI. Automate your marketing, save time, and watch your agency grow.
            </p>
            <p className="text-sm text-muted-foreground/70 mb-10">No lock-in contracts. Cancel anytime.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-base px-8 h-12" onClick={handleCTA}>
                Start Your 7-Day Free Trial <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-base px-8 h-12 bg-transparent"
                onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
              >
                View Pricing
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-border bg-card/50 py-10">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="text-3xl font-bold text-primary mb-1">{s.value}</div>
                <div className="text-sm text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Finally, an All-in-One Marketing Platform Built for You</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Juggling five different marketing tools is inefficient and expensive. Keys For Agents brings everything you need under one roof, powered by the most advanced AI in the industry.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <Card key={f.title} className="bg-card border-border hover:border-primary/30 transition-colors group">
                <CardHeader>
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 md:py-28 bg-card/50">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Join Top-Performing Agencies Across Australia</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Real results from real Australian agents who have transformed their lead generation with AI.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((t) => (
              <Card key={t.name} className="bg-card border-border flex flex-col">
                <CardContent className="pt-6 flex flex-col flex-1">
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <blockquote className="text-sm text-muted-foreground leading-relaxed flex-1 italic mb-6">
                    "{t.quote}"
                  </blockquote>
                  <div className="border-t border-border pt-4">
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.title} · {t.location}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 md:py-28">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Choose the Plan That's Right for Your Agency</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Simple, transparent pricing. No lock-in contracts. Cancel anytime.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <Card
                key={plan.name}
                className={`relative bg-card border-border flex flex-col ${i === 1 ? "border-primary ring-1 ring-primary/20 scale-[1.02]" : ""}`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="px-3 py-1">{plan.badge}</Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{plan.tagline}</p>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col flex-1">
                  <ul className="space-y-3 mb-6 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={i === 1 ? "default" : "outline"}
                    onClick={handleCTA}
                  >
                    Start Your Trial
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-8">
            All prices in AUD. GST may apply. 7-day free trial on all plans.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 md:py-28 bg-card/50">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Everything you need to know about Keys For Agents.
            </p>
          </div>
          <div className="max-w-3xl mx-auto bg-card border border-border rounded-xl px-6 md:px-8">
            {faqs.map((faq) => (
              <FAQItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* Free Audit CTA + Lead Capture */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <LeadCaptureForm />
          </div>
        </div>
      </section>

      {/* Live Grok Chat Widget */}
      <LiveChatWidget />

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              <span className="font-semibold">Keys For Agents</span>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              AI-powered marketing tools for Australian real estate agencies.
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <button
                className="hover:text-foreground transition-colors"
                onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
              >
                Pricing
              </button>
              <button
                className="hover:text-foreground transition-colors"
                onClick={() => document.getElementById("faq")?.scrollIntoView({ behavior: "smooth" })}
              >
                FAQ
              </button>
              <Link href="/blog" className="hover:text-foreground transition-colors">
                Blog
              </Link>
              <button className="hover:text-foreground transition-colors" onClick={handleCTA}>
                Dashboard
              </button>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-border text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Keys For Agents. All rights reserved. ABN pending.
          </div>
        </div>
      </footer>
    </div>
  );
}
