import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BarChart3, FileText, Globe, Megaphone, PenTool, ScrollText } from "lucide-react";

const FEATURE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  audits: { label: "Website Audits", icon: <Globe className="h-5 w-5" />, color: "text-teal-400" },
  campaigns: { label: "Campaigns", icon: <Megaphone className="h-5 w-5" />, color: "text-blue-400" },
  suburbPages: { label: "Suburb Pages", icon: <FileText className="h-5 w-5" />, color: "text-purple-400" },
  appraisalLetters: { label: "Appraisal Letters", icon: <PenTool className="h-5 w-5" />, color: "text-amber-400" },
  listingDescriptions: { label: "Listing Descriptions", icon: <ScrollText className="h-5 w-5" />, color: "text-emerald-400" },
};

export default function UsageDashboard() {
  const { data, isLoading } = trpc.usage.getUsage.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold">Usage Analytics</h1><p className="text-muted-foreground">Loading...</p></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5].map(i => <Card key={i} className="animate-pulse"><CardContent className="h-32" /></Card>)}
        </div>
      </div>
    );
  }

  if (!data) return <div className="text-muted-foreground">Unable to load usage data.</div>;

  const planLabel = data.plan.charAt(0).toUpperCase() + data.plan.slice(1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-teal-400" />
            Usage Analytics
          </h1>
          <p className="text-muted-foreground mt-1">Track your feature usage against your plan limits</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-1 border-teal-500 text-teal-400">
          {planLabel} Plan
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(FEATURE_META).map(([key, meta]) => {
          const used = data.usage[key as keyof typeof data.usage] ?? 0;
          const limit = data.limits[key as keyof typeof data.limits] ?? 0;
          const pct = data.percentages[key as keyof typeof data.percentages] ?? 0;
          const isNearLimit = pct >= 80;
          const isAtLimit = pct >= 100;

          return (
            <Card key={key} className={isAtLimit ? "border-red-500/50" : isNearLimit ? "border-amber-500/50" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className={meta.color}>{meta.icon}</span>
                  {meta.label}
                </CardTitle>
                <CardDescription>
                  {used} / {limit >= 999 ? "Unlimited" : limit} used
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Progress
                  value={Math.min(pct, 100)}
                  className="h-3"
                />
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>{pct}% used</span>
                  {isAtLimit && <span className="text-red-400 font-medium">Limit reached</span>}
                  {isNearLimit && !isAtLimit && <span className="text-amber-400 font-medium">Nearing limit</span>}
                  {!isNearLimit && <span className="text-emerald-400">{limit >= 999 ? "Unlimited" : `${limit - used} remaining`}</span>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {data.plan === "free" && (
        <Card className="border-teal-500/30 bg-teal-500/5">
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <h3 className="text-lg font-semibold">Upgrade to unlock more</h3>
              <p className="text-muted-foreground text-sm">
                You're on the Free plan. Upgrade to Starter, Growth, or Dominator for higher limits and premium features.
              </p>
              <a href="/subscription" className="inline-block bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">
                View Plans
              </a>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
