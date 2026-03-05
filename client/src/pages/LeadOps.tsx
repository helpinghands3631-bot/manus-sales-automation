import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Streamdown } from "streamdown";
import {
  Search, Zap, Users, BarChart3, FileText, Download, Play, Pause,
  RefreshCw, Target, Mail, TrendingUp, Loader2, CheckCircle2, XCircle,
  Clock, Star, ArrowRight, Rocket, Crown, Shield
} from "lucide-react";

// ── Plans ──
const PLANS = [
  {
    key: "local_lead_flood" as const,
    name: "Local Lead Flood",
    icon: Target,
    price: "$497/mo",
    description: "Scrape local businesses, score leads, and export ready-to-contact lists",
    features: ["Google Maps scraping", "A/B/C lead scoring", "CSV export", "Up to 500 leads/mo"],
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
  {
    key: "b2b_outbound" as const,
    name: "B2B Outbound Engine",
    icon: Mail,
    price: "$997/mo",
    description: "Full outreach sequences with AI-written cold emails and follow-ups",
    features: ["Everything in Local Lead Flood", "AI email sequences", "Multi-step campaigns", "Open/click tracking"],
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
  },
  {
    key: "fully_managed" as const,
    name: "Fully Managed LeadOps",
    icon: Crown,
    price: "$2,497/mo",
    description: "We run your entire lead gen operation — scrape, outreach, optimise, report",
    features: ["Everything in B2B Outbound", "Core Agent orchestration", "Weekly AI reports", "Strategy optimisation"],
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
];

// ── Stat Card ──
function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}><Icon className="h-5 w-5" /></div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Score Badge ──
function ScoreBadge({ score }: { score: string }) {
  const colors: Record<string, string> = {
    A: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    B: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    C: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    unscored: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  };
  return <Badge variant="outline" className={colors[score] || colors.unscored}>{score}</Badge>;
}

// ── Status Badge ──
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-zinc-500/20 text-zinc-400",
    running: "bg-blue-500/20 text-blue-400",
    completed: "bg-emerald-500/20 text-emerald-400",
    failed: "bg-red-500/20 text-red-400",
    cancelled: "bg-amber-500/20 text-amber-400",
    draft: "bg-zinc-500/20 text-zinc-400",
    active: "bg-emerald-500/20 text-emerald-400",
    paused: "bg-amber-500/20 text-amber-400",
  };
  return <Badge variant="outline" className={colors[status] || "bg-zinc-500/20 text-zinc-400"}>{status}</Badge>;
}

