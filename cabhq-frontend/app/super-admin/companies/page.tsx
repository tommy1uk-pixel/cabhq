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

type CompanyStatus = 'ACTIVE' | 'TRIAL' | 'SUSPENDED' | 'PENDING';
type PlanType = 'STARTER' | 'OPERATOR' | 'PRO' | 'ENTERPRISE' | string;
type PaymentStatus = 'PAID' | 'DUE' | 'OVERDUE' | 'TRIAL' | string;
type UsageHealth = 'GOOD' | 'HIGH' | 'LIMITED';

type ApiCompanyUser = {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
};

type ApiCompany = {
  id: string;
  name: string;
  code: string;
  slug: string;
  status: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  timezone: string;
  currency: string;
  driverLimit: number;
  vehicleLimit: number;
  dispatcherSeatLimit: number;
  billingPlan: string;
  billingStatus: string;
  trialEndsAt: string | null;
  subscriptionStartsAt: string | null;
  subscriptionEndsAt: string | null;
  createdAt: string;
  updatedAt: string;
  users?: ApiCompanyUser[];
};

type CompanyDetail = {
  id: string;
  companyName: string;
  code: string;
  slug: string;
  status: CompanyStatus;
  plan: PlanType;
  createdAt: string;
  renewalDate: string | null;
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
  lastContactAt: string | null;
  internalNotes: string;
  timezone: string;
  currency: string;
  dispatcherSeatLimit: number;
  trialEndsAt: string | null;
  subscriptionStartsAt: string | null;
  users: ApiCompanyUser[];
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
  if (status === 'PENDING') return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  return 'border-red-500/30 bg-red-500/10 text-red-300';
}

function planClass(plan: PlanType) {
  if (plan === 'STARTER') return 'border-white/10 bg-white/5 text-white/75';
  if (plan === 'OPERATOR') return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
  if (plan === 'PRO') return 'border-violet-500/30 bg-violet-500/10 text-violet-300';
  if (plan === 'ENTERPRISE') return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  return 'border-white/10 bg-white/5 text-white/70';
}

function paymentClass(status: PaymentStatus) {
  if (status === 'PAID') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  if (status === 'DUE' || status === 'TRIAL') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  }
  return 'border-red-500/30 bg-red-500/10 text-red-300';
}

function usageClass(health: UsageHealth) {
  if (health === 'GOOD') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  if (health === 'HIGH') return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  return 'border-red-500/30 bg-red-500/10 text-red-300';
}

function deriveUsageHealth(apiCompany: ApiCompany): UsageHealth {
  const capacityTotal =
    (apiCompany.driverLimit ?? 0) +
    (apiCompany.vehicleLimit ?? 0) +
    (apiCompany.dispatcherSeatLimit ?? 0);

  if (capacityTotal >= 100) return 'HIGH';
  if (capacityTotal >= 40) return 'GOOD';
  return 'LIMITED';
}

function mapCompany(apiCompany: ApiCompany): CompanyDetail {
  const status =
    apiCompany.billingStatus === 'TRIAL'
      ? 'TRIAL'
      : ((apiCompany.status?.toUpperCase?.() as CompanyStatus) || 'PENDING');

  return {
    id: apiCompany.id,
    companyName: apiCompany.name || 'Untitled Company',
    code: apiCompany.code,
    slug: apiCompany.slug,
    status,
    plan: apiCompany.billingPlan || 'STARTER',
    createdAt: apiCompany.createdAt,
    renewalDate: apiCompany.subscriptionEndsAt,
    paymentStatus: apiCompany.billingStatus || 'TRIAL',
    monthlyRevenue: 0,
    unpaidInvoices: 0,
    drivers: apiCompany.driverLimit ?? 0,
    vehicles: apiCompany.vehicleLimit ?? 0,
    activeUsers: apiCompany.users?.length ?? 0,
    bookingsMonth: 0,
    apiCalls: 0,
    smsUsed: 0,
    emailsSent: 0,
    storageGb: 0,
    usageHealth: deriveUsageHealth(apiCompany),
    ownerName: apiCompany.contactName?.trim() || 'No contact assigned',
    ownerEmail: apiCompany.contactEmail?.trim() || 'No email',
    ownerPhone: apiCompany.contactPhone?.trim() || 'No phone',
    salesRep: 'Unassigned',
    lastContactAt: apiCompany.updatedAt,
    internalNotes: '',
    timezone: apiCompany.timezone,
    currency: apiCompany.currency,
    dispatcherSeatLimit: apiCompany.dispatcherSeatLimit ?? 0,
    trialEndsAt: apiCompany.trialEndsAt,
    subscriptionStartsAt: apiCompany.subscriptionStartsAt,
    users: apiCompany.users ?? [],
  };
}

