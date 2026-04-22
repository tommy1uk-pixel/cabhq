'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type CompanyStatus = 'ACTIVE' | 'TRIAL' | 'SUSPENDED';
type PlanType = 'STARTER' | 'OPERATOR' | 'PRO' | 'ENTERPRISE';
type PaymentStatus = 'PAID' | 'DUE' | 'OVERDUE';
type UsageHealth = 'GOOD' | 'HIGH' | 'LIMITED';

type CompanyDetail = {
  id: string;
  companyName: string;
  slug: string;
  status: CompanyStatus;
  plan: PlanType;
  createdAt: string;
  renewalDate: string;
  paymentStatus: PaymentStatus;
  monthlyRevenue: number;
  unpaidInvoices: number;
  drivers: number;
  vehicles: number;
  activeUsers: number;
  bookingsMonth: number;
  apiCalls: number;
  smsUsed: number;
  emailsSent: number;
  storageGb: number;
  usageHealth: UsageHealth;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  salesRep: string;
  lastContactAt: string;
  internalNotes: string;
};

const initialCompany: CompanyDetail = {
  id: 'cmp_alpha_001',
  companyName: 'Alpha Cars',
  slug: 'alpha-cars',
  status: 'ACTIVE',
  plan: 'OPERATOR',
  createdAt: '2025-11-02T09:20:00',
  renewalDate: '2026-05-01T00:00:00',
  paymentStatus: 'PAID',
  monthlyRevenue: 18420,
  unpaidInvoices: 0,
  drivers: 34,
  vehicles: 28,
  activeUsers: 8,
  bookingsMonth: 3184,
  apiCalls: 128440,
  smsUsed: 842,
  emailsSent: 2190,
  storageGb: 3.7,
  usageHealth: 'GOOD',
  ownerName: 'Tommy Brown',
  ownerEmail: 'ops@alphacars.co.uk',
  ownerPhone: '0207 555 1000',
  salesRep: 'Megan Ross',
  lastContactAt: '2026-04-21T11:20:00',
  internalNotes:
    'Strong operator. Good dispatch adoption. Upsell target for Pro compliance + reporting.',
};

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

function statusClass(status: CompanyStatus) {
  if (status === 'ACTIVE') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  if (status === 'TRIAL') return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
  return 'border-red-500/30 bg-red-500/10 text-red-300';
}

function planClass(plan: PlanType) {
  if (plan === 'STARTER') return 'border-white/10 bg-white/5 text-white/75';
  if (plan === 'OPERATOR') return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
  if (plan === 'PRO') return 'border-violet-500/30 bg-violet-500/10 text-violet-300';
  return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
}

function paymentClass(status: PaymentStatus) {
  if (status === 'PAID') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  if (status === 'DUE') return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  return 'border-red-500/30 bg-red-500/10 text-red-300';
}

function usageClass(health: UsageHealth) {
  if (health === 'GOOD') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  if (health === 'HIGH') return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  return 'border-red-500/30 bg-red-500/10 text-red-300';
}

