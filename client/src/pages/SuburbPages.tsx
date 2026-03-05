import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Plus, Clock, Download, CalendarDays } from "lucide-react";
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

export default function SuburbPages() {
  const agenciesQuery = trpc.agency.list.useQuery();
  const agency = agenciesQuery.data?.[0];
  const pagesQuery = trpc.suburbPage.listByAgency.useQuery(
    { agencyId: agency?.id ?? 0 },
    { enabled: !!agency }
  );
  const [suburb, setSuburb] = useState("");
  const [service, setService] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const exportInput = useMemo(() => ({
    agencyId: agency?.id ?? 0,
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
  }), [agency?.id, dateFrom, dateTo]);

  const exportQuery = trpc.suburbPage.exportCsv.useQuery(exportInput, { enabled: false });

  const handleExport = async () => {
    try {
      const result = await exportQuery.refetch();
      if (result.data) {
        downloadCsv(result.data.csv, result.data.filename);
        toast.success("Suburb pages exported successfully");
      }
    } catch {
      toast.error("Failed to export suburb pages");
    }
  };

  const generateMutation = trpc.suburbPage.generate.useMutation({
    onSuccess: () => {
      toast.success("Suburb page generated!");
      pagesQuery.refetch();
      setShowForm(false);
      setSuburb("");
      setService("");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agency) return;
    if (!suburb.trim() || !service.trim()) { toast.error("Please fill in all fields"); return; }
    generateMutation.mutate({ agencyId: agency.id, suburb, service });
  };

  if (!agency && !agenciesQuery.isLoading) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <MapPin className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Agency Required</h2>
        <p className="text-muted-foreground">Create an agency profile first to build suburb pages.</p>
      </div>
    );
  }

  const hasPages = (pagesQuery.data?.length ?? 0) > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">SEO Suburb Page Builder</h1>
          <p className="text-muted-foreground mt-1">Generate SEO-optimized landing pages for your target suburbs.</p>
        </div>
        <div className="flex items-center gap-2">
          {hasPages && (
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
            <Plus className="h-4 w-4 mr-2" /> New Page
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
          <CardHeader><CardTitle>Generate Suburb Page</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="space-y-2">
                <Label>Suburb</Label>
                <Input value={suburb} onChange={(e) => setSuburb(e.target.value)} placeholder="e.g. Bondi Beach" />
              </div>
              <div className="space-y-2">
                <Label>Service</Label>
                <Input value={service} onChange={(e) => setService(e.target.value)} placeholder="e.g. Property Sales" />
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={generateMutation.isPending}>
                  {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MapPin className="h-4 w-4 mr-2" />}
                  Generate Page
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
            <p className="text-muted-foreground">Generating suburb page... This may take 15-30 seconds.</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {pagesQuery.data?.map((page) => {
          const content = page.pageContent as Record<string, unknown> | null;
          return (
            <Card key={page.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{page.suburb}</Badge>
                    <CardTitle className="text-base">{page.service}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(page.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </CardHeader>
              {content && (
                <CardContent>
                  <div className="prose prose-sm prose-invert max-w-none">
                    <Streamdown>
                      {typeof content === "string" ? content : JSON.stringify(content, null, 2)}
                    </Streamdown>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
        {pagesQuery.data?.length === 0 && !showForm && (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <MapPin className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No suburb pages yet. Click "New Page" to get started.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
