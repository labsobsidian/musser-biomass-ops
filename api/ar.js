// /api/ar.js
//
// Accounts receivable endpoint. Reads live data from Supabase tables that
// Atlas Sage Bridge populates from Sage 50. If no rows have been synced yet,
// returns an empty payload with source='no_data' so the UI can render an
// honest empty state.

import { getSupabaseAdmin } from '../lib/supabase.js';

const TENANT_ID = 'tenant_musser';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  try {
    const supa = getSupabaseAdmin();
    const [invoicesRes, customersRes] = await Promise.all([
      supa
        .from('sage_invoices')
        .select('source_id, source_updated_at, normalized')
        .eq('tenant_id', TENANT_ID),
      supa
        .from('sage_customers')
        .select('source_id, normalized')
        .eq('tenant_id', TENANT_ID),
    ]);

    if (invoicesRes.error) {
      return res.status(500).json({ error: 'sage_read_error', message: invoicesRes.error.message });
    }
    if (customersRes.error) {
      return res.status(500).json({ error: 'sage_read_error', message: customersRes.error.message });
    }

    const customerById = new Map();
    for (const c of customersRes.data ?? []) {
      customerById.set(c.source_id, c.normalized || {});
    }

    const today = startOfUtcDay(new Date());
    const allInvoices = invoicesRes.data ?? [];
    const openInvoices = allInvoices
      .map((row) => projectInvoice(row, customerById, today))
      .filter((inv) => inv && inv.amount > 0);

    const aging = { Current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    for (const inv of openInvoices) aging[inv.bucket] += inv.amount;

    const overdue = openInvoices.filter((inv) => inv.daysOverdue > 0);
    const critical = openInvoices.filter((inv) => inv.status === 'Critical');
    const totalOpen = round2(openInvoices.reduce((sum, i) => sum + i.amount, 0));
    const overdueTotal = round2(overdue.reduce((sum, i) => sum + i.amount, 0));
    const hasData = openInvoices.length > 0;

    return res.status(200).json({
      source: hasData ? 'sage_50' : 'no_data',
      connector: 'sage50',
      demoMode: !hasData,
      asOf: today.toISOString().slice(0, 10),
      summary: {
        totalOpen,
        overdueTotal,
        currentTotal: round2(aging.Current),
        invoiceCount: openInvoices.length,
        overdueCount: overdue.length,
        criticalCount: critical.length,
        dsoEstimate: hasData ? estimateDso(allInvoices) : null,
      },
      aging: Object.entries(aging).map(([bucket, amount]) => ({ bucket, amount: round2(amount) })),
      invoices: openInvoices.sort((a, b) => b.daysOverdue - a.daysOverdue),
      collectionPriority: buildPriority(openInvoices, hasData),
      aiSummary: hasData
        ? `Live AR via Atlas Sage Bridge: $${formatMoney(totalOpen)} open across ${openInvoices.length} invoices, $${formatMoney(overdueTotal)} overdue across ${overdue.length}. Source: Sage 50.`
        : 'No invoices have been synced from Sage 50 yet. Once Atlas Sage Bridge runs its first sync, live AR appears here.',
    });
  } catch (err) {
    return res.status(500).json({ error: 'ar_read_failed', message: err.message });
  }
}

function projectInvoice(row, customerById, today) {
  const n = row.normalized || {};
  const balanceRaw = n.balance ?? n.total;
  if (balanceRaw == null) return null;
  const balance = Number(balanceRaw);
  if (!Number.isFinite(balance)) return null;

  const dueDate = n.due_date ? new Date(n.due_date) : null;
  const daysOverdue = dueDate
    ? Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / 86400000))
    : 0;

  const bucket =
    daysOverdue === 0 ? 'Current'
    : daysOverdue <= 30 ? '1-30'
    : daysOverdue <= 60 ? '31-60'
    : daysOverdue <= 90 ? '61-90'
    : '90+';

  const status =
    daysOverdue === 0 ? 'Current'
    : daysOverdue <= 15 ? 'Overdue'
    : daysOverdue <= 60 ? 'At risk'
    : 'Critical';

  const customer = customerById.get(n.customer_source_id) || {};

  return {
    customer: customer.name || n.customer_source_id || 'Unknown customer',
    invoiceNumber: row.source_id,
    invoiceDate: shortDate(n.invoice_date),
    dueDate: shortDate(n.due_date),
    amount: round2(balance),
    status,
    daysOverdue,
    bucket,
    notes: customer.default_terms ? `Terms: ${customer.default_terms}` : '',
  };
}

function estimateDso(allInvoices) {
  const paid = allInvoices
    .map((r) => r.normalized || {})
    .filter((n) => n.paid_at && n.invoice_date)
    .slice(-12);
  if (paid.length === 0) return null;
  const avgDays =
    paid.reduce((sum, n) => {
      const inv = new Date(n.invoice_date);
      const paidDate = new Date(n.paid_at);
      return sum + (paidDate.getTime() - inv.getTime()) / 86400000;
    }, 0) / paid.length;
  return Math.round(avgDays);
}

function buildPriority(invoices, hasData) {
  if (!hasData) {
    return ['No open invoices yet — Atlas Sage Bridge has not pushed AR data, or everything is paid.'];
  }
  const items = [];
  for (const inv of invoices.filter((i) => i.status === 'Critical').slice(0, 3)) {
    items.push(`Call ${inv.customer} (${inv.invoiceNumber}) — ${inv.daysOverdue} days overdue. Owner review before any new shipment.`);
  }
  for (const inv of invoices.filter((i) => i.status === 'At risk').slice(0, 3)) {
    items.push(`Statement + BOL follow-up: ${inv.customer} (${inv.invoiceNumber}).`);
  }
  for (const inv of invoices.filter((i) => i.status === 'Overdue').slice(0, 3)) {
    items.push(`Email reminder: ${inv.customer} (${inv.invoiceNumber}).`);
  }
  if (items.length === 0) {
    items.push('All open invoices are current — no collection action needed.');
  }
  return items.slice(0, 6);
}

function startOfUtcDay(d) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function shortDate(s) {
  if (!s) return '';
  try { return new Date(s).toISOString().slice(0, 10); }
  catch { return String(s); }
}

function round2(n) { return Math.round(n * 100) / 100; }

function formatMoney(n) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
