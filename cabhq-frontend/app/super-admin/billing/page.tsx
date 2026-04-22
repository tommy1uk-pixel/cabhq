'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

type InvoiceStatus = 'PAID' | 'DUE' | 'OVERDUE' | 'DRAFT';
type PlanType = 'STARTER' | 'GROWTH' | 'PRO' | 'ENTERPRISE';

type BillingCompany = {
  id: string;
  companyName: string;
  plan: PlanType;
  billingEmail: string;
  monthlyPrice: number;
  usageCharges: number;
  invoiceTotal: number;
  invoiceStatus: InvoiceStatus;
  nextBillingDate: string;
  lastPaymentDate?: string | null;
  paymentMethod?: string | null;
  activeUsers: number;
  activeDrivers: number;
};

const initialCompanies: BillingCompany[] = [
  {
    id: '1',
    companyName: 'Alpha Cars',
    plan: 'PRO',
    billingEmail: 'billing@alphacars.co.uk',
    monthlyPrice: 299,
    usageCharges: 84,
    invoiceTotal: 383,
    invoiceStatus: 'PAID',
    nextBillingDate: '2026-05-01T00:00:00',
    lastPaymentDate: '2026-04-01T09:14:00',
    paymentMethod: 'Visa ending 4242',
    activeUsers: 8,
    activeDrivers: 34,
  },
  {
    id: '2',
    companyName: 'CityLine Transport',
    plan: 'STARTER',
    billingEmail: 'finance@cityline.co.uk',
    monthlyPrice: 99,
    usageCharges: 18,
    invoiceTotal: 117,
    invoiceStatus: 'DUE',
    nextBillingDate: '2026-04-28T00:00:00',
    lastPaymentDate: '2026-03-28T10:08:00',
    paymentMethod: 'Mastercard ending 1881',
    activeUsers: 3,
    activeDrivers: 11,
  },
  {
    id: '3',
    companyName: 'Metro Executive',
    plan: 'ENTERPRISE',
    billingEmail: 'accounts@metroexec.co.uk',
    monthlyPrice: 699,
    usageCharges: 145,
    invoiceTotal: 844,
    invoiceStatus: 'PAID',
    nextBillingDate: '2026-05-04T00:00:00',
    lastPaymentDate: '2026-04-04T08:22:00',
    paymentMethod: 'Direct Debit',
    activeUsers: 14,
    activeDrivers: 61,
  },
  {
    id: '4',
    companyName: 'Rapid Cab Group',
    plan: 'GROWTH',
    billingEmail: 'ops@rapidcabgroup.co.uk',
    monthlyPrice: 199,
    usageCharges: 52,
    invoiceTotal: 251,
    invoiceStatus: 'OVERDUE',
    nextBillingDate: '2026-04-18T00:00:00',
    lastPaymentDate: '2026-03-18T11:41:00',
    paymentMethod: 'Visa ending 9021',
    activeUsers: 5,
    activeDrivers: 19,
  },
];

