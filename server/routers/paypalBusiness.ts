import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { ENV } from "../_core/env";

const PAYPAL_BASE = "https://api-m.paypal.com";

// ─── PayPal API Helper ────────────────────────────────────────────────────────

async function getAccessToken(): Promise<string> {
  const credentials = Buffer.from(
    `${ENV.paypalClientId}:${ENV.paypalSecret}`
  ).toString("base64");

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "PayPal auth failed" });
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

async function paypalRequest<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${PAYPAL_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `PayPal API error ${res.status}: ${text}`,
    });
  }

  // Some endpoints return 204 No Content
  if (res.status === 204) return {} as T;
  return res.json() as Promise<T>;
}

// ─── Transactions Router ──────────────────────────────────────────────────────

export const paypalTransactionsRouter = router({
  list: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(), // ISO date string e.g. "2024-01-01"
      endDate: z.string().optional(),
      pageSize: z.number().min(1).max(500).default(20),
      page: z.number().min(1).default(1),
    }))
    .query(async ({ input }) => {
      const end = input.endDate || new Date().toISOString().split("T")[0];
      const start = input.startDate || (() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split("T")[0];
      })();

      const params = new URLSearchParams({
        start_date: `${start}T00:00:00-0700`,
        end_date: `${end}T23:59:59-0700`,
        page_size: input.pageSize.toString(),
        page: input.page.toString(),
        fields: "all",
      });

      const data = await paypalRequest<{
        transaction_details?: Array<{
          transaction_info: {
            transaction_id: string;
            transaction_amount: { value: string; currency_code: string };
            transaction_status: string;
            transaction_initiation_date: string;
            transaction_subject?: string;
            fee_amount?: { value: string };
          };
          payer_info?: { email_address?: string; payer_name?: { given_name?: string; surname?: string } };
        }>;
        total_items?: number;
        total_pages?: number;
      }>("GET", `/v1/reporting/transactions?${params}`);

      return {
        transactions: (data.transaction_details || []).map((t) => ({
          id: t.transaction_info.transaction_id,
          amount: parseFloat(t.transaction_info.transaction_amount.value),
          currency: t.transaction_info.transaction_amount.currency_code,
          status: t.transaction_info.transaction_status,
          date: t.transaction_info.transaction_initiation_date,
          subject: t.transaction_info.transaction_subject || "",
          fee: t.transaction_info.fee_amount ? parseFloat(t.transaction_info.fee_amount.value) : 0,
          payerEmail: t.payer_info?.email_address || "",
          payerName: t.payer_info?.payer_name
            ? `${t.payer_info.payer_name.given_name || ""} ${t.payer_info.payer_name.surname || ""}`.trim()
            : "",
        })),
        totalItems: data.total_items || 0,
        totalPages: data.total_pages || 1,
      };
    }),

  search: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      transactionId: z.string().optional(),
      payerEmail: z.string().optional(),
      transactionStatus: z.string().optional(), // S=Success, P=Pending, V=Reversed, D=Denied, F=Failed
      minAmount: z.number().optional(),
      maxAmount: z.number().optional(),
      transactionType: z.string().optional(), // T0001=Goods, T0003=Subscription, T0006=Recurring, T0007=Refund, etc.
      pageSize: z.number().min(1).max(500).default(20),
      page: z.number().min(1).default(1),
    }))
    .query(async ({ input }) => {
      const end = input.endDate || new Date().toISOString().split("T")[0];
      const start = input.startDate || (() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split("T")[0];
      })();

      const params = new URLSearchParams({
        start_date: `${start}T00:00:00-0700`,
        end_date: `${end}T23:59:59-0700`,
        page_size: input.pageSize.toString(),
        page: input.page.toString(),
        fields: "all",
      });

      // Add optional filters
      if (input.transactionId) params.set("transaction_id", input.transactionId);
      if (input.transactionStatus) params.set("transaction_status", input.transactionStatus);
      if (input.transactionType) params.set("transaction_type", input.transactionType);

      // PayPal API supports amount range via transaction_amount
      if (input.minAmount !== undefined) params.set("transaction_amount", `${input.minAmount}`);

      const data = await paypalRequest<{
        transaction_details?: Array<{
          transaction_info: {
            transaction_id: string;
            transaction_amount: { value: string; currency_code: string };
            transaction_status: string;
            transaction_initiation_date: string;
            transaction_subject?: string;
            transaction_note?: string;
            fee_amount?: { value: string };
            transaction_event_code?: string;
          };
          payer_info?: {
            email_address?: string;
            payer_name?: { given_name?: string; surname?: string };
            account_id?: string;
          };
          shipping_info?: {
            name?: string;
            address?: { line1?: string; city?: string; state?: string; postal_code?: string; country_code?: string };
          };
          cart_info?: {
            item_details?: Array<{ item_name?: string; item_quantity?: string; item_unit_price?: { value?: string } }>;
          };
        }>;
        total_items?: number;
        total_pages?: number;
        page?: number;
        last_refreshed_datetime?: string;
      }>("GET", `/v1/reporting/transactions?${params}`);

      // Client-side filtering for email and amount range (PayPal API has limited filter support)
      let transactions = (data.transaction_details || []).map((t) => ({
        id: t.transaction_info.transaction_id,
        amount: parseFloat(t.transaction_info.transaction_amount.value),
        currency: t.transaction_info.transaction_amount.currency_code,
        status: t.transaction_info.transaction_status,
        date: t.transaction_info.transaction_initiation_date,
        subject: t.transaction_info.transaction_subject || "",
        note: t.transaction_info.transaction_note || "",
        fee: t.transaction_info.fee_amount ? parseFloat(t.transaction_info.fee_amount.value) : 0,
        eventCode: t.transaction_info.transaction_event_code || "",
        payerEmail: t.payer_info?.email_address || "",
        payerName: t.payer_info?.payer_name
          ? `${t.payer_info.payer_name.given_name || ""} ${t.payer_info.payer_name.surname || ""}`.trim()
          : "",
        payerAccountId: t.payer_info?.account_id || "",
        shippingName: t.shipping_info?.name || "",
        shippingAddress: t.shipping_info?.address
          ? [t.shipping_info.address.line1, t.shipping_info.address.city, t.shipping_info.address.state, t.shipping_info.address.postal_code, t.shipping_info.address.country_code].filter(Boolean).join(", ")
          : "",
        items: (t.cart_info?.item_details || []).map((item) => ({
          name: item.item_name || "",
          quantity: parseInt(item.item_quantity || "1"),
          unitPrice: parseFloat(item.item_unit_price?.value || "0"),
        })),
      }));

      // Client-side email filter
      if (input.payerEmail) {
        const emailLower = input.payerEmail.toLowerCase();
        transactions = transactions.filter((tx) =>
          tx.payerEmail.toLowerCase().includes(emailLower) ||
          tx.payerName.toLowerCase().includes(emailLower)
        );
      }

      // Client-side amount range filter
      if (input.minAmount !== undefined) {
        transactions = transactions.filter((tx) => Math.abs(tx.amount) >= input.minAmount!);
      }
      if (input.maxAmount !== undefined) {
        transactions = transactions.filter((tx) => Math.abs(tx.amount) <= input.maxAmount!);
      }

      // Compute summary stats
      const totalVolume = transactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
      const totalFees = transactions.reduce((sum, tx) => sum + Math.abs(tx.fee), 0);
      const successCount = transactions.filter((tx) => tx.status === "S").length;
      const pendingCount = transactions.filter((tx) => tx.status === "P").length;
      const failedCount = transactions.filter((tx) => ["V", "D", "F"].includes(tx.status)).length;

      return {
        transactions,
        totalItems: data.total_items || 0,
        totalPages: data.total_pages || 1,
        currentPage: data.page || input.page,
        lastRefreshed: data.last_refreshed_datetime || "",
        summary: {
          totalVolume,
          totalFees,
          netAmount: totalVolume - totalFees,
          successCount,
          pendingCount,
          failedCount,
          transactionCount: transactions.length,
        },
      };
    }),

  getBalance: protectedProcedure.query(async () => {
    const data = await paypalRequest<{
      balances?: Array<{
        currency: string;
        primary: boolean;
        total_balance: { value: string; currency_code: string };
        available_balance: { value: string; currency_code: string };
      }>;
    }>("GET", "/v1/reporting/balances");

    return {
      balances: (data.balances || []).map((b) => ({
        currency: b.currency,
        isPrimary: b.primary,
        total: parseFloat(b.total_balance?.value || "0"),
        available: parseFloat(b.available_balance?.value || "0"),
      })),
    };
  }),
});

