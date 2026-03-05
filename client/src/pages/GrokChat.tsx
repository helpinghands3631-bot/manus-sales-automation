import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";

const INITIAL_MESSAGES: Message[] = [];

export default function GrokChat() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);

  const suggestedPromptsQuery = trpc.grokChat.suggestedPrompts.useQuery();

  const chatMutation = trpc.grokChat.chat.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.content },
      ]);
    },
    onError: (e: { message: string }) => {
      toast.error(`Grok error: ${e.message}`);
      // Remove the optimistically added user message on error
      setMessages((prev) => prev.slice(0, -1));
    },
  });

  const handleSendMessage = (content: string) => {
    const userMessage: Message = { role: "user", content };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    // Send full conversation history to maintain context
    chatMutation.mutate({
      messages: updatedMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });
  };

  const handleClearChat = () => {
    setMessages([]);
    toast.success("Conversation cleared");
  };

  const displayMessages = messages.filter((m) => m.role !== "system");

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="size-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Grok AI Chat</h1>
              <Badge variant="secondary" className="text-xs gap-1">
                <Zap className="size-3" />
                Powered by xAI
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Your AI co-pilot for real estate marketing — ask anything about campaigns, copy, SEO, and leads.
            </p>
          </div>
        </div>

        {displayMessages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearChat}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-4 mr-2" />
            Clear chat
          </Button>
        )}
      </div>

      {/* Chat Box — fills remaining height */}
      <div className="flex-1 min-h-0">
        <AIChatBox
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={chatMutation.isPending}
          placeholder="Ask Grok anything about real estate marketing..."
          height="calc(100vh - 220px)"
          emptyStateMessage="Ask Grok anything about real estate marketing, campaigns, SEO, or lead generation."
          suggestedPrompts={suggestedPromptsQuery.data ?? [
            "Write a Facebook ad for a free property appraisal",
            "How do I improve my agency website's SEO?",
            "Write a subject line for a vendor nurture email",
            "What's the best way to generate buyer leads on $50/day?",
          ]}
        />
      </div>

      {/* Footer note */}
      <p className="text-xs text-muted-foreground text-center pb-2">
        Grok is powered by xAI and specialised for Australian real estate marketing. Responses are AI-generated — always review before publishing.
      </p>
    </div>
  );
}
