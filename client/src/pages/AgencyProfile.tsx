import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Building2, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function AgencyProfile() {
  const utils = trpc.useUtils();
  const agenciesQuery = trpc.agency.list.useQuery();
  const agency = agenciesQuery.data?.[0];

  const [name, setName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [primarySuburbs, setPrimarySuburbs] = useState("");
  const [services, setServices] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (agency) {
      setName(agency.name || "");
      setWebsiteUrl(agency.websiteUrl || "");
      setPrimarySuburbs(agency.primarySuburbs || "");
      setServices(agency.services || "");
      setPhone(agency.phone || "");
    }
  }, [agency]);

  const createMutation = trpc.agency.create.useMutation({
    onSuccess: () => { toast.success("Agency created successfully"); utils.agency.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.agency.update.useMutation({
    onSuccess: () => { toast.success("Agency updated successfully"); utils.agency.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Agency name is required"); return; }
    if (agency) {
      updateMutation.mutate({ id: agency.id, name, websiteUrl, primarySuburbs, services, phone });
    } else {
      createMutation.mutate({ name, websiteUrl, primarySuburbs, services, phone });
    }
  };

  if (agenciesQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Agency Profile</h1>
        <p className="text-muted-foreground mt-1">
          {agency ? "Update your agency details to get better AI recommendations." : "Set up your agency to unlock all AI tools."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>{agency ? "Edit Agency" : "Create Agency"}</CardTitle>
              <CardDescription>This information helps our AI generate better results.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Agency Name *</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Keys For Agents" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website URL</Label>
              <Input id="website" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://youragency.com.au" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="suburbs">Primary Suburbs</Label>
              <Textarea id="suburbs" value={primarySuburbs} onChange={(e) => setPrimarySuburbs(e.target.value)} placeholder="e.g. Bondi, Surry Hills, Paddington" rows={2} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="services">Services Offered</Label>
              <Textarea id="services" value={services} onChange={(e) => setServices(e.target.value)} placeholder="e.g. Property Management, Sales, Rentals, Buyer's Agent" rows={2} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+61 2 1234 5678" />
            </div>
            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {agency ? "Save Changes" : "Create Agency"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
