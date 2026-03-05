import { useState, useEffect } from "react";
import React from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  DollarSign, Users, Mail, Search, TrendingUp, CreditCard,
  FileText, Send, RefreshCw, ExternalLink, Building2, BarChart3,
  Globe, Zap, ChevronRight, AlertCircle, CheckCircle2, Rocket, Target,
  History, Eye, Clock, Download, Filter, ChevronDown, ChevronUp, Copy, ArrowUpDown
} from "lucide-react";

// ── Revenue / PayPal Dashboard ──────────────────────────────────────────────

function RevenueDashboard() {
  const [showFilters, setShowFilters] = useState(false);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Search filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [payerEmail, setPayerEmail] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  // Applied filters (only update on search click)
  const [appliedFilters, setAppliedFilters] = useState<{
    startDate?: string; endDate?: string; transactionId?: string;
    payerEmail?: string; transactionStatus?: string; transactionType?: string;
    minAmount?: number; maxAmount?: number;
  }>({});

  const balanceQuery = trpc.paypalTransactions.getBalance.useQuery(undefined, { retry: 1 });

  const searchQuery = trpc.paypalTransactions.search.useQuery(
    {
      ...appliedFilters,
      page,
      pageSize: 20,
    },
    { retry: 1 }
  );

  const handleSearch = () => {
    setPage(1);
    setAppliedFilters({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      transactionId: transactionId || undefined,
      payerEmail: payerEmail || undefined,
      transactionStatus: statusFilter || undefined,
      transactionType: typeFilter || undefined,
      minAmount: minAmount ? parseFloat(minAmount) : undefined,
      maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
    });
  };

  const handleReset = () => {
    setStartDate(""); setEndDate(""); setTransactionId(""); setPayerEmail("");
    setStatusFilter(""); setTypeFilter(""); setMinAmount(""); setMaxAmount("");
    setAppliedFilters({});
    setPage(1);
  };

  const activeFilterCount = [startDate, endDate, transactionId, payerEmail, statusFilter, typeFilter, minAmount, maxAmount].filter(Boolean).length;

  const formatCurrency = (amount: number, currency = "AUD") =>
    new Intl.NumberFormat("en-AU", { style: "currency", currency }).format(amount);

  const statusColor = (status: string) => {
    const s = status.toUpperCase();
    if (s === "S") return "bg-emerald-500/20 text-emerald-400";
    if (s === "P") return "bg-yellow-500/20 text-yellow-400";
    if (s === "V" || s === "D" || s === "F") return "bg-red-500/20 text-red-400";
    return "bg-slate-500/20 text-slate-400";
  };

  const statusLabel = (s: string) => {
    const map: Record<string, string> = { S: "Success", P: "Pending", V: "Reversed", D: "Denied", F: "Failed" };
    return map[s.toUpperCase()] || s;
  };

  const typeLabel = (code: string) => {
    const map: Record<string, string> = {
      T0001: "Goods/Services", T0003: "Subscription", T0006: "Recurring",
      T0007: "Refund", T0400: "Transfer", T1107: "Payout",
    };
    return map[code] || code;
  };

  const exportCsv = () => {
    const txs = searchQuery.data?.transactions || [];
    if (txs.length === 0) { toast.error("No transactions to export"); return; }
    const headers = ["Date", "Transaction ID", "Payer Name", "Payer Email", "Subject", "Amount", "Currency", "Fee", "Status", "Type"];
    const rows = txs.map((tx) => [
      new Date(tx.date).toLocaleDateString("en-AU"),
      tx.id, tx.payerName, tx.payerEmail, tx.subject,
      tx.amount.toFixed(2), tx.currency, tx.fee.toFixed(2),
      statusLabel(tx.status), typeLabel(tx.eventCode),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `paypal-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`Exported ${txs.length} transactions to CSV`);
  };

  const copyTxId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success("Transaction ID copied");
  };

  const summary = searchQuery.data?.summary;

  return (
    <div className="space-y-6">
      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {balanceQuery.isLoading ? (
          [0, 1, 2].map((i) => (
            <Card key={i} className="bg-slate-800/50 border-slate-700 animate-pulse">
              <CardContent className="p-6 h-24" />
            </Card>
          ))
        ) : balanceQuery.error ? (
          <Card className="col-span-3 bg-slate-800/50 border-slate-700">
            <CardContent className="p-6 flex items-center gap-3 text-amber-400">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span className="text-sm">PayPal balance requires live account access. Transactions below are still available.</span>
            </CardContent>
          </Card>
        ) : (
          (balanceQuery.data?.balances || []).slice(0, 3).map((b) => (
            <Card key={b.currency} className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">{b.currency} {b.isPrimary ? "(Primary)" : ""}</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-white">{formatCurrency(b.total, b.currency)}</div>
                <div className="text-slate-400 text-xs mt-1">Available: {formatCurrency(b.available, b.currency)}</div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Search & Filter Panel */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Search className="w-4 h-4 text-emerald-400" />
              Transaction Search
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportCsv} className="border-slate-600 text-slate-300 hover:text-white">
                <Download className="w-3 h-3 mr-1" /> Export CSV
              </Button>
              <Button
                variant="outline" size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="border-slate-600 text-slate-300 hover:text-white"
              >
                <Filter className="w-3 h-3 mr-1" />
                Filters {activeFilterCount > 0 && <Badge className="ml-1 bg-emerald-600 text-white text-xs px-1.5 py-0">{activeFilterCount}</Badge>}
                {showFilters ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Quick Search Bar */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search by transaction ID..."
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search by payer email or name..."
                value={payerEmail}
                onChange={(e) => setPayerEmail(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Search className="w-4 h-4 mr-1" /> Search
            </Button>
            <Button variant="outline" onClick={handleReset} className="border-slate-600 text-slate-300">
              <RefreshCw className="w-3 h-3 mr-1" /> Reset
            </Button>
          </div>

          {/* Advanced Filters (collapsible) */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Start Date</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-slate-700 border-slate-600 text-white" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">End Date</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-slate-700 border-slate-600 text-white" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="S">Success</SelectItem>
                    <SelectItem value="P">Pending</SelectItem>
                    <SelectItem value="V">Reversed</SelectItem>
                    <SelectItem value="D">Denied</SelectItem>
                    <SelectItem value="F">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Transaction Type</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="T0001">Goods/Services</SelectItem>
                    <SelectItem value="T0003">Subscription</SelectItem>
                    <SelectItem value="T0006">Recurring</SelectItem>
                    <SelectItem value="T0007">Refund</SelectItem>
                    <SelectItem value="T0400">Transfer</SelectItem>
                    <SelectItem value="T1107">Payout</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Min Amount (AUD)</label>
                <Input type="number" placeholder="0.00" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} className="bg-slate-700 border-slate-600 text-white" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Max Amount (AUD)</label>
                <Input type="number" placeholder="10000.00" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} className="bg-slate-700 border-slate-600 text-white" />
              </div>
            </div>
          )}

          {/* Summary Stats */}
          {summary && !searchQuery.isLoading && !searchQuery.error && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
              <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                <div className="text-xs text-slate-400">Transactions</div>
                <div className="text-lg font-bold text-white">{summary.transactionCount}</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                <div className="text-xs text-slate-400">Volume</div>
                <div className="text-lg font-bold text-emerald-400">{formatCurrency(summary.totalVolume)}</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                <div className="text-xs text-slate-400">Fees</div>
                <div className="text-lg font-bold text-red-400">{formatCurrency(summary.totalFees)}</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                <div className="text-xs text-slate-400">Net</div>
                <div className="text-lg font-bold text-white">{formatCurrency(summary.netAmount)}</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                <div className="text-xs text-emerald-400">Success</div>
                <div className="text-lg font-bold text-emerald-400">{summary.successCount}</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                <div className="text-xs text-yellow-400">Pending</div>
                <div className="text-lg font-bold text-yellow-400">{summary.pendingCount}</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                <div className="text-xs text-red-400">Failed</div>
                <div className="text-lg font-bold text-red-400">{summary.failedCount}</div>
              </div>
            </div>
          )}

          {/* Results Table */}
          {searchQuery.isLoading ? (
            <div className="text-slate-400 text-sm py-8 text-center">Searching transactions...</div>
          ) : searchQuery.error ? (
            <div className="text-amber-400 text-sm py-8 text-center flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Transaction search requires live PayPal API access. Ensure your account has the Transaction Search feature enabled.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-slate-400">
                      <th className="text-left py-2 pr-2 w-8"></th>
                      <th className="text-left py-2 pr-4">Date</th>
                      <th className="text-left py-2 pr-4">Transaction ID</th>
                      <th className="text-left py-2 pr-4">Payer</th>
                      <th className="text-left py-2 pr-4">Subject</th>
                      <th className="text-right py-2 pr-4">Amount</th>
                      <th className="text-right py-2 pr-4">Fee</th>
                      <th className="text-left py-2 pr-4">Type</th>
                      <th className="text-left py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(searchQuery.data?.transactions || []).map((tx) => (
                      <React.Fragment key={tx.id}>
                        <tr
                          className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors cursor-pointer"
                          onClick={() => setExpandedTx(expandedTx === tx.id ? null : tx.id)}
                        >
                          <td className="py-2 pr-2">
                            {expandedTx === tx.id ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                          </td>
                          <td className="py-2 pr-4 text-slate-300 whitespace-nowrap">
                            {new Date(tx.date).toLocaleDateString("en-AU")}
                          </td>
                          <td className="py-2 pr-4">
                            <div className="flex items-center gap-1">
                              <span className="text-slate-400 font-mono text-xs">{tx.id.slice(0, 14)}...</span>
                              <button onClick={(e) => { e.stopPropagation(); copyTxId(tx.id); }} className="text-slate-500 hover:text-emerald-400 transition-colors">
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="py-2 pr-4 text-slate-300 max-w-32 truncate">
                            {tx.payerName || tx.payerEmail || "—"}
                          </td>
                          <td className="py-2 pr-4 text-slate-300 max-w-40 truncate">{tx.subject || "—"}</td>
                          <td className={`py-2 pr-4 text-right font-medium whitespace-nowrap ${tx.amount >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {formatCurrency(tx.amount, tx.currency)}
                          </td>
                          <td className="py-2 pr-4 text-right text-red-400 text-xs whitespace-nowrap">
                            {tx.fee ? formatCurrency(Math.abs(tx.fee), tx.currency) : "—"}
                          </td>
                          <td className="py-2 pr-4 text-slate-400 text-xs">{typeLabel(tx.eventCode)}</td>
                          <td className="py-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor(tx.status)}`}>
                              {statusLabel(tx.status)}
                            </span>
                          </td>
                        </tr>
                        {expandedTx === tx.id && (
                          <tr className="bg-slate-900/50">
                            <td colSpan={9} className="p-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div className="space-y-2">
                                  <h4 className="text-white font-medium text-xs uppercase tracking-wider">Transaction Details</h4>
                                  <div className="grid grid-cols-2 gap-2">
                                    <span className="text-slate-400">Full ID:</span>
                                    <span className="text-white font-mono text-xs break-all">{tx.id}</span>
                                    <span className="text-slate-400">Date/Time:</span>
                                    <span className="text-white">{new Date(tx.date).toLocaleString("en-AU")}</span>
                                    <span className="text-slate-400">Amount:</span>
                                    <span className="text-emerald-400 font-medium">{formatCurrency(tx.amount, tx.currency)}</span>
                                    <span className="text-slate-400">Fee:</span>
                                    <span className="text-red-400">{tx.fee ? formatCurrency(Math.abs(tx.fee), tx.currency) : "None"}</span>
                                    <span className="text-slate-400">Net:</span>
                                    <span className="text-white font-medium">{formatCurrency(tx.amount - Math.abs(tx.fee), tx.currency)}</span>
                                    <span className="text-slate-400">Event Code:</span>
                                    <span className="text-white">{tx.eventCode} ({typeLabel(tx.eventCode)})</span>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <h4 className="text-white font-medium text-xs uppercase tracking-wider">Payer Information</h4>
                                  <div className="grid grid-cols-2 gap-2">
                                    <span className="text-slate-400">Name:</span>
                                    <span className="text-white">{tx.payerName || "—"}</span>
                                    <span className="text-slate-400">Email:</span>
                                    <span className="text-white">{tx.payerEmail || "—"}</span>
                                    <span className="text-slate-400">Account ID:</span>
                                    <span className="text-white font-mono text-xs">{tx.payerAccountId || "—"}</span>
                                    {tx.shippingName && (<>
                                      <span className="text-slate-400">Shipping:</span>
                                      <span className="text-white">{tx.shippingName}</span>
                                    </>)}
                                    {tx.shippingAddress && (<>
                                      <span className="text-slate-400">Address:</span>
                                      <span className="text-white text-xs">{tx.shippingAddress}</span>
                                    </>)}
                                  </div>
                                  {tx.note && (
                                    <div className="mt-2">
                                      <span className="text-slate-400 text-xs">Note:</span>
                                      <p className="text-white text-sm mt-1">{tx.note}</p>
                                    </div>
                                  )}
                                  {tx.items.length > 0 && (
                                    <div className="mt-2">
                                      <span className="text-slate-400 text-xs">Items:</span>
                                      <div className="mt-1 space-y-1">
                                        {tx.items.map((item, i) => (
                                          <div key={i} className="text-white text-xs flex justify-between">
                                            <span>{item.name} x{item.quantity}</span>
                                            <span>{formatCurrency(item.unitPrice)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                    {(searchQuery.data?.transactions || []).length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400">No transactions found matching your search criteria</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {(searchQuery.data?.totalPages || 1) > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-slate-400 text-sm">
                    Page {page} of {searchQuery.data?.totalPages} · {searchQuery.data?.totalItems} total transactions
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="border-slate-600">Prev</Button>
                    <Button size="sm" variant="outline" disabled={page >= (searchQuery.data?.totalPages || 1)} onClick={() => setPage((p) => p + 1)} className="border-slate-600">Next</Button>
                  </div>
                </div>
              )}

              {/* Last Refreshed */}
              {searchQuery.data?.lastRefreshed && (
                <div className="text-slate-500 text-xs mt-2 text-right">
                  Last refreshed: {new Date(searchQuery.data.lastRefreshed).toLocaleString("en-AU")}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Invoicing Panel ──────────────────────────────────────────────────────────

function InvoicingPanel() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    recipientEmail: "", recipientName: "", note: "", currency: "AUD",
    items: [{ name: "", description: "", quantity: 1, unitAmount: 0 }],
  });
  const invoicesQuery = trpc.paypalInvoicing.list.useQuery(
    { page: 1, pageSize: 20 }, { retry: 1 }
  );
  const createMutation = trpc.paypalInvoicing.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Invoice ${data.invoiceNumber} created!`);
      setShowCreate(false);
      invoicesQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });
  const sendMutation = trpc.paypalInvoicing.send.useMutation({
    onSuccess: () => { toast.success("Invoice sent!"); invoicesQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const statusColor = (s: string) => {
    if (s === "PAID") return "bg-emerald-500/20 text-emerald-400";
    if (s === "SENT") return "bg-blue-500/20 text-blue-400";
    if (s === "DRAFT") return "bg-slate-500/20 text-slate-400";
    if (s === "CANCELLED") return "bg-red-500/20 text-red-400";
    return "bg-yellow-500/20 text-yellow-400";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-medium flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-400" /> PayPal Invoices
        </h3>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          {showCreate ? "Cancel" : "+ New Invoice"}
        </Button>
      </div>

      {showCreate && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Recipient email" value={form.recipientEmail} onChange={(e) => setForm((f) => ({ ...f, recipientEmail: e.target.value }))} className="bg-slate-700 border-slate-600 text-white" />
              <Input placeholder="Recipient name" value={form.recipientName} onChange={(e) => setForm((f) => ({ ...f, recipientName: e.target.value }))} className="bg-slate-700 border-slate-600 text-white" />
            </div>
            <div className="space-y-2">
              {form.items.map((item, i) => (
                <div key={i} className="grid grid-cols-4 gap-2">
                  <Input placeholder="Item name" value={item.name} onChange={(e) => setForm((f) => { const items = [...f.items]; items[i] = { ...items[i], name: e.target.value }; return { ...f, items }; })} className="bg-slate-700 border-slate-600 text-white col-span-2" />
                  <Input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => setForm((f) => { const items = [...f.items]; items[i] = { ...items[i], quantity: Number(e.target.value) }; return { ...f, items }; })} className="bg-slate-700 border-slate-600 text-white" />
                  <Input type="number" placeholder="Unit $" value={item.unitAmount || ""} onChange={(e) => setForm((f) => { const items = [...f.items]; items[i] = { ...items[i], unitAmount: Number(e.target.value) }; return { ...f, items }; })} className="bg-slate-700 border-slate-600 text-white" />
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => setForm((f) => ({ ...f, items: [...f.items, { name: "", description: "", quantity: 1, unitAmount: 0 }] }))} className="border-slate-600 text-slate-300 text-xs">+ Add Item</Button>
            </div>
            <Textarea placeholder="Note (optional)" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} className="bg-slate-700 border-slate-600 text-white text-sm" rows={2} />
            <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full">
              {createMutation.isPending ? "Creating..." : "Create Invoice"}
            </Button>
          </CardContent>
        </Card>
      )}

      {invoicesQuery.isLoading ? (
        <div className="text-slate-400 text-sm py-8 text-center">Loading invoices...</div>
      ) : invoicesQuery.error ? (
        <div className="text-amber-400 text-sm py-4 text-center flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4" /> Invoice access requires PayPal Invoicing feature enabled on your account.
        </div>
      ) : (
        <div className="space-y-2">
          {(invoicesQuery.data?.invoices || []).map((inv) => (
            <div key={inv.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700">
              <div>
                <div className="text-white text-sm font-medium">{inv.invoiceNumber || inv.id.slice(0, 12)}</div>
                <div className="text-slate-400 text-xs">{inv.recipientEmail} · {inv.date ? new Date(inv.date).toLocaleDateString("en-AU") : "—"}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-emerald-400 font-medium">${inv.amount.toFixed(2)} {inv.currency}</span>
                <span className={`px-2 py-0.5 rounded text-xs ${statusColor(inv.status)}`}>{inv.status}</span>
                {inv.status === "DRAFT" && (
                  <Button size="sm" variant="outline" onClick={() => sendMutation.mutate({ invoiceId: inv.id })} disabled={sendMutation.isPending} className="border-slate-600 text-slate-300 text-xs">
                    <Send className="w-3 h-3 mr-1" /> Send
                  </Button>
                )}
              </div>
            </div>
          ))}
          {(invoicesQuery.data?.invoices || []).length === 0 && (
            <div className="text-slate-400 text-sm py-8 text-center">No invoices yet. Create your first invoice above.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── CRM Panel ────────────────────────────────────────────────────────────────

// ── SEO Audit & Pitch Modal ──────────────────────────────────────────────────

type PitchContact = { id: number; name: string; email: string | null; company?: string | null; websiteUrl?: string | null; auditScore?: number | null };

function SeoAuditPitchModal({ contact, open, onClose }: { contact: PitchContact | null; open: boolean; onClose: () => void }) {
  const [websiteUrl, setWebsiteUrl] = useState(contact?.websiteUrl || "");
  const [annualRevenue, setAnnualRevenue] = useState("0");
  const [employeeCount, setEmployeeCount] = useState("0");
  const [sendEmail, setSendEmail] = useState(true);
  const [industry, setIndustry] = useState("");
  const [siteCount, setSiteCount] = useState("1");
  const [step, setStep] = useState<"form" | "running" | "result">("form");
  const [stepLabel, setStepLabel] = useState("");
  const [result, setResult] = useState<null | {
    qualified: boolean;
    seoScore: number;
    topIssues: string[];
    quickWins: string[];
    planName?: string;
    planPrice?: number;
    adjustments?: { reason: string; amount: number }[];
    deliverables?: string[];
    timeline?: string;
    expectedOutcomes?: string[];
    demoHtml?: string;
    demoUrl?: string;
    emailSubject?: string;
    emailBodyText?: string;
    emailSent?: boolean;
    disqualifyReason?: string;
  }>(null);

  const runMutation = trpc.seoAuditPitch.runAuditAndPitch.useMutation({
    onSuccess: (data) => {
      setResult(data);
      setStep("result");
    },
    onError: (err) => {
      toast.error(err.message);
      setStep("form");
    },
  });

  // Reset when contact changes
  useEffect(() => {
    setWebsiteUrl(contact?.websiteUrl || "");
    setStep("form");
    setResult(null);
  }, [contact?.id]);

  const handleRun = () => {
    if (!websiteUrl) return toast.error("Website URL is required");
    setStep("running");
    setStepLabel("Scraping website...");
    const labels = ["Scraping website...", "Scoring SEO with Grok...", "Checking qualification...", "Generating demo...", "Writing pitch email...", "Sending email..."];
    let i = 0;
    const interval = setInterval(() => {
      i++;
      if (i < labels.length) setStepLabel(labels[i]);
      else clearInterval(interval);
    }, 4000);
    runMutation.mutate({
      contactId: contact?.id,
      companyName: contact?.company || undefined,
      websiteUrl,
      contactEmail: contact?.email || undefined,
      contactName: contact?.name || undefined,
      annualRevenue: parseInt(annualRevenue) || 0,
      employeeCount: parseInt(employeeCount) || 0,
      industry: industry || undefined,
      siteCount: parseInt(siteCount) || 1,
      sendEmail,
    });
  };

  const scoreColor = (s: number) => s >= 70 ? "text-emerald-400" : s >= 50 ? "text-yellow-400" : "text-red-400";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Rocket className="w-5 h-5 text-emerald-400" />
            SEO Audit & Pitch — {contact?.company || contact?.name}
          </DialogTitle>
        </DialogHeader>

        {step === "form" && (
          <div className="space-y-4">
            <p className="text-slate-400 text-sm">Scrape their website, score their SEO, and auto-send a tailored pitch email if they qualify.</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Website URL *</label>
                <Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://example.com.au" className="bg-slate-800 border-slate-600 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Annual Revenue (AUD)</label>
                  <Input type="number" value={annualRevenue} onChange={(e) => setAnnualRevenue(e.target.value)} placeholder="e.g. 2000000" className="bg-slate-800 border-slate-600 text-white" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Employee Count</label>
                  <Input type="number" value={employeeCount} onChange={(e) => setEmployeeCount(e.target.value)} placeholder="e.g. 25" className="bg-slate-800 border-slate-600 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Industry (optional)</label>
                  <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Real Estate, Finance" className="bg-slate-800 border-slate-600 text-white" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Number of Sites</label>
                  <Input type="number" value={siteCount} onChange={(e) => setSiteCount(e.target.value)} placeholder="1" min="1" className="bg-slate-800 border-slate-600 text-white" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="sendEmail" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="accent-emerald-500" />
                <label htmlFor="sendEmail" className="text-sm text-slate-300">Auto-send pitch email if qualified</label>
              </div>
              <p className="text-xs text-slate-500">Qualifies if: SEO score &lt; 60 AND (revenue ≥ $2M or employees ≥ 20)</p>
            </div>
            <Button onClick={handleRun} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              <Rocket className="w-4 h-4 mr-2" /> Run SEO Audit & Pitch
            </Button>
          </div>
        )}

        {step === "running" && (
          <div className="space-y-6 py-4">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-600/20 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
              </div>
              <p className="text-white font-medium">{stepLabel}</p>
              <p className="text-slate-400 text-sm mt-1">This takes 20–60 seconds. Grok is working...</p>
            </div>
            <div className="space-y-2">
              {["Scraping website", "Scoring SEO", "Qualifying lead", "Generating demo", "Writing email", "Sending pitch"].map((s, i) => (
                <div key={s} className="flex items-center gap-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${stepLabel.toLowerCase().includes(s.toLowerCase().split(" ")[0]) ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
                  <span className={stepLabel.toLowerCase().includes(s.toLowerCase().split(" ")[0]) ? "text-white" : "text-slate-500"}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === "result" && result && (
          <div className="space-y-4">
            {/* Score Card */}
            <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
              <div>
                <p className="text-slate-400 text-xs">SEO Score</p>
                <p className={`text-4xl font-bold ${scoreColor(result.seoScore)}`}>{result.seoScore}<span className="text-lg text-slate-400">/100</span></p>
              </div>
              <div className="text-right">
                {result.qualified ? (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Qualified
                  </Badge>
                ) : (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                    <AlertCircle className="w-3 h-3 mr-1" /> Not Qualified
                  </Badge>
                )}
                {result.disqualifyReason && <p className="text-slate-500 text-xs mt-1 max-w-[200px]">{result.disqualifyReason}</p>}
              </div>
            </div>

            {/* Issues & Wins */}
            {result.topIssues?.length > 0 && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-xs font-medium mb-2">Top Issues Found</p>
                <ul className="space-y-1">
                  {result.topIssues.map((issue, i) => <li key={i} className="text-slate-300 text-xs flex gap-2"><span className="text-red-400">•</span>{issue}</li>)}
                </ul>
              </div>
            )}

            {result.quickWins?.length > 0 && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <p className="text-emerald-400 text-xs font-medium mb-2">Quick Wins</p>
                <ul className="space-y-1">
                  {result.quickWins.map((win, i) => <li key={i} className="text-slate-300 text-xs flex gap-2"><span className="text-emerald-400">✓</span>{win}</li>)}
                </ul>
              </div>
            )}

            {/* Plan & Email */}
            {result.qualified && (
              <div className="space-y-3">
                <div className="p-3 bg-slate-800 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Recommended Plan</p>
                    <p className="text-white font-medium">{result.planName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-400 font-bold text-lg">${result.planPrice?.toLocaleString()}<span className="text-slate-400 text-xs">/mo</span></p>
                  </div>
                </div>

                {/* Price Adjustments */}
                {result.adjustments && result.adjustments.length > 0 && (
                  <div className="p-3 bg-slate-800 rounded-lg">
                    <p className="text-slate-400 text-xs font-medium mb-1">Price Adjustments</p>
                    {result.adjustments.map((a, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-slate-300">{a.reason}</span>
                        <span className="text-yellow-400">+${a.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Deliverables */}
                {result.deliverables && result.deliverables.length > 0 && (
                  <div className="p-3 bg-slate-800 rounded-lg">
                    <p className="text-slate-400 text-xs font-medium mb-1">Deliverables</p>
                    <ul className="space-y-1">
                      {result.deliverables.map((d, i) => (
                        <li key={i} className="text-slate-300 text-xs flex gap-2"><span className="text-emerald-400">✓</span>{d}</li>
                      ))}
                    </ul>
                    {result.timeline && <p className="text-slate-400 text-xs mt-2">⏱ {result.timeline}</p>}
                  </div>
                )}

                {/* Expected Outcomes */}
                {result.expectedOutcomes && result.expectedOutcomes.length > 0 && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <p className="text-emerald-400 text-xs font-medium mb-1">Expected Outcomes</p>
                    <ul className="space-y-1">
                      {result.expectedOutcomes.map((o, i) => (
                        <li key={i} className="text-slate-300 text-xs flex gap-2"><span className="text-emerald-400">→</span>{o}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Demo Link */}
                {result.demoUrl && (
                  <a href={result.demoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-emerald-600/10 border border-emerald-600/20 rounded-lg text-emerald-400 hover:text-emerald-300 transition-colors">
                    <Eye className="w-4 h-4" />
                    <span className="text-sm font-medium">View Before/After Demo</span>
                    <ExternalLink className="w-3 h-3 ml-auto" />
                  </a>
                )}

                {result.emailSent && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-emerald-400 text-sm font-medium">Pitch email sent!</p>
                      <p className="text-slate-400 text-xs">Subject: {result.emailSubject}</p>
                    </div>
                  </div>
                )}
                {result.emailBodyText && (
                  <details className="group">
                    <summary className="cursor-pointer text-xs text-slate-400 hover:text-white">View email preview ▸</summary>
                    <pre className="mt-2 text-xs text-slate-300 bg-slate-800 p-3 rounded whitespace-pre-wrap max-h-48 overflow-y-auto">{result.emailBodyText}</pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setStep("form"); setResult(null); }} className="flex-1 border-slate-600 text-slate-300">
                Run Again
              </Button>
              <Button onClick={onClose} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── CRM Panel ────────────────────────────────────────────────────────────────

function CRMPanel() {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [pitchContact, setPitchContact] = useState<PitchContact | null>(null);
  type CRMStatus = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";
  const [form, setForm] = useState<{ name: string; email: string; phone: string; company: string; suburb: string; notes: string; status: CRMStatus }>({ name: "", email: "", phone: "", company: "", suburb: "", notes: "", status: "new" });

  const contactsQuery = trpc.crm.list.useQuery({ search: search || undefined, limit: 50 }, { retry: 1 });
  const addMutation = trpc.crm.add.useMutation({
    onSuccess: () => { toast.success("Contact added!"); setShowAdd(false); void contactsQuery.refetch(); },
    onError: (err: { message: string }) => toast.error(err.message),
  });
  const updateStatusMutation = trpc.crm.update.useMutation({
    onSuccess: () => { void contactsQuery.refetch(); },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const statusColor = (s: string) => {
    const map: Record<string, string> = {
      lead: "bg-blue-500/20 text-blue-400",
      prospect: "bg-yellow-500/20 text-yellow-400",
      client: "bg-emerald-500/20 text-emerald-400",
      inactive: "bg-slate-500/20 text-slate-400",
    };
    return map[s] || "bg-slate-500/20 text-slate-400";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search contacts..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-slate-700 border-slate-600 text-white" />
        </div>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          {showAdd ? "Cancel" : "+ Add Contact"}
        </Button>
      </div>

      {showAdd && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Full name *" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="bg-slate-700 border-slate-600 text-white" />
              <Input placeholder="Email *" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="bg-slate-700 border-slate-600 text-white" />
              <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="bg-slate-700 border-slate-600 text-white" />
              <Input placeholder="Company / Agency" value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} className="bg-slate-700 border-slate-600 text-white" />
              <Input placeholder="Suburb" value={form.suburb} onChange={(e) => setForm((f) => ({ ...f, suburb: e.target.value }))} className="bg-slate-700 border-slate-600 text-white" />
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as "new" | "contacted" | "qualified" | "proposal" | "won" | "lost" }))}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="proposal">Proposal</SelectItem>
                  <SelectItem value="won">Won</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="bg-slate-700 border-slate-600 text-white text-sm" rows={2} />
            <Button onClick={() => addMutation.mutate(form)} disabled={addMutation.isPending || !form.name || !form.email} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full">
              {addMutation.isPending ? "Adding..." : "Add Contact"}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {contactsQuery.isLoading ? (
          <div className="text-slate-400 text-sm py-8 text-center">Loading contacts...</div>
        ) : (contactsQuery.data?.contacts || []).length === 0 ? (
          <div className="text-slate-400 text-sm py-8 text-center">No contacts yet. Add your first contact above.</div>
        ) : (
          (contactsQuery.data?.contacts || []).map((c: { id: number; name: string; email: string | null; company?: string | null; suburb?: string | null; status: string; phone?: string | null; notes?: string | null }) => (
            <div key={c.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-600/20 flex items-center justify-center text-emerald-400 font-medium text-sm">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-white text-sm font-medium">{c.name}</div>
                  <div className="text-slate-400 text-xs">{c.email} {c.company ? `· ${c.company}` : ""} {c.suburb ? `· ${c.suburb}` : ""}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-emerald-600/40 text-emerald-400 hover:bg-emerald-600/20 hover:text-emerald-300 px-2"
                  onClick={() => setPitchContact({ id: c.id, name: c.name, email: c.email, company: c.company })}
                  title="Run SEO Audit & Pitch"
                >
                  <Rocket className="w-3 h-3 mr-1" /> Pitch
                </Button>
                <Select value={c.status} onValueChange={(v) => updateStatusMutation.mutate({ id: c.id, status: v as "new" | "contacted" | "qualified" | "proposal" | "won" | "lost" })}>
                  <SelectTrigger className={`h-7 text-xs border-0 px-2 ${statusColor(c.status)}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="proposal">Proposal</SelectItem>
                    <SelectItem value="won">Won</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))
        )}
      </div>

      <SeoAuditPitchModal
        contact={pitchContact}
        open={pitchContact !== null}
        onClose={() => { setPitchContact(null); void contactsQuery.refetch(); }}
      />
    </div>
  );
}

// ── Research Panel (Perplexity Sonar) ────────────────────────────────────────

function ResearchPanel() {
  const [researchType, setResearchType] = useState<"suburb" | "competitor" | "ads" | "market" | "search">("market");
  const [suburb, setSuburb] = useState("");
  const [state, setState] = useState("NSW");
  const [agencyName, setAgencyName] = useState("");
  const [adTopic, setAdTopic] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [result, setResult] = useState<{ content: string; citations: string[]; generatedAt: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const utils = trpc.useUtils();

  const runResearch = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      if (researchType === "suburb" && suburb) {
        const data = await utils.research.suburbTrends.fetch({ suburb, state });
        setResult({ content: data.analysis, citations: data.citations, generatedAt: data.generatedAt });
      } else if (researchType === "competitor" && agencyName) {
        const data = await utils.research.competitorIntel.fetch({ agencyName, state });
        setResult({ content: data.intel, citations: data.citations, generatedAt: data.generatedAt });
      } else if (researchType === "ads" && adTopic) {
        const data = await utils.research.adInsights.fetch({ topic: adTopic });
        setResult({ content: data.insights, citations: data.citations, generatedAt: data.generatedAt });
      } else if (researchType === "market") {
        const data = await utils.research.marketOverview.fetch({ state: state as "NSW" | "VIC" | "QLD" | "WA" | "SA" | "TAS" | "ACT" | "NT" | "all" });
        setResult({ content: data.overview, citations: data.citations, generatedAt: data.generatedAt });
      } else if (researchType === "search" && searchQuery) {
        const data = await utils.research.search.fetch({ query: searchQuery });
        setResult({ content: data.answer, citations: data.citations, generatedAt: data.generatedAt });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Research failed";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {(["market", "suburb", "competitor", "ads", "search"] as const).map((t) => (
          <Button
            key={t}
            size="sm"
            variant={researchType === t ? "default" : "outline"}
            onClick={() => setResearchType(t)}
            className={researchType === t ? "bg-emerald-600 text-white" : "border-slate-600 text-slate-300"}
          >
            {t === "market" ? "Market Overview" : t === "suburb" ? "Suburb Trends" : t === "competitor" ? "Competitor Intel" : t === "ads" ? "Ad Insights" : "Custom Search"}
          </Button>
        ))}
      </div>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-4 space-y-3">
          {(researchType === "suburb" || researchType === "competitor" || researchType === "market") && (
            <Select value={state} onValueChange={setState}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white w-40">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT", "all"].map((s) => (
                  <SelectItem key={s} value={s}>{s === "all" ? "All Australia" : s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {researchType === "suburb" && (
            <Input placeholder="Suburb name (e.g. Bondi, Toorak)" value={suburb} onChange={(e) => setSuburb(e.target.value)} className="bg-slate-700 border-slate-600 text-white" />
          )}
          {researchType === "competitor" && (
            <Input placeholder="Agency name (e.g. Ray White Bondi)" value={agencyName} onChange={(e) => setAgencyName(e.target.value)} className="bg-slate-700 border-slate-600 text-white" />
          )}
          {researchType === "ads" && (
            <Input placeholder="Ad topic (e.g. Facebook ads for Sydney real estate)" value={adTopic} onChange={(e) => setAdTopic(e.target.value)} className="bg-slate-700 border-slate-600 text-white" />
          )}
          {researchType === "search" && (
            <Textarea placeholder="Ask anything about Australian real estate marketing..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-slate-700 border-slate-600 text-white" rows={3} />
          )}

          <Button onClick={runResearch} disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full">
            {isLoading ? (
              <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Researching with Perplexity Sonar...</>
            ) : (
              <><Search className="w-4 h-4 mr-2" /> Run Research</>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-emerald-400 text-xs font-medium flex items-center gap-1">
                <Zap className="w-3 h-3" /> Powered by Perplexity Sonar Pro
              </span>
              <span className="text-slate-400 text-xs">{new Date(result.generatedAt).toLocaleString("en-AU")}</span>
            </div>
            <div className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">{result.content}</div>
            {result.citations.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-700">
                <div className="text-slate-400 text-xs font-medium mb-2">Sources</div>
                <div className="space-y-1">
                  {result.citations.slice(0, 5).map((cite, i) => (
                    <a key={i} href={cite} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-400 text-xs hover:text-blue-300 truncate">
                      <ExternalLink className="w-3 h-3 shrink-0" /> {cite}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Pitch History Panel ─────────────────────────────────────────────────────

function PitchHistoryPanel() {
  const pitchesQuery = trpc.seoAuditPitch.list.useQuery({ limit: 50 }, { retry: 1 });
  const [selectedPitch, setSelectedPitch] = useState<number | null>(null);
  const pitchDetailQuery = trpc.seoAuditPitch.getById.useQuery(
    { id: selectedPitch! },
    { enabled: selectedPitch !== null, retry: 1 }
  );

  const scoreColor = (s: number | null) => {
    if (s === null || s === undefined) return "text-slate-400";
    return s >= 70 ? "text-emerald-400" : s >= 50 ? "text-yellow-400" : "text-red-400";
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      email_sent: { bg: "bg-emerald-500/20", text: "text-emerald-400", label: "Email Sent" },
      qualified: { bg: "bg-blue-500/20", text: "text-blue-400", label: "Qualified" },
      not_qualified: { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "Not Qualified" },
      running: { bg: "bg-cyan-500/20", text: "text-cyan-400", label: "Running" },
      failed: { bg: "bg-red-500/20", text: "text-red-400", label: "Failed" },
      pending: { bg: "bg-slate-500/20", text: "text-slate-400", label: "Pending" },
    };
    const m = map[status] || map.pending;
    return <Badge className={`${m.bg} ${m.text} border-0`}>{m.label}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-slate-400 text-sm">All SEO audit pitches sent from the CRM tab.</p>
        <Button size="sm" variant="outline" onClick={() => void pitchesQuery.refetch()} className="border-slate-600 text-slate-300">
          <RefreshCw className="w-3 h-3 mr-1" /> Refresh
        </Button>
      </div>

      {pitchesQuery.isLoading ? (
        <div className="text-slate-400 text-sm py-8 text-center">Loading pitch history...</div>
      ) : (pitchesQuery.data || []).length === 0 ? (
        <div className="text-slate-400 text-sm py-8 text-center">No pitches yet. Use the CRM tab to run SEO audits.</div>
      ) : (
        <div className="space-y-2">
          {(pitchesQuery.data || []).map((p: any) => (
            <div
              key={p.id}
              className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer"
              onClick={() => setSelectedPitch(p.id)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${scoreColor(p.seoScore)}`} style={{ background: "rgba(30,41,59,0.8)" }}>
                  {p.seoScore ?? "?"}
                </div>
                <div>
                  <div className="text-white text-sm font-medium">{p.companyName || p.websiteUrl}</div>
                  <div className="text-slate-400 text-xs flex items-center gap-2">
                    {p.contactEmail && <span>{p.contactEmail}</span>}
                    {p.planName && <span>· {p.planName} ${p.planPrice?.toLocaleString()}/mo</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {statusBadge(p.status)}
                <div className="text-slate-500 text-xs flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-AU") : ""}
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={selectedPitch !== null} onOpenChange={(v) => { if (!v) setSelectedPitch(null); }}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Target className="w-5 h-5 text-emerald-400" />
              Pitch Detail — {pitchDetailQuery.data?.companyName || "Loading..."}
            </DialogTitle>
          </DialogHeader>

          {pitchDetailQuery.isLoading ? (
            <div className="text-slate-400 text-sm py-8 text-center">Loading details...</div>
          ) : pitchDetailQuery.data ? (
            <div className="space-y-4">
              {/* Score Card */}
              <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
                <div>
                  <p className="text-slate-400 text-xs">SEO Score</p>
                  <p className={`text-4xl font-bold ${scoreColor(pitchDetailQuery.data.seoScore)}`}>
                    {pitchDetailQuery.data.seoScore ?? "?"}<span className="text-lg text-slate-400">/100</span>
                  </p>
                </div>
                <div className="text-right space-y-1">
                  {statusBadge(pitchDetailQuery.data.status)}
                  {pitchDetailQuery.data.planName && (
                    <p className="text-emerald-400 font-bold">${pitchDetailQuery.data.planPrice?.toLocaleString()}<span className="text-slate-400 text-xs">/mo</span></p>
                  )}
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "On-Page", value: pitchDetailQuery.data.seoOnPage, max: 40 },
                  { label: "Content", value: pitchDetailQuery.data.seoContent, max: 25 },
                  { label: "Technical", value: pitchDetailQuery.data.seoTechnical, max: 20 },
                  { label: "Trust", value: pitchDetailQuery.data.seoTrust, max: 15 },
                ].map((d) => (
                  <div key={d.label} className="p-2 bg-slate-800 rounded text-center">
                    <p className="text-slate-400 text-xs">{d.label}</p>
                    <p className="text-white font-bold">{d.value ?? "?"}<span className="text-slate-500 text-xs">/{d.max}</span></p>
                  </div>
                ))}
              </div>

              {/* Issues */}
              {pitchDetailQuery.data.topIssues && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-400 text-xs font-medium mb-2">Top Issues</p>
                  <ul className="space-y-1">
                    {JSON.parse(pitchDetailQuery.data.topIssues).map((issue: string, i: number) => (
                      <li key={i} className="text-slate-300 text-xs flex gap-2"><span className="text-red-400">•</span>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Email info */}
              {pitchDetailQuery.data.emailSubject && (
                <div className="p-3 bg-slate-800 rounded-lg space-y-2">
                  <p className="text-slate-400 text-xs font-medium">Email Sent</p>
                  <p className="text-white text-sm">Subject: {pitchDetailQuery.data.emailSubject}</p>
                  {pitchDetailQuery.data.emailSentAt && (
                    <p className="text-slate-400 text-xs">Sent: {new Date(pitchDetailQuery.data.emailSentAt).toLocaleString("en-AU")}</p>
                  )}
                  {pitchDetailQuery.data.emailBodyText && (
                    <details className="group">
                      <summary className="cursor-pointer text-xs text-slate-400 hover:text-white">View email body ▸</summary>
                      <pre className="mt-2 text-xs text-slate-300 bg-slate-900 p-3 rounded whitespace-pre-wrap max-h-48 overflow-y-auto">{pitchDetailQuery.data.emailBodyText}</pre>
                    </details>
                  )}
                </div>
              )}

              {/* Demo link */}
              {pitchDetailQuery.data.demoHtml && (
                <a
                  href={`/demo/${pitchDetailQuery.data.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 bg-emerald-600/10 border border-emerald-600/20 rounded-lg text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span className="text-sm font-medium">View Demo Page</span>
                  <ExternalLink className="w-3 h-3 ml-auto" />
                </a>
              )}

              {/* Error */}
              {pitchDetailQuery.data.errorMessage && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-400 text-xs">Error: {pitchDetailQuery.data.errorMessage}</p>
                </div>
              )}

              <Button onClick={() => setSelectedPitch(null)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                Close
              </Button>
            </div>
          ) : (
            <div className="text-slate-400 text-sm py-4 text-center">Pitch not found.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Main Command Centre Page ─────────────────────────────────────────────────

export default function CommandCentre() {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-600/20 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Command Centre</h1>
          <p className="text-slate-400 text-sm">Private owner dashboard — Revenue, CRM, Invoicing & Research</p>
        </div>
        <Badge className="ml-auto bg-emerald-600/20 text-emerald-400 border-emerald-600/30">Owner Only</Badge>
      </div>

      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList className="bg-slate-800 border border-slate-700 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="revenue" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-slate-400">
            <DollarSign className="w-4 h-4 mr-1" /> Revenue
          </TabsTrigger>
          <TabsTrigger value="invoicing" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-slate-400">
            <FileText className="w-4 h-4 mr-1" /> Invoicing
          </TabsTrigger>
          <TabsTrigger value="crm" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-slate-400">
            <Users className="w-4 h-4 mr-1" /> CRM
          </TabsTrigger>
          <TabsTrigger value="research" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-slate-400">
            <Globe className="w-4 h-4 mr-1" /> Research
          </TabsTrigger>
          <TabsTrigger value="pitchHistory" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-slate-400">
            <History className="w-4 h-4 mr-1" /> Pitch History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="revenue"><RevenueDashboard /></TabsContent>
        <TabsContent value="invoicing"><InvoicingPanel /></TabsContent>
        <TabsContent value="crm"><CRMPanel /></TabsContent>
        <TabsContent value="research"><ResearchPanel /></TabsContent>
        <TabsContent value="pitchHistory"><PitchHistoryPanel /></TabsContent>
      </Tabs>
    </div>
  );
}
