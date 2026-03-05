import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Swords, CheckCircle2, XCircle, Lightbulb, ArrowRight, Trophy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function CompetitorAudit() {
  const agenciesQuery = trpc.agency.list.useQuery();
  const agency = agenciesQuery.data?.[0];
  const [myUrl, setMyUrl] = useState("");
  const [competitorUrl, setCompetitorUrl] = useState("");

  const compareMutation = trpc.audit.compareCompetitor.useMutation({
    onError: (e) => toast.error(e.message),
    onSuccess: () => toast.success("Competitor analysis complete!"),
  });

  const result = compareMutation.data;
  const comparison = result?.comparison as Record<string, unknown> | undefined;
  const yourSite = comparison?.your_site as Record<string, unknown> | undefined;
  const competitorSite = comparison?.competitor_site as Record<string, unknown> | undefined;

  const handleCompare = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agency) { toast.error("Please create an agency profile first"); return; }
    if (!myUrl.trim() || !competitorUrl.trim()) { toast.error("Please enter both URLs"); return; }
    compareMutation.mutate({ agencyId: agency.id, myUrl, competitorUrl });
  };

  if (!agency && !agenciesQuery.isLoading) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <Swords className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Agency Required</h2>
        <p className="text-muted-foreground">Create an agency profile first to run competitor comparisons.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Swords className="h-6 w-6 text-primary" /> Competitor Audit
        </h1>
        <p className="text-muted-foreground mt-1">
          Compare your website against a competitor to identify gaps and opportunities.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleCompare} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="my-url">Your Website URL</Label>
                <Input
                  id="my-url"
                  value={myUrl}
                  onChange={(e) => setMyUrl(e.target.value)}
                  placeholder="https://youragency.com.au"
                  disabled={compareMutation.isPending}
                />
              </div>
              <div>
                <Label htmlFor="competitor-url">Competitor Website URL</Label>
                <Input
                  id="competitor-url"
                  value={competitorUrl}
                  onChange={(e) => setCompetitorUrl(e.target.value)}
                  placeholder="https://competitor.com.au"
                  disabled={compareMutation.isPending}
                />
              </div>
            </div>
            <Button type="submit" disabled={compareMutation.isPending || !agency} className="w-full md:w-auto">
              {compareMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Swords className="h-4 w-4 mr-2" />}
              Compare Websites
            </Button>
          </form>
        </CardContent>
      </Card>

      {compareMutation.isPending && (
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Analyzing both websites... This may take 20-40 seconds.</p>
          </CardContent>
        </Card>
      )}

      {result && comparison && yourSite && competitorSite && (
        <div className="space-y-6">
          {/* Score Comparison */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-primary/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-primary" /> Your Website
                </CardTitle>
                <p className="text-xs text-muted-foreground truncate">{result.myUrl}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">SEO Score</span>
                    <span className="font-bold text-primary">{Number(yourSite.seo_score) || 0}/100</span>
                  </div>
                  <Progress value={Number(yourSite.seo_score) || 0} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Conversion Score</span>
                    <span className="font-bold text-primary">{Number(yourSite.conversion_score) || 0}/100</span>
                  </div>
                  <Progress value={Number(yourSite.conversion_score) || 0} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-destructive/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Swords className="h-4 w-4 text-destructive" /> Competitor
                </CardTitle>
                <p className="text-xs text-muted-foreground truncate">{result.competitorUrl}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">SEO Score</span>
                    <span className="font-bold">{Number(competitorSite.seo_score) || 0}/100</span>
                  </div>
                  <Progress value={Number(competitorSite.seo_score) || 0} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Conversion Score</span>
                    <span className="font-bold">{Number(competitorSite.conversion_score) || 0}/100</span>
                  </div>
                  <Progress value={Number(competitorSite.conversion_score) || 0} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Comparison Summary */}
          {typeof comparison.comparison_summary === "string" && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Analysis Summary</CardTitle></CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{comparison.comparison_summary}</p>
              </CardContent>
            </Card>
          )}

          {/* Strengths & Weaknesses Side by Side */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Your Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(Array.isArray(yourSite.strengths) ? yourSite.strengths as string[] : []).map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{s}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive" /> Your Weaknesses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(Array.isArray(yourSite.weaknesses) ? yourSite.weaknesses as string[] : []).map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <XCircle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{w}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Competitive Advantages */}
          {Array.isArray(comparison.competitive_advantages) && (comparison.competitive_advantages as string[]).length > 0 && (
            <Card className="border-emerald-500/20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-emerald-400" /> Your Competitive Advantages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(comparison.competitive_advantages as string[]).map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shrink-0 mt-0.5 text-xs">Win</Badge>
                      <span className="text-muted-foreground">{a}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Action Items */}
          {Array.isArray(comparison.action_items) && (comparison.action_items as string[]).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary" /> Action Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(comparison.action_items as string[]).map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-primary font-medium shrink-0">{i + 1}.</span>
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Areas to Improve */}
          {Array.isArray(comparison.areas_to_improve) && (comparison.areas_to_improve as string[]).length > 0 && (
            <Card className="border-amber-500/20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-amber-400" /> Areas to Improve
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(comparison.areas_to_improve as string[]).map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 shrink-0 mt-0.5 text-xs">Gap</Badge>
                      <span className="text-muted-foreground">{a}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
