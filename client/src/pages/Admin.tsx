import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Users, Building2, Search, CreditCard, ShieldAlert, TrendingUp } from "lucide-react";

export default function Admin() {
  const { user } = useAuth();

  if (user?.role !== "admin") {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <ShieldAlert className="h-12 w-12 text-destructive/40 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">You need admin privileges to access this page.</p>
      </div>
    );
  }

  return <AdminContent />;
}

function AdminContent() {
  const statsQuery = trpc.admin.stats.useQuery();
  const usersQuery = trpc.admin.users.useQuery();
  const agenciesQuery = trpc.admin.agencies.useQuery();
  const auditsQuery = trpc.admin.audits.useQuery();
  const subsQuery = trpc.admin.subscriptions.useQuery();

  const stats = statsQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-0.5">Monitor all users, agencies, audits, and subscriptions.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Users", value: stats?.users, icon: Users },
          { label: "Agencies", value: stats?.agencies, icon: Building2 },
          { label: "Audits", value: stats?.audits, icon: Search },
          { label: "Campaigns", value: stats?.campaigns, icon: Building2 },
          { label: "Subscriptions", value: stats?.subscriptions, icon: CreditCard },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <s.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              {statsQuery.isLoading ? (
                <Skeleton className="h-8 w-16 mt-2" />
              ) : (
                <p className="text-2xl font-bold mt-2">{s.value ?? 0}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="agencies">Agencies</TabsTrigger>
          <TabsTrigger value="audits">Audits</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="roas" className="gap-1.5"><TrendingUp className="h-3.5 w-3.5" />ROAS Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader><CardTitle>All Users</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersQuery.data?.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-mono text-xs">{u.id}</TableCell>
                      <TableCell>{u.name || "—"}</TableCell>
                      <TableCell>{u.email || "—"}</TableCell>
                      <TableCell><Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role}</Badge></TableCell>
                      <TableCell className="text-muted-foreground text-sm">{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agencies" className="mt-4">
          <Card>
            <CardHeader><CardTitle>All Agencies</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Website</TableHead>
                    <TableHead>Suburbs</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agenciesQuery.data?.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-xs">{a.id}</TableCell>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{a.websiteUrl || "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">{a.primarySuburbs || "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{new Date(a.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audits" className="mt-4">
          <Card>
            <CardHeader><CardTitle>All Audits</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Website</TableHead>
                    <TableHead>SEO</TableHead>
                    <TableHead>Conversion</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditsQuery.data?.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-xs">{a.id}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{a.websiteUrl}</TableCell>
                      <TableCell><Badge variant="secondary">{a.seoScore ?? 0}</Badge></TableCell>
                      <TableCell><Badge variant="secondary">{a.conversionScore ?? 0}</Badge></TableCell>
                      <TableCell className="text-muted-foreground text-sm">{new Date(a.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions" className="mt-4">
          <Card>
            <CardHeader><CardTitle>All Subscriptions</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subsQuery.data?.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{s.id}</TableCell>
                      <TableCell className="font-mono text-xs">{s.userId}</TableCell>
                      <TableCell><Badge className="capitalize">{s.plan}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={s.status === "active" ? "default" : "destructive"} className="capitalize">{s.status}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{new Date(s.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="roas" className="mt-4">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  ROAS Cross-Analysis Report — Last 30 Days
                </CardTitle>
                <p className="text-sm text-muted-foreground">Overall ROAS: <strong className="text-foreground">10.38x</strong> · Total Spend: <strong className="text-foreground">$11,843 AUD</strong> · Total Revenue: <strong className="text-foreground">$122,889 AUD</strong> · Avg. CPL: <strong className="text-foreground">$45.38 AUD</strong></p>
              </CardHeader>
            </Card>
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">ROAS by Age Group &amp; Gender</CardTitle></CardHeader>
                <CardContent>
                  <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663071281317/qUFvYLUysHjJFjJB.png" alt="ROAS by Age Group and Gender heatmap" className="w-full rounded-lg" />
                  <p className="text-xs text-muted-foreground mt-2">35–44 females: 17.34x · 35–44 males: 15.52x · 45–54 males: 15.63x</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">ROAS by Placement — Facebook vs Instagram</CardTitle></CardHeader>
                <CardContent>
                  <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663071281317/TsrYpDpiBzsMljjU.png" alt="ROAS grouped bar chart by placement" className="w-full rounded-lg" />
                  <p className="text-xs text-muted-foreground mt-2">Females 35–44 on Instagram Feed: 20.9x ROAS (top micro-segment)</p>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader><CardTitle className="text-base">Conversion Volume by Age Group &amp; Placement</CardTitle></CardHeader>
              <CardContent>
                <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663071281317/ejKVSGJniLLyVpOq.png" alt="Conversion volume by age group and placement" className="w-full max-w-2xl mx-auto rounded-lg" />
                <p className="text-xs text-muted-foreground mt-2 text-center">35–44 age group drives 115 conversions (highest volume) · Facebook Feed is the primary volume driver</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Key Recommendations</CardTitle></CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                    <p className="font-semibold text-green-400 mb-2">↑ Scale Up</p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>35–44 age group (40–50% of budget)</li>
                      <li>Females 35–44 on Instagram Feed</li>
                      <li>Males 35–54 on Facebook Feed</li>
                    </ul>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                    <p className="font-semibold text-blue-400 mb-2">→ Maintain</p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>25–34 age group</li>
                      <li>45–54 age group</li>
                      <li>Monitor performance closely</li>
                    </ul>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <p className="font-semibold text-red-400 mb-2">↓ Reduce Spend</p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>18–24 age group (ROAS &lt; 2.2x)</li>
                      <li>65+ age group (ROAS &lt; 2.2x)</li>
                      <li>Reallocate to 25–54 range</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
