import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Webhook, Plus, Trash2, Zap, ExternalLink } from "lucide-react";

const EVENT_LABELS: Record<string, string> = {
  new_audit: "New Audit Completed",
  new_campaign: "New Campaign Generated",
  new_suburb_page: "New Suburb Page Built",
  new_signup: "New User Signup",
  new_lead: "New Lead Captured",
  subscription_change: "Subscription Changed",
};

export default function WebhookSettings() {
  const utils = trpc.useUtils();
  const { data: webhookList, isLoading } = trpc.webhook.list.useQuery();
  const [url, setUrl] = useState("");
  const [event, setEvent] = useState("new_audit");

  const create = trpc.webhook.create.useMutation({
    onSuccess: () => {
      toast.success("Webhook created!");
      setUrl("");
      utils.webhook.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const toggle = trpc.webhook.toggle.useMutation({
    onSuccess: () => utils.webhook.list.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  const remove = trpc.webhook.delete.useMutation({
    onSuccess: () => {
      toast.success("Webhook deleted");
      utils.webhook.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleCreate = () => {
    if (!url.trim()) { toast.error("Please enter a webhook URL"); return; }
    try { new URL(url); } catch { toast.error("Please enter a valid URL"); return; }
    create.mutate({ url, events: [event] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Webhook className="h-6 w-6 text-purple-400" />
          Webhook Settings
        </h1>
        <p className="text-muted-foreground mt-1">Connect Keys For Agents to Zapier, Make, or any webhook-compatible service</p>
      </div>

      {/* Zapier Info */}
      <Card className="border-purple-500/20 bg-purple-500/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Zap className="h-8 w-8 text-purple-400 shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold mb-1">Connect with Zapier</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Create a Zap with a "Webhooks by Zapier" trigger (Catch Hook), copy the webhook URL, and paste it below.
                Events from Keys For Agents will automatically fire to your Zap.
              </p>
              <a
                href="https://zapier.com/apps/webhooks/integrations"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300"
              >
                Open Zapier <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Webhook */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" />Add Webhook</CardTitle>
          <CardDescription>Register a new webhook endpoint to receive events</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label>Webhook URL</Label>
              <Input
                placeholder="https://hooks.zapier.com/hooks/catch/..."
                value={url}
                onChange={e => setUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Event</Label>
              <Select value={event} onValueChange={setEvent}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(EVENT_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleCreate} disabled={create.isPending} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="h-4 w-4 mr-2" />Add Webhook
          </Button>
        </CardContent>
      </Card>

      {/* Webhook List */}
      <Card>
        <CardHeader>
          <CardTitle>Active Webhooks</CardTitle>
          <CardDescription>{webhookList?.length ?? 0} webhook(s) configured</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded" />)}</div>
          ) : webhookList && webhookList.length > 0 ? (
            <div className="space-y-3">
              {webhookList.map((wh) => (
                <div key={wh.id} className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3 min-w-0">
                    <Webhook className="h-4 w-4 text-purple-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-mono truncate">{wh.url}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{Array.isArray(wh.events) ? (wh.events as string[]).map(e => EVENT_LABELS[e] || e).join(", ") : "All"}</Badge>
                        {wh.lastFiredAt && (
                          <span className="text-xs text-muted-foreground">
                            Last fired: {new Date(wh.lastFiredAt).toLocaleDateString("en-AU")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Switch
                      checked={wh.active === 1}
                      onCheckedChange={(checked) => toggle.mutate({ id: wh.id, active: checked })}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-red-400 hover:text-red-300"
                      onClick={() => remove.mutate({ id: wh.id })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Webhook className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No webhooks configured yet. Add one above to get started!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
