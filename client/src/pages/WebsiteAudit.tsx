import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Search, AlertTriangle, AlertCircle, Lightbulb } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

export default function WebsiteAudit() {
  const agenciesQuery = trpc.agency.list.useQuery();
  const agency = agenciesQuery.data?.[0];
  const [url, setUrl] = useState("");

  const auditMutation = trpc.audit.run.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const audit = auditMutation.data;
  const findings = audit?.findings as Record<string, unknown> | undefined;

  const handleAudit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agency) { toast.error("Please create an agency profile first"); return; }
    if (!url.trim()) { toast.error("Please enter a website URL"); return; }
    auditMutation.mutate({ agencyId: agency.id, websiteUrl: url });
  };

  if (!agency && !agenciesQuery.isLoading) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Agency Required</h2>
        <p className="text-muted-foreground">Create an agency profile first to run website audits.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Website Audit</h1>
        <p className="text-muted-foreground mt-1">Analyze any real estate website for SEO and conversion opportunities.</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleAudit} className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="audit-url" className="sr-only">Website URL</Label>
              <Input
                id="audit-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://youragency.com.au"
                disabled={auditMutation.isPending}
              />
            </div>
            <Button type="submit" disabled={auditMutation.isPending || !agency}>
              {auditMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
              Run Audit
            </Button>
          </form>
        </CardContent>
      </Card>

      {auditMutation.isPending && (
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Analyzing website... This may take 15-30 seconds.</p>
          </CardContent>
        </Card>
      )}

      {audit && findings && (
        <div className="space-y-6">
          {/* Scores */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">SEO Score</CardTitle></CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{audit.seoScore ?? 0}/100</div>
                <Progress value={audit.seoScore ?? 0} className="mt-3 h-2" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Conversion Score</CardTitle></CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{audit.conversionScore ?? 0}/100</div>
                <Progress value={audit.conversionScore ?? 0} className="mt-3 h-2" />
              </CardContent>
            </Card>
          </div>

          {/* Summary */}
          {audit.summary && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Summary</CardTitle></CardHeader>
              <CardContent>
                <div className="prose prose-sm prose-invert max-w-none">
                  <Streamdown>{audit.summary}</Streamdown>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Findings */}
          {Array.isArray(findings.critical) && findings.critical.length > 0 && (
            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" /> Critical Issues
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(findings.critical as string[]).map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Badge variant="destructive" className="mt-0.5 shrink-0 text-xs">Critical</Badge>
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {Array.isArray(findings.important) && findings.important.length > 0 && (
            <Card className="border-amber-500/30">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" /> Important
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(findings.important as string[]).map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Badge variant="secondary" className="mt-0.5 shrink-0 text-xs">Important</Badge>
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {Array.isArray(findings.recommendations) && findings.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" /> Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(findings.recommendations as string[]).map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-primary font-medium shrink-0">{i + 1}.</span>
                      <span className="text-muted-foreground">{item}</span>
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
