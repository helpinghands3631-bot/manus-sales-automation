import { trpc } from "@/lib/trpc";
import { AIChatBox, Message } from "@/components/AIChatBox";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Target, Search, Pen, Palette } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

const MODES = [
  { value: "ad_strategist", label: "Ad Strategist", icon: Target, desc: "Facebook & Google Ads strategy" },
  { value: "seo_architect", label: "SEO Architect", icon: Search, desc: "Local SEO & content strategy" },
  { value: "conversion_copywriter", label: "Copywriter", icon: Pen, desc: "Headlines, CTAs & email copy" },
  { value: "design_advisor", label: "Design Advisor", icon: Palette, desc: "UX/UI & website design" },
] as const;

type Mode = (typeof MODES)[number]["value"];

const SUGGESTED_PROMPTS: Record<Mode, string[]> = {
  ad_strategist: [
    "What's the best Facebook Ads strategy for a $2000/month budget targeting Bondi?",
    "How should I structure Google Ads campaigns for property management?",
    "What ad creative angles work best for real estate lead generation?",
  ],
  seo_architect: [
    "How do I rank for 'real estate agent' in my suburb?",
    "What's the ideal content strategy for suburb pages?",
    "How should I structure my agency website for local SEO?",
  ],
  conversion_copywriter: [
    "Write a compelling headline for my appraisal landing page",
    "Create an email sequence for new seller leads",
    "What CTAs convert best for real estate websites?",
  ],
  design_advisor: [
    "How should I design my homepage for maximum conversions?",
    "What's the best layout for a property listing page?",
    "How can I improve trust signals on my agency website?",
  ],
};

export default function AIChat() {
  const agenciesQuery = trpc.agency.list.useQuery();
  const agency = agenciesQuery.data?.[0];
  const [activeMode, setActiveMode] = useState<Mode>("ad_strategist");
  const [messagesByMode, setMessagesByMode] = useState<Record<Mode, Message[]>>({
    ad_strategist: [],
    seo_architect: [],
    conversion_copywriter: [],
    design_advisor: [],
  });

  const chatMutation = trpc.chat.send.useMutation({
    onSuccess: (data) => {
      if (data?.aiReply) {
        setMessagesByMode((prev) => ({
          ...prev,
          [activeMode]: [...prev[activeMode], { role: "assistant" as const, content: data.aiReply! }],
        }));
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSend = (content: string) => {
    if (!agency) { toast.error("Please create an agency profile first"); return; }
    setMessagesByMode((prev) => ({
      ...prev,
      [activeMode]: [...prev[activeMode], { role: "user" as const, content }],
    }));
    chatMutation.mutate({ agencyId: agency.id, message: content, mode: activeMode });
  };

  const currentMessages = useMemo(() => messagesByMode[activeMode], [messagesByMode, activeMode]);

  if (!agency && !agenciesQuery.isLoading) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Agency Required</h2>
        <p className="text-muted-foreground">Create an agency profile first to use the AI Lead Coach.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 h-[calc(100vh-8rem)]">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Lead Coach</h1>
        <p className="text-muted-foreground mt-1">Get expert marketing advice from 4 specialized AI modes.</p>
      </div>

      <Tabs value={activeMode} onValueChange={(v) => setActiveMode(v as Mode)} className="flex flex-col h-[calc(100%-4rem)]">
        <TabsList className="grid grid-cols-4 w-full">
          {MODES.map((m) => (
            <TabsTrigger key={m.value} value={m.value} className="flex items-center gap-1.5 text-xs sm:text-sm">
              <m.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{m.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {MODES.map((m) => (
          <TabsContent key={m.value} value={m.value} className="flex-1 mt-3">
            <AIChatBox
              messages={currentMessages}
              onSendMessage={handleSend}
              isLoading={chatMutation.isPending && activeMode === m.value}
              placeholder={`Ask the ${m.label}...`}
              height="100%"
              emptyStateMessage={m.desc}
              suggestedPrompts={SUGGESTED_PROMPTS[m.value]}
              className="h-full"
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
