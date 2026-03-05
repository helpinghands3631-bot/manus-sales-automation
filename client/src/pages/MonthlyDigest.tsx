import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { BarChart3, Calendar, FileText, Globe, Loader2, Mail, Send, Settings2, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

type Prefs = {
  showAudits: boolean;
  showCampaigns: boolean;
  showSuburbPages: boolean;
  showScores: boolean;
  showHighlights: boolean;
  showAgencyBreakdown: boolean;
};

const defaultPrefs: Prefs = {
  showAudits: true,
  showCampaigns: true,
  showSuburbPages: true,
  showScores: true,
  showHighlights: true,
  showAgencyBreakdown: true,
};

export default function MonthlyDigest() {
  const { user } = useAuth();
  const [monthsBack, setMonthsBack] = useState(1);
  const [emailPreview, setEmailPreview] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [localPrefs, setLocalPrefs] = useState<Prefs>(defaultPrefs);

  const { data: digest, isLoading } = trpc.digest.preview.useQuery({ monthsBack });
  const { data: savedPrefs, isLoading: prefsLoading } = trpc.digest.getPreferences.useQuery();

  const utils = trpc.useUtils();
  const updatePrefs = trpc.digest.updatePreferences.useMutation({
    onSuccess: () => {
      toast.success("Digest preferences saved!");
      utils.digest.getPreferences.invalidate();
      utils.digest.preview.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const sendToMe = trpc.digest.sendToMe.useMutation({
    onSuccess: (result) => {
      toast.success(`Digest for ${result.period} sent successfully!`);
      setEmailPreview(result.emailHtml);
    },
    onError: (err) => toast.error(err.message),
  });

  const broadcastAll = trpc.digest.broadcastAll.useMutation({
    onSuccess: (result) => {
      toast.success(`Broadcast complete: sent to ${result.sent} of ${result.total} users`);
    },
    onError: (err) => toast.error(err.message),
  });

  // Sync local prefs with server prefs
  useEffect(() => {
    if (savedPrefs) {
      setLocalPrefs({
        showAudits: (savedPrefs.showAudits ?? 1) === 1,
        showCampaigns: (savedPrefs.showCampaigns ?? 1) === 1,
        showSuburbPages: (savedPrefs.showSuburbPages ?? 1) === 1,
        showScores: (savedPrefs.showScores ?? 1) === 1,
        showHighlights: (savedPrefs.showHighlights ?? 1) === 1,
        showAgencyBreakdown: (savedPrefs.showAgencyBreakdown ?? 1) === 1,
      });
    }
  }, [savedPrefs]);

  const togglePref = (key: keyof Prefs) => {
    setLocalPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const savePreferences = () => {
    updatePrefs.mutate(localPrefs);
  };

  if (isLoading || prefsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
      </div>
    );
  }

  // Apply preferences to filter the preview
  const prefs = savedPrefs
    ? {
        showAudits: (savedPrefs.showAudits ?? 1) === 1,
        showCampaigns: (savedPrefs.showCampaigns ?? 1) === 1,
        showSuburbPages: (savedPrefs.showSuburbPages ?? 1) === 1,
        showScores: (savedPrefs.showScores ?? 1) === 1,
        showHighlights: (savedPrefs.showHighlights ?? 1) === 1,
        showAgencyBreakdown: (savedPrefs.showAgencyBreakdown ?? 1) === 1,
      }
    : defaultPrefs;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Monthly Digest</h1>
          <p className="text-muted-foreground mt-1">Preview and send your monthly activity summary</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className={showSettings ? "border-teal-500 text-teal-400" : ""}
          >
            <Settings2 className="h-4 w-4 mr-2" />
            Customize
          </Button>
          <Select value={String(monthsBack)} onValueChange={(v) => setMonthsBack(Number(v))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last Month</SelectItem>
              <SelectItem value="2">2 Months Ago</SelectItem>
              <SelectItem value="3">3 Months Ago</SelectItem>
              <SelectItem value="6">6 Months Ago</SelectItem>
              <SelectItem value="12">12 Months Ago</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Preferences Panel */}
      {showSettings && (
        <Card className="border-teal-500/30 bg-teal-500/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-teal-400" />
              Digest Preferences
            </CardTitle>
            <CardDescription>Choose which sections appear in your monthly email digest</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center justify-between space-x-3 rounded-lg border border-border p-4">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-4 w-4 text-teal-400" />
                  <Label htmlFor="pref-audits" className="text-sm font-medium cursor-pointer">Audits Count</Label>
                </div>
                <Switch id="pref-audits" checked={localPrefs.showAudits} onCheckedChange={() => togglePref("showAudits")} />
              </div>
              <div className="flex items-center justify-between space-x-3 rounded-lg border border-border p-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-emerald-400" />
                  <Label htmlFor="pref-campaigns" className="text-sm font-medium cursor-pointer">Campaigns Count</Label>
                </div>
                <Switch id="pref-campaigns" checked={localPrefs.showCampaigns} onCheckedChange={() => togglePref("showCampaigns")} />
              </div>
              <div className="flex items-center justify-between space-x-3 rounded-lg border border-border p-4">
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-cyan-400" />
                  <Label htmlFor="pref-suburb" className="text-sm font-medium cursor-pointer">Suburb Pages Count</Label>
                </div>
                <Switch id="pref-suburb" checked={localPrefs.showSuburbPages} onCheckedChange={() => togglePref("showSuburbPages")} />
              </div>
              <div className="flex items-center justify-between space-x-3 rounded-lg border border-border p-4">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-4 w-4 text-yellow-400" />
                  <Label htmlFor="pref-scores" className="text-sm font-medium cursor-pointer">Average Scores</Label>
                </div>
                <Switch id="pref-scores" checked={localPrefs.showScores} onCheckedChange={() => togglePref("showScores")} />
              </div>
              <div className="flex items-center justify-between space-x-3 rounded-lg border border-border p-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-purple-400" />
                  <Label htmlFor="pref-highlights" className="text-sm font-medium cursor-pointer">Highlights</Label>
                </div>
                <Switch id="pref-highlights" checked={localPrefs.showHighlights} onCheckedChange={() => togglePref("showHighlights")} />
              </div>
              <div className="flex items-center justify-between space-x-3 rounded-lg border border-border p-4">
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-orange-400" />
                  <Label htmlFor="pref-agency" className="text-sm font-medium cursor-pointer">Agency Breakdown</Label>
                </div>
                <Switch id="pref-agency" checked={localPrefs.showAgencyBreakdown} onCheckedChange={() => togglePref("showAgencyBreakdown")} />
              </div>
            </div>
            <Separator />
            <div className="flex justify-end">
              <Button
                onClick={savePreferences}
                disabled={updatePrefs.isPending}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {updatePrefs.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Preferences
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Period Banner */}
      {digest && (
        <Card className="bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border-teal-500/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-6 w-6 text-teal-400" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">{digest.period}</h2>
                <p className="text-sm text-muted-foreground">
                  {new Date(digest.dateFrom).toLocaleDateString("en-AU")} — {new Date(digest.dateTo).toLocaleDateString("en-AU")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Metrics — filtered by preferences */}
      {digest && (prefs.showAudits || prefs.showCampaigns || prefs.showSuburbPages) && (
        <div className={`grid gap-4 ${
          [prefs.showAudits, prefs.showCampaigns, prefs.showSuburbPages].filter(Boolean).length <= 2
            ? "grid-cols-2"
            : "grid-cols-2 md:grid-cols-3"
        }`}>
          {prefs.showAudits && (
            <Card>
              <CardContent className="p-4 text-center">
                <BarChart3 className="h-5 w-5 text-teal-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-foreground">{digest.totals.audits}</div>
                <div className="text-xs text-muted-foreground">Audits</div>
              </CardContent>
            </Card>
          )}
          {prefs.showCampaigns && (
            <Card>
              <CardContent className="p-4 text-center">
                <FileText className="h-5 w-5 text-emerald-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-foreground">{digest.totals.campaigns}</div>
                <div className="text-xs text-muted-foreground">Campaigns</div>
              </CardContent>
            </Card>
          )}
          {prefs.showSuburbPages && (
            <Card>
              <CardContent className="p-4 text-center">
                <Globe className="h-5 w-5 text-cyan-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-foreground">{digest.totals.suburbPages}</div>
                <div className="text-xs text-muted-foreground">Suburb Pages</div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Scores — filtered by preferences */}
      {digest && prefs.showScores && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-teal-400">{digest.totals.avgSeoScore}</div>
              <div className="text-xs text-muted-foreground">Avg SEO Score</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-emerald-400">{digest.totals.avgConversionScore}</div>
              <div className="text-xs text-muted-foreground">Avg Conv. Score</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Agency Breakdown — filtered by preferences */}
      {digest && prefs.showAgencyBreakdown && digest.agencies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Agency Breakdown</CardTitle>
            <CardDescription>Performance by agency for {digest.period}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left p-3 font-medium">Agency</th>
                    <th className="text-center p-3 font-medium">Audits</th>
                    <th className="text-center p-3 font-medium">Campaigns</th>
                    <th className="text-center p-3 font-medium">Pages</th>
                    <th className="text-center p-3 font-medium">SEO</th>
                    <th className="text-center p-3 font-medium">Conversion</th>
                  </tr>
                </thead>
                <tbody>
                  {digest.agencies.map((agency, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium text-foreground">{agency.name}</td>
                      <td className="p-3 text-center text-muted-foreground">{agency.audits}</td>
                      <td className="p-3 text-center text-muted-foreground">{agency.campaigns}</td>
                      <td className="p-3 text-center text-muted-foreground">{agency.suburbPages}</td>
                      <td className="p-3 text-center">
                        <span className={`font-semibold ${agency.avgSeoScore >= 70 ? "text-emerald-400" : agency.avgSeoScore >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                          {agency.avgSeoScore}/100
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`font-semibold ${agency.avgConversionScore >= 70 ? "text-emerald-400" : agency.avgConversionScore >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                          {agency.avgConversionScore}/100
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Highlights — filtered by preferences */}
      {digest && prefs.showHighlights && digest.highlights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Highlights</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {digest.highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-teal-400 mt-0.5">•</span>
                  {h}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {digest && digest.totals.audits === 0 && digest.totals.campaigns === 0 && digest.totals.suburbPages === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Mail className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Activity This Period</h3>
            <p className="text-muted-foreground text-sm">There were no audits, campaigns, or suburb pages created during {digest.period}. Try selecting a different period.</p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={() => sendToMe.mutate({ monthsBack })}
          disabled={sendToMe.isPending}
          className="bg-teal-600 hover:bg-teal-700"
        >
          {sendToMe.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
          Send Digest to Me
        </Button>

        {user?.role === "admin" && (
          <Button
            variant="outline"
            onClick={() => {
              if (confirm("This will send the monthly digest to ALL active users. Continue?")) {
                broadcastAll.mutate();
              }
            }}
            disabled={broadcastAll.isPending}
          >
            {broadcastAll.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Users className="h-4 w-4 mr-2" />}
            Broadcast to All Users
          </Button>
        )}
      </div>

      {/* Email Preview */}
      {emailPreview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Email Preview</CardTitle>
            <CardDescription>This is how the digest email looks (respecting your preferences)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg overflow-hidden border border-border">
              <iframe
                srcDoc={emailPreview}
                className="w-full h-[600px]"
                title="Email Preview"
                sandbox="allow-same-origin"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
