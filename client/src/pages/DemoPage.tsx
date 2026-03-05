import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

export default function DemoPage() {
  const params = useParams<{ id: string }>();
  const pitchId = parseInt(params.id || "0", 10);

  const { data, isLoading, error } = trpc.seoAuditPitch.getDemo.useQuery(
    { id: pitchId },
    { enabled: pitchId > 0 }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#2dd4bf] mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Loading your SEO improvement preview…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <h1 className="text-2xl font-bold text-white mb-3">Demo Not Found</h1>
          <p className="text-slate-400 mb-6">
            This demo link may have expired or the audit is still in progress.
          </p>
          <a
            href="https://keyforagents.com"
            className="inline-block px-6 py-3 bg-[#2dd4bf] text-[#0f172a] font-semibold rounded-lg hover:bg-[#14b8a6] transition-colors"
          >
            Visit Keys For Agents
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a]">
      {/* Top bar */}
      <div className="border-b border-slate-800 bg-[#0f172a]/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-[#2dd4bf]">Keys For Agents</span>
            <span className="text-xs text-slate-500">SEO Improvement Preview</span>
          </div>
          <div className="flex items-center gap-4">
            {data.seoScore !== null && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Current Score</span>
                <span className={`text-sm font-bold ${
                  (data.seoScore ?? 0) < 40 ? "text-red-400" : (data.seoScore ?? 0) < 60 ? "text-amber-400" : "text-emerald-400"
                }`}>
                  {data.seoScore}/100
                </span>
              </div>
            )}
            <a
              href="https://keyforagents.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 bg-[#2dd4bf] text-[#0f172a] font-semibold rounded-md hover:bg-[#14b8a6] transition-colors"
            >
              Get Started
            </a>
          </div>
        </div>
      </div>

      {/* Demo HTML rendered in an iframe for isolation */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">
              {data.companyName ? `${data.companyName} — ` : ""}SEO Improvement Preview
            </h1>
            {data.planName && (
              <p className="text-sm text-slate-400 mt-1">
                Recommended plan: <span className="text-[#2dd4bf] font-medium">{data.planName}</span>
                {data.planPrice ? ` — $${data.planPrice.toLocaleString()} AUD/mo` : ""}
              </p>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Generated {data.createdAt ? new Date(data.createdAt).toLocaleDateString("en-AU") : ""}
          </p>
        </div>

        <div className="rounded-xl overflow-hidden border border-slate-700 bg-white">
          <iframe
            srcDoc={data.demoHtml ?? ""}
            title="SEO Demo Preview"
            className="w-full border-0"
            style={{ minHeight: "80vh" }}
            sandbox="allow-same-origin"
          />
        </div>

        {/* CTA */}
        <div className="mt-8 text-center pb-12">
          <p className="text-slate-400 mb-4">Ready to transform your online presence?</p>
          <a
            href="https://keyforagents.com/#pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-8 py-3 bg-[#2dd4bf] text-[#0f172a] font-bold rounded-lg hover:bg-[#14b8a6] transition-colors text-lg"
          >
            Book a Free 15-Minute Strategy Call
          </a>
        </div>
      </div>
    </div>
  );
}
