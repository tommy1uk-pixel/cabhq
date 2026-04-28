'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import SuperAdminPageHeader from '@/components/super-admin/SuperAdminPageHeader';
import SuperAdminPanel from '@/components/super-admin/SuperAdminPanel';
import SuperAdminStatCard from '@/components/super-admin/SuperAdminStatCard';
import SuperAdminDetailRow from '@/components/super-admin/SuperAdminDetailRow';

type BillingPlan = 'STARTER' | 'GROWTH' | 'PRO' | 'ENTERPRISE';
type BillingStatus = 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'CANCELLED' | string;
type InvoiceStatus =
  | 'DRAFT'
  | 'SENT'
  | 'PART_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'VOID'
  | 'ACTIVE'
  | 'TRIAL'
  | 'PAST_DUE'
  | 'CANCELLED'
  | string;

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
  amount?: number;
  total?: number;
  balanceDue?: number;
  paidAmount?: number;
  currency?: string;
  status: InvoiceStatus;
  dueDate: string | null;
  paidAt?: string | null;
  createdAt: string;
};

const planPrices: Record<BillingPlan, number> = {
  STARTER: 49,
  GROWTH: 89,
  PRO: 149,
  ENTERPRISE: 249,
};

function formatCurrency(value: number, currency = 'GBP') {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
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
  if (status === 'ACTIVE' || status === 'PAID') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }

  if (status === 'TRIAL' || status === 'SENT' || status === 'PART_PAID') {
    return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
  }

  if (status === 'PAST_DUE' || status === 'OVERDUE') {
    return 'border-red-500/30 bg-red-500/10 text-red-300';
  }

  if (status === 'DRAFT') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  }

  return 'border-white/10 bg-white/5 text-white/70';
}

function invoiceAmount(invoice: Invoice) {
  return Number(invoice.total ?? invoice.amount ?? 0);
}

function invoiceCurrency(invoice: Invoice, fallback = 'GBP') {
  return invoice.currency || fallback;
}

