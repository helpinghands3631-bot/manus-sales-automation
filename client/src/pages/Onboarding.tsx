import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  KeyRound,
  Building2,
  Globe,
  Search,
  CreditCard,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  SkipForward,
  Sparkles,
  Target,
  FileText,
  MessageSquare,
  BarChart3,
} from "lucide-react";

const STEPS = [
  { id: 0, title: "Welcome", icon: KeyRound },
  { id: 1, title: "Agency Setup", icon: Building2 },
  { id: 2, title: "First Audit", icon: Search },
  { id: 3, title: "Choose Plan", icon: CreditCard },
  { id: 4, title: "Complete", icon: CheckCircle2 },
];

export default function Onboarding() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);

  // Agency form state
  const [agencyName, setAgencyName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [suburbs, setSuburbs] = useState("");
  const [services, setServices] = useState("");
  const [phone, setPhone] = useState("");
  const [createdAgencyId, setCreatedAgencyId] = useState<number | null>(null);

  // Audit state
  const [auditUrl, setAuditUrl] = useState("");
  const [auditComplete, setAuditComplete] = useState(false);

  const onboardingStatus = trpc.onboarding.status.useQuery(undefined, { enabled: !!user });
  const updateStep = trpc.onboarding.updateStep.useMutation();
  const completeOnboarding = trpc.onboarding.complete.useMutation();
  const skipOnboarding = trpc.onboarding.skip.useMutation();
  const createAgency = trpc.agency.create.useMutation();
  const runAudit = trpc.audit.run.useMutation();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (onboardingStatus.data) {
      if (onboardingStatus.data.onboardingComplete === 1) {
        navigate("/dashboard");
      } else if (onboardingStatus.data.onboardingStep > 0) {
        setStep(onboardingStatus.data.onboardingStep);
      }
    }
  }, [onboardingStatus.data, navigate]);

  const goToStep = (newStep: number) => {
    setStep(newStep);
    updateStep.mutate({ step: newStep });
  };

  const handleSkip = async () => {
    await skipOnboarding.mutateAsync();
    toast.success("Onboarding skipped — you can always set things up later from the dashboard.");
    navigate("/dashboard");
  };

  const handleCreateAgency = async () => {
    if (!agencyName.trim()) {
      toast.error("Please enter your agency name");
      return;
    }
    try {
      const agency = await createAgency.mutateAsync({
        name: agencyName.trim(),
        websiteUrl: websiteUrl.trim() || undefined,
        primarySuburbs: suburbs.trim() || undefined,
        services: services.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      if (agency) {
        setCreatedAgencyId(agency.id);
        if (websiteUrl.trim()) setAuditUrl(websiteUrl.trim());
        toast.success("Agency created successfully!");
        goToStep(2);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create agency");
    }
  };

  const handleRunAudit = async () => {
    if (!auditUrl.trim() || !createdAgencyId) {
      toast.error("Please enter a website URL to audit");
      return;
    }
    try {
      await runAudit.mutateAsync({ agencyId: createdAgencyId, websiteUrl: auditUrl.trim() });
      setAuditComplete(true);
      toast.success("Audit complete! Check your results in the dashboard.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Audit failed");
    }
  };

  const handleComplete = async () => {
    await completeOnboarding.mutateAsync();
    toast.success("You're all set! Welcome to Keys For Agents.");
    navigate("/dashboard");
  };

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-sm border-b border-border">
        <div className="container max-w-4xl py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">Keys For Agents</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground hover:text-foreground">
              <SkipForward className="h-4 w-4 mr-1" />
              Skip Setup
            </Button>
          </div>
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center flex-1">
                <div className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                  i <= step ? "text-primary" : "text-muted-foreground"
                }`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    i < step ? "bg-primary text-primary-foreground" :
                    i === step ? "bg-primary/20 text-primary ring-2 ring-primary" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                  </div>
                  <span className="hidden sm:inline">{s.title}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 rounded transition-colors ${
                    i < step ? "bg-primary" : "bg-muted"
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-3xl pt-32 pb-16 px-4">
        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Sparkles className="h-4 w-4" />
              Welcome to Keys For Agents
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
              Let's Set Up Your<br />
              <span className="text-primary">Lead Generation Machine</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              In just a few steps, we'll create your agency profile, run your first AI website audit,
              and get you ready to dominate your local market.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
              {[
                { icon: Building2, title: "Agency Profile", desc: "Set up your agency details and target suburbs" },
                { icon: Search, title: "Website Audit", desc: "Get an AI-powered analysis of your website" },
                { icon: Target, title: "AI Campaigns", desc: "Generate Facebook, Google & email campaigns" },
                { icon: FileText, title: "SEO Pages", desc: "Build suburb landing pages that rank" },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col items-center gap-3">
              <Button size="lg" onClick={() => goToStep(1)} className="px-8">
                Get Started <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <p className="text-sm text-muted-foreground">Takes about 3 minutes</p>
            </div>
          </div>
        )}

        {/* Step 1: Agency Setup */}
        {step === 1 && (
          <Card className="border-border">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto p-3 rounded-full bg-primary/10 w-fit mb-3">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Create Your Agency Profile</CardTitle>
              <CardDescription>Tell us about your real estate agency so we can tailor everything to your market.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-4">
              <div className="space-y-2">
                <Label htmlFor="agencyName">Agency Name *</Label>
                <Input id="agencyName" placeholder="e.g., Ray White Bondi Beach" value={agencyName} onChange={(e) => setAgencyName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="websiteUrl">Website URL</Label>
                <Input id="websiteUrl" type="url" placeholder="https://www.youragency.com.au" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
                <p className="text-xs text-muted-foreground">We'll use this for your first website audit</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="suburbs">Primary Suburbs</Label>
                <Textarea id="suburbs" placeholder="e.g., Bondi Beach, Coogee, Bronte, Randwick" value={suburbs} onChange={(e) => setSuburbs(e.target.value)} rows={2} />
                <p className="text-xs text-muted-foreground">Comma-separated list of suburbs you service</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="services">Services Offered</Label>
                <Textarea id="services" placeholder="e.g., Sales, Property Management, Auctions, Rentals" value={services} onChange={(e) => setServices(e.target.value)} rows={2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" type="tel" placeholder="e.g., 02 9123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>

              <div className="flex items-center justify-between pt-4">
                <Button variant="ghost" onClick={() => goToStep(0)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button onClick={handleCreateAgency} disabled={createAgency.isPending || !agencyName.trim()}>
                  {createAgency.isPending ? "Creating..." : "Create Agency"}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: First Audit */}
        {step === 2 && (
          <Card className="border-border">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto p-3 rounded-full bg-primary/10 w-fit mb-3">
                <Search className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Run Your First Website Audit</CardTitle>
              <CardDescription>Our AI will analyze your website for SEO performance, conversion optimization, and lead generation effectiveness.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-4">
              {!auditComplete ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="auditUrl">Website URL to Audit</Label>
                    <Input id="auditUrl" type="url" placeholder="https://www.youragency.com.au" value={auditUrl} onChange={(e) => setAuditUrl(e.target.value)} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { icon: BarChart3, title: "SEO Analysis", desc: "Meta tags, headings, content quality" },
                      { icon: Target, title: "Conversion Check", desc: "CTAs, forms, trust signals" },
                      { icon: MessageSquare, title: "Lead Gen Review", desc: "Appraisal forms, contact methods" },
                    ].map((item) => (
                      <div key={item.title} className="p-3 rounded-lg bg-muted/50 border border-border text-center">
                        <item.icon className="h-5 w-5 text-primary mx-auto mb-1" />
                        <p className="text-sm font-medium text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    ))}
                  </div>

                  {runAudit.isPending && (
                    <div className="text-center py-6 space-y-3">
                      <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mx-auto" />
                      <p className="text-sm text-muted-foreground">AI is analyzing your website... This may take 15-30 seconds.</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4">
                    <Button variant="ghost" onClick={() => goToStep(1)}>
                      <ArrowLeft className="h-4 w-4 mr-1" /> Back
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => goToStep(3)}>
                        Skip Audit
                      </Button>
                      <Button onClick={handleRunAudit} disabled={runAudit.isPending || !auditUrl.trim()}>
                        {runAudit.isPending ? "Auditing..." : "Run Audit"}
                        <Search className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 space-y-4">
                  <div className="mx-auto p-4 rounded-full bg-green-500/10 w-fit">
                    <CheckCircle2 className="h-12 w-12 text-green-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">Audit Complete!</h3>
                  <p className="text-muted-foreground">Your website has been analyzed. You can view the full results in your dashboard after setup.</p>
                  <Button onClick={() => goToStep(3)} className="mt-4">
                    Continue to Plans <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Choose Plan */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="mx-auto p-3 rounded-full bg-primary/10 w-fit mb-3">
                <CreditCard className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Choose Your Plan</h2>
              <p className="text-muted-foreground">Select the plan that fits your agency's growth goals. You can always upgrade later.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { key: "starter", name: "Starter", price: "$297", features: ["5 Website Audits/mo", "10 AI Campaigns/mo", "5 Suburb Pages/mo", "AI Lead Coach", "Email Support"] },
                { key: "growth", name: "Growth", price: "$497", features: ["20 Website Audits/mo", "Unlimited Campaigns", "20 Suburb Pages/mo", "AI Lead Coach", "Competitor Analysis", "Priority Support"], popular: true },
                { key: "dominator", name: "Dominator", price: "$997", features: ["Unlimited Audits", "Unlimited Campaigns", "Unlimited Suburb Pages", "AI Lead Coach", "Competitor Analysis", "White-label Reports", "Dedicated Account Manager"] },
              ].map((plan) => (
                <Card key={plan.key} className={`relative border ${plan.popular ? "border-primary ring-2 ring-primary/20" : "border-border"}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                      Most Popular
                    </div>
                  )}
                  <CardHeader className="text-center pb-2">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <div className="text-3xl font-bold text-foreground">{plan.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ul className="space-y-2">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full mt-4"
                      variant={plan.popular ? "default" : "outline"}
                      onClick={() => {
                        toast.info("You can subscribe from the Subscription page in your dashboard.");
                        goToStep(4);
                      }}
                    >
                      Select {plan.name}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" onClick={() => goToStep(2)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button variant="outline" onClick={() => goToStep(4)}>
                Continue with Free Trial <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Complete */}
        {step === 4 && (
          <div className="text-center space-y-8">
            <div className="mx-auto p-4 rounded-full bg-green-500/10 w-fit">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <h1 className="text-4xl font-bold text-foreground">You're All Set!</h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Your agency is configured and ready to go. Here's what you can do next from your dashboard:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
              {[
                { icon: Search, title: "Run More Audits", desc: "Analyze competitor websites and track improvements" },
                { icon: MessageSquare, title: "Chat with AI Coach", desc: "Get expert advice from 4 specialist AI advisors" },
                { icon: Target, title: "Generate Campaigns", desc: "Create Facebook, Google & email campaigns in seconds" },
                { icon: FileText, title: "Build Suburb Pages", desc: "Generate SEO-optimized landing pages for your suburbs" },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <Button size="lg" onClick={handleComplete} className="px-8" disabled={completeOnboarding.isPending}>
              {completeOnboarding.isPending ? "Finishing..." : "Go to Dashboard"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