function formatCurrency(value: number) {
  return `£${value.toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';

  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function statusClass(status: InvoiceStatus) {
  if (status === 'PAID') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }
  if (status === 'DUE') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  }
  if (status === 'OVERDUE') {
    return 'border-red-500/30 bg-red-500/10 text-red-300';
  }
  return 'border-slate-500/30 bg-slate-500/10 text-slate-300';
}

function planClass(plan: PlanType) {
  if (plan === 'ENTERPRISE') {
    return 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300';
  }
  if (plan === 'PRO') {
    return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
  }
  if (plan === 'GROWTH') {
    return 'border-sky-500/30 bg-sky-500/10 text-sky-300';
  }
  return 'border-white/10 bg-white/5 text-white/70';
}

export default function SuperAdminBillingPage() {
  const [companies, setCompanies] = useState<BillingCompany[]>(initialCompanies);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialCompanies[0]?.id ?? null,
  );
  const [search, setSearch] = useState('');

  const filteredCompanies = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return companies;

    return companies.filter((company) =>
      [
        company.companyName,
        company.billingEmail,
        company.plan,
        company.invoiceStatus,
        company.paymentMethod || '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [companies, search]);

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === selectedId) ?? null,
    [companies, selectedId],
  );

  const stats = useMemo(() => {
    return {
      totalMrr: companies.reduce((sum, company) => sum + company.monthlyPrice, 0),
      usage: companies.reduce((sum, company) => sum + company.usageCharges, 0),
      invoiced: companies.reduce((sum, company) => sum + company.invoiceTotal, 0),
      overdue: companies.filter((company) => company.invoiceStatus === 'OVERDUE')
        .length,
      due: companies.filter((company) => company.invoiceStatus === 'DUE').length,
      paid: companies.filter((company) => company.invoiceStatus === 'PAID').length,
    };
  }, [companies]);

  function updateInvoiceStatus(id: string, status: InvoiceStatus) {
    setCompanies((prev) =>
      prev.map((company) =>
        company.id === id ? { ...company, invoiceStatus: status } : company,
      ),
    );
  }

  return (
    <main className="min-h-screen bg-[#05070c] px-4 py-6 text-white md:px-6">
      <div className="mx-auto max-w-[1850px]">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-white/35">
              Platform Billing
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
              Super Admin Billing
            </h1>
            <p className="mt-2 text-sm text-white/55">
              Subscription plans, invoice states, usage charges and payment tracking across all companies.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/super-admin"
              className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Back to Overview
            </Link>
            <button className="rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500">
              Export Billing
            </button>
          </div>
        </div>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <StatCard label="MRR" value={formatCurrency(stats.totalMrr)} />
          <StatCard label="Usage Charges" value={formatCurrency(stats.usage)} />
          <StatCard label="Invoiced" value={formatCurrency(stats.invoiced)} />
          <StatCard label="Paid" value={stats.paid} />
          <StatCard label="Due" value={stats.due} />
          <StatCard label="Overdue" value={stats.overdue} />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Billing Accounts</h2>
                <p className="mt-1 text-sm text-white/60">
                  Review current plan, invoice totals and payment status by company.
                </p>
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search billing accounts..."
                className="w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-500/50 lg:w-[320px]"
              />
            </div>

            {filteredCompanies.length === 0 ? (
              <div className="rounded-2xl bg-[#0b1728] p-6 text-white/60">
                No billing accounts found.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredCompanies.map((company) => {
                  const isSelected = selectedId === company.id;

                  return (
                    <div
                      key={company.id}
                      onClick={() => setSelectedId(company.id)}
                      className={`cursor-pointer rounded-2xl border p-5 transition ${
                        isSelected
                          ? 'border-cyan-500/50 bg-[#0c1b2c]'
                          : 'border-white/10 bg-[#0b1728]'
                      }`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-bold">{company.companyName}</h3>

                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${planClass(
                                company.plan,
                              )}`}
                            >
                              {company.plan}
                            </span>

                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                                company.invoiceStatus,
                              )}`}
                            >
                              {company.invoiceStatus}
                            </span>
                          </div>

                          <p className="mt-2 text-sm text-white/60">
                            {company.billingEmail}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/45">
                            <span>Base: {formatCurrency(company.monthlyPrice)}</span>
                            <span>Usage: {formatCurrency(company.usageCharges)}</span>
                            <span>Total: {formatCurrency(company.invoiceTotal)}</span>
                            <span>Next Billing: {formatDate(company.nextBillingDate)}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/super-admin/companies/${company.id}/edit`}
                            className="rounded-xl bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
                          >
                            Edit Company
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-bold">Billing Focus</h2>
            <p className="mt-1 text-sm text-white/60">
              Selected company billing summary and invoice controls.
            </p>

            {!selectedCompany ? (
              <div className="mt-5 rounded-2xl bg-[#0b1728] p-6 text-white/60">
                No company selected.
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-bold text-white">
                      {selectedCompany.companyName}
                    </h3>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                        selectedCompany.invoiceStatus,
                      )}`}
                    >
                      {selectedCompany.invoiceStatus}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-white/60">
                    {selectedCompany.billingEmail}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
                    Charges
                  </h4>
                  <DetailRow label="Plan" value={selectedCompany.plan} />
                  <DetailRow
                    label="Monthly Price"
                    value={formatCurrency(selectedCompany.monthlyPrice)}
                  />
                  <DetailRow
                    label="Usage Charges"
                    value={formatCurrency(selectedCompany.usageCharges)}
                  />
                  <DetailRow
                    label="Invoice Total"
                    value={formatCurrency(selectedCompany.invoiceTotal)}
                  />
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
                    Account
                  </h4>
                  <DetailRow
                    label="Payment Method"
                    value={selectedCompany.paymentMethod || '—'}
                  />
                  <DetailRow
                    label="Last Payment"
                    value={formatDate(selectedCompany.lastPaymentDate)}
                  />
                  <DetailRow
                    label="Next Billing"
                    value={formatDate(selectedCompany.nextBillingDate)}
                  />
                  <DetailRow
                    label="Active Users"
                    value={String(selectedCompany.activeUsers)}
                  />
                  <DetailRow
                    label="Active Drivers"
                    value={String(selectedCompany.activeDrivers)}
                  />
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
                    Actions
                  </h4>

                  <div className="space-y-2">
                    <button
                      onClick={() => updateInvoiceStatus(selectedCompany.id, 'PAID')}
                      className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                    >
                      Mark Paid
                    </button>

                    <button
                      onClick={() => updateInvoiceStatus(selectedCompany.id, 'DUE')}
                      className="w-full rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500"
                    >
                      Mark Due
                    </button>

                    <button
                      onClick={() => updateInvoiceStatus(selectedCompany.id, 'OVERDUE')}
                      className="w-full rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
                    >
                      Mark Overdue
                    </button>

                    <button
                      onClick={() => updateInvoiceStatus(selectedCompany.id, 'DRAFT')}
                      className="w-full rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
                    >
                      Mark Draft
                    </button>
                  </div>
                </div>
              </div>
            )}
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
      <span className="max-w-[60%] text-right text-sm text-white/85">
        {value}
      </span>
    </div>
  );
}