// ─── Invoicing Router ─────────────────────────────────────────────────────────

export const paypalInvoicingRouter = router({
  list: protectedProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      pageSize: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      const data = await paypalRequest<{
        items?: Array<{
          id: string;
          status: string;
          detail: { invoice_number?: string; invoice_date?: string; currency_code: string };
          amount: { value: string };
          primary_recipients?: Array<{ billing_info: { email_address?: string; name?: { full_name?: string } } }>;
        }>;
        total_items?: number;
        total_pages?: number;
      }>("GET", `/v2/invoicing/invoices?page=${input.page}&page_size=${input.pageSize}&total_count_required=true`);

      return {
        invoices: (data.items || []).map((inv) => ({
          id: inv.id,
          status: inv.status,
          invoiceNumber: inv.detail.invoice_number || "",
          date: inv.detail.invoice_date || "",
          currency: inv.detail.currency_code,
          amount: parseFloat(inv.amount?.value || "0"),
          recipientEmail: inv.primary_recipients?.[0]?.billing_info?.email_address || "",
          recipientName: inv.primary_recipients?.[0]?.billing_info?.name?.full_name || "",
        })),
        totalItems: data.total_items || 0,
        totalPages: data.total_pages || 1,
      };
    }),

  create: protectedProcedure
    .input(z.object({
      recipientEmail: z.string().email(),
      recipientName: z.string(),
      items: z.array(z.object({
        name: z.string(),
        description: z.string().optional(),
        quantity: z.number().positive(),
        unitAmount: z.number().positive(),
      })),
      note: z.string().optional(),
      currency: z.string().default("AUD"),
    }))
    .mutation(async ({ input }) => {
      const invoice = await paypalRequest<{ id: string; status: string; detail: { invoice_number?: string } }>(
        "POST",
        "/v2/invoicing/invoices",
        {
          detail: {
            currency_code: input.currency,
            note: input.note,
            payment_term: { term_type: "DUE_ON_RECEIPT" },
          },
          primary_recipients: [{
            billing_info: {
              email_address: input.recipientEmail,
              name: { full_name: input.recipientName },
            },
          }],
          items: input.items.map((item) => ({
            name: item.name,
            description: item.description,
            quantity: item.quantity.toString(),
            unit_amount: { currency_code: input.currency, value: item.unitAmount.toFixed(2) },
          })),
        }
      );

      return {
        id: invoice.id,
        status: invoice.status,
        invoiceNumber: invoice.detail?.invoice_number || "",
      };
    }),

  send: protectedProcedure
    .input(z.object({ invoiceId: z.string() }))
    .mutation(async ({ input }) => {
      await paypalRequest("POST", `/v2/invoicing/invoices/${input.invoiceId}/send`, {
        send_to_recipient: true,
        send_to_invoicer: true,
      });
      return { success: true };
    }),

  cancel: protectedProcedure
    .input(z.object({ invoiceId: z.string(), note: z.string().optional() }))
    .mutation(async ({ input }) => {
      await paypalRequest("POST", `/v2/invoicing/invoices/${input.invoiceId}/cancel`, {
        subject: "Invoice Cancelled",
        note: input.note || "This invoice has been cancelled.",
        send_to_recipient: true,
      });
      return { success: true };
    }),
});