export default function SuperAdminCompanyDetailPage() {
  const [company, setCompany] = useState<CompanyDetail>(initialCompany);
  const [notes, setNotes] = useState(initialCompany.internalNotes);
  const [saved, setSaved] = useState(false);

  const billingTotal = useMemo(() => {
    return company.plan === 'STARTER'
      ? 49
      : company.plan === 'OPERATOR'
      ? 89
      : company.plan === 'PRO'
      ? 149
      : 249;
  }, [company.plan]);

  function setStatus(status: CompanyStatus) {
    setCompany((prev) => ({ ...prev, status }));
  }

  function setPlan(plan: PlanType) {
    setCompany((prev) => ({ ...prev, plan }));
  }

  function setPaymentStatus(paymentStatus: PaymentStatus) {
    setCompany((prev) => ({ ...prev, paymentStatus }));
  }

  function extendTrial() {
    setCompany((prev) => ({ ...prev, status: 'TRIAL' }));
  }

  function saveNotes() {
    setCompany((prev) => ({ ...prev, internalNotes: notes }));
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  }

  return (
    <main className="min-h-screen bg-[#05070c] px-4 py-6 text-white md:px-6">
      <div className="mx-auto max-w-[1850px]">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-white/35">
              Company Detail
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
              {company.companyName}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(company.status)}`}>
                {company.status}
              </span>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${planClass(company.plan)}`}>
                {company.plan}
              </span>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${paymentClass(company.paymentStatus)}`}>
                {company.paymentStatus}
              </span>
            </div>
            <p className="mt-3 text-sm text-white/55">
              Company ID: {company.id} · Created {formatDate(company.createdAt)}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/super-admin/companies"
              className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Back to Companies
            </Link>
            <Link
              href={`/super-admin/companies/${company.id}/edit`}
              className="rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500"
            >
              Edit Company
            </Link>
            <Link
              href={`/super-admin/companies/${company.id}/billing`}
              className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/20"
            >
              Open Billing
            </Link>
          </div>
        </div>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <StatCard label="Drivers" value={company.drivers} />
          <StatCard label="Vehicles" value={company.vehicles} />
          <StatCard label="Bookings Month" value={company.bookingsMonth} />
          <StatCard label="Revenue Month" value={formatCurrency(company.monthlyRevenue)} />
          <StatCard label="Unpaid Invoices" value={company.unpaidInvoices} />
          <StatCard label="Active Users" value={company.activeUsers} />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="space-y-6">
            <Panel title="Company & Billing">
              <DetailRow label="Company Name" value={company.companyName} />
              <DetailRow label="Slug" value={company.slug} />
              <DetailRow label="Owner" value={company.ownerName} />
              <DetailRow label="Owner Email" value={company.ownerEmail} />
              <DetailRow label="Owner Phone" value={company.ownerPhone} />
              <DetailRow label="Current Plan" value={company.plan} />
              <DetailRow label="Plan Amount" value={formatCurrency(billingTotal)} />
              <DetailRow label="Renewal Date" value={formatDate(company.renewalDate)} />
              <DetailRow label="Payment Status" value={company.paymentStatus} />
            </Panel>

            <Panel title="Usage">
              <div className="mb-4">
                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${usageClass(company.usageHealth)}`}>
                  {company.usageHealth} USAGE HEALTH
                </span>
              </div>
              <DetailRow label="API Calls" value={company.apiCalls.toLocaleString('en-GB')} />
              <DetailRow label="SMS Used" value={company.smsUsed.toLocaleString('en-GB')} />
              <DetailRow label="Emails Sent" value={company.emailsSent.toLocaleString('en-GB')} />
              <DetailRow label="Storage" value={`${company.storageGb.toFixed(1)} GB`} />
              <DetailRow label="Last Contact" value={formatDateTime(company.lastContactAt)} />
              <DetailRow label="Sales Rep" value={company.salesRep} />
            </Panel>

            <Panel title="Internal CRM Notes">
              <textarea
                rows={8}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3 text-white outline-none focus:border-cyan-500/50"
              />
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={saveNotes}
                  className="rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500"
                >
                  Save Notes
                </button>
                {saved ? <span className="text-sm text-emerald-300">Saved</span> : null}
              </div>
            </Panel>
          </section>

          <section className="space-y-6">
            <Panel title="Quick Actions">
              <div className="grid gap-3">
                <button className="rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500">
                  Login as Company Admin
                </button>
                <button className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10">
                  Open Company Dashboard
                </button>
                <button className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10">
                  Reset Owner Password
                </button>
                <button
                  onClick={extendTrial}
                  className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/20"
                >
                  Extend Trial
                </button>
                <button className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-200 hover:bg-amber-500/20">
                  Add Credits
                </button>
                <button
                  onClick={() => setStatus('SUSPENDED')}
                  className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200 hover:bg-red-500/20"
                >
                  Disable Company
                </button>
              </div>
            </Panel>

            <Panel title="Subscription Controls">
              <div className="grid gap-3">
                <button onClick={() => setPlan('STARTER')} className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10">
                  Move to Starter
                </button>
                <button onClick={() => setPlan('OPERATOR')} className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10">
                  Move to Operator
                </button>
                <button onClick={() => setPlan('PRO')} className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10">
                  Move to Pro
                </button>
                <button onClick={() => setPlan('ENTERPRISE')} className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10">
                  Move to Enterprise
                </button>
              </div>
            </Panel>

            <Panel title="Status Controls">
              <div className="grid gap-3">
                <button onClick={() => setStatus('ACTIVE')} className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500">
                  Mark Active
                </button>
                <button onClick={() => setStatus('TRIAL')} className="rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500">
                  Mark Trial
                </button>
                <button onClick={() => setStatus('SUSPENDED')} className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-500">
                  Suspend Company
                </button>
              </div>
            </Panel>

            <Panel title="Payment Controls">
              <div className="grid gap-3">
                <button onClick={() => setPaymentStatus('PAID')} className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500">
                  Mark Paid
                </button>
                <button onClick={() => setPaymentStatus('DUE')} className="rounded-2xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-500">
                  Mark Due
                </button>
                <button onClick={() => setPaymentStatus('OVERDUE')} className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-500">
                  Mark Overdue
                </button>
              </div>
            </Panel>
          </section>
        </div>
      </div>
    </main>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <h2 className="mb-4 text-2xl font-bold">{title}</h2>
      {children}
    </section>
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
      <span className="max-w-[60%] text-right text-sm text-white/85">{value}</span>
    </div>
  );
}