export default function SuperAdminCompanyBillingPage() {
  const params = useParams();
  const companyId = Array.isArray(params.companyId)
    ? params.companyId[0]
    : params.companyId;

  const [billing, setBilling] = useState<CompanyBilling | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadBilling = useCallback(async () => {
    if (!companyId) return;

    const [billingData, invoiceData] = await Promise.all([
      apiFetch<CompanyBilling>(`/companies/${companyId}/billing`),
      apiFetch<Invoice[]>(`/companies/${companyId}/invoices`).catch(() => []),
    ]);

    setBilling(billingData);
    setInvoices(Array.isArray(invoiceData) ? invoiceData : []);
  }, [companyId]);

  useEffect(() => {
    let active = true;

    async function run() {
      try {
        setLoading(true);
        setError('');
        await loadBilling();
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load billing');
      } finally {
        if (active) setLoading(false);
      }
    }

    void run();

    return () => {
      active = false;
    };
  }, [loadBilling]);

  const stats = useMemo(() => {
    const invoiceTotal = invoices.reduce((sum, invoice) => {
      return sum + invoiceAmount(invoice);
    }, 0);

    const unpaidValue = invoices.reduce((sum, invoice) => {
      const status = String(invoice.status || '').toUpperCase();

      if (status === 'PAID' || status === 'VOID' || status === 'CANCELLED') {
        return sum;
      }

      return sum + Number(invoice.balanceDue ?? invoiceAmount(invoice));
    }, 0);

    const paidValue = invoices.reduce((sum, invoice) => {
      return sum + Number(invoice.paidAmount ?? 0);
    }, 0);

    return {
      invoices: invoices.length,
      unpaid: billing?.unpaidInvoices ?? invoices.filter((invoice) =>
        ['SENT', 'PART_PAID', 'OVERDUE', 'PAST_DUE'].includes(
          String(invoice.status).toUpperCase(),
        ),
      ).length,
      monthlyPrice: billing?.monthlyPrice ?? 0,
      trial: billing?.billingStatus === 'TRIAL' ? 'Yes' : 'No',
      nextDue: billing?.subscriptionEndsAt ? formatDate(billing.subscriptionEndsAt) : '—',
      invoiceTotal,
      unpaidValue,
      paidValue,
    };
  }, [billing, invoices]);

  async function updateBillingStatus(nextStatus: BillingStatus) {
    if (!billing || !companyId) return;

    try {
      setSavingKey(`status-${nextStatus}`);
      setError('');
      setSuccess('');

      await apiFetch<CompanyBilling>(`/companies/${companyId}/billing`, {
        method: 'PATCH',
        body: JSON.stringify({ billingStatus: nextStatus }),
      });

      await loadBilling();
      setSuccess(`Billing status updated to ${nextStatus}`);
      setTimeout(() => setSuccess(''), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update billing');
    } finally {
      setSavingKey(null);
    }
  }

  async function updateBillingPlan(nextPlan: BillingPlan) {
    if (!billing || !companyId) return;

    try {
      setSavingKey(`plan-${nextPlan}`);
      setError('');
      setSuccess('');

      await apiFetch<CompanyBilling>(`/companies/${companyId}/billing`, {
        method: 'PATCH',
        body: JSON.stringify({
          billingPlan: nextPlan,
          monthlyPrice: planPrices[nextPlan],
        }),
      });

      await loadBilling();
      setSuccess(`Plan updated to ${nextPlan}`);
      setTimeout(() => setSuccess(''), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update plan');
    } finally {
      setSavingKey(null);
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
          description="Billing plan, subscription status, trial dates and company invoices."
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

        {(error || success) && (
          <div
            className={`mb-6 rounded-2xl border p-4 text-sm ${
              error
                ? 'border-red-500/20 bg-red-500/10 text-red-200'
                : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
            }`}
          >
            {error || success}
          </div>
        )}

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <SuperAdminStatCard
            label="Monthly Price"
            value={formatCurrency(billing.monthlyPrice, billing.currency)}
          />
          <SuperAdminStatCard label="Invoices" value={stats.invoices} />
          <SuperAdminStatCard label="Unpaid Invoices" value={stats.unpaid} />
          <SuperAdminStatCard
            label="Unpaid Value"
            value={formatCurrency(stats.unpaidValue, billing.currency)}
          />
          <SuperAdminStatCard label="Next Due" value={stats.nextDue} />
        </section>

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
                <SuperAdminDetailRow label="Trial Active" value={stats.trial} />
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

                        <div className="text-right">
                          <div className="text-lg font-bold text-white">
                            {formatCurrency(
                              invoiceAmount(invoice),
                              invoiceCurrency(invoice, billing.currency),
                            )}
                          </div>

                          {invoice.balanceDue != null ? (
                            <div className="mt-1 text-xs text-white/45">
                              Balance: {formatCurrency(invoice.balanceDue, invoiceCurrency(invoice, billing.currency))}
                            </div>
                          ) : null}
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
                {(['STARTER', 'GROWTH', 'PRO', 'ENTERPRISE'] as BillingPlan[]).map(
                  (plan) => (
                    <button
                      key={plan}
                      disabled={Boolean(savingKey) || billing.billingPlan === plan}
                      onClick={() => updateBillingPlan(plan)}
                      className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition disabled:opacity-50 ${
                        billing.billingPlan === plan
                          ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200'
                          : 'border-white/10 text-white hover:bg-white/10'
                      }`}
                    >
                      {savingKey === `plan-${plan}`
                        ? 'Updating...'
                        : `Move to ${plan} · ${formatCurrency(planPrices[plan], billing.currency)}`}
                    </button>
                  ),
                )}
              </div>
            </SuperAdminPanel>

            <SuperAdminPanel title="Billing Status Controls">
              <div className="grid gap-3">
                <button
                  disabled={Boolean(savingKey)}
                  onClick={() => updateBillingStatus('ACTIVE')}
                  className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {savingKey === 'status-ACTIVE' ? 'Updating...' : 'Mark Active'}
                </button>

                <button
                  disabled={Boolean(savingKey)}
                  onClick={() => updateBillingStatus('TRIAL')}
                  className="rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
                >
                  {savingKey === 'status-TRIAL' ? 'Updating...' : 'Mark Trial'}
                </button>

                <button
                  disabled={Boolean(savingKey)}
                  onClick={() => updateBillingStatus('PAST_DUE')}
                  className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                >
                  {savingKey === 'status-PAST_DUE' ? 'Updating...' : 'Mark Past Due'}
                </button>

                <button
                  disabled={Boolean(savingKey)}
                  onClick={() => updateBillingStatus('CANCELLED')}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50"
                >
                  {savingKey === 'status-CANCELLED'
                    ? 'Updating...'
                    : 'Mark Cancelled'}
                </button>
              </div>
            </SuperAdminPanel>

            <SuperAdminPanel title="Billing Health">
              <div className="space-y-3">
                <SuperAdminDetailRow
                  label="Invoice Total"
                  value={formatCurrency(stats.invoiceTotal, billing.currency)}
                />
                <SuperAdminDetailRow
                  label="Paid Recorded"
                  value={formatCurrency(stats.paidValue, billing.currency)}
                />
                <SuperAdminDetailRow
                  label="Unpaid Value"
                  value={formatCurrency(stats.unpaidValue, billing.currency)}
                />
                <SuperAdminDetailRow
                  label="Unpaid Count"
                  value={String(stats.unpaid)}
                />
              </div>
            </SuperAdminPanel>
          </section>
        </div>
      </div>
    </main>
  );
}