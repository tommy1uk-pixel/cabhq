'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import SuperAdminPageHeader from '@/components/super-admin/SuperAdminPageHeader';
import SuperAdminPanel from '@/components/super-admin/SuperAdminPanel';
import SuperAdminStatCard from '@/components/super-admin/SuperAdminStatCard';
import SuperAdminDetailRow from '@/components/super-admin/SuperAdminDetailRow';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') || 'http://localhost:3002';

type BillingPlan = 'STARTER' | 'GROWTH' | 'PRO' | 'ENTERPRISE';
type BillingStatus = 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'CANCELLED' | string;
type InvoiceStatus = 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'CANCELLED' | string;

type CompanyBilling = {
  companyId: string;
  companyName: string;
  billingPlan: BillingPlan;
  billingStatus: BillingStatus;
  trialEndsAt: string | null;
  subscriptionStartsAt: string | null;
  subscriptionEndsAt: string | null;
  monthlyPrice: number;
  unpaidInvoices: number;
  currency: string;
  createdAt: string;
};

type Invoice = {
  id: string;
  companyId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  dueDate: string | null;
  paidAt: string | null;
  createdAt: string;
};

function formatCurrency(value: number, currency = 'GBP') {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
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

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function planClass(plan: BillingPlan) {
  if (plan === 'STARTER') return 'border-white/10 bg-white/5 text-white/75';
  if (plan === 'GROWTH') return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
  if (plan === 'PRO') return 'border-violet-500/30 bg-violet-500/10 text-violet-300';
  return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
}

function statusClass(status: BillingStatus | InvoiceStatus) {
  if (status === 'ACTIVE') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }
  if (status === 'TRIAL') {
    return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
  }
  if (status === 'PAST_DUE') {
    return 'border-red-500/30 bg-red-500/10 text-red-300';
  }
  if (status === 'CANCELLED') {
    return 'border-white/10 bg-white/5 text-white/70';
  }
  return 'border-white/10 bg-white/5 text-white/70';
}

