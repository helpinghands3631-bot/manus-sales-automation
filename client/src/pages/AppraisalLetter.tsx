import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { PenTool, Loader2, Copy, Trash2, ChevronDown, ChevronUp } from "lucide-react";

export default function AppraisalLetter() {
  const { user } = useAuth();
  const agencies = trpc.agency.list.useQuery();
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>("");
  const [suburb, setSuburb] = useState("");
  const [propertyType, setPropertyType] = useState<"house" | "apartment" | "townhouse" | "land" | "commercial">("house");
  const [tone, setTone] = useState("professional");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const agencyId = useMemo(() => selectedAgencyId ? parseInt(selectedAgencyId) : undefined, [selectedAgencyId]);
  const history = trpc.appraisalLetter.list.useQuery(
    { agencyId: agencyId! },
    { enabled: !!agencyId }
  );

  const generate = trpc.appraisalLetter.generate.useMutation({
    onSuccess: () => {
      toast.success("Appraisal letter generated!");
      history.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteLetter = trpc.appraisalLetter.delete.useMutation({
    onSuccess: () => {
      toast.success("Letter deleted");
      history.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleGenerate = () => {
    if (!agencyId) { toast.error("Please select an agency"); return; }
    if (!suburb.trim()) { toast.error("Please enter a suburb"); return; }
    generate.mutate({ agencyId, suburb, propertyType });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <PenTool className="h-6 w-6 text-amber-400" />
          Appraisal Letter Generator
        </h1>
        <p className="text-muted-foreground mt-1">Generate personalised appraisal letters for specific suburbs and property types</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate New Letter</CardTitle>
          <CardDescription>AI will create a professional appraisal letter tailored to your agency and target area</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Agency</Label>
              <Select value={selectedAgencyId} onValueChange={setSelectedAgencyId}>
                <SelectTrigger><SelectValue placeholder="Select agency" /></SelectTrigger>
                <SelectContent>
                  {agencies.data?.map(a => (
                    <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Suburb</Label>
              <Input placeholder="e.g. Bondi Beach" value={suburb} onChange={e => setSuburb(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Property Type</Label>
              <Select value={propertyType} onValueChange={(v) => setPropertyType(v as typeof propertyType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="house">House</SelectItem>
                  <SelectItem value="apartment">Apartment / Unit</SelectItem>
                  <SelectItem value="townhouse">Townhouse</SelectItem>
                  <SelectItem value="land">Vacant Land</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="friendly">Friendly & Warm</SelectItem>
                  <SelectItem value="authoritative">Authoritative & Data-Driven</SelectItem>
                  <SelectItem value="luxury">Luxury / Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleGenerate} disabled={generate.isPending} className="bg-amber-600 hover:bg-amber-700">
            {generate.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Generating...</> : "Generate Appraisal Letter"}
          </Button>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>Generated Letters</CardTitle>
          <CardDescription>{history.data?.length ?? 0} letters generated</CardDescription>
        </CardHeader>
        <CardContent>
          {!agencyId ? (
            <p className="text-muted-foreground text-center py-6">Select an agency to view generated letters</p>
          ) : history.isLoading ? (
            <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded" />)}</div>
          ) : history.data && history.data.length > 0 ? (
            <div className="space-y-3">
              {history.data.map((letter) => (
                <div key={letter.id} className="border rounded-lg overflow-hidden">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpandedId(expandedId === letter.id ? null : letter.id)}
                  >
                    <div className="flex items-center gap-3">
                      <PenTool className="h-4 w-4 text-amber-400" />
                      <div>
                        <p className="font-medium">{letter.suburb} — {letter.propertyType}</p>
                        <p className="text-xs text-muted-foreground">{new Date(letter.createdAt).toLocaleDateString("en-AU")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{letter.propertyType}</Badge>
                      {expandedId === letter.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                  {expandedId === letter.id && (
                    <div className="border-t p-4 space-y-3">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <Streamdown>{letter.content}</Streamdown>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(letter.content); toast.success("Copied!"); }}>
                          <Copy className="h-3 w-3 mr-1" />Copy
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-400 hover:text-red-300" onClick={() => deleteLetter.mutate({ id: letter.id })}>
                          <Trash2 className="h-3 w-3 mr-1" />Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <PenTool className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No letters generated yet. Create your first one above!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
