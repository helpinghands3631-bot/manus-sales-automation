import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { ScrollText, Loader2, Copy, Trash2, ChevronDown, ChevronUp } from "lucide-react";

export default function ListingDescription() {
  const agencies = trpc.agency.list.useQuery();
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>("");
  const [suburb, setSuburb] = useState("");
  const [propertyType, setPropertyType] = useState<"house" | "apartment" | "townhouse" | "land" | "commercial">("house");
  const [bedrooms, setBedrooms] = useState("3");
  const [bathrooms, setBathrooms] = useState("2");
  const [features, setFeatures] = useState("");
  const [targetBuyer, setTargetBuyer] = useState("families");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const agencyId = useMemo(() => selectedAgencyId ? parseInt(selectedAgencyId) : undefined, [selectedAgencyId]);
  const history = trpc.listingDescription.list.useQuery(
    { agencyId: agencyId! },
    { enabled: !!agencyId }
  );

  const generate = trpc.listingDescription.generate.useMutation({
    onSuccess: () => {
      toast.success("Listing description generated!");
      history.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteDesc = trpc.listingDescription.delete.useMutation({
    onSuccess: () => {
      toast.success("Description deleted");
      history.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleGenerate = () => {
    if (!agencyId) { toast.error("Please select an agency"); return; }
    if (!suburb.trim()) { toast.error("Please enter a suburb"); return; }
    generate.mutate({
      agencyId, suburb, propertyType,
      propertyAddress: suburb,
      bedrooms: parseInt(bedrooms) || 3,
      bathrooms: parseInt(bathrooms) || 2,
      keyFeatures: features || undefined,
      targetBuyer: targetBuyer || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ScrollText className="h-6 w-6 text-emerald-400" />
          Listing Description Generator
        </h1>
        <p className="text-muted-foreground mt-1">AI-powered property listing copy tailored to your suburb and target buyer</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate New Description</CardTitle>
          <CardDescription>Provide property details and the AI will craft compelling listing copy</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              <Input placeholder="e.g. Surry Hills" value={suburb} onChange={e => setSuburb(e.target.value)} />
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
              <Label>Bedrooms</Label>
              <Input type="number" min="0" max="20" value={bedrooms} onChange={e => setBedrooms(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Bathrooms</Label>
              <Input type="number" min="0" max="10" value={bathrooms} onChange={e => setBathrooms(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Target Buyer</Label>
              <Select value={targetBuyer} onValueChange={setTargetBuyer}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="families">Families</SelectItem>
                  <SelectItem value="investors">Investors</SelectItem>
                  <SelectItem value="first_home_buyers">First Home Buyers</SelectItem>
                  <SelectItem value="downsizers">Downsizers</SelectItem>
                  <SelectItem value="luxury">Luxury Buyers</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Key Features (optional)</Label>
            <Textarea
              placeholder="e.g. Renovated kitchen, north-facing backyard, close to schools, harbour views..."
              value={features}
              onChange={e => setFeatures(e.target.value)}
              rows={3}
            />
          </div>
          <Button onClick={handleGenerate} disabled={generate.isPending} className="bg-emerald-600 hover:bg-emerald-700">
            {generate.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Generating...</> : "Generate Listing Description"}
          </Button>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>Generated Descriptions</CardTitle>
          <CardDescription>{history.data?.length ?? 0} descriptions generated</CardDescription>
        </CardHeader>
        <CardContent>
          {!agencyId ? (
            <p className="text-muted-foreground text-center py-6">Select an agency to view generated descriptions</p>
          ) : history.isLoading ? (
            <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded" />)}</div>
          ) : history.data && history.data.length > 0 ? (
            <div className="space-y-3">
              {history.data.map((desc) => (
                <div key={desc.id} className="border rounded-lg overflow-hidden">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpandedId(expandedId === desc.id ? null : desc.id)}
                  >
                    <div className="flex items-center gap-3">
                      <ScrollText className="h-4 w-4 text-emerald-400" />
                      <div>
                        <p className="font-medium">{desc.suburb} — {desc.propertyType}</p>
                        <p className="text-xs text-muted-foreground">
                          {desc.bedrooms}bd / {desc.bathrooms}ba · {new Date(desc.createdAt).toLocaleDateString("en-AU")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{desc.targetBuyer || "General"}</Badge>
                      {expandedId === desc.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                  {expandedId === desc.id && (
                    <div className="border-t p-4 space-y-3">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <Streamdown>{desc.content}</Streamdown>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(desc.content); toast.success("Copied!"); }}>
                          <Copy className="h-3 w-3 mr-1" />Copy
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-400 hover:text-red-300" onClick={() => deleteDesc.mutate({ id: desc.id })}>
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
              <ScrollText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No descriptions generated yet. Create your first one above!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