// ─── Subscriptions Router ─────────────────────────────────────────────────────

export const paypalSubscriptionsRouter = router({
  list: protectedProcedure
    .input(z.object({ planId: z.string().optional() }))
    .query(async ({ input }) => {
      // List subscription plans first
      const plansData = await paypalRequest<{
        plans?: Array<{ id: string; name: string; status: string; billing_cycles?: unknown[] }>;
      }>("GET", "/v1/billing/plans?page_size=20&page=1&total_required=true");

      return {
        plans: (plansData.plans || []).map((p) => ({
          id: p.id,
          name: p.name,
          status: p.status,
        })),
      };
    }),

  getSubscription: protectedProcedure
    .input(z.object({ subscriptionId: z.string() }))
    .query(async ({ input }) => {
      const data = await paypalRequest<{
        id: string;
        status: string;
        plan_id: string;
        start_time: string;
        subscriber?: { email_address?: string; name?: { given_name?: string; surname?: string } };
        billing_info?: { next_billing_time?: string; last_payment?: { amount?: { value?: string }; time?: string } };
      }>("GET", `/v1/billing/subscriptions/${input.subscriptionId}`);

      return {
        id: data.id,
        status: data.status,
        planId: data.plan_id,
        startTime: data.start_time,
        subscriberEmail: data.subscriber?.email_address || "",
        subscriberName: data.subscriber?.name
          ? `${data.subscriber.name.given_name || ""} ${data.subscriber.name.surname || ""}`.trim()
          : "",
        nextBillingTime: data.billing_info?.next_billing_time || "",
        lastPaymentAmount: parseFloat(data.billing_info?.last_payment?.amount?.value || "0"),
        lastPaymentTime: data.billing_info?.last_payment?.time || "",
      };
    }),

  cancel: protectedProcedure
    .input(z.object({ subscriptionId: z.string(), reason: z.string().optional() }))
    .mutation(async ({ input }) => {
      await paypalRequest("POST", `/v1/billing/subscriptions/${input.subscriptionId}/cancel`, {
        reason: input.reason || "Customer requested cancellation",
      });
      return { success: true };
    }),
});