export default function LeadOps() {
  const [activePlan, setActivePlan] = useState<"local_lead_flood" | "b2b_outbound" | "fully_managed">("local_lead_flood");
  const [activeTab, setActiveTab] = useState("scrape");

  // ── Queries ──
  const statsQ = trpc.leadOps.stats.useQuery();
  const jobsQ = trpc.leadOps.listJobs.useQuery();
  const leadsQ = trpc.leadOps.listLeads.useQuery();
  const seqsQ = trpc.leadOps.listSequences.useQuery();

  // ── Scrape State ──
  const [scrapeNiche, setScrapeNiche] = useState("");
  const [scrapeLocation, setScrapeLocation] = useState("");
  const [scrapeMax, setScrapeMax] = useState(20);
  const scrapeMut = trpc.leadOps.runScrape.useMutation({
    onSuccess: (data) => {
      toast.success(`Scraped ${data.leadsFound} leads!`);
      jobsQ.refetch();
      leadsQ.refetch();
      statsQ.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Outreach State ──
  const [outreachSegment, setOutreachSegment] = useState("");
  const [outreachNiche, setOutreachNiche] = useState("");
  const [outreachCity, setOutreachCity] = useState("");
  const [outreachTone, setOutreachTone] = useState<"professional" | "casual" | "urgent" | "friendly">("professional");
  const [outreachSteps, setOutreachSteps] = useState(3);
  const outreachMut = trpc.leadOps.generateOutreach.useMutation({
    onSuccess: () => {
      toast.success("Outreach sequence generated!");
      seqsQ.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Optimization State ──
  const [optGoal, setOptGoal] = useState("");
  const [optContext, setOptContext] = useState("");
  const [optResult, setOptResult] = useState<any>(null);
  const optMut = trpc.leadOps.runOptimization.useMutation({
    onSuccess: (data) => {
      setOptResult(data);
      toast.success("Optimization complete!");
      jobsQ.refetch();
      statsQ.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Report State ──
  const [report, setReport] = useState<string | null>(null);
  const reportMut = trpc.leadOps.generateReport.useMutation({
    onSuccess: (data) => {
      setReport(data.report);
      toast.success("Report generated!");
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Lead Filters ──
  const [scoreFilter, setScoreFilter] = useState<string>("all");

  const stats = statsQ.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Rocket className="h-6 w-6 text-emerald-400" /> LeadOps Platform
        </h1>
        <p className="text-muted-foreground mt-1">
          Unified lead generation, scoring, outreach, and optimisation — powered by AI
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total Jobs" value={stats?.totalJobs ?? 0} icon={Zap} color="bg-blue-500/10 text-blue-400" />
        <StatCard label="Leads Scraped" value={stats?.totalLeads ?? 0} icon={Users} color="bg-emerald-500/10 text-emerald-400" />
        <StatCard label="A-Grade Leads" value={stats?.aGradeLeads ?? 0} icon={Star} color="bg-amber-500/10 text-amber-400" />
        <StatCard label="Sequences" value={stats?.totalSequences ?? 0} icon={Mail} color="bg-purple-500/10 text-purple-400" />
        <StatCard label="Active Jobs" value={stats?.activeJobs ?? 0} icon={RefreshCw} color="bg-cyan-500/10 text-cyan-400" />
      </div>

      {/* Plan Selector */}
      <div className="grid md:grid-cols-3 gap-4">
        {PLANS.map((plan) => (
          <Card
            key={plan.key}
            className={`cursor-pointer transition-all hover:scale-[1.02] ${activePlan === plan.key ? plan.bg + " ring-1 ring-current " + plan.color : "bg-card/30 border-border/30 opacity-70 hover:opacity-100"}`}
            onClick={() => setActivePlan(plan.key)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <plan.icon className={`h-6 w-6 ${plan.color}`} />
                <span className={`text-lg font-bold ${plan.color}`}>{plan.price}</span>
              </div>
              <CardTitle className="text-base">{plan.name}</CardTitle>
              <CardDescription className="text-xs">{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card/50 border border-border/50">
          <TabsTrigger value="scrape"><Search className="h-4 w-4 mr-1" /> Scrape</TabsTrigger>
          <TabsTrigger value="leads"><Users className="h-4 w-4 mr-1" /> Leads</TabsTrigger>
          <TabsTrigger value="outreach"><Mail className="h-4 w-4 mr-1" /> Outreach</TabsTrigger>
          {(activePlan === "fully_managed") && (
            <TabsTrigger value="optimize"><TrendingUp className="h-4 w-4 mr-1" /> Optimize</TabsTrigger>
          )}
          <TabsTrigger value="reports"><FileText className="h-4 w-4 mr-1" /> Reports</TabsTrigger>
          <TabsTrigger value="jobs"><BarChart3 className="h-4 w-4 mr-1" /> Jobs</TabsTrigger>
        </TabsList>

        {/* ── Scrape Tab ── */}
        <TabsContent value="scrape" className="space-y-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Search className="h-5 w-5 text-emerald-400" /> Lead Scraper
              </CardTitle>
              <CardDescription>Find businesses by niche and location using Google Maps data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Business Niche</Label>
                  <Input placeholder="e.g. Real Estate Agents" value={scrapeNiche} onChange={(e) => setScrapeNiche(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input placeholder="e.g. Sydney, NSW" value={scrapeLocation} onChange={(e) => setScrapeLocation(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Max Results</Label>
                  <Input type="number" min={1} max={100} value={scrapeMax} onChange={(e) => setScrapeMax(Number(e.target.value))} />
                </div>
              </div>
              <Button
                onClick={() => scrapeMut.mutate({ niche: scrapeNiche, location: scrapeLocation, maxResults: scrapeMax, plan: activePlan })}
                disabled={scrapeMut.isPending || !scrapeNiche || !scrapeLocation}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {scrapeMut.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Scraping...</> : <><Search className="h-4 w-4 mr-2" /> Run Scrape</>}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Leads Tab ── */}
        <TabsContent value="leads" className="space-y-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-emerald-400" /> Lead Database
                  </CardTitle>
                  <CardDescription>{leadsQ.data?.total ?? 0} total leads</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={scoreFilter} onValueChange={setScoreFilter}>
                    <SelectTrigger className="w-32"><SelectValue placeholder="Score" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Scores</SelectItem>
                      <SelectItem value="A">A-Grade</SelectItem>
                      <SelectItem value="B">B-Grade</SelectItem>
                      <SelectItem value="C">C-Grade</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => {
                    toast.success("Exporting CSV...");
                  }}>
                    <Download className="h-4 w-4 mr-1" /> Export CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-muted-foreground">
                      <th className="text-left py-2 px-3">Name</th>
                      <th className="text-left py-2 px-3">Email</th>
                      <th className="text-left py-2 px-3">Phone</th>
                      <th className="text-left py-2 px-3">City</th>
                      <th className="text-left py-2 px-3">Category</th>
                      <th className="text-left py-2 px-3">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(leadsQ.data?.leads ?? [])
                      .filter((l: any) => scoreFilter === "all" || l.score === scoreFilter)
                      .map((lead: any) => (
                        <tr key={lead.id} className="border-b border-border/30 hover:bg-card/80">
                          <td className="py-2 px-3 font-medium">{lead.name || "—"}</td>
                          <td className="py-2 px-3 text-muted-foreground">{lead.email || "—"}</td>
                          <td className="py-2 px-3 text-muted-foreground">{lead.phone || "—"}</td>
                          <td className="py-2 px-3">{lead.city || "—"}</td>
                          <td className="py-2 px-3">{lead.category || "—"}</td>
                          <td className="py-2 px-3"><ScoreBadge score={lead.score} /></td>
                        </tr>
                      ))}
                    {(!leadsQ.data?.leads || leadsQ.data.leads.length === 0) && (
                      <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No leads yet — run a scrape to get started</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Outreach Tab ── */}
        <TabsContent value="outreach" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Create Sequence */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mail className="h-5 w-5 text-blue-400" /> Generate Sequence
                </CardTitle>
                <CardDescription>AI-written cold email sequences tailored to your niche</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Target Segment</Label>
                  <Input placeholder="e.g. Independent agencies, 5-20 staff" value={outreachSegment} onChange={(e) => setOutreachSegment(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Niche</Label>
                    <Input placeholder="e.g. Real Estate" value={outreachNiche} onChange={(e) => setOutreachNiche(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input placeholder="e.g. Melbourne" value={outreachCity} onChange={(e) => setOutreachCity(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Tone</Label>
                    <Select value={outreachTone} onValueChange={(v: any) => setOutreachTone(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="friendly">Friendly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Steps</Label>
                    <Input type="number" min={1} max={5} value={outreachSteps} onChange={(e) => setOutreachSteps(Number(e.target.value))} />
                  </div>
                </div>
                <Button
                  onClick={() => outreachMut.mutate({ segment: outreachSegment, niche: outreachNiche, city: outreachCity, tone: outreachTone, sequenceLength: outreachSteps })}
                  disabled={outreachMut.isPending || !outreachSegment || !outreachNiche || !outreachCity}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {outreachMut.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</> : <><Zap className="h-4 w-4 mr-2" /> Generate Sequence</>}
                </Button>
              </CardContent>
            </Card>

            {/* Sequences List */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Saved Sequences</CardTitle>
                <CardDescription>{seqsQ.data?.length ?? 0} sequences</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {(seqsQ.data ?? []).map((seq: any) => (
                    <div key={seq.id} className="p-3 rounded-lg bg-background/50 border border-border/30 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{seq.name}</p>
                        <p className="text-xs text-muted-foreground">{seq.platform} · {(seq.templateSteps as any[])?.length ?? 0} steps</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={seq.status} />
                      </div>
                    </div>
                  ))}
                  {(!seqsQ.data || seqsQ.data.length === 0) && (
                    <p className="text-center py-8 text-muted-foreground text-sm">No sequences yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Optimize Tab (Fully Managed only) ── */}
        <TabsContent value="optimize" className="space-y-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-amber-400" /> AI Optimization Agent
              </CardTitle>
              <CardDescription>Let the Core Agent analyse your campaigns and suggest improvements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Optimization Goal</Label>
                <Input placeholder="e.g. Increase reply rate to 15% for Melbourne agencies" value={optGoal} onChange={(e) => setOptGoal(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Campaign Context (optional)</Label>
                <Textarea placeholder="Describe your current campaign performance, target audience, and any constraints..." value={optContext} onChange={(e) => setOptContext(e.target.value)} rows={4} />
              </div>
              <Button
                onClick={() => optMut.mutate({ goal: optGoal, campaignContext: optContext })}
                disabled={optMut.isPending || !optGoal}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {optMut.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analysing...</> : <><TrendingUp className="h-4 w-4 mr-2" /> Run Optimization</>}
              </Button>
              {optResult && (
                <Card className="mt-4 bg-background/50 border-amber-500/20">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2">Optimization Results</h4>
                    {optResult.summary && <p className="text-sm text-muted-foreground mb-3">{optResult.summary}</p>}
                    {optResult.recommended_actions && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-amber-400">Recommended Actions:</p>
                        {optResult.recommended_actions.map((a: string, i: number) => (
                          <p key={i} className="text-sm flex items-start gap-2"><ArrowRight className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" /> {a}</p>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Reports Tab ── */}
        <TabsContent value="reports" className="space-y-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-purple-400" /> Performance Reports
                  </CardTitle>
                  <CardDescription>AI-generated weekly summaries of your lead operations</CardDescription>
                </div>
                <Button
                  onClick={() => reportMut.mutate()}
                  disabled={reportMut.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {reportMut.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</> : <><FileText className="h-4 w-4 mr-2" /> Generate Report</>}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {report ? (
                <div className="prose prose-invert prose-sm max-w-none">
                  <Streamdown>{report}</Streamdown>
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">Click "Generate Report" to create a weekly performance summary</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Jobs Tab ── */}
        <TabsContent value="jobs" className="space-y-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-cyan-400" /> Job History
              </CardTitle>
              <CardDescription>All scrape, outreach, and optimization jobs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-muted-foreground">
                      <th className="text-left py-2 px-3">ID</th>
                      <th className="text-left py-2 px-3">Type</th>
                      <th className="text-left py-2 px-3">Plan</th>
                      <th className="text-left py-2 px-3">Status</th>
                      <th className="text-left py-2 px-3">Started</th>
                      <th className="text-left py-2 px-3">Results</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(jobsQ.data ?? []).map((job: any) => (
                      <tr key={job.id} className="border-b border-border/30 hover:bg-card/80">
                        <td className="py-2 px-3 font-mono text-xs">#{job.id}</td>
                        <td className="py-2 px-3"><Badge variant="outline">{job.type}</Badge></td>
                        <td className="py-2 px-3 text-xs">{job.plan?.replace(/_/g, " ")}</td>
                        <td className="py-2 px-3"><StatusBadge status={job.status} /></td>
                        <td className="py-2 px-3 text-xs text-muted-foreground">{job.startedAt ? new Date(job.startedAt).toLocaleString() : "—"}</td>
                        <td className="py-2 px-3 text-xs">{job.results ? JSON.stringify(job.results).slice(0, 80) + "..." : "—"}</td>
                      </tr>
                    ))}
                    {(!jobsQ.data || jobsQ.data.length === 0) && (
                      <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No jobs yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
