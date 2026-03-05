import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Building2, Search, Megaphone, MapPin, MessageSquare, ArrowRight,
  BarChart3, TrendingUp, FileText, Crown, Clock, Activity,
} from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const onboardingQuery = trpc.onboarding.status.useQuery(undefined, { enabled: !!user });
  const agenciesQuery = trpc.agency.list.useQuery();
  const statsQuery = trpc.dashboard.stats.useQuery();
  const activityQuery = trpc.dashboard.recentActivity.useQuery();
  const subQuery = trpc.dashboard.subscription.useQuery();

  // Redirect new users to onboarding
  useEffect(() => {
    if (onboardingQuery.data && onboardingQuery.data.onboardingComplete === 0) {
      setLocation("/onboarding");
    }
  }, [onboardingQuery.data, setLocation]);

  const agencies = agenciesQuery.data ?? [];
  const hasAgency = agencies.length > 0;
  const firstAgency = agencies[0];
  const stats = statsQuery.data;
  const activities = activityQuery.data ?? [];
  const subscription = subQuery.data;

  const isLoading = agenciesQuery.isLoading || statsQuery.isLoading;

  const activityIcon = (type: string) => {
    switch (type) {
      case "audit": return <Search className="h-4 w-4 text-blue-400" />;
      case "campaign": return <Megaphone className="h-4 w-4 text-amber-400" />;
      case "suburb_page": return <MapPin className="h-4 w-4 text-purple-400" />;
      default: return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const planLabel = (plan?: string) => {
    if (!plan) return null;
    const colors: Record<string, string> = {
      starter: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      growth: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      dominator: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    };
    return (
      <Badge variant="outline" className={colors[plan] || ""}>
        <Crown className="h-3 w-3 mr-1" />
        {plan.charAt(0).toUpperCase() + plan.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back{user?.name ? `, ${user.name}` : ""}
          </h1>
          <p className="text-muted-foreground mt-1">
            Your AI-powered real estate marketing command centre.
          </p>
        </div>
        {subscription && planLabel(subscription.plan)}
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : !hasAgency ? (
        <Card className="border-dashed border-2 border-primary/30">
          <CardContent className="p-8 text-center">
            <Building2 className="h-12 w-12 text-primary/40 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Set Up Your Agency</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Create your agency profile to unlock all AI-powered marketing tools.
            </p>
            <Button onClick={() => setLocation("/agency")}>
              Create Agency Profile <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Agency Card */}
          <Card className="bg-gradient-to-r from-primary/10 to-transparent border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Agency</p>
                  <h3 className="text-xl font-bold mt-1">{firstAgency.name}</h3>
                  {firstAgency.websiteUrl && (
                    <p className="text-sm text-muted-foreground mt-1">{firstAgency.websiteUrl}</p>
                  )}
                </div>
                <Button variant="outline" size="sm" className="bg-transparent" onClick={() => setLocation("/agency")}>
                  Edit Profile
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <FileText className="h-5 w-5 text-blue-400" />
                  <span className="text-2xl font-bold">{stats?.audits ?? 0}</span>
                </div>
                <p className="text-sm text-muted-foreground">Total Audits</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <Megaphone className="h-5 w-5 text-amber-400" />
                  <span className="text-2xl font-bold">{stats?.campaigns ?? 0}</span>
                </div>
                <p className="text-sm text-muted-foreground">Campaigns</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <MapPin className="h-5 w-5 text-purple-400" />
                  <span className="text-2xl font-bold">{stats?.suburbPages ?? 0}</span>
                </div>
                <p className="text-sm text-muted-foreground">Suburb Pages</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <Building2 className="h-5 w-5 text-emerald-400" />
                  <span className="text-2xl font-bold">{stats?.agencies ?? 0}</span>
                </div>
                <p className="text-sm text-muted-foreground">Agencies</p>
              </CardContent>
            </Card>
          </div>

          {/* Score Averages */}
          {(stats?.avgSeoScore || stats?.avgConversionScore) ? (
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" /> Average SEO Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-3">
                    <span className="text-3xl font-bold text-primary">{stats.avgSeoScore}</span>
                    <span className="text-muted-foreground text-sm mb-1">/100</span>
                  </div>
                  <Progress value={stats.avgSeoScore} className="mt-3 h-2" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" /> Average Conversion Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-3">
                    <span className="text-3xl font-bold text-primary">{stats.avgConversionScore}</span>
                    <span className="text-muted-foreground text-sm mb-1">/100</span>
                  </div>
                  <Progress value={stats.avgConversionScore} className="mt-3 h-2" />
                </CardContent>
              </Card>
            </div>
          ) : null}

          {/* Quick Actions + Recent Activity */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Quick Actions */}
            <div className="lg:col-span-1 space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-primary" /> Quick Actions
              </h2>
              {[
                { icon: Search, title: "Website Audit", desc: "Analyze your website", path: "/audit", color: "text-blue-400" },
                { icon: MessageSquare, title: "AI Lead Coach", desc: "Get expert advice", path: "/chat", color: "text-emerald-400" },
                { icon: Megaphone, title: "Campaigns", desc: "Generate campaigns", path: "/campaigns", color: "text-amber-400" },
                { icon: MapPin, title: "Suburb Pages", desc: "Build SEO pages", path: "/suburb-pages", color: "text-purple-400" },
              ].map((item) => (
                <Card
                  key={item.title}
                  className="group hover:border-primary/30 transition-all cursor-pointer"
                  onClick={() => setLocation(item.path)}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <item.icon className={`h-5 w-5 ${item.color} shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Recent Activity */}
            <div className="lg:col-span-2">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-primary" /> Recent Activity
              </h2>
              <Card>
                <CardContent className="p-0">
                  {activityQuery.isLoading ? (
                    <div className="p-6 space-y-3">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                  ) : activities.length === 0 ? (
                    <div className="p-8 text-center">
                      <Activity className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No activity yet. Run your first audit to get started!</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {activities.map((activity, i) => (
                        <div key={i} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                          <div className="shrink-0">{activityIcon(activity.type)}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{activity.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {new Date(activity.date).toLocaleDateString("en-AU", { month: "short", day: "numeric" })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Subscription CTA */}
          {!subscription && (
            <Card className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    <Crown className="h-5 w-5 text-primary" /> Upgrade Your Plan
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Unlock unlimited audits, campaigns, and priority support.
                  </p>
                </div>
                <Button onClick={() => setLocation("/subscription")}>
                  View Plans <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