// ─── Payouts Router ───────────────────────────────────────────────────────────

export const paypalPayoutsRouter = router({
  send: protectedProcedure
    .input(z.object({
      recipients: z.array(z.object({
        email: z.string().email(),
        amount: z.number().positive(),
        note: z.string().optional(),
        recipientType: z.enum(["EMAIL", "PHONE", "PAYPAL_ID"]).default("EMAIL"),
      })),
      currency: z.string().default("AUD"),
      emailSubject: z.string().optional(),
      emailMessage: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const batchId = `KFA-${Date.now()}`;
      const data = await paypalRequest<{
        batch_header: { payout_batch_id: string; batch_status: string };
      }>("POST", "/v1/payments/payouts", {
        sender_batch_header: {
          sender_batch_id: batchId,
          email_subject: input.emailSubject || "You have a payment from Keys For Agents",
          email_message: input.emailMessage || "Thank you for your partnership with Keys For Agents.",
        },
        items: input.recipients.map((r, i) => ({
          recipient_type: r.recipientType,
          amount: { value: r.amount.toFixed(2), currency: input.currency },
          note: r.note || "",
          receiver: r.email,
          sender_item_id: `${batchId}-${i}`,
        })),
      });

      return {
        batchId: data.batch_header.payout_batch_id,
        status: data.batch_header.batch_status,
      };
    }),

  getStatus: protectedProcedure
    .input(z.object({ payoutBatchId: z.string() }))
    .query(async ({ input }) => {
      const data = await paypalRequest<{
        batch_header: { payout_batch_id: string; batch_status: string; amount?: { value?: string; currency?: string } };
        items?: Array<{ payout_item_id: string; transaction_status: string; payout_item: { receiver: string; amount: { value: string } } }>;
      }>("GET", `/v1/payments/payouts/${input.payoutBatchId}`);

      return {
        batchId: data.batch_header.payout_batch_id,
        status: data.batch_header.batch_status,
        totalAmount: parseFloat(data.batch_header.amount?.value || "0"),
        currency: data.batch_header.amount?.currency || "AUD",
        items: (data.items || []).map((item) => ({
          id: item.payout_item_id,
          status: item.transaction_status,
          receiver: item.payout_item.receiver,
          amount: parseFloat(item.payout_item.amount.value),
        })),
      };
    }),
});
