import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Megaphone, Target, DollarSign, BarChart3, FlaskConical, Sparkles, Plus, Trash2, Play, Pause, Copy, Bookmark, TrendingUp, Eye, MousePointerClick, ArrowUpRight } from "lucide-react";

const PLATFORMS = ["facebook", "google", "instagram", "linkedin", "tiktok"] as const;
const OBJECTIVES = ["awareness", "traffic", "leads", "conversions", "sales"] as const;
const STATUSES = ["draft", "active", "paused", "completed", "archived"] as const;

const platformColors: Record<string, string> = {
  facebook: "bg-blue-600", google: "bg-red-500", instagram: "bg-pink-500", linkedin: "bg-blue-700", tiktok: "bg-gray-800",
};
const statusColors: Record<string, string> = {
  draft: "bg-gray-500", active: "bg-green-500", paused: "bg-yellow-500", completed: "bg-blue-500", archived: "bg-gray-700",
};

export default function DigitalAds() {
  const [activeTab, setActiveTab] = useState("campaigns");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-teal-400" />
          Digital Advertising
        </h1>
        <p className="text-muted-foreground mt-1">Create, manage, and optimise ad campaigns across platforms with AI-powered tools.</p>
      </div>

      <PerformanceOverview />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="campaigns" className="flex items-center gap-1"><Megaphone className="h-3.5 w-3.5" />Campaigns</TabsTrigger>
          <TabsTrigger value="copywriter" className="flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" />AI Copy</TabsTrigger>
          <TabsTrigger value="audience" className="flex items-center gap-1"><Target className="h-3.5 w-3.5" />Audience</TabsTrigger>
          <TabsTrigger value="budget" className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" />Budget</TabsTrigger>
          <TabsTrigger value="abtests" className="flex items-center gap-1"><FlaskConical className="h-3.5 w-3.5" />A/B Tests</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns"><CampaignsTab /></TabsContent>
        <TabsContent value="copywriter"><AICopywriterTab /></TabsContent>
        <TabsContent value="audience"><AudienceBuilderTab /></TabsContent>
        <TabsContent value="budget"><BudgetOptimizerTab /></TabsContent>
        <TabsContent value="abtests"><ABTestsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ── Performance Overview ──────────────────────────────
function PerformanceOverview() {
  const { data } = trpc.digitalAds.performanceSummary.useQuery();
  if (!data) return null;
  const stats = [
    { label: "Total Campaigns", value: data.totalCampaigns, icon: Megaphone, color: "text-teal-400" },
    { label: "Active", value: data.activeCampaigns, icon: Play, color: "text-green-400" },
    { label: "Impressions", value: data.totalImpressions.toLocaleString(), icon: Eye, color: "text-blue-400" },
    { label: "Clicks", value: data.totalClicks.toLocaleString(), icon: MousePointerClick, color: "text-purple-400" },
    { label: "Conversions", value: data.totalConversions.toLocaleString(), icon: ArrowUpRight, color: "text-orange-400" },
    { label: "Avg CTR", value: `${data.avgCtr}%`, icon: TrendingUp, color: "text-yellow-400" },
    { label: "Total Spend", value: `$${(data.totalSpend / 100).toFixed(0)}`, icon: DollarSign, color: "text-red-400" },
    { label: "ROAS", value: `${data.avgRoas}x`, icon: BarChart3, color: "text-emerald-400" },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      {stats.map(s => (
        <Card key={s.label} className="bg-card/50 border-border/50">
          <CardContent className="p-3 text-center">
            <s.icon className={`h-4 w-4 mx-auto mb-1 ${s.color}`} />
            <div className="text-lg font-bold">{s.value}</div>
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Campaigns Tab ──────────────────────────────
function CampaignsTab() {
  const utils = trpc.useUtils();
  const { data: campaigns, isLoading } = trpc.digitalAds.listCampaigns.useQuery();
  const createMut = trpc.digitalAds.createCampaign.useMutation({ onSuccess: () => { utils.digitalAds.listCampaigns.invalidate(); utils.digitalAds.performanceSummary.invalidate(); toast.success("Campaign created"); } });
  const statusMut = trpc.digitalAds.updateStatus.useMutation({ onSuccess: () => { utils.digitalAds.listCampaigns.invalidate(); utils.digitalAds.performanceSummary.invalidate(); } });
  const deleteMut = trpc.digitalAds.deleteCampaign.useMutation({ onSuccess: () => { utils.digitalAds.listCampaigns.invalidate(); utils.digitalAds.performanceSummary.invalidate(); toast.success("Campaign deleted"); } });

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", platform: "facebook" as typeof PLATFORMS[number], objective: "leads" as typeof OBJECTIVES[number], targetSuburbs: "", budgetType: "daily" as "daily" | "lifetime", budgetAmount: "" });

  const handleCreate = () => {
    if (!form.name) { toast.error("Name required"); return; }
    createMut.mutate({ ...form, budgetAmount: form.budgetAmount ? parseInt(form.budgetAmount) * 100 : undefined });
    setForm({ name: "", platform: "facebook", objective: "leads", targetSuburbs: "", budgetType: "daily", budgetAmount: "" });
    setShowCreate(false);
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Ad Campaigns</h2>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />New Campaign</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Create Campaign</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Campaign Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Spring Listings Push" /></div>
              <div><Label>Platform</Label>
                <Select value={form.platform} onValueChange={v => setForm(f => ({ ...f, platform: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PLATFORMS.map(p => <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Objective</Label>
                <Select value={form.objective} onValueChange={v => setForm(f => ({ ...f, objective: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{OBJECTIVES.map(o => <SelectItem key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Target Suburbs</Label><Input value={form.targetSuburbs} onChange={e => setForm(f => ({ ...f, targetSuburbs: e.target.value }))} placeholder="e.g. Bondi, Surry Hills, Manly" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Budget Type</Label>
                  <Select value={form.budgetType} onValueChange={v => setForm(f => ({ ...f, budgetType: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="daily">Daily</SelectItem><SelectItem value="lifetime">Lifetime</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>Budget (AUD)</Label><Input type="number" value={form.budgetAmount} onChange={e => setForm(f => ({ ...f, budgetAmount: e.target.value }))} placeholder="e.g. 50" /></div>
              </div>
              <Button onClick={handleCreate} disabled={createMut.isPending} className="w-full">{createMut.isPending ? "Creating..." : "Create Campaign"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && <p className="text-muted-foreground text-sm">Loading campaigns...</p>}
      {campaigns?.length === 0 && <Card className="bg-card/50"><CardContent className="p-8 text-center text-muted-foreground">No campaigns yet. Click "New Campaign" to get started.</CardContent></Card>}

      <div className="grid gap-3">
        {campaigns?.map(c => (
          <Card key={c.id} className="bg-card/50 border-border/50">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{c.name}</h3>
                    <Badge className={`${platformColors[c.platform]} text-white text-[10px]`}>{c.platform}</Badge>
                    <Badge className={`${statusColors[c.status]} text-white text-[10px]`}>{c.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Objective: {c.objective} | Budget: {c.budgetAmount ? `$${(c.budgetAmount / 100).toFixed(0)}/day` : "Not set"} | Suburbs: {c.targetSuburbs || "All"}</p>
                  {(c.impressions || 0) > 0 && (
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span><Eye className="h-3 w-3 inline mr-0.5" />{c.impressions?.toLocaleString()} imp</span>
                      <span><MousePointerClick className="h-3 w-3 inline mr-0.5" />{c.clicks?.toLocaleString()} clicks</span>
                      <span>CTR: {c.ctr || "0"}%</span>
                      <span>CPC: ${c.cpc || "0"}</span>
                      <span>ROAS: {c.roas || "0"}x</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {c.status === "draft" && <Button size="sm" variant="outline" onClick={() => statusMut.mutate({ id: c.id, status: "active" })}><Play className="h-3 w-3" /></Button>}
                  {c.status === "active" && <Button size="sm" variant="outline" onClick={() => statusMut.mutate({ id: c.id, status: "paused" })}><Pause className="h-3 w-3" /></Button>}
                  {c.status === "paused" && <Button size="sm" variant="outline" onClick={() => statusMut.mutate({ id: c.id, status: "active" })}><Play className="h-3 w-3" /></Button>}
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteMut.mutate({ id: c.id })}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── AI Copywriter Tab ──────────────────────────────
function AICopywriterTab() {
  const generateMut = trpc.digitalAds.generateAdCopy.useMutation();
  const [form, setForm] = useState({ platform: "facebook" as typeof PLATFORMS[number], objective: "leads" as typeof OBJECTIVES[number], suburbs: "", services: "", agencyName: "", tone: "" });
  const [result, setResult] = useState<any>(null);

  const handleGenerate = () => {
    generateMut.mutate(form, {
      onSuccess: (data) => { setResult(data); toast.success("Ad copy generated!"); },
      onError: (err) => toast.error(`Generation failed: ${err.message}`),
    });
  };

  return (
    <div className="space-y-4 mt-4">
      <Card className="bg-card/50">
        <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-teal-400" />AI Ad Copy Generator</CardTitle><CardDescription>Generate platform-specific ad copy powered by Grok AI</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Platform</Label>
              <Select value={form.platform} onValueChange={v => setForm(f => ({ ...f, platform: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PLATFORMS.map(p => <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Objective</Label>
              <Select value={form.objective} onValueChange={v => setForm(f => ({ ...f, objective: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{OBJECTIVES.map(o => <SelectItem key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Agency Name</Label><Input value={form.agencyName} onChange={e => setForm(f => ({ ...f, agencyName: e.target.value }))} placeholder="e.g. Ray White Bondi" /></div>
          <div><Label>Target Suburbs</Label><Input value={form.suburbs} onChange={e => setForm(f => ({ ...f, suburbs: e.target.value }))} placeholder="e.g. Bondi Beach, Surry Hills, Manly" /></div>
          <div><Label>Services</Label><Input value={form.services} onChange={e => setForm(f => ({ ...f, services: e.target.value }))} placeholder="e.g. Sales, rentals, property management" /></div>
          <div><Label>Tone (optional)</Label><Input value={form.tone} onChange={e => setForm(f => ({ ...f, tone: e.target.value }))} placeholder="e.g. Professional, warm, results-driven" /></div>
          <Button onClick={handleGenerate} disabled={generateMut.isPending} className="w-full">{generateMut.isPending ? "Generating with Grok AI..." : "Generate Ad Copy"}</Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="bg-card/50 border-teal-500/30">
          <CardHeader><CardTitle className="text-teal-400">Generated Ad Copy</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {result.headlines && (
              <div>
                <Label className="text-sm font-semibold">Headlines</Label>
                <div className="space-y-1 mt-1">{result.headlines.map((h: string, i: number) => (
                  <div key={i} className="flex items-center gap-2 bg-muted/50 rounded px-3 py-1.5 text-sm">
                    <span className="flex-1">{h}</span>
                    <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(h); toast.success("Copied!"); }}><Copy className="h-3 w-3" /></Button>
                  </div>
                ))}</div>
              </div>
            )}
            {result.descriptions && (
              <div>
                <Label className="text-sm font-semibold">Descriptions</Label>
                <div className="space-y-1 mt-1">{result.descriptions.map((d: string, i: number) => (
                  <div key={i} className="bg-muted/50 rounded px-3 py-2 text-sm">{d}</div>
                ))}</div>
              </div>
            )}
            {result.primaryText && (
              <div>
                <Label className="text-sm font-semibold">Primary Text</Label>
                <div className="bg-muted/50 rounded px-3 py-2 text-sm mt-1">{result.primaryText}</div>
              </div>
            )}
            {result.callToAction && (
              <div>
                <Label className="text-sm font-semibold">Call to Action</Label>
                <Badge className="bg-teal-500 text-white mt-1">{result.callToAction}</Badge>
              </div>
            )}
            {result.hashtags && (
              <div>
                <Label className="text-sm font-semibold">Hashtags</Label>
                <div className="flex flex-wrap gap-1 mt-1">{result.hashtags.map((h: string, i: number) => <Badge key={i} variant="outline" className="text-xs">{h}</Badge>)}</div>
              </div>
            )}
            {result.tips && (
              <div>
                <Label className="text-sm font-semibold">Platform Tips</Label>
                <ul className="list-disc list-inside text-sm text-muted-foreground mt-1 space-y-0.5">{result.tips.map((t: string, i: number) => <li key={i}>{t}</li>)}</ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Audience Builder Tab ──────────────────────────────
function AudienceBuilderTab() {
  const buildMut = trpc.digitalAds.buildAudience.useMutation();
  const [form, setForm] = useState({ platform: "facebook" as typeof PLATFORMS[number], objective: "leads" as typeof OBJECTIVES[number], suburbs: "", services: "", propertyType: "", priceRange: "" });
  const [result, setResult] = useState<any>(null);

  const handleBuild = () => {
    buildMut.mutate(form, {
      onSuccess: (data) => { setResult(data); toast.success("Audience built!"); },
      onError: (err) => toast.error(`Failed: ${err.message}`),
    });
  };

  return (
    <div className="space-y-4 mt-4">
      <Card className="bg-card/50">
        <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-purple-400" />AI Audience Builder</CardTitle><CardDescription>Build targeted audiences with AI-powered demographic and interest analysis</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Platform</Label>
              <Select value={form.platform} onValueChange={v => setForm(f => ({ ...f, platform: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PLATFORMS.map(p => <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Objective</Label>
              <Select value={form.objective} onValueChange={v => setForm(f => ({ ...f, objective: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{OBJECTIVES.map(o => <SelectItem key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Target Suburbs</Label><Input value={form.suburbs} onChange={e => setForm(f => ({ ...f, suburbs: e.target.value }))} placeholder="e.g. Bondi, Manly, Surry Hills" /></div>
          <div><Label>Services</Label><Input value={form.services} onChange={e => setForm(f => ({ ...f, services: e.target.value }))} placeholder="e.g. Sales, rentals, property management" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Property Type</Label><Input value={form.propertyType} onChange={e => setForm(f => ({ ...f, propertyType: e.target.value }))} placeholder="e.g. Houses, Apartments" /></div>
            <div><Label>Price Range</Label><Input value={form.priceRange} onChange={e => setForm(f => ({ ...f, priceRange: e.target.value }))} placeholder="e.g. $500K-$1.5M" /></div>
          </div>
          <Button onClick={handleBuild} disabled={buildMut.isPending} className="w-full">{buildMut.isPending ? "Building audience with Grok AI..." : "Build Audience"}</Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="bg-card/50 border-purple-500/30">
          <CardHeader><CardTitle className="text-purple-400">Audience Targeting</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {result.demographics && (
              <div>
                <Label className="text-sm font-semibold">Demographics</Label>
                <div className="grid grid-cols-2 gap-2 mt-1 text-sm">
                  <div className="bg-muted/50 rounded px-3 py-1.5">Age: {result.demographics.ageRange}</div>
                  <div className="bg-muted/50 rounded px-3 py-1.5">Gender: {result.demographics.gender}</div>
                  <div className="bg-muted/50 rounded px-3 py-1.5">Income: {result.demographics.income}</div>
                  <div className="bg-muted/50 rounded px-3 py-1.5">Education: {result.demographics.education}</div>
                </div>
              </div>
            )}
            {result.interests && (
              <div>
                <Label className="text-sm font-semibold">Interest Targeting</Label>
                <div className="flex flex-wrap gap-1 mt-1">{result.interests.map((i: string, idx: number) => <Badge key={idx} variant="outline" className="text-xs">{i}</Badge>)}</div>
              </div>
            )}
            {result.behaviours && (
              <div>
                <Label className="text-sm font-semibold">Behavioural Targeting</Label>
                <div className="flex flex-wrap gap-1 mt-1">{result.behaviours.map((b: string, idx: number) => <Badge key={idx} className="bg-purple-500/20 text-purple-300 text-xs">{b}</Badge>)}</div>
              </div>
            )}
            {result.geoTargeting && (
              <div>
                <Label className="text-sm font-semibold">Geo Targeting</Label>
                <div className="bg-muted/50 rounded px-3 py-2 text-sm mt-1">
                  Radius: {result.geoTargeting.radius}
                  {result.geoTargeting.suburbs && <span> | Suburbs: {result.geoTargeting.suburbs.join(", ")}</span>}
                </div>
              </div>
            )}
            {result.estimatedReach && <div className="text-sm"><Label className="font-semibold">Estimated Reach:</Label> <span className="text-purple-400 font-bold">{result.estimatedReach}</span></div>}
            {result.tips && (
              <div>
                <Label className="text-sm font-semibold">Targeting Tips</Label>
                <ul className="list-disc list-inside text-sm text-muted-foreground mt-1 space-y-0.5">{result.tips.map((t: string, i: number) => <li key={i}>{t}</li>)}</ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Budget Optimizer Tab ──────────────────────────────
function BudgetOptimizerTab() {
  const optimizeMut = trpc.digitalAds.optimizeBudget.useMutation();
  const [form, setForm] = useState({ platform: "facebook" as typeof PLATFORMS[number], objective: "leads" as typeof OBJECTIVES[number], suburbs: "", monthlyBudget: "" });
  const [result, setResult] = useState<any>(null);

  const handleOptimize = () => {
    optimizeMut.mutate({ ...form, monthlyBudget: form.monthlyBudget ? parseInt(form.monthlyBudget) * 100 : undefined }, {
      onSuccess: (data) => { setResult(data); toast.success("Budget optimised!"); },
      onError: (err) => toast.error(`Failed: ${err.message}`),
    });
  };

  return (
    <div className="space-y-4 mt-4">
      <Card className="bg-card/50">
        <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-green-400" />AI Budget Optimizer</CardTitle><CardDescription>Get AI-powered budget recommendations based on your goals and market</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Platform</Label>
              <Select value={form.platform} onValueChange={v => setForm(f => ({ ...f, platform: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PLATFORMS.map(p => <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Objective</Label>
              <Select value={form.objective} onValueChange={v => setForm(f => ({ ...f, objective: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{OBJECTIVES.map(o => <SelectItem key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Target Suburbs</Label><Input value={form.suburbs} onChange={e => setForm(f => ({ ...f, suburbs: e.target.value }))} placeholder="e.g. Bondi, Manly, Surry Hills" /></div>
          <div><Label>Monthly Budget (AUD, optional)</Label><Input type="number" value={form.monthlyBudget} onChange={e => setForm(f => ({ ...f, monthlyBudget: e.target.value }))} placeholder="e.g. 2000" /></div>
          <Button onClick={handleOptimize} disabled={optimizeMut.isPending} className="w-full">{optimizeMut.isPending ? "Optimising with Grok AI..." : "Optimize Budget"}</Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="bg-card/50 border-green-500/30">
          <CardHeader><CardTitle className="text-green-400">Budget Recommendation</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {result.recommendedDaily && <div className="bg-muted/50 rounded p-3 text-center"><div className="text-lg font-bold text-green-400">${(result.recommendedDaily / 100).toFixed(0)}</div><div className="text-[10px] text-muted-foreground">Daily Budget</div></div>}
              {result.estimatedCPC && <div className="bg-muted/50 rounded p-3 text-center"><div className="text-lg font-bold">{result.estimatedCPC}</div><div className="text-[10px] text-muted-foreground">Est. CPC</div></div>}
              {result.estimatedCTR && <div className="bg-muted/50 rounded p-3 text-center"><div className="text-lg font-bold">{result.estimatedCTR}</div><div className="text-[10px] text-muted-foreground">Est. CTR</div></div>}
              {result.estimatedROAS && <div className="bg-muted/50 rounded p-3 text-center"><div className="text-lg font-bold text-emerald-400">{result.estimatedROAS}</div><div className="text-[10px] text-muted-foreground">Est. ROAS</div></div>}
            </div>
            {result.budgetBreakdown && (
              <div>
                <Label className="text-sm font-semibold">Budget Breakdown</Label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  <div className="bg-blue-500/10 rounded px-3 py-2 text-center text-sm"><div className="font-bold text-blue-400">{result.budgetBreakdown.testing}</div><div className="text-[10px] text-muted-foreground">Testing</div></div>
                  <div className="bg-green-500/10 rounded px-3 py-2 text-center text-sm"><div className="font-bold text-green-400">{result.budgetBreakdown.scaling}</div><div className="text-[10px] text-muted-foreground">Scaling</div></div>
                  <div className="bg-orange-500/10 rounded px-3 py-2 text-center text-sm"><div className="font-bold text-orange-400">{result.budgetBreakdown.retargeting}</div><div className="text-[10px] text-muted-foreground">Retargeting</div></div>
                </div>
              </div>
            )}
            {result.estimatedConversions && <div className="text-sm"><Label className="font-semibold">Est. Conversions/Month:</Label> <span className="text-green-400 font-bold">{result.estimatedConversions}</span></div>}
            {result.timeline && <div className="text-sm"><Label className="font-semibold">Recommended Duration:</Label> <span>{result.timeline}</span></div>}
            {result.tips && (
              <div>
                <Label className="text-sm font-semibold">Budget Tips</Label>
                <ul className="list-disc list-inside text-sm text-muted-foreground mt-1 space-y-0.5">{result.tips.map((t: string, i: number) => <li key={i}>{t}</li>)}</ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── A/B Tests Tab ──────────────────────────────
function ABTestsTab() {
  const { data: tests, isLoading } = trpc.digitalAds.listAbTests.useQuery({});
  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2"><FlaskConical className="h-5 w-5 text-orange-400" />A/B Tests</h2>
      </div>
      {isLoading && <p className="text-muted-foreground text-sm">Loading tests...</p>}
      {tests?.length === 0 && (
        <Card className="bg-card/50">
          <CardContent className="p-8 text-center text-muted-foreground">
            No A/B tests yet. Create a campaign with multiple creatives, then set up an A/B test to compare performance.
          </CardContent>
        </Card>
      )}
      {tests?.map(t => (
        <Card key={t.id} className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{t.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={t.status === "running" ? "bg-green-500" : t.status === "completed" ? "bg-blue-500" : "bg-gray-500"}>{t.status}</Badge>
                  {t.winner && t.winner !== "none" && <Badge className="bg-yellow-500">Winner: Variant {t.winner}</Badge>}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">Started: {new Date(t.startedAt).toLocaleDateString()}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
