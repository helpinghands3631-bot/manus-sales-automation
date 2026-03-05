import { useEffect } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Clock, MapPin, ArrowRight, KeyRound } from "lucide-react";

export default function Blog() {
  useEffect(() => {
    document.title = "Suburb Guides for Real Estate Agents | Keys For Agents Blog";
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", "Expert suburb guides for Australian real estate agents. Market insights, buyer demographics, investment data, and marketing tips for top suburbs across NSW, VIC, QLD, WA, and SA.");
  }, []);

  const { data, isLoading } = trpc.blog.list.useQuery({ limit: 20 });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-foreground hover:text-primary transition-colors">
            <KeyRound className="h-5 w-5 text-primary" />
            Keys For Agents
          </Link>
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <Link href="/blog" className="text-foreground font-medium">Blog</Link>
            <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/5 via-background to-background border-b">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-3 py-1 rounded-full mb-4">
            <BookOpen className="h-3.5 w-3.5" />
            Suburb Intelligence
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
            Real Estate Suburb Guides
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Data-driven suburb guides written for Australian real estate agents. Market conditions, buyer demographics, investment potential, and proven marketing strategies — all in one place.
          </p>
        </div>
      </section>

      {/* Blog Grid */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !data?.length ? (
          <div className="text-center py-20 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">No guides published yet. Check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`}>
                <Card className="h-full overflow-hidden hover:shadow-md transition-all cursor-pointer border hover:border-primary/30 group">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2 mb-2">
                      {post.suburb && (
                        <Badge variant="secondary" className="text-xs font-normal gap-1">
                          <MapPin className="h-3 w-3" />
                          {post.suburb}
                        </Badge>
                      )}
                      {post.state && (
                        <Badge variant="outline" className="text-xs font-normal">
                          {post.state}
                        </Badge>
                      )}
                    </div>
                    <h2 className="font-semibold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
                      {post.title}
                    </h2>
                    {post.metaDescription && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {post.metaDescription}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {post.readingTime ?? 5} min read
                      </div>
                      <div className="flex items-center gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        Read guide <ArrowRight className="h-3 w-3" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}


      </section>

      {/* CTA */}
      <section className="border-t bg-primary/5">
        <div className="max-w-6xl mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-3">
            Want AI-powered marketing for your suburb?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            Keys For Agents generates suburb pages, audit reports, and personalised campaigns for any Australian suburb in seconds.
          </p>
          <Link href="/dashboard">
            <button className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors">
              Start Free Audit <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
}
