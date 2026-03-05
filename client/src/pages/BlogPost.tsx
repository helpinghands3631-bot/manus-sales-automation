import { useEffect } from "react";
import { Link, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, MapPin, ArrowLeft, KeyRound, Calendar } from "lucide-react";
import { Streamdown } from "streamdown";

export default function BlogPost() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";

  const { data: post, isLoading } = trpc.blog.getBySlug.useQuery(
    { slug },
    { enabled: !!slug }
  );

  useEffect(() => {
    if (post) {
      document.title = `${post.title} | Keys For Agents`;
      const desc = document.querySelector('meta[name="description"]');
      if (desc && post.metaDescription) {
        desc.setAttribute("content", post.metaDescription);
      }
    }
  }, [post]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-foreground hover:text-primary transition-colors">
            <KeyRound className="h-5 w-5 text-primary" />
            Keys For Agents
          </Link>
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link>
            <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          </nav>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="h-4 w-4" />
          Back to all guides
        </Link>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : !post ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg">Guide not found.</p>
            <Link href="/blog" className="text-primary hover:underline mt-2 inline-block">
              Browse all guides →
            </Link>
          </div>
        ) : (
          <article>
            {/* Meta badges */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {post.suburb && (
                <Badge variant="secondary" className="gap-1 text-sm">
                  <MapPin className="h-3.5 w-3.5" />
                  {post.suburb}
                </Badge>
              )}
              {post.state && (
                <Badge variant="outline" className="text-sm">{post.state}</Badge>
              )}
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight mb-4">
              {post.title}
            </h1>

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8 pb-8 border-b">
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {post.readingTime ?? 5} min read
              </span>
              {post.publishedAt && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {new Date(post.publishedAt).toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              )}
              <span className="text-muted-foreground">By Keys For Agents</span>
            </div>

            {/* Content */}
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              <Streamdown>{post.content}</Streamdown>
            </div>

            {/* Tags */}
            {post.tags && (() => {
              try {
                const tags: string[] = JSON.parse(post.tags);
                return (
                  <div className="flex flex-wrap gap-2 mt-10 pt-8 border-t">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs font-normal">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                );
              } catch {
                return null;
              }
            })()}

            {/* CTA */}
            <div className="mt-12 p-6 rounded-xl bg-primary/5 border border-primary/20 text-center">
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Market properties in {post.suburb ?? "this suburb"} with AI
              </h2>
              <p className="text-muted-foreground mb-4 text-sm">
                Generate suburb pages, audit reports, and personalised campaigns for {post.suburb ?? "any suburb"} in seconds.
              </p>
              <Link href="/dashboard">
                <button className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors text-sm">
                  Start Free Audit →
                </button>
              </Link>
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
