'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import SuperAdminPageHeader from '@/components/super-admin/SuperAdminPageHeader';
import SuperAdminPanel from '@/components/super-admin/SuperAdminPanel';
import SuperAdminStatCard from '@/components/super-admin/SuperAdminStatCard';
import SuperAdminDetailRow from '@/components/super-admin/SuperAdminDetailRow';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') || 'http://localhost:3002';

/* =====================================================
   TYPES
===================================================== */

type CompanyStatus = 'ACTIVE' | 'TRIAL' | 'SUSPENDED' | 'PENDING';
type PlanType = 'STARTER' | 'GROWTH' | 'PRO' | 'ENTERPRISE' | string;
type PaymentStatus = 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'CANCELLED' | string;

type ApiCompany = {
  id: string;
  name: string;
  plan: PlanType;
  billingStatus: PaymentStatus;
  trialEndsAt: string | null;
  subscriptionStartsAt: string | null;
  subscriptionEndsAt: string | null;
  monthlyRevenue: number;
  unpaidInvoices: number;
  createdAt: string;
  updatedAt: string;
};

/* =====================================================
   STYLES
===================================================== */

const buttonPrimary =
  'rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50';
const buttonOutline =
  'rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50';

/* =====================================================
   HELPERS
===================================================== */

function formatCurrency(value: number) {
  return `£${value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* =====================================================
   PAGE
===================================================== */

export default function SuperAdminCompanyBillingPage() {
  const params = useParams();
  const companyId = Array.isArray(params.companyId) ? params.companyId[0] : params.companyId;

  const [company, setCompany] = useState<ApiCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  async function loadCompany() {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/companies/${companyId}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Failed to load company (${res.status})`);
      const data: ApiCompany = await res.json();
      setCompany(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load company');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCompany();
  }, [companyId]);

  const monthlyPrice = useMemo(() => {
    if (!company) return 0;
    switch (company.plan) {
      case 'STARTER': return 49;
      case 'GROWTH': return 89;
      case 'PRO': return 149;
      case 'ENTERPRISE': return 249;
      default: return 0;
    }
  }, [company]);

  async function changeBillingStatus(newStatus: PaymentStatus) {
    if (!companyId) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`${API_URL}/companies/${companyId}/billing-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billingStatus: newStatus }),
      });
      if (!res.ok) throw new Error(`Failed to update billing status (${res.status})`);
      await loadCompany();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingStatus(false);
    }
  }

  if (loading) return <main className="min-h-screen bg-[#05070c] p-6 text-white">Loading...</main>;
  if (!company) return <main className="min-h-screen bg-[#05070c] p-6 text-red-300">{error || 'Company not found'}</main>;

  return (
    <main className="min-h-screen bg-[#05070c] px-4 py-6 text-white md:px-6">
      <div className="mx-auto max-w-[1850px]">
        <SuperAdminPageHeader
          eyebrow="Billing"
          title={company.name}
          description={`Company ID: ${company.id} · Created ${formatDate(company.createdAt)}`}
          actions={
            <>
              <Link href={`/super-admin/companies/${company.id}`} className={buttonOutline}>Back</Link>
            </>
          }
        />

        <section className="mb-6 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <SuperAdminStatCard label="Plan" value={company.plan} />
          <SuperAdminStatCard label="Monthly Cost" value={formatCurrency(monthlyPrice)} />
          <SuperAdminStatCard label="Billing Status" value={company.billingStatus} />
          <SuperAdminStatCard label="Revenue" value={formatCurrency(company.monthlyRevenue)} />
          <SuperAdminStatCard label="Unpaid Invoices" value={company.unpaidInvoices} />
        </section>

        <SuperAdminPanel title="Billing Status Actions">
          <div className="flex flex-wrap gap-4">
            <button
              className={buttonPrimary}
              disabled={updatingStatus}
              onClick={() => changeBillingStatus('ACTIVE')}
            >
              Mark ACTIVE
            </button>
            <button
              className={buttonOutline}
              disabled={updatingStatus}
              onClick={() => changeBillingStatus('PAST_DUE')}
            >
              Mark PAST DUE
            </button>
            <button
              className={buttonOutline}
              disabled={updatingStatus}
              onClick={() => changeBillingStatus('TRIAL')}
            >
              Mark TRIAL
            </button>
            <button
              className={buttonOutline}
              disabled={updatingStatus}
              onClick={() => changeBillingStatus('CANCELLED')}
            >
              Cancel Billing
            </button>
          </div>
        </SuperAdminPanel>
      </div>
    </main>
  );
}