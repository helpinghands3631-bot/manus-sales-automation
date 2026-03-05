import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Megaphone, Plus, Clock, Download, CalendarDays } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function Campaigns() {
  const agenciesQuery = trpc.agency.list.useQuery();
  const agency = agenciesQuery.data?.[0];
  const campaignsQuery = trpc.campaign.listByAgency.useQuery(
    { agencyId: agency?.id ?? 0 },
    { enabled: !!agency }
  );
  const [type, setType] = useState<"facebook" | "google" | "email">("facebook");
  const [suburbs, setSuburbs] = useState("");
  const [services, setServices] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const exportInput = useMemo(() => ({
    agencyId: agency?.id ?? 0,
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
  }), [agency?.id, dateFrom, dateTo]);

  const exportQuery = trpc.campaign.exportCsv.useQuery(exportInput, { enabled: false });

  const handleExport = async () => {
    try {
      const result = await exportQuery.refetch();
      if (result.data) {
        downloadCsv(result.data.csv, result.data.filename);
        toast.success("Campaigns exported successfully");
      }
    } catch {
      toast.error("Failed to export campaigns");
    }
  };

  const generateMutation = trpc.campaign.generate.useMutation({
    onSuccess: () => {
      toast.success("Campaign generated!");
      campaignsQuery.refetch();
      setShowForm(false);
      setSuburbs("");
      setServices("");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agency) return;
    if (!suburbs.trim() || !services.trim()) { toast.error("Please fill in all fields"); return; }
    generateMutation.mutate({ agencyId: agency.id, campaignType: type, suburbs, services });
  };

  if (!agency && !agenciesQuery.isLoading) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <Megaphone className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Agency Required</h2>
        <p className="text-muted-foreground">Create an agency profile first to generate campaigns.</p>
      </div>
    );
  }

  const hasCampaigns = (campaignsQuery.data?.length ?? 0) > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Campaign Generator</h1>
          <p className="text-muted-foreground mt-1">Create ready-to-launch marketing campaigns.</p>
        </div>
        <div className="flex items-center gap-2">
          {hasCampaigns && (
            <>
              <Button variant="outline" className="bg-transparent" size="sm" onClick={() => setShowFilters(!showFilters)}>
                <CalendarDays className="h-4 w-4 mr-2" />
                {showFilters ? "Hide Filters" : "Date Filter"}
              </Button>
              <Button variant="outline" className="bg-transparent" size="sm" onClick={handleExport} disabled={exportQuery.isFetching}>
                {exportQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                Export CSV
              </Button>
            </>
          )}
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" /> New Campaign
          </Button>
        </div>
      </div>

      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-end gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">From Date</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-44 h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">To Date</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-44 h-9" />
              </div>
              {(dateFrom || dateTo) && (
                <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); }}>
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Generate New Campaign</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="space-y-2">
                <Label>Campaign Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="facebook">Facebook Ads</SelectItem>
                    <SelectItem value="google">Google Ads</SelectItem>
                    <SelectItem value="email">Email Campaign</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target Suburbs</Label>
                <Input value={suburbs} onChange={(e) => setSuburbs(e.target.value)} placeholder="e.g. Bondi, Surry Hills, Paddington" />
              </div>
              <div className="space-y-2">
                <Label>Services to Promote</Label>
                <Input value={services} onChange={(e) => setServices(e.target.value)} placeholder="e.g. Property Sales, Rentals, Appraisals" />
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={generateMutation.isPending}>
                  {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Megaphone className="h-4 w-4 mr-2" />}
                  Generate Campaign
                </Button>
                <Button type="button" variant="outline" className="bg-transparent" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {generateMutation.isPending && (
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Generating your campaign... This may take 15-30 seconds.</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {campaignsQuery.data?.map((campaign) => {
          const content = campaign.content as Record<string, unknown> | null;
          return (
            <Card key={campaign.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="capitalize">{campaign.campaignType}</Badge>
                    <CardTitle className="text-base">
                      {campaign.suburbs} — {campaign.services}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(campaign.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </CardHeader>
              {content && (
                <CardContent>
                  <div className="prose prose-sm prose-invert max-w-none">
                    <Streamdown>{typeof content === "string" ? content : JSON.stringify(content, null, 2)}</Streamdown>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
        {campaignsQuery.data?.length === 0 && !showForm && (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <Megaphone className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No campaigns yet. Click "New Campaign" to get started.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