export default function SuperAdminCompanyDetailPage() {
  const params = useParams();
  const companyId = Array.isArray(params.companyId) ? params.companyId[0] : params.companyId;

  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!companyId) return;

    let active = true;

    async function loadCompany() {
      try {
        setLoading(true);
        setError('');

        const res = await fetch(`${API_URL}/companies/${companyId}`, {
          cache: 'no-store',
        });

        if (!res.ok) {
          throw new Error(`Failed to load company (${res.status})`);
        }

        const data = (await res.json()) as ApiCompany;

        if (!active) return;

        const mapped = mapCompany(data);
        setCompany(mapped);
        setNotes(mapped.internalNotes);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load company');
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadCompany();

    return () => {
      active = false;
    };
  }, [companyId]);

  const billingTotal = useMemo(() => {
    if (!company) return 0;

    return company.plan === 'STARTER'
      ? 49
      : company.plan === 'OPERATOR'
      ? 89
      : company.plan === 'PRO'
      ? 149
      : 249;
  }, [company]);

  function saveNotes() {
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#05070c] px-4 py-6 text-white md:px-6">
        <div className="mx-auto max-w-[1850px] rounded-2xl border border-white/10 bg-[#0b1728] p-6 text-white/55">
          Loading company...
        </div>
      </main>
    );
  }

  if (error || !company) {
    return (
      <main className="min-h-screen bg-[#05070c] px-4 py-6 text-white md:px-6">
        <div className="mx-auto max-w-[1850px] rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-200">
          {error || 'Company not found'}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#05070c] px-4 py-6 text-white md:px-6">
      <div className="mx-auto max-w-[1850px]">
        <SuperAdminPageHeader
          eyebrow="Company Detail"
          title={company.companyName}
          description={`Company ID: ${company.id} · Created ${formatDate(company.createdAt)}`}
          actions={
            <>
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
            </>
          }
        />

        <div className="mb-6 flex flex-wrap gap-2">
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

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <SuperAdminStatCard label="Drivers" value={company.drivers} />
          <SuperAdminStatCard label="Vehicles" value={company.vehicles} />
          <SuperAdminStatCard label="Bookings Month" value={company.bookingsMonth} />
          <SuperAdminStatCard label="Revenue Month" value={formatCurrency(company.monthlyRevenue)} />
          <SuperAdminStatCard label="Unpaid Invoices" value={company.unpaidInvoices} />
          <SuperAdminStatCard label="Active Users" value={company.activeUsers} />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="space-y-6">
            <SuperAdminPanel title="Company & Billing">
              <div className="space-y-3">
                <SuperAdminDetailRow label="Company Name" value={company.companyName} />
                <SuperAdminDetailRow label="Code" value={company.code} />
                <SuperAdminDetailRow label="Slug" value={company.slug} />
                <SuperAdminDetailRow label="Owner" value={company.ownerName} />
                <SuperAdminDetailRow label="Owner Email" value={company.ownerEmail} />
                <SuperAdminDetailRow label="Owner Phone" value={company.ownerPhone} />
                <SuperAdminDetailRow label="Current Plan" value={company.plan} />
                <SuperAdminDetailRow label="Plan Amount" value={formatCurrency(billingTotal)} />
                <SuperAdminDetailRow label="Billing Status" value={company.paymentStatus} />
                <SuperAdminDetailRow label="Trial Ends" value={formatDate(company.trialEndsAt)} />
                <SuperAdminDetailRow label="Subscription Starts" value={formatDate(company.subscriptionStartsAt)} />
                <SuperAdminDetailRow label="Renewal Date" value={formatDate(company.renewalDate)} />
                <SuperAdminDetailRow label="Timezone" value={company.timezone} />
                <SuperAdminDetailRow label="Currency" value={company.currency} />
              </div>
            </SuperAdminPanel>

            <SuperAdminPanel title="Users">
              {company.users.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4 text-sm text-white/55">
                  No users found.
                </div>
              ) : (
                <div className="space-y-3">
                  {company.users.map((user) => (
                    <div
                      key={user.id}
                      className="rounded-2xl border border-white/10 bg-[#0b1728] p-4"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="font-semibold text-white">{user.email}</div>
                          <div className="mt-1 text-xs text-white/45">
                            Created {formatDateTime(user.createdAt)}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-300">
                            {user.role}
                          </span>
                          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                            {user.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SuperAdminPanel>

            <SuperAdminPanel title="Usage">
              <div className="mb-4">
                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${usageClass(company.usageHealth)}`}>
                  {company.usageHealth} USAGE HEALTH
                </span>
              </div>

              <div className="space-y-3">
                <SuperAdminDetailRow label="Driver Limit" value={company.drivers.toLocaleString('en-GB')} />
                <SuperAdminDetailRow label="Vehicle Limit" value={company.vehicles.toLocaleString('en-GB')} />
                <SuperAdminDetailRow label="Dispatcher Seats" value={company.dispatcherSeatLimit.toLocaleString('en-GB')} />
                <SuperAdminDetailRow label="API Calls" value={company.apiCalls.toLocaleString('en-GB')} />
                <SuperAdminDetailRow label="SMS Used" value={company.smsUsed.toLocaleString('en-GB')} />
                <SuperAdminDetailRow label="Emails Sent" value={company.emailsSent.toLocaleString('en-GB')} />
                <SuperAdminDetailRow label="Storage" value={`${company.storageGb.toFixed(1)} GB`} />
                <SuperAdminDetailRow label="Last Contact" value={formatDateTime(company.lastContactAt)} />
                <SuperAdminDetailRow label="Sales Rep" value={company.salesRep} />
              </div>
            </SuperAdminPanel>

            <SuperAdminPanel title="Internal CRM Notes">
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
            </SuperAdminPanel>
          </section>

          <section className="space-y-6">
            <SuperAdminPanel title="Quick Actions">
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
                <button className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/20">
                  Extend Trial
                </button>
                <button className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-200 hover:bg-amber-500/20">
                  Add Credits
                </button>
                <button className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200 hover:bg-red-500/20">
                  Disable Company
                </button>
              </div>
            </SuperAdminPanel>
          </section>
        </div>
      </div>
    </main>
  );
}