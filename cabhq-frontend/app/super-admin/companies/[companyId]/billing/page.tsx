'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type PlanType = 'STARTER' | 'OPERATOR' | 'PRO' | 'ENTERPRISE';
type InvoiceStatus = 'PAID' | 'DUE' | 'OVERDUE' | 'DRAFT';

type Invoice = {
  id: string;
  period: string;
  issueDate: string;
  dueDate: string;
  basePlan: number;
  usageCharges: number;
  total: number;
  status: InvoiceStatus;
};

const initialInvoices: Invoice[] = [
  {
    id: 'INV-1001',
    period: 'Apr 2026',
    issueDate: '2026-04-01',
    dueDate: '2026-04-07',
    basePlan: 89,
    usageCharges: 24,
    total: 113,
    status: 'PAID',
  },
  {
    id: 'INV-0972',
    period: 'Mar 2026',
    issueDate: '2026-03-01',
    dueDate: '2026-03-07',
    basePlan: 89,
    usageCharges: 18,
    total: 107,
    status: 'PAID',
  },
  {
    id: 'INV-0941',
    period: 'Feb 2026',
    issueDate: '2026-02-01',
    dueDate: '2026-02-07',
    basePlan: 89,
    usageCharges: 31,
    total: 120,
    status: 'PAID',
  },
];

const planPrices: Record<PlanType, number> = {
  STARTER: 49,
  OPERATOR: 89,
  PRO: 149,
  ENTERPRISE: 249,
};

function formatCurrency(value: number) {
  return `£${value.toFixed(2)}`;
}

function statusClass(status: InvoiceStatus) {
  if (status === 'PAID') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  if (status === 'DUE') return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  if (status === 'OVERDUE') return 'border-red-500/30 bg-red-500/10 text-red-300';
  return 'border-white/10 bg-white/5 text-white/70';
}

export default function CompanyBillingPage() {
  const [plan, setPlan] = useState<PlanType>('OPERATOR');
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [usageCharges, setUsageCharges] = useState('24');

  const stats = useMemo(() => {
    return {
      invoiced: invoices.reduce((sum, inv) => sum + inv.total, 0),
      paid: invoices.filter((inv) => inv.status === 'PAID').reduce((sum, inv) => sum + inv.total, 0),
      due: invoices.filter((inv) => inv.status !== 'PAID').reduce((sum, inv) => sum + inv.total, 0),
      count: invoices.length,
    };
  }, [invoices]);

  function addInvoice() {
    const usage = Number(usageCharges || 0);
    const basePlan = planPrices[plan];
    const total = basePlan + usage;

    const next: Invoice = {
      id: `INV-${Math.random().toString().slice(2, 8)}`,
      period: 'New Invoice',
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date().toISOString().slice(0, 10),
      basePlan,
      usageCharges: usage,
      total,
      status: 'DUE',
    };

    setInvoices((prev) => [next, ...prev]);
  }

  function setInvoiceStatus(id: string, status: InvoiceStatus) {
    setInvoices((prev) => prev.map((inv) => (inv.id === id ? { ...inv, status } : inv)));
  }

  return (
    <main className="min-h-screen bg-[#05070c] px-4 py-6 text-white md:px-6">
      <div className="mx-auto max-w-[1700px]">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-white/35">
              Company Billing
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
              Alpha Cars Billing
            </h1>
            <p className="mt-2 text-sm text-white/55">
              Subscription plan, usage charges and invoice history.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/super-admin/companies/cmp_alpha_001"
              className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Back to Company
            </Link>
          </div>
        </div>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Invoice Count" value={stats.count} />
          <StatCard label="Total Invoiced" value={formatCurrency(stats.invoiced)} />
          <StatCard label="Paid" value={formatCurrency(stats.paid)} />
          <StatCard label="Outstanding" value={formatCurrency(stats.due)} />
        </section>

        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-bold">Create Invoice</h2>
            <div className="mt-5 space-y-4">
              <Field
                label="Plan"
                input={
                  <select
                    value={plan}
                    onChange={(e) => setPlan(e.target.value as PlanType)}
                    className={inputClassName}
                  >
                    <option value="STARTER">Starter</option>
                    <option value="OPERATOR">Operator</option>
                    <option value="PRO">Pro</option>
                    <option value="ENTERPRISE">Enterprise</option>
                  </select>
                }
              />
              <Field
                label="Usage Charges"
                input={
                  <input
                    value={usageCharges}
                    onChange={(e) => setUsageCharges(e.target.value)}
                    className={inputClassName}
                  />
                }
              />

              <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                <DetailRow label="Base Plan" value={formatCurrency(planPrices[plan])} />
                <DetailRow label="Usage" value={formatCurrency(Number(usageCharges || 0))} />
                <DetailRow
                  label="Invoice Total"
                  value={formatCurrency(planPrices[plan] + Number(usageCharges || 0))}
                />
              </div>

              <button
                onClick={addInvoice}
                className="w-full rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500"
              >
                Create Invoice
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 text-2xl font-bold">Invoices</h2>
            <div className="space-y-4">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="rounded-2xl border border-white/10 bg-[#0b1728] p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold">{invoice.id}</h3>
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-white/60">{invoice.period}</p>
                      <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/45">
                        <span>Issued: {invoice.issueDate}</span>
                        <span>Due: {invoice.dueDate}</span>
                        <span>Plan: {formatCurrency(invoice.basePlan)}</span>
                        <span>Usage: {formatCurrency(invoice.usageCharges)}</span>
                        <span>Total: {formatCurrency(invoice.total)}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setInvoiceStatus(invoice.id, 'PAID')} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500">
                        Mark Paid
                      </button>
                      <button onClick={() => setInvoiceStatus(invoice.id, 'DUE')} className="rounded-xl bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-500">
                        Mark Due
                      </button>
                      <button onClick={() => setInvoiceStatus(invoice.id, 'OVERDUE')} className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500">
                        Mark Overdue
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <p className="text-sm text-white/60">{label}</p>
      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

function Field({
  label,
  input,
}: {
  label: string;
  input: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-medium text-white/75">{label}</div>
      {input}
    </label>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/5 py-2 last:border-b-0">
      <span className="text-sm text-white/50">{label}</span>
      <span className="text-right text-sm text-white/85">{value}</span>
    </div>
  );
}

const inputClassName =
  'w-full rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3 text-white outline-none focus:border-cyan-500/50';