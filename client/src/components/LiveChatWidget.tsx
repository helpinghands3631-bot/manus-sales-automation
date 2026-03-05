import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Sparkles, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const STARTER_PROMPTS = [
  "Write a Facebook ad for a free appraisal",
  "How do I get more vendor leads?",
  "Write a suburb page intro for Bondi Beach",
  "Best email subject line for a listing campaign",
];

const MAX_FREE_MESSAGES = 5;

export default function LiveChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [hasGreeted, setHasGreeted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const publicChat = trpc.grokChat.publicChat.useMutation();

  useEffect(() => {
    if (isOpen && !hasGreeted) {
      setMessages([
        {
          role: "assistant",
          content:
            "G'day! I'm Grok, your AI real estate marketing assistant. Ask me anything about Facebook ads, SEO, suburb pages, email campaigns, or lead generation. I'm here to help Australian agents win more listings. 🏡",
        },
      ]);
      setHasGreeted(true);
    }
  }, [isOpen, hasGreeted]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading || messageCount >= MAX_FREE_MESSAGES) return;

    const userMessage: Message = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    setMessageCount((c) => c + 1);

    try {
      // Only send the last 6 messages to keep context manageable
      const contextMessages = newMessages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const result = await publicChat.mutateAsync({ messages: contextMessages });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.content },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I hit a snag. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleReset = () => {
    setMessages([]);
    setMessageCount(0);
    setHasGreeted(false);
    setInput("");
  };

  const isLimitReached = messageCount >= MAX_FREE_MESSAGES;

  return (
    <>
      {/* Floating bubble */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-all duration-300",
          "bg-primary text-primary-foreground hover:scale-110 active:scale-95",
          isOpen && "rotate-0"
        )}
        aria-label="Open Grok AI chat"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageSquare className="h-6 w-6" />
        )}
        {/* Pulse ring when closed */}
        {!isOpen && (
          <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-30" />
        )}
      </button>

      {/* Chat panel */}
      <div
        className={cn(
          "fixed bottom-24 right-6 z-50 flex flex-col rounded-2xl shadow-2xl border border-border bg-background overflow-hidden transition-all duration-300 origin-bottom-right",
          "w-[340px] sm:w-[380px]",
          isOpen
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-90 pointer-events-none"
        )}
        style={{ maxHeight: "520px" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-primary text-primary-foreground">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/20">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-none">Grok AI Assistant</p>
            <p className="text-xs opacity-75 mt-0.5">Keys For Agents · Real Estate AI</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleReset}
              className="p-1.5 rounded-lg hover:bg-primary-foreground/20 transition-colors"
              title="Reset chat"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-primary-foreground/20 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 0, maxHeight: "340px" }}>
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                )}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
                </span>
              </div>
            </div>
          )}

          {/* Starter prompts (show only when no user messages yet) */}
          {messages.length === 1 && !isLoading && (
            <div className="space-y-1.5 pt-1">
              <p className="text-xs text-muted-foreground font-medium">Try asking:</p>
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg border border-border hover:bg-muted hover:border-primary/40 transition-colors text-muted-foreground hover:text-foreground"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {isLimitReached && (
            <div className="rounded-xl bg-primary/10 border border-primary/20 p-3 text-center">
              <p className="text-xs font-medium text-primary mb-1">Free demo limit reached</p>
              <p className="text-xs text-muted-foreground mb-2">
                Get unlimited Grok AI access with a Keys For Agents subscription.
              </p>
              <a
                href="#pricing"
                onClick={() => {
                  setIsOpen(false);
                  document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="inline-block text-xs font-semibold text-primary hover:underline"
              >
                View Plans →
              </a>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border p-3">
          {!isLimitReached ? (
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about real estate marketing..."
                className="flex-1 h-9 text-sm"
                disabled={isLoading}
              />
              <Button
                type="submit"
                size="sm"
                className="h-9 w-9 p-0 shrink-0"
                disabled={isLoading || !input.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          ) : (
            <Button
              className="w-full h-9 text-sm"
              onClick={() => {
                setIsOpen(false);
                document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Start Free Trial <Sparkles className="ml-2 h-4 w-4" />
            </Button>
          )}
          <p className="text-center text-xs text-muted-foreground mt-2">
            {isLimitReached
              ? "Upgrade for unlimited AI access"
              : `${MAX_FREE_MESSAGES - messageCount} free message${MAX_FREE_MESSAGES - messageCount !== 1 ? "s" : ""} remaining`}
          </p>
        </div>
      </div>
    </>
  );
}
