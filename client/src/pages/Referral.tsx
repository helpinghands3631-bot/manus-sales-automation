import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, Gift, Share2, Users, UserPlus, CheckCircle } from "lucide-react";

export default function Referral() {
  const { data: codeData, isLoading: codeLoading } = trpc.referral.getMyCode.useQuery();
  const { data: stats, isLoading: statsLoading } = trpc.referral.getStats.useQuery();
  const { data: referrals, isLoading: refsLoading } = trpc.referral.listMine.useQuery();
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    if (codeData?.link) {
      navigator.clipboard.writeText(codeData.link);
      setCopied(true);
      toast.success("Referral link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareLink = () => {
    if (codeData?.link && navigator.share) {
      navigator.share({
        title: "Keys For Agents — AI Real Estate Marketing",
        text: "Check out Keys For Agents — the AI-powered platform for real estate agencies. Use my referral link to get started!",
        url: codeData.link,
      }).catch(() => {});
    } else {
      copyLink();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Gift className="h-6 w-6 text-teal-400" />
          Referral Program
        </h1>
        <p className="text-muted-foreground mt-1">Share Keys For Agents and earn rewards for every agency that signs up</p>
      </div>

      {/* Referral Link Card */}
      <Card className="border-teal-500/30 bg-gradient-to-br from-teal-500/5 to-emerald-500/5">
        <CardHeader>
          <CardTitle>Your Referral Link</CardTitle>
          <CardDescription>Share this link with other real estate agencies</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {codeLoading ? (
            <div className="h-12 bg-muted animate-pulse rounded-lg" />
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-muted rounded-lg px-4 py-3 font-mono text-sm truncate">
                  {codeData?.link || "Loading..."}
                </div>
                <Button variant="outline" size="icon" onClick={copyLink}>
                  {copied ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="icon" onClick={shareLink}>
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Your referral code: <Badge variant="secondary" className="font-mono">{codeData?.code}</Badge>
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Referrals", value: stats?.totalReferrals ?? 0, icon: <Users className="h-5 w-5" />, color: "text-blue-400" },
          { label: "Signed Up", value: stats?.signedUp ?? 0, icon: <UserPlus className="h-5 w-5" />, color: "text-teal-400" },
          { label: "Subscribed", value: stats?.subscribed ?? 0, icon: <CheckCircle className="h-5 w-5" />, color: "text-emerald-400" },
          { label: "Rewards Earned", value: stats?.rewarded ?? 0, icon: <Gift className="h-5 w-5" />, color: "text-amber-400" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6 text-center">
              <div className={`${stat.color} flex justify-center mb-2`}>{stat.icon}</div>
              <div className="text-3xl font-bold">{statsLoading ? "—" : stat.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Referral History */}
      <Card>
        <CardHeader>
          <CardTitle>Referral History</CardTitle>
          <CardDescription>Track who signed up through your referral link</CardDescription>
        </CardHeader>
        <CardContent>
          {refsLoading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>
          ) : referrals && referrals.length > 0 ? (
            <div className="space-y-3">
              {referrals.map((ref) => (
                <div key={ref.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Referral #{ref.id}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(ref.createdAt).toLocaleDateString("en-AU")}
                      </p>
                    </div>
                  </div>
                  <Badge variant={ref.status === "rewarded" ? "default" : ref.status === "subscribed" ? "secondary" : "outline"}>
                    {ref.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No referrals yet. Share your link to get started!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
