import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { History, ExternalLink, Clock, Download, Loader2, FileText, CalendarDays, Printer } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function openPrintWindow(html: string) {
  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    // Give fonts time to load before triggering print
    setTimeout(() => win.print(), 800);
  } else {
    toast.error("Please allow popups to print the report");
  }
}

function ReportButtons({ auditId }: { auditId: number }) {
  const [downloading, setDownloading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const utils = trpc.useUtils();

  const fetchReport = async () => {
    return await utils.audit.generatePdfReport.fetch({ auditId });
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloading(true);
    try {
      const result = await fetchReport();
      if (result) {
        downloadBlob(result.html, result.filename, "text/html;charset=utf-8;");
        toast.success("Audit report downloaded");
      }
    } catch {
      toast.error("Failed to generate report");
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setPrinting(true);
    try {
      const result = await fetchReport();
      if (result) {
        openPrintWindow(result.html);
        toast.success("Print dialog opened");
      }
    } catch {
      toast.error("Failed to generate report");
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="bg-transparent"
        onClick={handlePrint}
        disabled={printing}
      >
        {printing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Printer className="h-4 w-4 mr-2" />}
        Print Report
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="bg-transparent"
        onClick={handleDownload}
        disabled={downloading}
      >
        {downloading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
        Download Report
      </Button>
    </div>
  );
}

export default function AuditHistory() {
  const agenciesQuery = trpc.agency.list.useQuery();
  const agency = agenciesQuery.data?.[0];
  const auditsQuery = trpc.audit.listByAgency.useQuery(
    { agencyId: agency?.id ?? 0 },
    { enabled: !!agency }
  );
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const exportInput = useMemo(() => ({
    agencyId: agency?.id ?? 0,
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
  }), [agency?.id, dateFrom, dateTo]);

  const exportQuery = trpc.audit.exportCsv.useQuery(exportInput, { enabled: false });

  const handleExport = async () => {
    try {
      const result = await exportQuery.refetch();
      if (result.data) {
        downloadBlob(result.data.csv, result.data.filename, "text/csv;charset=utf-8;");
        toast.success("Audit history exported successfully");
      }
    } catch {
      toast.error("Failed to export audit history");
    }
  };

  if (!agency && !agenciesQuery.isLoading) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <History className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Agency Required</h2>
        <p className="text-muted-foreground">Create an agency profile first to view audit history.</p>
      </div>
    );
  }

  const hasAudits = (auditsQuery.data?.length ?? 0) > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit History</h1>
          <p className="text-muted-foreground mt-1">View all past website audits with scores and recommendations.</p>
        </div>
        <div className="flex items-center gap-2">
          {hasAudits && (
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

      <div className="space-y-4">
        {auditsQuery.data?.map((audit) => {
          const findings = audit.findings as Record<string, unknown> | null;
          const isExpanded = expandedId === audit.id;
          return (
            <Card
              key={audit.id}
              className="cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => setExpandedId(isExpanded ? null : audit.id)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base">{audit.websiteUrl}</CardTitle>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">SEO: {audit.seoScore ?? 0}</Badge>
                      <Badge variant="secondary">Conv: {audit.conversionScore ?? 0}</Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(audit.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">SEO Score</p>
                    <Progress value={audit.seoScore ?? 0} className="h-1.5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Conversion Score</p>
                    <Progress value={audit.conversionScore ?? 0} className="h-1.5" />
                  </div>
                </div>
              </CardHeader>
              {isExpanded && (
                <CardContent className="border-t pt-4">
                  <div className="flex justify-end mb-3">
                    <ReportButtons auditId={audit.id} />
                  </div>
                  {audit.summary && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold mb-2">Summary</h4>
                      <div className="prose prose-sm prose-invert max-w-none">
                        <Streamdown>{audit.summary}</Streamdown>
                      </div>
                    </div>
                  )}
                  {findings && (
                    <div className="prose prose-sm prose-invert max-w-none">
                      <Streamdown>{JSON.stringify(findings, null, 2)}</Streamdown>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
        {auditsQuery.data?.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <History className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No audits yet. Run your first website audit to see results here.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