export default function SuperAdminCompanyBillingPage() {
  const params = useParams();
  const companyId = Array.isArray(params.companyId) ? params.companyId[0] : params.companyId;

  const [billing, setBilling] = useState<CompanyBilling | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!companyId) return;

    let active = true;

    async function loadBilling() {
      try {
        setLoading(true);
        setError('');

        const [billingRes, invoicesRes] = await Promise.all([
          fetch(`${API_URL}/companies/${companyId}/billing`, { cache: 'no-store' }),
          fetch(`${API_URL}/companies/${companyId}/invoices`, { cache: 'no-store' }),
        ]);

        if (!billingRes.ok) {
          throw new Error(`Failed to load billing (${billingRes.status})`);
        }

        if (!invoicesRes.ok) {
          throw new Error(`Failed to load invoices (${invoicesRes.status})`);
        }

        const billingData = (await billingRes.json()) as CompanyBilling;
        const invoiceData = (await invoicesRes.json()) as Invoice[];

        if (!active) return;

        setBilling(billingData);
        setInvoices(Array.isArray(invoiceData) ? invoiceData : []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load billing');
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadBilling();

    return () => {
      active = false;
    };
  }, [companyId]);

  const stats = useMemo(() => {
    return {
      invoices: invoices.length,
      unpaid: billing?.unpaidInvoices ?? 0,
      monthlyPrice: billing?.monthlyPrice ?? 0,
      trial: billing?.billingStatus === 'TRIAL' ? 'Yes' : 'No',
      nextDue: billing?.subscriptionEndsAt ? formatDate(billing.subscriptionEndsAt) : '—',
    };
  }, [billing, invoices]);

  async function updateBillingStatus(nextStatus: BillingStatus) {
    if (!billing || !companyId) return;

    try {
      setSaving(true);
      setError('');

      const res = await fetch(`${API_URL}/companies/${companyId}/billing`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          billingStatus: nextStatus,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to update billing (${res.status})`);
      }

      const refreshed = await fetch(`${API_URL}/companies/${companyId}/billing`, {
        cache: 'no-store',
      });

      if (!refreshed.ok) {
        throw new Error(`Failed to refresh billing (${refreshed.status})`);
      }

      const billingData = (await refreshed.json()) as CompanyBilling;
      setBilling(billingData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update billing');
    } finally {
      setSaving(false);
    }
  }

  async function updateBillingPlan(nextPlan: BillingPlan) {
    if (!billing || !companyId) return;

    try {
      setSaving(true);
      setError('');

      const res = await fetch(`${API_URL}/companies/${companyId}/billing`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          billingPlan: nextPlan,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to update plan (${res.status})`);
      }

      const refreshed = await fetch(`${API_URL}/companies/${companyId}/billing`, {
        cache: 'no-store',
      });

      if (!refreshed.ok) {
        throw new Error(`Failed to refresh billing (${refreshed.status})`);
      }

      const billingData = (await refreshed.json()) as CompanyBilling;
      setBilling(billingData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update plan');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#05070c] px-4 py-6 text-white md:px-6">
        <div className="mx-auto max-w-[1850px] rounded-2xl border border-white/10 bg-[#0b1728] p-6 text-white/55">
          Loading billing...
        </div>
      </main>
    );
  }

  if (error && !billing) {
    return (
      <main className="min-h-screen bg-[#05070c] px-4 py-6 text-white md:px-6">
        <div className="mx-auto max-w-[1850px] rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-200">
          {error}
        </div>
      </main>
    );
  }

  if (!billing) {
    return (
      <main className="min-h-screen bg-[#05070c] px-4 py-6 text-white md:px-6">
        <div className="mx-auto max-w-[1850px] rounded-2xl border border-white/10 bg-[#0b1728] p-6 text-white/55">
          Billing record not found.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#05070c] px-4 py-6 text-white md:px-6">
      <div className="mx-auto max-w-[1850px]">
        <SuperAdminPageHeader
          eyebrow="Company Billing"
          title={billing.companyName}
          description={`Billing plan, status, subscription dates and invoices.`}
          actions={
            <>
              <Link
                href={`/super-admin/companies/${billing.companyId}`}
                className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Back to Company
              </Link>
              <Link
                href={`/super-admin/companies/${billing.companyId}/edit`}
                className="rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500"
              >
                Edit Company
              </Link>
            </>
          }
        />

        <div className="mb-6 flex flex-wrap gap-2">
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${planClass(
              billing.billingPlan,
            )}`}
          >
            {billing.billingPlan}
          </span>
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
              billing.billingStatus,
            )}`}
          >
            {billing.billingStatus}
          </span>
        </div>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <SuperAdminStatCard
            label="Monthly Price"
            value={formatCurrency(billing.monthlyPrice, billing.currency)}
          />
          <SuperAdminStatCard label="Invoices" value={stats.invoices} />
          <SuperAdminStatCard label="Unpaid Invoices" value={stats.unpaid} />
          <SuperAdminStatCard label="Trial" value={stats.trial} />
          <SuperAdminStatCard label="Next Due" value={stats.nextDue} />
        </section>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-200">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="space-y-6">
            <SuperAdminPanel title="Billing Summary">
              <div className="space-y-3">
                <SuperAdminDetailRow label="Company" value={billing.companyName} />
                <SuperAdminDetailRow label="Billing Plan" value={billing.billingPlan} />
                <SuperAdminDetailRow label="Billing Status" value={billing.billingStatus} />
                <SuperAdminDetailRow
                  label="Monthly Price"
                  value={formatCurrency(billing.monthlyPrice, billing.currency)}
                />
                <SuperAdminDetailRow label="Currency" value={billing.currency} />
                <SuperAdminDetailRow label="Trial Ends" value={formatDate(billing.trialEndsAt)} />
                <SuperAdminDetailRow
                  label="Subscription Starts"
                  value={formatDate(billing.subscriptionStartsAt)}
                />
                <SuperAdminDetailRow
                  label="Subscription Ends"
                  value={formatDate(billing.subscriptionEndsAt)}
                />
                <SuperAdminDetailRow
                  label="Billing Record Created"
                  value={formatDateTime(billing.createdAt)}
                />
              </div>
            </SuperAdminPanel>

            <SuperAdminPanel title="Invoices">
              {invoices.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4 text-sm text-white/55">
                  No invoices found.
                </div>
              ) : (
                <div className="space-y-4">
                  {invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="rounded-2xl border border-white/10 bg-[#0b1728] p-5"
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-lg font-bold text-white">
                              {invoice.invoiceNumber}
                            </div>
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                                invoice.status,
                              )}`}
                            >
                              {invoice.status}
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/45">
                            <span>Created: {formatDate(invoice.createdAt)}</span>
                            <span>Due: {formatDate(invoice.dueDate)}</span>
                            <span>Paid: {formatDate(invoice.paidAt)}</span>
                          </div>
                        </div>

                        <div className="text-lg font-bold text-white">
                          {formatCurrency(invoice.amount, invoice.currency)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SuperAdminPanel>
          </section>

          <section className="space-y-6">
            <SuperAdminPanel title="Plan Controls">
              <div className="grid gap-3">
                <button
                  disabled={saving}
                  onClick={() => updateBillingPlan('STARTER')}
                  className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50"
                >
                  Move to Starter
                </button>
                <button
                  disabled={saving}
                  onClick={() => updateBillingPlan('GROWTH')}
                  className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50"
                >
                  Move to Growth
                </button>
                <button
                  disabled={saving}
                  onClick={() => updateBillingPlan('PRO')}
                  className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50"
                >
                  Move to Pro
                </button>
                <button
                  disabled={saving}
                  onClick={() => updateBillingPlan('ENTERPRISE')}
                  className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50"
                >
                  Move to Enterprise
                </button>
              </div>
            </SuperAdminPanel>

            <SuperAdminPanel title="Billing Status Controls">
              <div className="grid gap-3">
                <button
                  disabled={saving}
                  onClick={() => updateBillingStatus('ACTIVE')}
                  className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  Mark Active
                </button>
                <button
                  disabled={saving}
                  onClick={() => updateBillingStatus('TRIAL')}
                  className="rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
                >
                  Mark Trial
                </button>
                <button
                  disabled={saving}
                  onClick={() => updateBillingStatus('PAST_DUE')}
                  className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                >
                  Mark Past Due
                </button>
                <button
                  disabled={saving}
                  onClick={() => updateBillingStatus('CANCELLED')}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50"
                >
                  Mark Cancelled
                </button>
              </div>
            </SuperAdminPanel>
          </section>
        </div>
      </div>
    </main>
  );
}